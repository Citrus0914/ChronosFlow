# 📱 ChronosFlow (时流) 手机版独立 App 研发计划与应用时长检测方案
> （完全对齐选股软件 StockTwin AI 的标准架构与一键安装交互范式）

---

## 一、对齐选股软件的“开箱即用”安装交付体系

参考并完全对齐您在【选股软件 (`ai_stock_tool`)】中极其便捷的安装与构建流程，在 `mobile/` 手机版目录下将标配**三剑客批处理工具**：

```text
mobile/
├── 【一键安装到手机】.bat    # 🚀 自动调用 ADB，智能识别手机 USB 调试状态，一键传输安装并自动拉起 App
├── 【打包APK】.bat            # 📦 一键调用 Gradle 自动化编译，输出独立 APK 到 dist/ 目录
├── 【预览手机版】.bat          # 💻 在 PC 端浏览器中以手机仿真分辨率极速调试界面与交互
├── android/                   # 🤖 Android 原生工程目录 (Kotlin + Gradle + 原生权限桥接)
│   ├── app/
│   │   ├── src/main/java/com/chronosflow/app/
│   │   │   ├── MainActivity.kt           # 沉浸式原生容器，状态栏与手势避让
│   │   │   └── AppUsageBridge.kt         # @JavascriptInterface 原生桥接层 (实现检测其它App时长)
│   │   └── AndroidManifest.xml           # 声明 PACKAGE_USAGE_STATS 与前台服务权限
├── src/                       # 🎨 移动端前端源码 (React 19 + TypeScript + Tailwind)
│   ├── components/            # 移动端专用大触控卡片、时间流手势看板、应用耗时热力榜
│   └── services/              # 100% 共享复用 PC 端 NLP 解析器与 AI 认知教练双引擎
└── dist/                      # 编译生成的独立 APK 安装包存放目录
```

### 1. `【一键安装到手机】.bat` 运行流程（与选股软件完全一致）
1. **自动查找 ADB 工具**（优先复用 `.build-tools` 或系统 Android SDK 的 `platform-tools\adb.exe`）；
2. **智能检测设备状态**：
   - 未插数据线：友好提示“请连接 USB 并开启传输文件模式”；
   - 未授权调试：清晰提示“请在手机屏幕上勾选【始终允许】并点击确定”；
   - 离线（Offline）：提示重新插拔；
3. **一键极速推包安装**：自动执行 `adb install -r dist/ChronosFlow_v1.0.0_debug.apk`；
4. **自动拉起 App**：安装完成后执行 `adb shell am start -n com.chronosflow.app/.MainActivity`，手机屏幕立即亮起并进入时流！

---

## 二、架构设计：为什么这是“检测其它 App 使用时间”的最佳方案？

选股软件采用了 **Kotlin 原生沉浸容器 + Web 界面资产 + `@JavascriptInterface` 双向通信桥接** 的架构。这种架构用在时间管理应用上具有压倒性优势：

1. **核心算法 100% 零成本复用**：
   - PC 端的 `nlpParser.ts`（自适应自然语言时间提取）、`aiDebrief.ts`（认知心理学复盘双引擎）、`dateUtils.ts` 等纯 TypeScript 业务代码可以直接无损引入；
   - PC 端通过的 38 项自动化单元测试在移动端继续生效。
2. **检测其它 App 使用时长（核心新功能）实现极简且原生合规**：
   - 在 Kotlin 原生层通过 `@JavascriptInterface` 向前端注入 `window.ChronosNative` 对象；
   - 仅需 1 个 `AppUsageBridge.kt` 即可完整掌控系统底层 `UsageStatsManager`！

---

## 三、“检测其它 App 使用时间”技术实现细节

### 1. Android 原生桥接层实现 (`AppUsageBridge.kt`)

```kotlin
package com.chronosflow.app

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

class AppUsageBridge(private val context: Context) {

    // 1. 检查是否已取得“有权查看使用情况的应用”系统权限
    @JavascriptInterface
    fun hasUsagePermission(): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    // 2. 引导用户一键直达安卓系统设置页开启权限
    @JavascriptInterface
    fun openUsageSettings() {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    // 3. 读取某段时间内各 App 的前台使用总时长与最后活跃时间
    @JavascriptInterface
    fun getAppUsageJson(startTime: Long, endTime: Long): String {
        val usageManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val stats = usageManager.queryUsageStats(UsageStatsManager.INTERVAL_BEST, startTime, endTime)
        val pm = context.packageManager
        val jsonArray = JSONArray()

        for (item in stats) {
            // 过滤使用时长小于 30 秒的误触瞬时启动
            if (item.totalTimeInForeground > 30 * 1000) {
                val obj = JSONObject()
                obj.put("packageName", item.packageName)
                obj.put("foregroundMs", item.totalTimeInForeground)
                obj.put("lastTimeUsed", item.lastTimeUsed)
                
                // 自动获取 App 真实中文名（如“微信”、“哔哩哔哩”）
                val appLabel = try {
                    pm.getApplicationLabel(pm.getApplicationInfo(item.packageName, 0)).toString()
                } catch (e: Exception) {
                    item.packageName
                }
                obj.put("appName", appLabel)
                jsonArray.put(obj)
            }
        }
        return jsonArray.toString()
    }
}
```

### 2. 前端 TypeScript 极简调用与时间流自动融合

在前端代码中，只需调用原生注入的桥接方法：

```typescript
// 1. 检查权限
const isGranted = window.ChronosNative?.hasUsagePermission() ?? false;

// 2. 自动拉取今日各 App 的使用时长数据
if (isGranted) {
  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const rawData = window.ChronosNative.getAppUsageJson(startOfDay, now);
  const appList: AppUsageItem[] = JSON.parse(rawData);

  // 3. 智能映射到 ChronosFlow 分类与时间流
  // 微信 -> 沟通协作；原神/抖音 -> 娱乐休闲；微信读书 -> 学习探索
  syncAppUsageToTimeline(appList);
}
```

---

## 四、本地已有编译环境与工具链复用

经确认，本台电脑已经具备构建安卓所需的一切基建：
- **JDK 17**：`C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot`（已完全就绪）
- **Android SDK**：`C:\Users\Citrus\AppData\Local\Android\Sdk` 与 `ai_stock_tool\.build-tools\android-sdk`
- **Gradle**：`ai_stock_tool\.build-tools\gradle-8.9`（现成绿色构建器）
- **ADB 工具**：现成 `adb.exe` 位于 platform-tools 目录

我们可以直接共享选股软件的构建器配置与脚本模板，无需重复下载庞大的依赖包，构建速度极快！

---

## 五、手机版开发推进路线图

| 步骤 | 内容说明 | 预期成果 |
| :--- | :--- | :--- |
| **第 1 步：脚手架与双端脚本初始化** | 在 `mobile/` 目录初始化前端与 Android 原生工程架构，放置 `【一键安装到手机】.bat`、`【打包APK】.bat`、`【预览手机版】.bat` | 双击可在电脑仿真预览手机版，打包脚本可直接唤起 |
| **第 2 步：Android 原生桥接层接入** | 编写 `AppUsageBridge.kt`，接入 `UsageStatsManager`，配置 Android 权限申请流程 | 点击手机界面按钮，可正确跳转安卓授权设置，并成功读出微信等实际使用时长 |
| **第 3 步：应用时长与时间流深度融合** | 编写包名识别字典、去噪过滤器，自动将 App 耗时生成为带“🤖自动感知”标签的时间块 | 手机上的时间流能自动还原今天一天使用了哪些 App，支持一键归档与情绪标记 |
| **第 4 步：注意力碎片化评估与 AI 复盘联动** | 结合多任务频繁切换频次与各 App 耗时，在 AI 认知教练中生成“手机数字分心诊断” | 手机端专属的高价值复盘报告 |
| **第 5 步：真机联调与打包交付** | 执行 `【打包APK】.bat` 生成 Release APK，执行 `【一键安装到手机】.bat` 验证真机流畅运行 | 手机端独立 App 正式落成交付 |

---

> 🎯 **确认即可开工**：如果您认可上述完全对齐选股软件的架构与安装脚本，我们将立即在 `mobile/` 目录开始搭建工程！
