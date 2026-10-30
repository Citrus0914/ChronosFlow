package com.chronosflow.app

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject

class AppUsageBridge(private val context: Context) {

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
     * 0.1 获取设备电池容量 (mAh) 与当前实时电量 (基于标准 BatteryManager，无需额外特权权限)
     */
    @JavascriptInterface
    fun getDeviceBatteryInfo(): String {
        return try {
            val iFilter = android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            val batteryStatus = context.registerReceiver(null, iFilter)
            val level = batteryStatus?.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryStatus?.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1) ?: 100
            val batteryPct = if (level >= 0 && scale > 0) (level * 100 / scale) else -1

            var capacity = 5000
            try {
                val powerProfileClass = Class.forName("com.android.internal.os.PowerProfile")
                val powerProfile = powerProfileClass.getConstructor(Context::class.java).newInstance(context)
                val getBatteryCapacity = powerProfileClass.getMethod("getBatteryCapacity")
                val cap = (getBatteryCapacity.invoke(powerProfile) as? Number)?.toDouble() ?: 5000.0
                if (cap > 1000.0 && cap < 25000.0) {
                    capacity = cap.toInt()
                }
            } catch (e: Exception) {
                // 部分定制ROM限制反射访问隐藏类，使用主流 5000mAh
            }

            JSONObject().apply {
                put("level", batteryPct)
                put("capacityMah", capacity)
            }.toString()
        } catch (e: Exception) {
            JSONObject().apply {
                put("level", -1)
                put("capacityMah", 5000)
            }.toString()
        }
    }

    /**
     * 0.2 检查是否已通过 ADB 授予 BATTERY_STATS 或 DUMP 特权权限
     */
    @JavascriptInterface
    fun hasBatteryStatsPermission(): Boolean {
        return try {
            val hasBattery = context.checkSelfPermission(android.Manifest.permission.BATTERY_STATS) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED
            val hasDump = context.checkSelfPermission(android.Manifest.permission.DUMP) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED
            hasBattery || hasDump
        } catch (e: Exception) {
            false
        }
    }

    /**
     * 通过 BatteryStatsManager 系统服务反射提取电量数据 (API 31+，需 BATTERY_STATS 权限)
     */
    private fun getBatteryUsageFromManager(): Map<String, Double> {
        val result = HashMap<String, Double>()
        try {
            val bsm = context.getSystemService("batterystats")
            if (bsm == null) {
                android.util.Log.w("ChronosPower", "batterystats service is null")
                return result
            }

            android.util.Log.d("ChronosPower", "bsm class: ${bsm.javaClass.name}")
            for (m in bsm.javaClass.methods) {
                if (m.name.contains("Usage", ignoreCase = true) || m.name.contains("Battery", ignoreCase = true)) {
                    val paramTypes = m.parameterTypes.map { it.simpleName }.joinToString(", ")
                    android.util.Log.d("ChronosPower", "bsm method: ${m.name}($paramTypes) -> ${m.returnType.simpleName}")
                }
            }

            var stats: Any? = null
            // 尝试 1：查找任何名为 getBatteryUsageStats 的方法
            for (m in bsm.javaClass.methods) {
                if (m.name == "getBatteryUsageStats") {
                    try {
                        if (m.parameterCount == 0) {
                            stats = m.invoke(bsm)
                            break
                        } else if (m.parameterTypes[0] == List::class.java) {
                            // 查找 BatteryUsageStatsQuery 的静态方法或构造器
                            val qClass = Class.forName("android.os.BatteryUsageStatsQuery")
                            val defaultField = qClass.fields.firstOrNull { it.name == "DEFAULT" }
                            val defaultObj = defaultField?.get(null)
                            val builderConstructors = try {
                                val bClass = Class.forName("android.os.BatteryUsageStatsQuery\$Builder")
                                bClass.constructors
                            } catch (e: Exception) {
                                emptyArray()
                            }
                            android.util.Log.d("ChronosPower", "Query builders: ${builderConstructors.size}, defaultObj: $defaultObj")
                            val queryObj = defaultObj ?: (if (builderConstructors.isNotEmpty()) builderConstructors[0].newInstance() else null)
                            if (queryObj != null) {
                                val query = if (queryObj.javaClass.name.endsWith("Builder")) {
                                    queryObj.javaClass.getMethod("build").invoke(queryObj)
                                } else {
                                    queryObj
                                }
                                stats = (m.invoke(bsm, listOf(query)) as? List<*>)?.firstOrNull()
                                if (stats != null) break
                            }
                        }
                    } catch (e: Throwable) {
                        android.util.Log.w("ChronosPower", "Failed invoking ${m.name}: ${e.message}")
                    }
                }
            }

            if (stats != null) {
                android.util.Log.d("ChronosPower", "Obtained stats: ${stats.javaClass.name}")
                try {
                    val consumers = stats.javaClass.methods.firstOrNull {
                        it.name == "getUidBatteryConsumers"
                    }?.invoke(stats) as? List<*>

                    val pm = context.packageManager
                    if (consumers != null) {
                        android.util.Log.d("ChronosPower", "Found ${consumers.size} UidBatteryConsumers")
                        for (consumer in consumers) {
                            if (consumer == null) continue
                            val uid = (consumer.javaClass.methods.firstOrNull { it.name == "getUid" }?.invoke(consumer) as? Number)?.toInt() ?: continue
                            if (uid < 10000) continue

                            val powerMah = (consumer.javaClass.methods.firstOrNull { it.name == "getConsumedPower" && it.parameterCount == 0 }?.invoke(consumer) as? Number)?.toDouble() ?: 0.0
                            if (powerMah > 0) {
                                val pkgs = pm.getPackagesForUid(uid) ?: continue
                                for (pkg in pkgs) {
                                    result[pkg] = powerMah
                                }
                            }
                        }
                    }
                } finally {
                    try {
                        if (stats is java.io.Closeable) {
                            stats.close()
                        }
                    } catch (t: Throwable) {
                        // ignore
                    }
                }
            }
        } catch (e: Throwable) {
            android.util.Log.w("ChronosPower", "BatteryStatsManager reflection query: ${e.message}", e)
        }
        return result
    }

    /**
     * 通过 dumpsys batterystats 管道流提取电量数据 (需 DUMP 权限)
     */
    private fun getBatteryUsageFromDumpsys(): Map<String, Double> {
        val result = HashMap<String, Double>()
        try {
            val process = Runtime.getRuntime().exec(arrayOf("dumpsys", "batterystats"))
            val reader = java.io.BufferedReader(java.io.InputStreamReader(process.inputStream))
            val errReader = java.io.BufferedReader(java.io.InputStreamReader(process.errorStream))
            
            val firstErr = errReader.readLine()
            if (firstErr != null) {
                android.util.Log.w("ChronosPower", "dumpsys stderr: $firstErr")
            }

            var line: String?
            val pm = context.packageManager

            val uidRegex = Regex("""^\s*UID\s+([u0-9a-zA-Z_]+):\s+([\d\.]+)""")
            val userAppRegex = Regex("""^u(\d+)a(\d+)$""")
            var matchedCount = 0

            while (reader.readLine().also { line = it } != null) {
                val currentLine = line ?: continue
                val match = uidRegex.find(currentLine)
                if (match != null) {
                    val uidRaw = match.groupValues[1]
                    val mahStr = match.groupValues[2]
                    val mah = mahStr.toDoubleOrNull() ?: continue

                    var uid: Int? = null
                    val userMatch = userAppRegex.find(uidRaw)
                    if (userMatch != null) {
                        val userId = userMatch.groupValues[1].toIntOrNull() ?: 0
                        val appId = userMatch.groupValues[2].toIntOrNull() ?: 0
                        uid = userId * 100000 + 10000 + appId
                    } else if (uidRaw.startsWith("u0a")) {
                        val num = uidRaw.removePrefix("u0a").toIntOrNull()
                        if (num != null) uid = 10000 + num
                    } else {
                        uid = uidRaw.toIntOrNull()
                    }

                    if (uid != null && uid >= 10000 && mah > 0) {
                        matchedCount++
                        val pkgs = pm.getPackagesForUid(uid) ?: continue
                        for (pkg in pkgs) {
                            result[pkg] = mah
                        }
                    }
                }
            }
            android.util.Log.d("ChronosPower", "dumpsys matched UID count: $matchedCount, mapped packages: ${result.size}")
            reader.close()
            errReader.close()
            process.destroy()
        } catch (e: Throwable) {
            android.util.Log.w("ChronosPower", "dumpsys batterystats query: ${e.message}", e)
        }
        return result
    }

    /**
     * 0.3 获取通过 ADB 权限读取到的真实硬件电量消耗 (mAh)
     * 双引擎架构：
     * 1. 优先调用 BatteryStatsManager 系统服务反射提取（API 31+，需 BATTERY_STATS 权限）
     * 2. 回退调用 dumpsys batterystats 管道解析（需 DUMP 权限）
     */
    @JavascriptInterface
    fun getHardwareBatteryUsageJson(): String {
        val finalMap = HashMap<String, Double>()
        try {
            if (!hasBatteryStatsPermission()) {
                return "{}"
            }

            val fromManager = getBatteryUsageFromManager()
            if (fromManager.isNotEmpty()) {
                finalMap.putAll(fromManager)
                android.util.Log.i("ChronosPower", "成功通过 BatteryStatsManager 解析 ${finalMap.size} 个应用的硬件耗电量")
            } else {
                val fromDumpsys = getBatteryUsageFromDumpsys()
                if (fromDumpsys.isNotEmpty()) {
                    finalMap.putAll(fromDumpsys)
                    android.util.Log.i("ChronosPower", "成功通过 dumpsys batterystats 解析 ${finalMap.size} 个应用的硬件耗电量")
                } else {
                    android.util.Log.w("ChronosPower", "双引擎查询均未返回数据，请确认是否已通过 ADB 授权 BATTERY_STATS 和 DUMP")
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("ChronosPower", "getHardwareBatteryUsageJson exception", e)
        }

        val json = JSONObject()
        for ((pkg, mah) in finalMap) {
            json.put(pkg, mah)
        }
        return json.toString()
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
}
