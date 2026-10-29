package com.chronosflow.app

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 沉浸式全屏布局与状态栏配置
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.parseColor("#020617") // 与 slate-950 背景融为一体
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false // 浅色图标文字，适应深色背景
            isAppearanceLightNavigationBars = false
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#020617"))
            overScrollMode = View.OVER_SCROLL_NEVER
        }
        setContentView(webView)

        setupWebViewSettings()

        // 注入安卓原生通信桥梁对象 window.ChronosNative
        webView.addJavascriptInterface(AppUsageBridge(this), "ChronosNative")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                return false
            }
        }
        webView.webChromeClient = WebChromeClient()

        // 载入打包在 assets/app 中的前端 SPA
        webView.loadUrl("file:///android_asset/app/index.html")

        // 拦截物理/手势返回键
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    moveTaskToBack(true) // 返回桌面而非销毁进程，保证后台感知连贯
                }
            }
        })
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebViewSettings() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            settings.mediaPlaybackRequiresUserGesture = false
        }
    }
}
