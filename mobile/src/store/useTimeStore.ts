import { create } from 'zustand';
import { Activity, AppSettings, AppUsageItem, ToastNotification, DEFAULT_SETTINGS } from '../types';
import { storage } from '../services/storage';
import { checkUsagePermission, fetchAppUsageStats } from '../services/nativeBridge';

interface TimeStore {
  // 基础状态
  activities: Activity[];
  activeActivity: Activity | null;
  settings: AppSettings;
  currentTab: 'tracker' | 'timeline' | 'coach' | 'settings';
  toasts: ToastNotification[];

  // 手机端专属：应用时长检测状态
  hasUsagePermission: boolean;
  appUsageList: AppUsageItem[];
  isScanningUsage: boolean;

  // 基础操作
  setCurrentTab: (tab: 'tracker' | 'timeline' | 'coach' | 'settings') => void;
  startActivity: (title: string, category: string, rawInput: string) => Activity;
  stopActiveActivity: () => void;
  addActivity: (activity: Activity) => void;
  deleteActivity: (id: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  addToast: (type: 'SUCCESS' | 'INFO' | 'WARNING', title: string, message: string) => void;
  removeToast: (id: string) => void;

  // 手机端专属操作
  refreshUsagePermission: () => void;
  scanAppUsage: () => void;
  importAppUsageToTimeline: (item: AppUsageItem) => void;
  importAllAppUsages: () => void;
}

export const useTimeStore = create<TimeStore>((set, get) => {
  const initialActivities = storage.getActivities();
  const initialSettings = storage.getSettings() || DEFAULT_SETTINGS;
  const currentOngoing = initialActivities.find((a: Activity) => a.status === 'IN_PROGRESS') || null;

  return {
    activities: initialActivities,
    activeActivity: currentOngoing,
    settings: {
      ...initialSettings,
      enableAutoAppUsageSync: true,
      minUsageDurationSeconds: 60,
    },
    currentTab: 'tracker',
    toasts: [],

    hasUsagePermission: checkUsagePermission(),
    appUsageList: [],
    isScanningUsage: false,

    setCurrentTab: (tab) => set({ currentTab: tab }),

    startActivity: (title, category, rawInput) => {
      const { activeActivity, activities } = get();
      const now = Date.now();

      // 若已有进行中任务，先结算
      let updatedList = [...activities];
      if (activeActivity) {
        const durationMin = Math.max(1, Math.round((now - activeActivity.startTime) / 60000));
        updatedList = updatedList.map((a) =>
          a.id === activeActivity.id
            ? { ...a, endTime: now, durationMinutes: durationMin, status: 'COMPLETED' as const }
            : a
        );
      }

      const newAct: Activity = {
        id: 'act_' + now + '_' + Math.random().toString(36).slice(2, 6),
        rawInput,
        title,
        category,
        tags: [],
        startTime: now,
        endTime: null,
        durationMinutes: 0,
        status: 'IN_PROGRESS',
        mood: 'NORMAL',
      };

      updatedList.unshift(newAct);
      storage.saveActivities(updatedList);
      set({ activities: updatedList, activeActivity: newAct });
      return newAct;
    },

    stopActiveActivity: () => {
      const { activeActivity, activities } = get();
      if (!activeActivity) return;

      const now = Date.now();
      const durationMin = Math.max(1, Math.round((now - activeActivity.startTime) / 60000));
      const updatedList = activities.map((a) =>
        a.id === activeActivity.id
          ? { ...a, endTime: now, durationMinutes: durationMin, status: 'COMPLETED' as const }
          : a
      );

      storage.saveActivities(updatedList);
      set({ activities: updatedList, activeActivity: null });
    },

    addActivity: (activity) => {
      const updated = [activity, ...get().activities];
      storage.saveActivities(updated);
      set({ activities: updated });
    },

    deleteActivity: (id) => {
      const updated = get().activities.filter((a) => a.id !== id);
      const active = get().activeActivity?.id === id ? null : get().activeActivity;
      storage.saveActivities(updated);
      set({ activities: updated, activeActivity: active });
    },

    updateSettings: (newSettings) => {
      const updated = { ...get().settings, ...newSettings };
      storage.saveSettings(updated);
      set({ settings: updated });
    },

    addToast: (type, title, message) => {
      const id = 'toast_' + Date.now();
      set({ toasts: [...get().toasts, { id, type, title, message }] });
      setTimeout(() => {
        get().removeToast(id);
      }, 3500);
    },

    removeToast: (id) => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    },

    refreshUsagePermission: () => {
      const granted = checkUsagePermission();
      set({ hasUsagePermission: granted });
      if (granted) {
        get().scanAppUsage();
      }
    },

    scanAppUsage: () => {
      set({ isScanningUsage: true });
      try {
        const now = Date.now();
        const startOfDay = new Date().setHours(0, 0, 0, 0);
        const stats = fetchAppUsageStats(startOfDay, now);

        // 标记哪些已经导入过时间流
        const activities = get().activities;
        const mapped = stats.map((item) => {
          const alreadyImported = activities.some(
            (a) => a.isAutoDetected && a.sourceAppPackage === item.packageName
          );
          return {
            ...item,
            isImported: alreadyImported,
          };
        });

        set({ appUsageList: mapped, isScanningUsage: false });
      } catch (e) {
        console.error('扫描 App 使用失败:', e);
        set({ isScanningUsage: false });
      }
    },

    importAppUsageToTimeline: (item) => {
      const durationMin = Math.max(1, Math.round(item.foregroundMs / 60000));
      const now = Date.now();
      const endTime = item.lastTimeUsed > 0 ? item.lastTimeUsed : now;
      const startTime = endTime - durationMin * 60000;

      const newAct: Activity = {
        id: 'auto_' + item.packageName.replace(/\./g, '_') + '_' + Math.floor(now / 86400000),
        rawInput: `使用 ${item.appName} ${durationMin}分钟`,
        title: item.appName,
        category: item.category,
        tags: ['自动感知', item.appName],
        startTime,
        endTime,
        durationMinutes: durationMin,
        status: 'COMPLETED',
        mood: item.category === '休闲娱乐' ? 'DISTRACTED' : 'FOCUSED',
        isAutoDetected: true,
        sourceAppPackage: item.packageName,
      };

      // 如果已有相同包名的自动时间块，做更新替换
      const filtered = get().activities.filter(
        (a) => !(a.isAutoDetected && a.sourceAppPackage === item.packageName)
      );
      const updated = [newAct, ...filtered];

      storage.saveActivities(updated);
      set({
        activities: updated,
        appUsageList: get().appUsageList.map((u) =>
          u.packageName === item.packageName ? { ...u, isImported: true } : u
        ),
      });

      get().addToast('SUCCESS', '自动感知入库', `已将 ${item.appName} (${durationMin}分钟) 导入时间流`);
    },

    importAllAppUsages: () => {
      const unimported = get().appUsageList.filter((u) => !u.isImported && u.foregroundMs > 60000);
      if (unimported.length === 0) {
        get().addToast('INFO', '无待导入项', '今日应用使用数据均已在时间流中或时长低于1分钟');
        return;
      }
      unimported.forEach((item) => get().importAppUsageToTimeline(item));
      get().addToast('SUCCESS', '一键全部同步', `已将 ${unimported.length} 款应用的使用时间生成为时间流`);
    },
  };
});
