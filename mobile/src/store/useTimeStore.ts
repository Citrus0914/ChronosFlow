import { create } from 'zustand';
import {
  Activity,
  AppSettings,
  AppUsageItem,
  ToastNotification,
  CategoryBudget,
  ProjectGoal,
  ManualPrefill,
  DEFAULT_SETTINGS,
} from '../types';
import { storage } from '../services/storage';
import { checkUsagePermission, fetchAppUsageStats } from '../services/nativeBridge';
import { getWeekRange, getMonthRange, isTimestampInWeek, isTimestampInMonth } from '../lib/dateUtils';

interface TimeStore {
  // 基础状态
  activities: Activity[];
  activeActivity: Activity | null;
  settings: AppSettings;
  categoryBudgets: CategoryBudget[];
  projectGoals: ProjectGoal[];
  currentTab: 'tracker' | 'timeline' | 'analytics' | 'goals' | 'coach' | 'settings';
  toasts: ToastNotification[];

  // 手机端专属：应用时长检测状态
  hasUsagePermission: boolean;
  appUsageList: AppUsageItem[];
  isScanningUsage: boolean;

  // 基础操作
  setCurrentTab: (tab: 'tracker' | 'timeline' | 'analytics' | 'goals' | 'coach' | 'settings') => void;
  startActivity: (title: string, category: string, rawInput: string) => Activity;
  stopActiveActivity: () => void;
  addActivity: (activity: Activity) => void;
  deleteActivity: (id: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  addToast: (type: 'SUCCESS' | 'INFO' | 'WARNING', title: string, message: string) => void;
  removeToast: (id: string) => void;

  // 预算与专属目标操作
  updateCategoryBudget: (category: string, updates: Partial<CategoryBudget>, silent?: boolean) => void;
  addProjectGoal: (goal: Omit<ProjectGoal, 'id' | 'createdAt' | 'isArchived'>) => ProjectGoal;
  updateProjectGoal: (id: string, updates: Partial<ProjectGoal>) => void;
  deleteProjectGoal: (id: string) => void;
  toggleArchiveProject: (id: string) => void;
  getProjectDurationMinutes: (projectId: string, period?: 'WEEK' | 'WEEKLY' | 'TOTAL', refDate?: Date) => number;
  getCategorySpentMinutes: (category: string, period?: 'WEEK' | 'MONTH', refDate?: Date) => number;
  startRealtimeActivity: (title: string, category: string, tags?: string[], projectId?: string) => Activity;

  // 手动补录与编辑弹窗
  isManualModalOpen: boolean;
  manualPrefill: ManualPrefill | null;
  setManualModalOpen: (open: boolean, prefill?: ManualPrefill | null) => void;
  addManualActivity: (data: Omit<Activity, 'id'>) => Activity;
  updateActivity: (id: string, updates: Partial<Activity>) => void;

  // 智能断层感知
  getDetectedGap: () => { hasGap: boolean; gapMinutes: number; lastEndTime: number } | null;

  // 手机端专属操作
  refreshUsagePermission: () => void;
  scanAppUsage: () => void;
  importAppUsageToTimeline: (item: AppUsageItem) => void;
  importAllAppUsages: () => void;
}

export const useTimeStore = create<TimeStore>((set, get) => {
  const initialActivities = storage.getActivities();
  const initialSettings = storage.getSettings() || DEFAULT_SETTINGS;
  const initialBudgets = storage.getCategoryBudgets();
  const initialProjects = storage.getProjectGoals();
  const currentOngoing = initialActivities.find((a: Activity) => a.status === 'IN_PROGRESS') || null;

  return {
    activities: initialActivities,
    activeActivity: currentOngoing,
    settings: {
      ...initialSettings,
      enableAutoAppUsageSync: true,
      minUsageDurationSeconds: 60,
    },
    categoryBudgets: initialBudgets,
    projectGoals: initialProjects,
    currentTab: 'tracker',
    toasts: [],
    isManualModalOpen: false,
    manualPrefill: null,

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

    updateCategoryBudget: (category, updates, silent = false) => {
      const current = get().categoryBudgets;
      let updated = current.map((b) => (b.category === category ? { ...b, ...updates } : b));
      if (!current.some((b) => b.category === category)) {
        updated.push({
          category,
          weeklyTargetHours: updates.weeklyTargetHours || 0,
          budgetType: updates.budgetType || 'AT_LEAST',
          isEnabled: updates.isEnabled !== undefined ? updates.isEnabled : true,
        });
      }
      storage.saveCategoryBudgets(updated);
      set({ categoryBudgets: updated });
      if (!silent) {
        get().addToast('SUCCESS', '🎯 预算已更新', `「${category}」周目标已调整`);
      }
    },

    addProjectGoal: (goalData) => {
      const newProject: ProjectGoal = {
        ...goalData,
        id: `proj-${Date.now()}`,
        createdAt: Date.now(),
        isArchived: false,
      };
      const updated = [newProject, ...get().projectGoals];
      storage.saveProjectGoals(updated);
      set({ projectGoals: updated });
      get().addToast('SUCCESS', '🚀 专属目标已创建', `目标项目「${newProject.name}」已添加`);
      return newProject;
    },

    updateProjectGoal: (id, updates) => {
      const updated = get().projectGoals.map((p) => (p.id === id ? { ...p, ...updates } : p));
      storage.saveProjectGoals(updated);
      set({ projectGoals: updated });
      get().addToast('SUCCESS', '✏️ 目标已更新', '项目配置已成功保存');
    },

    deleteProjectGoal: (id) => {
      const target = get().projectGoals.find((p) => p.id === id);
      const updated = get().projectGoals.filter((p) => p.id !== id);
      storage.saveProjectGoals(updated);
      // 解除已有时间块的绑定
      const updatedActs = get().activities.map((a) => (a.projectId === id ? { ...a, projectId: undefined } : a));
      storage.saveActivities(updatedActs);
      set({ projectGoals: updated, activities: updatedActs });
      get().addToast('INFO', '🗑️ 目标已删除', target ? `已移除项目「${target.name}」` : '目标已删除');
    },

    toggleArchiveProject: (id) => {
      const updated = get().projectGoals.map((p) => (p.id === id ? { ...p, isArchived: !p.isArchived } : p));
      storage.saveProjectGoals(updated);
      set({ projectGoals: updated });
      const target = updated.find((p) => p.id === id);
      get().addToast(
        'INFO',
        target?.isArchived ? '📦 目标已归档' : '📂 目标已解除归档',
        `「${target?.name}」现为 ${target?.isArchived ? '已归档' : '进行中'}`
      );
    },

    getProjectDurationMinutes: (projectId, period = 'TOTAL', refDate = new Date()) => {
      const now = Date.now();
      const activities = get().activities;
      const matches = activities.filter((a) => a.projectId === projectId);
      
      const calcDuration = (a: Activity) => {
        if (a.status === 'IN_PROGRESS') {
          return Math.max(1, Math.round((now - a.startTime) / 60000));
        }
        return a.durationMinutes;
      };

      if (period === 'WEEK' || period === 'WEEKLY') {
        const range = getWeekRange(refDate);
        return matches
          .filter((a) => isTimestampInWeek(a.startTime, range))
          .reduce((sum, a) => sum + calcDuration(a), 0);
      }
      return matches.reduce((sum, a) => sum + calcDuration(a), 0);
    },

    getCategorySpentMinutes: (category, period = 'WEEK', refDate = new Date()) => {
      const now = Date.now();
      const activities = get().activities;
      const matches = activities.filter((a) => a.category === category);

      const calcDuration = (a: Activity) => {
        if (a.status === 'IN_PROGRESS') {
          return Math.max(1, Math.round((now - a.startTime) / 60000));
        }
        return a.durationMinutes;
      };

      if (period === 'MONTH') {
        const range = getMonthRange(refDate);
        return matches
          .filter((a) => isTimestampInMonth(a.startTime, range))
          .reduce((sum, a) => sum + calcDuration(a), 0);
      }
      const range = getWeekRange(refDate);
      return matches
        .filter((a) => isTimestampInWeek(a.startTime, range))
        .reduce((sum, a) => sum + calcDuration(a), 0);
    },

    startRealtimeActivity: (title, category, tags = [], projectId) => {
      const { activeActivity, activities } = get();
      const now = Date.now();
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
        rawInput: `开始 ${title}`,
        title,
        category,
        tags,
        startTime: now,
        endTime: null,
        durationMinutes: 0,
        status: 'IN_PROGRESS',
        mood: 'FOCUSED',
        projectId,
      };

      updatedList.unshift(newAct);
      storage.saveActivities(updatedList);
      set({ activities: updatedList, activeActivity: newAct, currentTab: 'timeline' });
      get().addToast('SUCCESS', '🎯 实时专注已启动', `已开启「${title}」(${category})，计时中...`);
      return newAct;
    },

    setManualModalOpen: (open, prefill = null) => {
      set({ isManualModalOpen: open, manualPrefill: prefill });
    },

    addManualActivity: (data) => {
      const now = Date.now();
      const newActivity: Activity = {
        ...data,
        id: `act_${now}_${Math.random().toString(36).slice(2, 6)}`,
      };
      const updated = [newActivity, ...get().activities];
      storage.saveActivities(updated);
      set({ activities: updated, isManualModalOpen: false, manualPrefill: null });
      get().addToast('SUCCESS', '✨ 时间块已精确归档', `「${data.title}」· ${data.category} · ${data.durationMinutes}分钟`);
      return newActivity;
    },

    updateActivity: (id, updates) => {
      const current = get().activities;
      const updated = current.map((a) => (a.id === id ? { ...a, ...updates } : a));
      storage.saveActivities(updated);
      set({ activities: updated, isManualModalOpen: false, manualPrefill: null });
      get().addToast('SUCCESS', '✏️ 时间块已更新', '活动记录已成功保存');
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

    getDetectedGap: () => {
      const { activities, activeActivity, settings } = get();
      if (!settings.enableSmartGapAlert || activeActivity) return null;

      const completed = activities
        .filter((a) => a.status === 'COMPLETED' && a.endTime !== null && !a.isFuzzyTime)
        .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));

      if (completed.length === 0) return null;

      const lastEndTime = completed[0].endTime!;
      const diffMinutes = Math.round((Date.now() - lastEndTime) / 60000);

      // 如果距离上个任务结束超过 45 分钟未打卡，且在 24 小时以内，提示时间空白
      if (diffMinutes >= 45 && diffMinutes < 1440) {
        return {
          hasGap: true,
          gapMinutes: diffMinutes,
          lastEndTime,
        };
      }
      return null;
    },
  };
});
