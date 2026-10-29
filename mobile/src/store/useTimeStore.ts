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
} from '../types';
import { storage } from '../services/storage';
import { checkUsagePermission, fetchAppUsageStats } from '../services/nativeBridge';
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
  trackedAppConfigs: Record<string, TrackedAppConfig>;
  selectedAppForDetail: AppUsageItem | null;

  // 手机端应用追踪专属操作
  setSelectedAppForDetail: (app: AppUsageItem | null) => void;
  updateAppConfig: (packageName: string, updates: Partial<TrackedAppConfig>) => void;
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
    isDebriefLoading: false,

    hasUsagePermission: checkUsagePermission(),
    appUsageList: [],
    isScanningUsage: false,
    trackedAppConfigs: storage.getTrackedAppConfigs(),
    selectedAppForDetail: null,

    setSelectedAppForDetail: (app) => set({ selectedAppForDetail: app }),

    updateAppConfig: (packageName, updates) => {
      const currentConfigs = { ...get().trackedAppConfigs };
      const existing = currentConfigs[packageName] || {
        packageName,
        isTracked: false,
      };

      const updatedConfig: TrackedAppConfig = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };
      currentConfigs[packageName] = updatedConfig;
      storage.saveTrackedAppConfigs(currentConfigs);

      // 同步更新 appUsageList 中的项
      const currentList = get().appUsageList.map((item) => {
        if (item.packageName === packageName) {
          const newName = updatedConfig.customName?.trim() || item.originalAppName || item.packageName;
          const newCategory = updatedConfig.category || item.category;
          const newNotes = updatedConfig.notes ?? item.notes;
          const newTracked = updatedConfig.isTracked;

          return {
            ...item,
            appName: newName,
            category: newCategory,
            notes: newNotes,
            isTracked: newTracked,
          };
        }
        return item;
      });

      // 同步更新已存在的时间流活动中的自动时间块
      const finalName = updatedConfig.customName?.trim();
      const updatedActivities = get().activities.map((a) => {
        if (a.isAutoDetected && a.sourceAppPackage === packageName) {
          return {
            ...a,
            title: finalName || a.title,
            category: updatedConfig.category || a.category,
            notes: updatedConfig.notes !== undefined ? updatedConfig.notes : a.notes,
            tags: a.tags.map((t) => (t === a.title && finalName ? finalName : t)),
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

      get().addToast('SUCCESS', '配置已更新', `应用「${finalName || packageName}」设置已保存`);
    },

    toggleAppTracked: (packageName, isTracked) => {
      const config = get().trackedAppConfigs[packageName];
      const targetState = isTracked !== undefined ? isTracked : !(config?.isTracked ?? false);
      get().updateAppConfig(packageName, { isTracked: targetState });
      get().addToast(
        'INFO',
        targetState ? '已加入追踪' : '已移出追踪',
        targetState ? '该应用将纳入核心追踪列表与总时长统计' : '该应用已从主追踪列表中隐藏'
      );
    },

    batchSetTrackedApps: (packageNames) => {
      const currentConfigs = { ...get().trackedAppConfigs };
      const nameSet = new Set(packageNames);

      // 遍历当前已知的所有 appUsageList，确保有 config 项
      get().appUsageList.forEach((item) => {
        const pkg = item.packageName;
        const shouldTrack = nameSet.has(pkg);
        currentConfigs[pkg] = {
          ...(currentConfigs[pkg] || { packageName: pkg }),
          isTracked: shouldTrack,
          updatedAt: Date.now(),
        };
      });

      storage.saveTrackedAppConfigs(currentConfigs);

      // 刷新当前 appUsageList 的 isTracked 状态
      const updatedList = get().appUsageList.map((item) => ({
        ...item,
        isTracked: nameSet.has(item.packageName),
      }));

      set({
        trackedAppConfigs: currentConfigs,
        appUsageList: updatedList,
      });

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

    scanAppUsage: (manual = false) => {
      set({ isScanningUsage: true });
      try {
        const now = Date.now();
        const startOfDay = new Date().setHours(0, 0, 0, 0);
        const stats = fetchAppUsageStats(startOfDay, now);
        const activities = get().activities;

        let configs = { ...get().trackedAppConfigs };
        const hasExistingConfig = Object.keys(configs).length > 0;

        // 若用户首次使用尚未选定任何应用，默认将前台时长排名前 4 的常用核心应用设为追踪
        if (!hasExistingConfig && stats.length > 0) {
          const sorted = [...stats].sort((a, b) => b.foregroundMs - a.foregroundMs);
          const topList = sorted.slice(0, 4);
          const initialConfigs: Record<string, TrackedAppConfig> = {};
          topList.forEach((app) => {
            initialConfigs[app.packageName] = {
              packageName: app.packageName,
              isTracked: true,
              category: app.category,
              updatedAt: Date.now(),
            };
          });
          configs = initialConfigs;
          storage.saveTrackedAppConfigs(configs);
          set({ trackedAppConfigs: configs });
        }

        // 结合配置与已导入状态映射
        const mapped: AppUsageItem[] = stats.map((item) => {
          const cfg = configs[item.packageName];
          const customName = cfg?.customName?.trim();
          const finalAppName = customName || item.appName || item.packageName;
          const finalCategory = cfg?.category || item.category || '默认/其他';
          const notes = cfg?.notes || '';
          const isTracked = cfg !== undefined ? !!cfg.isTracked : false;

          const alreadyImported = activities.some(
            (a) => a.isAutoDetected && a.sourceAppPackage === item.packageName
          );
          return {
            ...item,
            appName: finalAppName,
            originalAppName: item.originalAppName || item.appName,
            category: finalCategory,
            notes,
            isTracked,
            isImported: alreadyImported,
          };
        });

        set({ appUsageList: mapped, isScanningUsage: false });
        if (manual) {
          if (!get().hasUsagePermission) {
            get().addToast('WARNING', '待授权访问', '请先授予应用使用情况访问权限');
          } else if (mapped.length > 0) {
            const trackedCount = mapped.filter((i) => i.isTracked).length;
            get().addToast('SUCCESS', '应用感知已更新', `已同步数据，当前锁定追踪 ${trackedCount} 款核心应用`);
          } else {
            get().addToast('INFO', '刷新完成', '应用感知数据已是最新');
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
        notes: item.notes || undefined,
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

      get().addToast('SUCCESS', '自动感知入库', `已将「${item.appName}」(${durationMin}分钟) 导入时间流`);
    },

    importAllAppUsages: () => {
      // 仅同步【选定追踪中】且未导入、时长大于1分钟的应用
      const unimported = get().appUsageList.filter(
        (u) => u.isTracked && !u.isImported && u.foregroundMs > 60000
      );
      if (unimported.length === 0) {
        get().addToast('INFO', '无待导入项', '选定追踪的应用均已在时间流中或时长低于1分钟');
        return;
      }
      unimported.forEach((item) => get().importAppUsageToTimeline(item));
      get().addToast('SUCCESS', '一键全部同步', `已将 ${unimported.length} 款追踪应用生成为时间流`);
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
      });
      get().addToast('INFO', '🧹 数据已清空', '手机端所有时间流水记录已重置为空白状态');
    },

    loadFiveWeeksDemoData: () => {
      const demoActivities = generateFiveWeeksDemoActivities(new Date());
      storage.saveActivities(demoActivities);
      set({
        activities: demoActivities,
        activeActivity: null,
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
