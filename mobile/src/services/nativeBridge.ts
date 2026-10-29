import { AppUsageItem } from '../types';

/**
 * 常见安卓包名的默认智能分类词典
 */
export const DEFAULT_PACKAGE_CATEGORIES: Record<string, { name: string; category: string }> = {
  'com.tencent.mm': { name: '微信', category: '工作/业务' },
  'com.tencent.mobileqq': { name: 'QQ', category: '工作/业务' },
  'com.alibaba.android.rimet': { name: '钉钉', category: '工作/业务' },
  'com.ss.android.lark': { name: '飞书', category: '工作/业务' },
  'com.ss.android.ugc.aweme': { name: '抖音', category: '休闲/生活' },
  'com.kuaishou.nebula': { name: '快手', category: '休闲/生活' },
  'tv.danmaku.bili': { name: '哔哩哔哩', category: '休闲/生活' },
  'com.xingin.xhs': { name: '小红书', category: '休闲/生活' },
  'com.sina.weibo': { name: '微博', category: '休闲/生活' },
  'com.tencent.tmgp.sgame': { name: '王者荣耀', category: '休闲/生活' },
  'com.miHoYo.Yuanshen': { name: '原神', category: '休闲/生活' },
  'com.zhihu.android': { name: '知乎', category: '学习/提升' },
  'com.tencent.weread': { name: '微信读书', category: '学习/提升' },
  'com.luojilab.player': { name: '得到', category: '学习/提升' },
  'com.coolapk.market': { name: '酷安', category: '休闲/生活' },
  'com.netease.cloudmusic': { name: '网易云音乐', category: '休闲/生活' },
};

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * 注入与更新安全区域 CSS 变量（适配状态栏与虚拟导航栏）
 */
export function updateSafeAreaVariables(insets: SafeAreaInsets): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const topStr = `${insets.top}px`;
  const bottomStr = `${insets.bottom}px`;
  const leftStr = `${insets.left}px`;
  const rightStr = `${insets.right}px`;

  root.style.setProperty('--native-safe-top', topStr);
  root.style.setProperty('--native-safe-bottom', bottomStr);
  root.style.setProperty('--native-safe-left', leftStr);
  root.style.setProperty('--native-safe-right', rightStr);
  root.style.setProperty('--safe-top', topStr);
  root.style.setProperty('--safe-bottom', bottomStr);
}

/**
 * 初始化安全区域监听与原生查询
 */
export function initSafeArea(): void {
  if (typeof window === 'undefined') return;

  // 1. 若宿主已注入 getSafeAreaInsets，主动同步读取
  const queryNative = () => {
    if (window.ChronosNative?.getSafeAreaInsets) {
      try {
        const raw = window.ChronosNative.getSafeAreaInsets();
        if (raw) {
          const insets = JSON.parse(raw) as SafeAreaInsets;
          updateSafeAreaVariables(insets);
        }
      } catch (e) {
        console.warn('获取原生安全区域边距失败:', e);
      }
    }
  };

  queryNative();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', queryNative);
  }
  window.addEventListener('load', queryNative);

  // 2. 监听原生 WindowInsets 动态变动通知（如键盘弹出或屏幕旋转）
  window.addEventListener('nativesafeareachange', ((e: CustomEvent<SafeAreaInsets>) => {
    if (e.detail) {
      updateSafeAreaVariables(e.detail);
    }
  }) as EventListener);
}

// 模块加载时执行安全区域初始化
initSafeArea();

type BackHandler = () => boolean;
const backHandlerStack: BackHandler[] = [];

/**
 * 注册返回按键监听处理器。后注册的优先触发。
 * 若处理器返回 true，表示该事件已被消费（如关闭弹窗、退回上一级），原生层不再执行退回桌面。
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlerStack.push(handler);
  return () => {
    const idx = backHandlerStack.indexOf(handler);
    if (idx !== -1) {
      backHandlerStack.splice(idx, 1);
    }
  };
}

/**
 * 供 Android 原生 evaluateJavascript 直接调用的全局返回钩子
 */
if (typeof window !== 'undefined') {
  (window as any).__onNativeBackPressed = () => {
    for (let i = backHandlerStack.length - 1; i >= 0; i--) {
      const handler = backHandlerStack[i];
      try {
        if (handler()) {
          return true; // 已消费
        }
      } catch (e) {
        console.error('BackHandler 执行异常:', e);
      }
    }
    return false; // 未消费，由 Android 宿主执行默认操作 (如移至后台)
  };
}

/**
 * 检查当前是否运行在 Android 原生宿主内
 */
export function isAndroidNative(): boolean {
  return typeof window !== 'undefined' && !!window.ChronosNative;
}

/**
 * 检查是否有【有权查看使用情况的应用】权限
 */
export function checkUsagePermission(): boolean {
  if (isAndroidNative()) {
    try {
      return window.ChronosNative!.hasUsagePermission();
    } catch (e) {
      console.warn('原生检查权限失败，降级为未授权:', e);
      return false;
    }
  }
  // PC 浏览器端仿真模式：从 localStorage 读取调试标记，默认模拟已开启
  const mockState = localStorage.getItem('chronos_mock_perm');
  return mockState !== 'false';
}

/**
 * 切换 PC 调试模式下的模拟授权状态
 */
export function toggleMockPermission(granted: boolean): void {
  localStorage.setItem('chronos_mock_perm', granted ? 'true' : 'false');
}

/**
 * 引导跳转至安卓系统设置页开启【使用情况访问权限】
 */
export function requestUsagePermission(): void {
  if (isAndroidNative()) {
    try {
      window.ChronosNative!.openUsageSettings();
      return;
    } catch (e) {
      console.error('跳转系统设置失败:', e);
    }
  }
  alert('【PC 仿真预览提示】\n已触发跳转系统【使用情况访问权限】设置页面。\n在安卓真机上，此时将直接唤起系统的授权列表。');
}

/**
 * 触发轻微触觉震动
 */
export function triggerHapticFeedback(durationMs = 20): void {
  if (isAndroidNative()) {
    try {
      window.ChronosNative!.vibrate(durationMs);
      return;
    } catch {
      // ignore
    }
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(durationMs);
  }
}

/**
 * 弹出 Toast
 */
export function showNativeToast(message: string): void {
  if (isAndroidNative()) {
    try {
      window.ChronosNative!.showToast(message);
      return;
    } catch {
      // ignore
    }
  }
  console.log('[Native Toast]:', message);
}

/**
 * 获取指定时间段内的各个 App 使用时长
 */
export function fetchAppUsageStats(startTime: number, endTime: number): AppUsageItem[] {
  if (isAndroidNative()) {
    try {
      const jsonStr = window.ChronosNative!.getAppUsageJson(startTime, endTime);
      const list = JSON.parse(jsonStr) as Array<{
        packageName: string;
        appName: string;
        foregroundMs: number;
        lastTimeUsed: number;
      }>;

      return list.map((item) => {
        const defaultInfo = DEFAULT_PACKAGE_CATEGORIES[item.packageName];
        const rawName = item.appName || defaultInfo?.name || item.packageName;
        return {
          packageName: item.packageName,
          appName: rawName,
          originalAppName: rawName,
          foregroundMs: item.foregroundMs,
          lastTimeUsed: item.lastTimeUsed,
          category: defaultInfo?.category || '默认/其他',
        };
      });
    } catch (e) {
      console.error('从原生读取 UsageStats 失败:', e);
      return [];
    }
  }

  // 电脑端浏览器调试仿真数据
  return [
    {
      packageName: 'com.tencent.mm',
      appName: '微信',
      originalAppName: '微信',
      foregroundMs: 48 * 60 * 1000, // 48分钟
      lastTimeUsed: Date.now() - 15 * 60 * 1000,
      category: '沟通协作',
    },
    {
      packageName: 'tv.danmaku.bili',
      appName: '哔哩哔哩',
      originalAppName: '哔哩哔哩',
      foregroundMs: 65 * 60 * 1000, // 65分钟
      lastTimeUsed: Date.now() - 40 * 60 * 1000,
      category: '休闲娱乐',
    },
    {
      packageName: 'com.tencent.weread',
      appName: '微信读书',
      originalAppName: '微信读书',
      foregroundMs: 35 * 60 * 1000, // 35分钟
      lastTimeUsed: Date.now() - 120 * 60 * 1000,
      category: '学习/阅读',
    },
    {
      packageName: 'com.zhihu.android',
      appName: '知乎',
      originalAppName: '知乎',
      foregroundMs: 22 * 60 * 1000, // 22分钟
      lastTimeUsed: Date.now() - 180 * 60 * 1000,
      category: '学习/阅读',
    },
    {
      packageName: 'com.alibaba.android.rimet',
      appName: '钉钉',
      originalAppName: '钉钉',
      foregroundMs: 18 * 60 * 1000, // 18分钟
      lastTimeUsed: Date.now() - 90 * 60 * 1000,
      category: '开发/工作',
    },
    {
      packageName: 'com.github.mobile',
      appName: 'com.github.mobile',
      originalAppName: 'com.github.mobile',
      foregroundMs: 14 * 60 * 1000, // 14分钟
      lastTimeUsed: Date.now() - 240 * 60 * 1000,
      category: '默认/其他',
    },
    {
      packageName: 'com.coolapk.market',
      appName: '酷安',
      originalAppName: '酷安',
      foregroundMs: 9 * 60 * 1000, // 9分钟
      lastTimeUsed: Date.now() - 300 * 60 * 1000,
      category: '休闲娱乐',
    },
  ];
}
