package com.chronosflow.app

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject

class AppUsageBridge(private val context: Context) {

    /**
     * 1. 检查是否已被用户授予【有权查看使用情况的应用】特别系统权限
     */
    @JavascriptInterface
    fun hasUsagePermission(): Boolean {
        return try {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.packageName
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.packageName
                )
            }
            mode == AppOpsManager.MODE_ALLOWED
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    /**
     * 2. 一键直达安卓系统设置页，开启【使用情况访问权限】
     */
    @JavascriptInterface
    fun openUsageSettings() {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            // 某些定制 ROM 若不存在直接入口，降级跳转常规设置
            try {
                val fallbackIntent = Intent(Settings.ACTION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(fallbackIntent)
            } catch (ex: Exception) {
                ex.printStackTrace()
            }
        }
    }

    /**
     * 3. 提取某时间段内的各个 App 使用时长
     * 过滤系统 UI、桌面、输入法等无意义进程，返回高可信的前台时长列表 JSON
     */
    @JavascriptInterface
    fun getAppUsageJson(startTime: Double, endTime: Double): String {
        val jsonArray = JSONArray()
        try {
            val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
                ?: return jsonArray.toString()

            val stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_BEST,
                startTime.toLong(),
                endTime.toLong()
            ) ?: return jsonArray.toString()

            val pm = context.packageManager
            val ignoredPackages = setOf(
                context.packageName,
                "com.android.systemui",
                "com.google.android.inputmethod.latin",
                "com.sohu.inputmethod.sogou",
                "com.baidu.input"
            )

            for (item in stats) {
                // 过滤本应用、系统UI以及前台时长小于 30 秒的瞬时误触
                if (item.packageName in ignoredPackages) continue
                if (item.totalTimeInForeground < 30 * 1000) continue

                val obj = JSONObject()
                obj.put("packageName", item.packageName)
                obj.put("foregroundMs", item.totalTimeInForeground)
                obj.put("lastTimeUsed", item.lastTimeUsed)

                // 获取中文或友好可读的应用名称（如“微信”、“原神”）
                val appLabel = try {
                    val appInfo = pm.getApplicationInfo(item.packageName, 0)
                    pm.getApplicationLabel(appInfo).toString()
                } catch (e: Exception) {
                    item.packageName
                }
                obj.put("appName", appLabel)
                jsonArray.put(obj)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return jsonArray.toString()
    }

    /**
     * 4. 触觉震动反馈
     */
    @JavascriptInterface
    fun vibrate(durationMs: Double) {
        try {
            val ms = durationMs.toLong().coerceAtLeast(10L)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator.vibrate(
                    VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(ms)
                }
            }
        } catch (e: Exception) {
            // ignore
        }
    }

    /**
     * 5. 原生 Toast 浮窗
     */
    @JavascriptInterface
    fun showToast(message: String) {
        try {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            // ignore
        }
    }
}
