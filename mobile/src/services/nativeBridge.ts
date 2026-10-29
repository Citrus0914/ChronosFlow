import { AppUsageItem } from '../types';

/**
 * 常见安卓包名的默认智能分类词典
 */
export const DEFAULT_PACKAGE_CATEGORIES: Record<string, { name: string; category: string }> = {
  'com.tencent.mm': { name: '微信', category: '沟通协作' },
  'com.tencent.mobileqq': { name: 'QQ', category: '沟通协作' },
  'com.alibaba.android.rimet': { name: '钉钉', category: '开发/工作' },
  'com.ss.android.lark': { name: '飞书', category: '开发/工作' },
  'com.ss.android.ugc.aweme': { name: '抖音', category: '休闲娱乐' },
  'com.kuaishou.nebula': { name: '快手', category: '休闲娱乐' },
  'tv.danmaku.bili': { name: '哔哩哔哩', category: '休闲娱乐' },
  'com.xingin.xhs': { name: '小红书', category: '休闲娱乐' },
  'com.sina.weibo': { name: '微博', category: '休闲娱乐' },
  'com.tencent.tmgp.sgame': { name: '王者荣耀', category: '休闲娱乐' },
  'com.miHoYo.Yuanshen': { name: '原神', category: '休闲娱乐' },
  'com.zhihu.android': { name: '知乎', category: '学习/阅读' },
  'com.tencent.weread': { name: '微信读书', category: '学习/阅读' },
  'com.luojilab.player': { name: '得到', category: '学习/阅读' },
  'com.coolapk.market': { name: '酷安', category: '休闲娱乐' },
  'com.netease.cloudmusic': { name: '网易云音乐', category: '休闲娱乐' },
};

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
        return {
          packageName: item.packageName,
          appName: item.appName || defaultInfo?.name || item.packageName,
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
      foregroundMs: 48 * 60 * 1000, // 48分钟
      lastTimeUsed: Date.now() - 15 * 60 * 1000,
      category: '沟通协作',
    },
    {
      packageName: 'tv.danmaku.bili',
      appName: '哔哩哔哩',
      foregroundMs: 65 * 60 * 1000, // 65分钟
      lastTimeUsed: Date.now() - 40 * 60 * 1000,
      category: '休闲娱乐',
    },
    {
      packageName: 'com.tencent.weread',
      appName: '微信读书',
      foregroundMs: 35 * 60 * 1000, // 35分钟
      lastTimeUsed: Date.now() - 120 * 60 * 1000,
      category: '学习/阅读',
    },
    {
      packageName: 'com.zhihu.android',
      appName: '知乎',
      foregroundMs: 22 * 60 * 1000, // 22分钟
      lastTimeUsed: Date.now() - 180 * 60 * 1000,
      category: '学习/阅读',
    },
    {
      packageName: 'com.alibaba.android.rimet',
      appName: '钉钉',
      foregroundMs: 18 * 60 * 1000, // 18分钟
      lastTimeUsed: Date.now() - 90 * 60 * 1000,
      category: '开发/工作',
    },
  ];
}
