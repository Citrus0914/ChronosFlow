package com.chronosflow.app

import android.Manifest
import android.app.AppOpsManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

class AppUsageBridge(private val context: Context) {

    companion object {
        const val CHANNEL_FOCUS_ID = "chronosflow_focus_channel"
        const val CHANNEL_ALARM_ID = "chronosflow_alarm_channel"
        const val NOTIFICATION_ID_FOCUS = 1001
        const val NOTIFICATION_ID_ALARM = 1002
    }

    private var activeRingtone: Ringtone? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var scheduledAlarmRunnable: Runnable? = null

    init {
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                ?: return

            // 1. 实时专注通知渠道 (常驻无打扰)
            val focusChannel = NotificationChannel(
                CHANNEL_FOCUS_ID,
                "实时专注状态",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "在通知栏实时展示当前专注任务与进度"
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }

            // 2. 专注到期响铃渠道 (高优先级、横幅浮窗、响铃、振动)
            val alarmChannel = NotificationChannel(
                CHANNEL_ALARM_ID,
                "专注时长到期提醒",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "专注倒计时结束时的通知与响铃提醒"
                setShowBadge(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 400)
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                setSound(soundUri, audioAttributes)
            }

            nm.createNotificationChannel(focusChannel)
            nm.createNotificationChannel(alarmChannel)
        }
    }

    /**
     * 0. 获取系统安全区域边距（状态栏、虚拟导航栏、打孔屏黑边）
     */
    @JavascriptInterface
    fun getSafeAreaInsets(): String {
        val activity = context as? MainActivity
        val top = activity?.topInsetCss ?: 0f
        val bottom = activity?.bottomInsetCss ?: 0f
        val left = activity?.leftInsetCss ?: 0f
        val right = activity?.rightInsetCss ?: 0f
        return JSONObject().apply {
            put("top", top)
            put("bottom", bottom)
            put("left", left)
            put("right", right)
        }.toString()
    }

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
     * 解析应用的可读中文/本地化名称（失败则回退包名）
     */
    @JavascriptInterface
    fun getAppLabel(packageName: String): String {
        return try {
            val pm = context.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            packageName
        }
    }

    /**
     * 3. 精确提取指定时间区间 [startTime, endTime] 内各个 App 的前台使用时长
     * 核心升级：采用 UsageEvents 毫秒级事件流切片，彻底解决 queryUsageStats 跨天桶重叠、
     * 同包名多桶重复及当天新增时长延迟刷新的问题；针对超过 7 天历史才降级使用去重后的 queryUsageStats。
     */
    @JavascriptInterface
    fun getAppUsageJson(startTime: Double, endTime: Double): String {
        val jsonArray = JSONArray()
        try {
            val startMs = startTime.toLong()
            val endMs = endTime.toLong()
            if (endMs <= startMs) return jsonArray.toString()

            val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
                ?: return jsonArray.toString()

            val pm = context.packageManager
            val homePkg = try {
                val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
                pm.resolveActivity(homeIntent, 0)?.activityInfo?.packageName
            } catch (e: Exception) {
                null
            }

            val ignoredPackages = mutableSetOf(
                context.packageName,
                "com.android.systemui",
                "com.google.android.inputmethod.latin",
                "com.sohu.inputmethod.sogou",
                "com.baidu.input",
                "com.samsung.android.honeyboard",
                "com.iflytek.inputmethod",
                "com.tencent.wetype",
                "com.sec.android.app.launcher",
                "com.miui.home",
                "com.huawei.android.launcher",
                "com.hihonor.android.launcher",
                "com.oppo.launcher",
                "com.android.launcher3",
                "com.google.android.apps.nexuslauncher"
            )
            if (!homePkg.isNullOrBlank()) {
                ignoredPackages.add(homePkg)
            }

            val foregroundMap = HashMap<String, Long>()
            val lastUsedMap = HashMap<String, Long>()

            // 向前多回溯 6 小时以精准捕获跨零点连续使用的应用（最终严格裁剪到 [startMs, endMs]）
            val lookbackMs = 6 * 3600 * 1000L
            val queryStart = (startMs - lookbackMs).coerceAtLeast(0L)
            val usageEvents = usageStatsManager.queryEvents(queryStart, endMs)

            val activeClasses = HashMap<String, MutableSet<String>>()
            val pkgStartTime = HashMap<String, Long>()
            var sawEventInTargetRange = false

            fun closePackageInterval(pkg: String, closeTs: Long) {
                val openTs = pkgStartTime.remove(pkg) ?: return
                activeClasses.remove(pkg)
                val clippedStart = maxOf(openTs, startMs)
                val clippedEnd = minOf(closeTs, endMs)
                if (clippedEnd > clippedStart) {
                    val delta = (clippedEnd - clippedStart).coerceAtMost(12 * 3600 * 1000L)
                    foregroundMap[pkg] = (foregroundMap[pkg] ?: 0L) + delta
                    lastUsedMap[pkg] = maxOf(lastUsedMap[pkg] ?: 0L, clippedEnd)
                }
            }

            if (usageEvents != null) {
                val event = UsageEvents.Event()
                while (usageEvents.hasNextEvent()) {
                    usageEvents.getNextEvent(event)
                    val ts = event.timeStamp
                    if (ts >= startMs) {
                        sawEventInTargetRange = true
                    }
                    when (event.eventType) {
                        // 1 = ACTIVITY_RESUMED / MOVE_TO_FOREGROUND
                        1 -> {
                            val pkg = event.packageName ?: continue
                            val cls = event.className ?: "__default__"
                            val set = activeClasses.getOrPut(pkg) { HashSet() }
                            if (set.isEmpty()) {
                                pkgStartTime[pkg] = ts
                            }
                            set.add(cls)
                            if (ts >= startMs) {
                                lastUsedMap[pkg] = maxOf(lastUsedMap[pkg] ?: 0L, ts)
                            }
                        }
                        // 2 = ACTIVITY_PAUSED / MOVE_TO_BACKGROUND, 23 = ACTIVITY_STOPPED
                        2, 23 -> {
                            val pkg = event.packageName ?: continue
                            val cls = event.className ?: "__default__"
                            val set = activeClasses[pkg]
                            if (set != null && set.remove(cls) && set.isEmpty()) {
                                closePackageInterval(pkg, ts)
                            }
                        }
                        // 15 = SCREEN_NON_INTERACTIVE (熄屏), 26 = DEVICE_SHUTDOWN (关机)
                        15, 26 -> {
                            for (openPkg in pkgStartTime.keys.toList()) {
                                closePackageInterval(openPkg, ts)
                            }
                        }
                    }
                }
                // 结算在查询截止时刻仍处于前台的应用（例如分屏或刚切换的瞬时状态）
                for (openPkg in pkgStartTime.keys.toList()) {
                    closePackageInterval(openPkg, endMs)
                }
            }

            // 降级兜底：若查询的是系统已清理原始事件的远古日期，回退到去重后的 queryUsageStats
            if (!sawEventInTargetRange && foregroundMap.isEmpty()) {
                val stats = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_DAILY,
                    startMs,
                    endMs
                )
                if (stats != null) {
                    for (item in stats) {
                        val pkg = item.packageName ?: continue
                        if (item.lastTimeUsed < startMs || item.firstTimeStamp >= endMs) continue
                        val fg = item.totalTimeInForeground
                        if (fg <= 0L) continue
                        // 按包名严格合并去重，杜绝重复 key
                        foregroundMap[pkg] = maxOf(foregroundMap[pkg] ?: 0L, fg)
                        lastUsedMap[pkg] = maxOf(lastUsedMap[pkg] ?: 0L, item.lastTimeUsed)
                    }
                }
            }

            for ((pkg, fgMs) in foregroundMap) {
                // 过滤本应用、桌面启动器、系统UI、输入法以及前台时长小于 30 秒的瞬时误触
                if (pkg in ignoredPackages) continue
                if (fgMs < 30 * 1000L) continue

                val obj = JSONObject()
                obj.put("packageName", pkg)
                obj.put("foregroundMs", fgMs)
                obj.put("lastTimeUsed", lastUsedMap[pkg] ?: endMs)
                obj.put("appName", getAppLabel(pkg))
                jsonArray.put(obj)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return jsonArray.toString()
    }

    /**
     * 4. 触觉震动反馈 (已全局彻底禁用)
     */
    @JavascriptInterface
    fun vibrate(durationMs: Double) {
        // 用户要求彻底移除手机版震动反馈：空实现以兼容现有 JS-Bridge 接口调用
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

    /**
     * 6. 检测是否具备发送通知权限 (Android 13+ 动态权限检测)
     */
    @JavascriptInterface
    fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    /**
     * 7. 在系统通知栏常驻展示/更新实时专注消息与计时
     */
    @JavascriptInterface
    fun updateFocusNotification(title: String, category: String, startTime: Double, targetDurationMin: Double) {
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            val openIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val openPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val stopIntent = Intent(context, MainActivity::class.java).apply {
                action = "com.chronosflow.app.ACTION_STOP_FOCUS"
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val stopPendingIntent = PendingIntent.getActivity(
                context,
                1,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val builder = NotificationCompat.Builder(context, CHANNEL_FOCUS_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("🎯 专注中: $title")
                .setContentIntent(openPendingIntent)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(true)
                .addAction(android.R.drawable.ic_media_pause, "结束并结算", stopPendingIntent)
                .addAction(android.R.drawable.ic_menu_view, "打开应用", openPendingIntent)

            val startMs = startTime.toLong()
            if (targetDurationMin > 0) {
                val totalTargetMs = (targetDurationMin * 60 * 1000).toLong()
                val endMs = startMs + totalTargetMs
                builder.setContentText("目标 ${targetDurationMin.toInt()} 分钟 · 分类: $category")
                builder.setSubText("计时专注中")
                builder.setUsesChronometer(true)
                builder.setWhen(endMs)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    builder.setChronometerCountDown(true)
                }
                // 调度原生后台定时响铃 (后台休眠兜底)
                scheduleAlarmTrigger(title, endMs)
            } else {
                builder.setContentText("自由专注 · 分类: $category")
                builder.setSubText("计时专注中")
                builder.setUsesChronometer(true)
                builder.setWhen(startMs)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    builder.setChronometerCountDown(false)
                }
                cancelScheduledAlarm()
            }

            nm.notify(NOTIFICATION_ID_FOCUS, builder.build())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * 8. 清除通知栏常驻专注消息
     */
    @JavascriptInterface
    fun cancelFocusNotification() {
        try {
            cancelScheduledAlarm()
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            nm?.cancel(NOTIFICATION_ID_FOCUS)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * 9. 启动专注时长到达响铃与横幅浮窗通知
     */
    @JavascriptInterface
    fun startAlarmRing(title: String) {
        val activity = context as? MainActivity
        activity?.runOnUiThread {
            playNativeRingtone()
            showAlarmNotification(title)
        } ?: run {
            playNativeRingtone()
            showAlarmNotification(title)
        }
    }

    /**
     * 10. 停止响铃并关闭响铃浮窗通知
     */
    @JavascriptInterface
    fun stopAlarmRing() {
        val activity = context as? MainActivity
        activity?.runOnUiThread {
            stopNativeRingtone()
            cancelAlarmNotification()
        } ?: run {
            stopNativeRingtone()
            cancelAlarmNotification()
        }
    }

    private fun playNativeRingtone() {
        try {
            stopNativeRingtone()
            val uri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

            activeRingtone = RingtoneManager.getRingtone(context.applicationContext, uri)?.apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    isLooping = true
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                }
                play()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopNativeRingtone() {
        try {
            activeRingtone?.let {
                if (it.isPlaying) {
                    it.stop()
                }
            }
            activeRingtone = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun showAlarmNotification(title: String) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val openPendingIntent = PendingIntent.getActivity(
            context,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val dismissIntent = Intent(context, MainActivity::class.java).apply {
            action = "com.chronosflow.app.ACTION_DISMISS_ALARM"
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val dismissPendingIntent = PendingIntent.getActivity(
            context,
            2,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(context, MainActivity::class.java).apply {
            action = "com.chronosflow.app.ACTION_STOP_FOCUS"
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val stopPendingIntent = PendingIntent.getActivity(
            context,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ALARM_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("🔔 专注时长已到！")
            .setContentText("「$title」已达成目标专注时长，点击查看或结算")
            .setContentIntent(openPendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .addAction(android.R.drawable.ic_notification_clear_all, "停止响铃", dismissPendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "结算归档", stopPendingIntent)

        nm.notify(NOTIFICATION_ID_ALARM, builder.build())
    }

    private fun cancelAlarmNotification() {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        nm?.cancel(NOTIFICATION_ID_ALARM)
    }

    private fun scheduleAlarmTrigger(title: String, endMs: Long) {
        cancelScheduledAlarm()
        val delay = endMs - System.currentTimeMillis()
        if (delay <= 0) {
            startAlarmRing(title)
            return
        }
        val r = Runnable {
            startAlarmRing(title)
        }
        scheduledAlarmRunnable = r
        mainHandler.postDelayed(r, delay)
    }

    private fun cancelScheduledAlarm() {
        scheduledAlarmRunnable?.let {
            mainHandler.removeCallbacks(it)
            scheduledAlarmRunnable = null
        }
    }
}
