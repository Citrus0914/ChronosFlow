package com.chronosflow.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val TAG = "ChronosFlow"

    var topInsetCss: Float = 0f
        private set
    var bottomInsetCss: Float = 0f
        private set
    var leftInsetCss: Float = 0f
        private set
    var rightInsetCss: Float = 0f
        private set

    private var pageReady: Boolean = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 沉浸式透明状态栏与导航栏
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
        }
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false // 浅色状态栏文字与图标，适应深色背景
            isAppearanceLightNavigationBars = false
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#020617"))
            overScrollMode = View.OVER_SCROLL_NEVER
        }
        setContentView(webView)

        // 预先根据系统资源初始化基础安全边距（防止首帧渲染闪烁）
        val density = resources.displayMetrics.density
        val navBarResId = resources.getIdentifier("navigation_bar_height", "dimen", "android")
        val navBarResPx = if (navBarResId > 0) resources.getDimensionPixelSize(navBarResId) else 0
        val statusBarResId = resources.getIdentifier("status_bar_height", "dimen", "android")
        val statusBarResPx = if (statusBarResId > 0) resources.getDimensionPixelSize(statusBarResId) else 0
        topInsetCss = statusBarResPx / density
        bottomInsetCss = navBarResPx / density

        // 🎯 核心解决界面重叠：综合系统栏、忽略隐藏状态、可点击区、系统手势与资源高度
        ViewCompat.setOnApplyWindowInsetsListener(window.decorView) { _, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val systemBarsIgnored = insets.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.systemBars())
            val tappable = insets.getInsets(WindowInsetsCompat.Type.tappableElement())
            val gestures = insets.getInsets(WindowInsetsCompat.Type.mandatorySystemGestures())
            val displayCutout = insets.displayCutout

            val cutoutLeft = displayCutout?.safeInsetLeft ?: 0
            val cutoutRight = displayCutout?.safeInsetRight ?: 0
            val cutoutTop = displayCutout?.safeInsetTop ?: 0
            val cutoutBottom = displayCutout?.safeInsetBottom ?: 0

            val rawBottom = maxOf(
                systemBars.bottom,
                systemBarsIgnored.bottom,
                tappable.bottom,
                gestures.bottom,
                cutoutBottom,
                navBarResPx
            )

            val rawTop = maxOf(
                systemBars.top,
                systemBarsIgnored.top,
                cutoutTop,
                statusBarResPx
            )

            topInsetCss = rawTop / density
            bottomInsetCss = rawBottom / density
            leftInsetCss = maxOf(systemBars.left, systemBarsIgnored.left, cutoutLeft) / density
            rightInsetCss = maxOf(systemBars.right, systemBarsIgnored.right, cutoutRight) / density

            Log.d(TAG, "WindowInsets calculated: top=$topInsetCss, bottom=$bottomInsetCss (rawBottomPx=$rawBottom)")
            applyInsetsToPage()
            insets
        }

        setupWebViewSettings()

        // 注入原生通信桥梁 window.ChronosNative
        webView.addJavascriptInterface(AppUsageBridge(this), "ChronosNative")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                Log.d(TAG, "WebView page started: $url")
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                pageReady = true
                applyInsetsToPage()
                Log.d(TAG, "WebView page finished: $url")
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                Log.e(TAG, "WebView error: ${error?.description} on ${request?.url}")
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                if (consoleMessage != null) {
                    val logMsg = "[JS Console] ${consoleMessage.message()} -- line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}"
                    when (consoleMessage.messageLevel()) {
                        ConsoleMessage.MessageLevel.ERROR -> Log.e(TAG, logMsg)
                        ConsoleMessage.MessageLevel.WARNING -> Log.w(TAG, logMsg)
                        else -> Log.d(TAG, logMsg)
                    }
                }
                return true
            }
        }

        // 🎯 核心修复：直接加载 assets 根目录下的 index.html
        webView.loadUrl("file:///android_asset/index.html")

        // 拦截物理与手势返回：优先询问前端 JS 是否消费（如关闭补录弹窗、退回上一级等）
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("(window.__onNativeBackPressed && window.__onNativeBackPressed()) ? true : false") { result ->
                    val handled = result == "true"
                    if (!handled) {
                        if (webView.canGoBack()) {
                            webView.goBack()
                        } else {
                            moveTaskToBack(true) // 返回桌面，保持后台感知服务
                        }
                    }
                }
            }
        })

        // 处理启动时携带的通知栏快捷操作
        handleIncomingIntent(intent)

        // Android 13+ (API 33+) 动态申请通知栏权限
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingIntent(intent)
    }

    private fun handleIncomingIntent(intent: Intent?) {
        val action = intent?.action ?: return
        Log.d(TAG, "Incoming intent action: $action")
        when (action) {
            "com.chronosflow.app.ACTION_STOP_FOCUS" -> {
                runOnUiThread {
                    webView.evaluateJavascript(
                        "(window.__stopActiveFocus && window.__stopActiveFocus()) || true;",
                        null
                    )
                }
            }
            "com.chronosflow.app.ACTION_DISMISS_ALARM" -> {
                runOnUiThread {
                    webView.evaluateJavascript(
                        "(window.__dismissFocusAlarm && window.__dismissFocusAlarm()) || true;",
                        null
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (pageReady && ::webView.isInitialized) {
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('chronosappresume'));",
                null
            )
        }
    }

    /**
     * 将原生精准计算的 Safe-Area CSS 变量实时注入到 WebView 前端
     */
    fun applyInsetsToPage() {
        if (!pageReady || !::webView.isInitialized) return
        val js = """
            (function() {
                var top = '${topInsetCss}px';
                var bottom = '${bottomInsetCss}px';
                var left = '${leftInsetCss}px';
                var right = '${rightInsetCss}px';
                document.documentElement.style.setProperty('--native-safe-top', top);
                document.documentElement.style.setProperty('--native-safe-bottom', bottom);
                document.documentElement.style.setProperty('--native-safe-left', left);
                document.documentElement.style.setProperty('--native-safe-right', right);
                document.documentElement.style.setProperty('--safe-top', top);
                document.documentElement.style.setProperty('--safe-bottom', bottom);
                window.dispatchEvent(new CustomEvent('nativesafeareachange', {
                    detail: { top: ${topInsetCss}, bottom: ${bottomInsetCss}, left: ${leftInsetCss}, right: ${rightInsetCss} }
                }));
                window.dispatchEvent(new Event('resize'));
            })();
        """.trimIndent()
        runOnUiThread {
            webView.evaluateJavascript(js, null)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebViewSettings() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true

        // 🎯 核心修复：允许在 file:/// 协议下加载模块化 JS 与 CSS 资产
        @Suppress("DEPRECATION")
        settings.allowFileAccessFromFileURLs = true
        @Suppress("DEPRECATION")
        settings.allowUniversalAccessFromFileURLs = true

        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            settings.mediaPlaybackRequiresUserGesture = false
        }
    }
}
