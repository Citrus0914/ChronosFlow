import { create } from 'zustand';
import {
  Activity,
  AppSettings,
  AppUsageItem,
  TrackedAppConfig,
  ToastNotification,
  CategoryBudget,
  ProjectGoal,
  ManualPrefill,
  AICoachDebrief,
  DEFAULT_SETTINGS,
  getActivityCategories,
} from '../types';
import { storage } from '../services/storage';
import {
  checkUsagePermission,
  fetchAppUsageStats,
  resolveNativeAppLabel,
  DEFAULT_PACKAGE_CATEGORIES,
} from '../services/nativeBridge';
import {
  getWeekRange,
  getMonthRange,
  isTimestampInWeek,
  isTimestampInMonth,
  formatDate,
  isSameDay,
} from '../lib/dateUtils';
import { generateAICoachDebrief } from '../services/aiDebrief';
import { generateFiveWeeksDemoActivities } from '../services/demoDataGenerator';

interface TimeStore {
  // 基础状态
  activities: Activity[];
  activeActivity: Activity | null;
  settings: AppSettings;
  categoryBudgets: CategoryBudget[];
  projectGoals: ProjectGoal[];
  currentTab: 'tracker' | 'timeline' | 'analytics' | 'goals' | 'coach' | 'settings';
  toasts: ToastNotification[];

  // 手机端专属：应用时长检测状态与自定义配置
  hasUsagePermission: boolean;
  appUsageList: AppUsageItem[];
  isScanningUsage: boolean;
  trackerDayOffset: number; // 0 = 今天, -1 = 昨天, 最多回溯最近 7 天 (-6..0)
  lastScanDateKey: string;  // YYYY-MM-DD，用于跨零点唤醒检测
  trackedAppConfigs: Record<string, TrackedAppConfig>;
  selectedAppForDetail: AppUsageItem | null;

  // 手机端应用追踪专属操作
  setSelectedAppForDetail: (app: AppUsageItem | null) => void;
  setTrackerDayOffset: (offset: number) => void;
  updateAppConfig: (
    packageName: string,
    updates: Partial<TrackedAppConfig>,
    options?: { silentToast?: boolean }
  ) => void;
  toggleAppTracked: (packageName: string, isTracked?: boolean) => void;
  batchSetTrackedApps: (packageNames: string[]) => void;

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

  // AI 认知教练多周期复盘
  isDebriefLoading: boolean;
  getDebriefForPeriod: (period: 'DAY' | 'WEEK' | 'MONTH', refDate: Date) => AICoachDebrief | null;
  generateDebrief: (period?: 'DAY' | 'WEEK' | 'MONTH', refDate?: Date) => Promise<AICoachDebrief>;

  // 数据管理与演示备份
  clearAllActivities: () => void;
  loadFiveWeeksDemoData: () => void;
  exportDataBackup: () => void;
  importDataBackup: (jsonStr: string) => boolean;

  // 手机端专属操作
  refreshUsagePermission: () => void;
  scanAppUsage: (manual?: boolean) => void;
  importAppUsageToTimeline: (item: AppUsageItem, options?: { silentToast?: boolean }) => void;
  importAllAppUsages: () => void;
}

function getTargetDateFromOffset(dayOffset: number): Date {
  const d = new Date();
  if (dayOffset !== 0) {
    d.setDate(d.getDate() + dayOffset);
  }
  return d;
}

function computeAppSyncFields(
  foregroundMs: number,
  packageName: string,
  activities: Activity[],
  targetDate: Date
): { isImported: boolean; importedMinutes: number; unsyncedMinutes: number } {
  const totalMinutes = Math.round(foregroundMs / 60000);
  const sameDayAutoActs = activities.filter(
    (a) =>
      a.isAutoDetected &&
      a.sourceAppPackage === packageName &&
      isSameDay(a.startTime, targetDate)
  );
  const isImported = sameDayAutoActs.length > 0;
  const importedMinutes = sameDayAutoActs.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
  const unsyncedMinutes = totalMinutes >= 1 ? Math.max(0, totalMinutes - importedMinutes) : 0;
  return { isImported, importedMinutes, unsyncedMinutes };
}

function reconcileAppUsageSyncState(
  list: AppUsageItem[],
  activities: Activity[],
  dayOffset: number
): AppUsageItem[] {
  const targetDate = getTargetDateFromOffset(dayOffset);
  return list.map((item) => ({
    ...item,
    ...computeAppSyncFields(item.foregroundMs, item.packageName, activities, targetDate),
  }));
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
    isDebriefLoading: false,

    hasUsagePermission: checkUsagePermission(),
    appUsageList: [],
    isScanningUsage: false,
    trackerDayOffset: 0,
    lastScanDateKey: formatDate(new Date()),
    trackedAppConfigs: storage.getTrackedAppConfigs(),
    selectedAppForDetail: null,

    setSelectedAppForDetail: (app) => set({ selectedAppForDetail: app }),

    setTrackerDayOffset: (offset) => {
      const clamped = Math.max(-6, Math.min(0, Math.trunc(offset)));
      set({ trackerDayOffset: clamped });
      get().scanAppUsage(false);
    },

    updateAppConfig: (packageName, updates, options) => {
      const currentConfigs = { ...get().trackedAppConfigs };
      const existing = currentConfigs[packageName] || {
        packageName,
        isTracked: false,
      };

      const matchedItem =
        get().appUsageList.find((i) => i.packageName === packageName) ||
        (get().selectedAppForDetail?.packageName === packageName ? get().selectedAppForDetail : null);

      const rawOriginalName =
        matchedItem?.originalAppName && matchedItem.originalAppName !== packageName
          ? matchedItem.originalAppName
          : existing.cachedAppName;

      const hasProjectIdUpdate = Object.prototype.hasOwnProperty.call(updates, 'projectId');
      const hasProjectIdsUpdate = Object.prototype.hasOwnProperty.call(updates, 'projectIds');
      const hasCategoriesUpdate = Object.prototype.hasOwnProperty.call(updates, 'categories');
      const hasNotesUpdate = Object.prototype.hasOwnProperty.call(updates, 'notes');
      const hasCustomNameUpdate = Object.prototype.hasOwnProperty.call(updates, 'customName');

      const updatedConfig: TrackedAppConfig = {
        ...existing,
        ...updates,
        cachedAppName: updates.cachedAppName || rawOriginalName,
        customName: hasCustomNameUpdate ? updates.customName?.trim() : existing.customName,
        notes: hasNotesUpdate ? updates.notes?.trim() : existing.notes,
        updatedAt: Date.now(),
      };
      currentConfigs[packageName] = updatedConfig;
      storage.saveTrackedAppConfigs(currentConfigs);

      const effectiveDisplayName =
        updatedConfig.customName?.trim() ||
        rawOriginalName ||
        resolveNativeAppLabel(packageName) ||
        packageName;

      // 同步更新 appUsageList 中的项
      const currentList = get().appUsageList.map((item) => {
        if (item.packageName === packageName) {
          const itemOriginal = item.originalAppName || rawOriginalName || item.packageName;
          const newName = updatedConfig.customName?.trim() || itemOriginal;
          const newCategories = hasCategoriesUpdate
            ? updatedConfig.categories && updatedConfig.categories.length > 0
              ? updatedConfig.categories
              : [updatedConfig.category || item.category || '默认/其他']
            : updatedConfig.categories !== undefined
            ? updatedConfig.categories
            : item.categories;
          const newCategory = updatedConfig.category || newCategories?.[0] || item.category || '默认/其他';
          const newProjectId = hasProjectIdUpdate ? updates.projectId : item.projectId;
          const newProjectIds = hasProjectIdsUpdate ? updates.projectIds : item.projectIds;
          const newNotes = hasNotesUpdate ? (updates.notes?.trim() ?? '') : (updatedConfig.notes ?? item.notes);
          const newTracked = Boolean(updatedConfig.isTracked);

          return {
            ...item,
            appName: newName,
            originalAppName: itemOriginal,
            category: newCategory,
            categories: newCategories,
            projectId: newProjectId,
            projectIds: newProjectIds,
            notes: newNotes,
            isTracked: newTracked,
          };
        }
        return item;
      });

      // 若该应用此前尚未在列表里（如首次从详情加入追踪的 0 分钟应用），补齐进列表确保即时展示
      if (!currentList.some((i) => i.packageName === packageName) && (updatedConfig.isTracked || matchedItem)) {
        const targetDate = getTargetDateFromOffset(get().trackerDayOffset);
        const defaultInfo = DEFAULT_PACKAGE_CATEGORIES[packageName];
        const fallbackCategory =
          updatedConfig.categories?.[0] ||
          updatedConfig.category ||
          matchedItem?.category ||
          defaultInfo?.category ||
          '默认/其他';
        const fallbackCategories =
          updatedConfig.categories && updatedConfig.categories.length > 0
            ? updatedConfig.categories
            : [fallbackCategory];
        const fgMs = matchedItem?.foregroundMs ?? 0;

        currentList.push({
          packageName,
          appName: effectiveDisplayName,
          originalAppName: rawOriginalName || effectiveDisplayName,
          foregroundMs: fgMs,
          lastTimeUsed: matchedItem?.lastTimeUsed ?? 0,
          category: fallbackCategory,
          categories: fallbackCategories,
          projectId: updatedConfig.projectId,
          projectIds: updatedConfig.projectIds,
          notes: updatedConfig.notes || '',
          isTracked: Boolean(updatedConfig.isTracked),
          ...computeAppSyncFields(fgMs, packageName, get().activities, targetDate),
        });
      }

      // 同步更新已存在的时间流活动中的自动时间块（含清空别名恢复原名、取消专属目标绑定、清空备注）
      const updatedActivities = get().activities.map((a) => {
        if (a.isAutoDetected && a.sourceAppPackage === packageName) {
          const oldTitle = a.title;
          const nextTitle = effectiveDisplayName || a.title;
          const allCats = hasCategoriesUpdate
            ? updatedConfig.categories && updatedConfig.categories.length > 0
              ? updatedConfig.categories
              : [updatedConfig.category || a.category]
            : updatedConfig.categories !== undefined
            ? updatedConfig.categories
            : a.categories;
          const primaryCat = updatedConfig.category || allCats?.[0] || a.category;
          const nextProjectId = hasProjectIdUpdate ? (updates.projectId || undefined) : a.projectId;
          const nextProjectIds = hasProjectIdsUpdate ? (updates.projectIds || undefined) : a.projectIds;
          const nextNotes = hasNotesUpdate ? (updates.notes?.trim() || undefined) : a.notes;
          const safeTags = Array.isArray(a.tags) ? a.tags : ['自动感知', nextTitle];

          return {
            ...a,
            title: nextTitle,
            rawInput: a.durationMinutes ? `使用 ${nextTitle} ${a.durationMinutes}分钟` : a.rawInput,
            category: primaryCat,
            categories: allCats,
            projectId: nextProjectId,
            projectIds: nextProjectIds,
            notes: nextNotes,
            tags: safeTags.map((t) => (t === oldTitle ? nextTitle : t)),
          };
        }
        return a;
      });
      storage.saveActivities(updatedActivities);

      // 同步当前选中详情
      let updatedSelected = get().selectedAppForDetail;
      if (updatedSelected && updatedSelected.packageName === packageName) {
        const match = currentList.find((i) => i.packageName === packageName);
        updatedSelected = match || null;
      }

      set({
        trackedAppConfigs: currentConfigs,
        appUsageList: currentList,
        activities: updatedActivities,
        selectedAppForDetail: updatedSelected,
      });

      if (!options?.silentToast) {
        get().addToast('SUCCESS', '配置已保存', `「${effectiveDisplayName}」的修改已生效`);
      }
    },

    toggleAppTracked: (packageName, isTracked) => {
      const config = get().trackedAppConfigs[packageName];
      const targetState = isTracked !== undefined ? isTracked : !(config?.isTracked ?? false);
      get().updateAppConfig(packageName, { isTracked: targetState }, { silentToast: true });
      get().addToast(
        'INFO',
        targetState ? '已加入追踪' : '已移出追踪',
        targetState ? '该应用将纳入核心追踪列表与总时长统计' : '该应用已从主追踪列表中隐藏'
      );
    },

    batchSetTrackedApps: (packageNames) => {
      const currentConfigs = { ...get().trackedAppConfigs };
      const nameSet = new Set(packageNames);
      const allKnownPackages = new Set<string>([
        ...Object.keys(currentConfigs),
        ...packageNames,
        ...get().appUsageList.map((i) => i.packageName),
      ]);

      allKnownPackages.forEach((pkg) => {
        const shouldTrack = nameSet.has(pkg);
        const listHit = get().appUsageList.find((i) => i.packageName === pkg);
        const rawLabel = listHit?.originalAppName && listHit.originalAppName !== pkg
          ? listHit.originalAppName
          : currentConfigs[pkg]?.cachedAppName;
        currentConfigs[pkg] = {
          ...(currentConfigs[pkg] || { packageName: pkg }),
          cachedAppName: rawLabel || currentConfigs[pkg]?.cachedAppName,
          isTracked: shouldTrack,
          updatedAt: Date.now(),
        };
      });

      storage.saveTrackedAppConfigs(currentConfigs);

      // 重新扫描合并，确保新勾选或未满1分钟的追踪项均一致呈现
      set({ trackedAppConfigs: currentConfigs });
      get().scanAppUsage(false);

      get().addToast('SUCCESS', '追踪名单已更新', `当前已锁定追踪 ${packageNames.length} 款核心应用`);
    },

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
        categories: [category],
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
      set({
        activities: updated,
        appUsageList: reconcileAppUsageSyncState(get().appUsageList, updated, get().trackerDayOffset),
      });
    },

    deleteActivity: (id) => {
      const updated = get().activities.filter((a) => a.id !== id);
      const active = get().activeActivity?.id === id ? null : get().activeActivity;
      storage.saveActivities(updated);
      set({
        activities: updated,
        activeActivity: active,
        appUsageList: reconcileAppUsageSyncState(get().appUsageList, updated, get().trackerDayOffset),
      });
    },

    updateSettings: (newSettings) => {
      const updated = { ...get().settings, ...newSettings };
      storage.saveSettings(updated);
      set({ settings: updated });
    },

    addToast: (type, title, message) => {
      const id = 'toast_' + Date.now();
      // 保持至多 1 条最新轻量提示，杜绝堆叠遮挡内容
      set({ toasts: [{ id, type, title, message }] });
      setTimeout(() => {
        get().removeToast(id);
      }, 2500);
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
      const project = get().projectGoals.find((p) => p.id === projectId);
      const matches = activities.filter(
        (a) => a.projectId === projectId || (project && a.category === project.name)
      );
      
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
      // 🌟 支持同一项记录同时隶属于多个分类时的精准匹配
      const matches = activities.filter((a) => getActivityCategories(a).includes(category));

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
        categories: [category],
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
      const primaryCategory = data.categories?.[0] || data.category || '默认/其他';
      const categories = data.categories && data.categories.length > 0 ? data.categories : [primaryCategory];
      const newActivity: Activity = {
        ...data,
        category: primaryCategory,
        categories,
        id: `act_${now}_${Math.random().toString(36).slice(2, 6)}`,
      };
      const updated = [newActivity, ...get().activities];
      storage.saveActivities(updated);
      set({ activities: updated, isManualModalOpen: false, manualPrefill: null });
      get().addToast('SUCCESS', '✨ 时间块已精确归档', `「${data.title}」· ${categories.join('/')} · ${data.durationMinutes}分钟`);
      return newActivity;
    },

    updateActivity: (id, updates) => {
      const current = get().activities;
      const updated = current.map((a) => {
        if (a.id === id) {
          const primaryCategory = updates.categories?.[0] || updates.category || a.category;
          const categories = updates.categories !== undefined ? updates.categories : (a.categories || [primaryCategory]);
          return {
            ...a,
            ...updates,
            category: primaryCategory,
            categories,
          };
        }
        return a;
      });
      storage.saveActivities(updated);
      set({
        activities: updated,
        isManualModalOpen: false,
        manualPrefill: null,
        appUsageList: reconcileAppUsageSyncState(get().appUsageList, updated, get().trackerDayOffset),
      });
      get().addToast('SUCCESS', '✏️ 时间块已更新', '活动记录已成功保存');
    },

    refreshUsagePermission: () => {
      const granted = checkUsagePermission();
      set({ hasUsagePermission: granted });
      if (granted) {
        get().scanAppUsage();
      }
    },

    scanAppUsage: (manual = false) => {
      set({ isScanningUsage: true });
      try {
        const now = Date.now();
        const todayKey = formatDate(new Date(now));
        const prevScanKey = get().lastScanDateKey;
        let activeOffset = get().trackerDayOffset;

        // 跨零点自动翻篇：若自然日已变更，自动回到新的“今天”
        if (prevScanKey && prevScanKey !== todayKey && activeOffset !== 0) {
          activeOffset = 0;
        }

        const targetDate = getTargetDateFromOffset(activeOffset);
        const startOfDay = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          0,
          0,
          0,
          0
        ).getTime();
        const endOfRange =
          activeOffset === 0
            ? now
            : new Date(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                targetDate.getDate(),
                23,
                59,
                59,
                999
              ).getTime();

        const stats = fetchAppUsageStats(startOfDay, endOfRange);
        const activities = get().activities;

        let configs = { ...get().trackedAppConfigs };
        let configsDirty = false;
        const hasExistingConfig = Object.keys(configs).length > 0;

        // 若用户首次使用尚未选定任何应用，默认将前台时长排名前 4 的常用核心应用设为追踪
        if (!hasExistingConfig && stats.length > 0) {
          const sorted = [...stats].sort((a, b) => b.foregroundMs - a.foregroundMs);
          const topList = sorted.slice(0, 4);
          const initialConfigs: Record<string, TrackedAppConfig> = {};
          topList.forEach((app) => {
            initialConfigs[app.packageName] = {
              packageName: app.packageName,
              cachedAppName: app.originalAppName || app.appName,
              isTracked: true,
              category: app.category,
              updatedAt: now,
            };
          });
          configs = initialConfigs;
          configsDirty = true;
        }

        const seenPackages = new Set<string>();

        // 结合配置与目标日期的已同步时长状态映射
        const mapped: AppUsageItem[] = stats.map((item) => {
          seenPackages.add(item.packageName);
          const cfg = configs[item.packageName];
          const rawOriginalName = item.originalAppName || item.appName || item.packageName;

          if (cfg && rawOriginalName !== item.packageName && cfg.cachedAppName !== rawOriginalName) {
            configs[item.packageName] = {
              ...cfg,
              cachedAppName: rawOriginalName,
            };
            configsDirty = true;
          }

          const customName = cfg?.customName?.trim();
          const finalAppName = customName || rawOriginalName;
          const finalCategory = cfg?.categories?.[0] || cfg?.category || item.category || '默认/其他';
          const finalCategories = cfg?.categories && cfg.categories.length > 0
            ? cfg.categories
            : [finalCategory];
          const notes = cfg?.notes || '';
          const projectId = cfg?.projectId;
          const projectIds = cfg?.projectIds || (projectId ? [projectId] : undefined);
          const isTracked = cfg !== undefined ? !!cfg.isTracked : false;

          const syncState = computeAppSyncFields(
            item.foregroundMs,
            item.packageName,
            activities,
            targetDate
          );

          return {
            ...item,
            appName: finalAppName,
            originalAppName: rawOriginalName,
            category: finalCategory,
            categories: finalCategories,
            projectId,
            projectIds,
            notes,
            isTracked,
            ...syncState,
          };
        });

        // 补齐已选定追踪、但在目标日期暂未产生前台时长的应用（0 分钟占位，防止跨天后追踪名单隐身）
        Object.values(configs).forEach((cfg) => {
          if (!cfg?.isTracked || seenPackages.has(cfg.packageName)) return;
          const pkg = cfg.packageName;
          const defaultInfo = DEFAULT_PACKAGE_CATEGORIES[pkg];
          const resolvedRaw = cfg.cachedAppName || resolveNativeAppLabel(pkg);
          if (resolvedRaw !== pkg && cfg.cachedAppName !== resolvedRaw) {
            configs[pkg] = { ...cfg, cachedAppName: resolvedRaw };
            configsDirty = true;
          }
          const finalAppName = cfg.customName?.trim() || resolvedRaw;
          const finalCategory = cfg.categories?.[0] || cfg.category || defaultInfo?.category || '默认/其他';
          const finalCategories = cfg.categories && cfg.categories.length > 0
            ? cfg.categories
            : [finalCategory];
          const projectId = cfg.projectId;
          const projectIds = cfg.projectIds || (projectId ? [projectId] : undefined);
          const syncState = computeAppSyncFields(0, pkg, activities, targetDate);

          mapped.push({
            packageName: pkg,
            appName: finalAppName,
            originalAppName: resolvedRaw,
            foregroundMs: 0,
            lastTimeUsed: 0,
            category: finalCategory,
            categories: finalCategories,
            projectId,
            projectIds,
            notes: cfg.notes || '',
            isTracked: true,
            ...syncState,
          });
        });

        if (configsDirty) {
          storage.saveTrackedAppConfigs(configs);
        }

        const currentSelected = get().selectedAppForDetail;
        const updatedSelected = currentSelected
          ? mapped.find((m) => m.packageName === currentSelected.packageName) || currentSelected
          : null;

        set({
          trackedAppConfigs: configs,
          appUsageList: mapped,
          selectedAppForDetail: updatedSelected,
          trackerDayOffset: activeOffset,
          lastScanDateKey: todayKey,
          isScanningUsage: false,
        });

        if (manual) {
          if (!get().hasUsagePermission) {
            get().addToast('WARNING', '待授权访问', '请先授予应用使用情况访问权限');
          } else {
            const pendingCount = mapped.filter(
              (i) => i.isTracked && Math.round(i.foregroundMs / 60000) >= 1 && (!i.isImported || (i.unsyncedMinutes ?? 0) > 0)
            ).length;
            if (pendingCount > 0) {
              get().addToast('SUCCESS', '应用时长已刷新', `检测到 ${pendingCount} 款追踪应用有新时长可同步`);
            } else {
              get().addToast('SUCCESS', '应用感知已更新', '当前应用前台时长已是最新');
            }
          }
        }
      } catch (e) {
        console.error('扫描 App 使用失败:', e);
        set({ isScanningUsage: false });
        if (manual) {
          get().addToast('WARNING', '刷新失败', '读取应用使用时长异常');
        }
      }
    },

    importAppUsageToTimeline: (item, options) => {
      const activeOffset = get().trackerDayOffset;
      const targetDate = getTargetDateFromOffset(activeOffset);
      const dateKey = formatDate(targetDate);

      // 优先以最新扫描到的前台时长为准，确保同步时刻拿到最新时长
      const latestInList = get().appUsageList.find((u) => u.packageName === item.packageName);
      const effectiveMs = latestInList ? latestInList.foregroundMs : item.foregroundMs;
      const durationMin = Math.round(effectiveMs / 60000);

      if (durationMin < 1) {
        if (!options?.silentToast) {
          get().addToast('INFO', '未满 1 分钟', `「${item.appName}」使用时长不足 1 分钟，暂无需入流`);
        }
        return;
      }

      const now = Date.now();
      const anchorStartTime =
        activeOffset === 0
          ? now
          : new Date(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate(),
              12,
              0,
              0,
              0
            ).getTime();

      const appCategories = item.categories && item.categories.length > 0
        ? item.categories
        : [item.category || '默认/其他'];
      const appProjectIds = item.projectIds || (item.projectId ? [item.projectId] : undefined);

      // 查找【目标日期当天】是否已有该包名的自动感知时间块（绝不误匹配或误删历史日期的记录！）
      const existingSameDay = get().activities.filter(
        (a) =>
          a.isAutoDetected &&
          a.sourceAppPackage === item.packageName &&
          isSameDay(a.startTime, targetDate)
      );
      const prevMinutes = existingSameDay.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
      const primaryExisting = existingSameDay[0];

      // 默认按照未知时段（isFuzzyTime: true），按本地自然日生成唯一 ID，完整统计当天累计时长
      const newAct: Activity = {
        id: 'auto_' + item.packageName.replace(/\./g, '_') + '_' + dateKey,
        rawInput: `使用 ${item.appName} ${durationMin}分钟`,
        title: item.appName,
        category: appCategories[0],
        categories: appCategories,
        tags: ['自动感知', item.appName],
        startTime: anchorStartTime,
        endTime: null,
        durationMinutes: durationMin,
        status: 'COMPLETED',
        mood:
          primaryExisting?.mood ||
          (appCategories.some((c) => c.includes('娱乐') || c.includes('休闲') || c.includes('生活'))
            ? 'DISTRACTED'
            : 'FOCUSED'),
        notes: item.notes || primaryExisting?.notes || undefined,
        isFuzzyTime: true,
        projectId: item.projectId || undefined,
        projectIds: appProjectIds,
        isAutoDetected: true,
        sourceAppPackage: item.packageName,
      };

      // 仅替换【目标日期当天】相同包名的自动时间块，100% 保留前一天及更早历史记录
      const filtered = get().activities.filter(
        (a) =>
          !(
            a.isAutoDetected &&
            a.sourceAppPackage === item.packageName &&
            isSameDay(a.startTime, targetDate)
          )
      );
      const updated = [newAct, ...filtered];

      const reconciledList = reconcileAppUsageSyncState(get().appUsageList, updated, activeOffset);
      const currentSelected = get().selectedAppForDetail;
      const updatedSelected =
        currentSelected && currentSelected.packageName === item.packageName
          ? reconciledList.find((u) => u.packageName === item.packageName) || currentSelected
          : currentSelected;

      storage.saveActivities(updated);
      set({
        activities: updated,
        appUsageList: reconciledList,
        selectedAppForDetail: updatedSelected,
      });

      if (!options?.silentToast) {
        const addedMin = durationMin - prevMinutes;
        if (existingSameDay.length > 0 && addedMin > 0) {
          get().addToast(
            'SUCCESS',
            '时长已增量同步',
            `「${item.appName}」已更新：${prevMinutes}m → ${durationMin}m (+${addedMin}分钟)`
          );
        } else if (existingSameDay.length > 0) {
          get().addToast('SUCCESS', '时间块已刷新', `「${item.appName}」(${durationMin}分钟) 已同步最新配置`);
        } else {
          get().addToast(
            'SUCCESS',
            '自动感知入库',
            `已将「${item.appName}」(${durationMin}分钟 · 未知时段) 导入时间流`
          );
        }
      }
    },

    importAllAppUsages: () => {
      // 同步前先执行一次静默实时扫描，确保直接点击按钮也能拿到最新增量时长
      get().scanAppUsage(false);

      const pendingItems = get().appUsageList.filter((u) => {
        const mins = Math.round(u.foregroundMs / 60000);
        return u.isTracked && mins >= 1 && (!u.isImported || (u.unsyncedMinutes ?? 0) > 0);
      });

      if (pendingItems.length === 0) {
        const hasAnyActive = get().appUsageList.some(
          (u) => u.isTracked && Math.round(u.foregroundMs / 60000) >= 1
        );
        get().addToast(
          'INFO',
          hasAnyActive ? '已是最新时长' : '暂无可同步项',
          hasAnyActive
            ? '选定追踪应用的最新时长均已同步至时间流'
            : '当前选定追踪应用的使用时长均未满 1 分钟'
        );
        return;
      }

      const newCount = pendingItems.filter((i) => !i.isImported).length;
      const updateCount = pendingItems.filter((i) => i.isImported).length;
      const totalAddedMin = pendingItems.reduce(
        (sum, i) => sum + (i.isImported ? (i.unsyncedMinutes || 0) : Math.round(i.foregroundMs / 60000)),
        0
      );

      pendingItems.forEach((item) => get().importAppUsageToTimeline(item, { silentToast: true }));

      if (newCount > 0 && updateCount > 0) {
        get().addToast(
          'SUCCESS',
          '一键同步与增量更新',
          `已新增 ${newCount} 款、更新 ${updateCount} 款时长 (共 +${totalAddedMin}分钟)`
        );
      } else if (updateCount > 0) {
        get().addToast(
          'SUCCESS',
          '新增时长已同步',
          `已同步 ${updateCount} 款追踪应用的新增时长 (+${totalAddedMin}分钟)`
        );
      } else {
        get().addToast(
          'SUCCESS',
          '一键全部同步',
          `已将 ${newCount} 款追踪应用 (${totalAddedMin}分钟) 生成为时间流`
        );
      }
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

    getDebriefForPeriod: (period: 'DAY' | 'WEEK' | 'MONTH', refDate: Date) => {
      if (period === 'WEEK') {
        const range = getWeekRange(refDate);
        return storage.getDebrief(`week_${range.label}`);
      }
      if (period === 'MONTH') {
        const range = getMonthRange(refDate);
        return storage.getDebrief(`month_${range.label}`);
      }
      return storage.getDebrief(`day_${formatDate(refDate)}`);
    },

    generateDebrief: async (period = 'DAY', refDate = new Date()) => {
      set({ isDebriefLoading: true });
      try {
        const { activities, settings, categoryBudgets } = get();
        let targetActivities = activities.filter((a) => a.status === 'COMPLETED');
        let cacheKey = '';
        let periodLabel = '今日';

        if (period === 'WEEK') {
          const range = getWeekRange(refDate);
          targetActivities = targetActivities.filter((a) => isTimestampInWeek(a.startTime, range));
          cacheKey = `week_${range.label}`;
          periodLabel = range.label;
        } else if (period === 'MONTH') {
          const range = getMonthRange(refDate);
          targetActivities = targetActivities.filter((a) => isTimestampInMonth(a.startTime, range));
          cacheKey = `month_${range.label}`;
          periodLabel = range.label;
        } else {
          targetActivities = targetActivities.filter((a) => isSameDay(a.startTime, refDate));
          cacheKey = `day_${formatDate(refDate)}`;
          periodLabel = isSameDay(refDate, new Date()) ? '今日' : formatDate(refDate);
        }

        const debrief = await generateAICoachDebrief(
          targetActivities,
          settings,
          period,
          periodLabel,
          categoryBudgets
        );
        storage.saveDebrief(cacheKey, debrief);

        get().addToast(
          'SUCCESS',
          '🌟 AI 复盘生成完成',
          `${period === 'WEEK' ? '周度' : period === 'MONTH' ? '月度' : '日度'}认知复盘已生成并本地缓存`
        );
        return debrief;
      } finally {
        set({ isDebriefLoading: false });
      }
    },

    clearAllActivities: () => {
      storage.clearActivities();
      set({
        activities: [],
        activeActivity: null,
        appUsageList: reconcileAppUsageSyncState(get().appUsageList, [], get().trackerDayOffset),
      });
      get().addToast('INFO', '🧹 数据已清空', '手机端所有时间流水记录已重置为空白状态');
    },

    loadFiveWeeksDemoData: () => {
      const demoActivities = generateFiveWeeksDemoActivities(new Date());
      storage.saveActivities(demoActivities);
      set({
        activities: demoActivities,
        activeActivity: null,
        appUsageList: reconcileAppUsageSyncState(
          get().appUsageList,
          demoActivities,
          get().trackerDayOffset
        ),
      });
      get().addToast(
        'SUCCESS',
        '🎉 35 天全景演示数据已载入',
        `已成功载入 5 周共 ${demoActivities.length} 条生活与工作记录`
      );
    },

    exportDataBackup: () => {
      const data = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        activities: get().activities,
        categoryBudgets: get().categoryBudgets,
        projectGoals: get().projectGoals,
        settings: get().settings,
        trackedAppConfigs: get().trackedAppConfigs,
      };
      const jsonStr = JSON.stringify(data, null, 2);
      try {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chronosflow_mobile_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        get().addToast('SUCCESS', '备份已导出', '时间流数据与应用追踪配置已保存为 JSON 文件');
      } catch (err) {
        console.error('导出失败:', err);
        get().addToast('WARNING', '导出失败', '无法唤起文件下载');
      }
    },

    importDataBackup: (jsonStr: string) => {
      try {
        const parsed = JSON.parse(jsonStr);
        if (!parsed || (!Array.isArray(parsed.activities) && !Array.isArray(parsed))) {
          get().addToast('WARNING', '导入失败', 'JSON 格式不符合备份规范');
          return false;
        }
        const newActivities: Activity[] = Array.isArray(parsed.activities) ? parsed.activities : parsed;
        storage.saveActivities(newActivities);

        if (Array.isArray(parsed.categoryBudgets)) {
          storage.saveCategoryBudgets(parsed.categoryBudgets);
        }
        if (Array.isArray(parsed.projectGoals)) {
          storage.saveProjectGoals(parsed.projectGoals);
        }
        if (parsed.trackedAppConfigs && typeof parsed.trackedAppConfigs === 'object') {
          storage.saveTrackedAppConfigs(parsed.trackedAppConfigs);
        }

        set({
          activities: newActivities,
          activeActivity: null,
          appUsageList: reconcileAppUsageSyncState(
            get().appUsageList,
            newActivities,
            get().trackerDayOffset
          ),
          categoryBudgets: Array.isArray(parsed.categoryBudgets) ? parsed.categoryBudgets : get().categoryBudgets,
          projectGoals: Array.isArray(parsed.projectGoals) ? parsed.projectGoals : get().projectGoals,
          trackedAppConfigs: parsed.trackedAppConfigs && typeof parsed.trackedAppConfigs === 'object'
            ? parsed.trackedAppConfigs
            : get().trackedAppConfigs,
        });

        get().addToast('SUCCESS', '恢复成功', `已恢复 ${newActivities.length} 条时间块数据与应用配置`);
        return true;
      } catch (err) {
        console.error('导入失败:', err);
        get().addToast('WARNING', '导入失败', '无法解析 JSON 文件内容');
        return false;
      }
    },
  };
});
