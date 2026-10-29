import { create } from 'zustand';
import type {
  Activity,
  AICoachDebrief,
  AppSettings,
  CategoryStat,
  ToastNotification,
  ManualPrefill,
  CategoryBudget,
  ProjectGoal,
} from '../types';
import { storage } from '../services/storage';
import { parseWithAI } from '../services/nlpParser';
import { generateAICoachDebrief } from '../services/aiDebrief';
import { generateFiveWeeksDemoActivities } from '../services/demoDataGenerator';
import { formatDuration, getCategoryColor } from '../lib/utils';
import {
  getWeekRange,
  getMonthRange,
  isTimestampInWeek,
  isTimestampInMonth,
  isSameDay,
  formatDate,
} from '../lib/dateUtils';

export type ViewTab = 'TIMELINE' | 'ANALYTICS' | 'GOALS' | 'DEBRIEF' | 'SETTINGS';

interface TimeStore {
  activities: Activity[];
  activeActivity: Activity | null;
  settings: AppSettings;
  categoryBudgets: CategoryBudget[];
  projectGoals: ProjectGoal[];
  currentDebrief: AICoachDebrief | null;
  isDebriefLoading: boolean;
  activeTab: ViewTab;
  isCommandBarOpen: boolean;
  isManualModalOpen: boolean;
  manualPrefill: ManualPrefill | null;
  toast: ToastNotification | null;

  // Actions
  setActiveTab: (tab: ViewTab) => void;
  setCommandBarOpen: (open: boolean) => void;
  setManualModalOpen: (open: boolean, prefill?: ManualPrefill | null) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  showToast: (title: string, message: string, type?: 'SUCCESS' | 'INFO' | 'WARNING') => void;
  hideToast: () => void;
  
  // Activity actions
  submitNaturalInput: (input: string) => Promise<Activity>;
  addManualActivity: (data: Omit<Activity, 'id'>) => Activity;
  startRealtimeActivity: (title: string, category: string, tags: string[], projectId?: string) => Activity;
  finishActiveActivity: (notes?: string) => void;
  deleteActivity: (id: string) => void;
  clearAllActivities: () => void;
  loadFiveWeeksDemoData: () => void;

  // Budget & Projects
  updateCategoryBudget: (category: string, updates: Partial<CategoryBudget>, silent?: boolean) => void;
  addProjectGoal: (goal: Omit<ProjectGoal, 'id' | 'createdAt' | 'isArchived'>) => ProjectGoal;
  updateProjectGoal: (id: string, updates: Partial<ProjectGoal>) => void;
  deleteProjectGoal: (id: string) => void;
  toggleArchiveProject: (id: string) => void;
  getProjectDurationMinutes: (projectId: string, period?: 'WEEK' | 'WEEKLY' | 'TOTAL', refDate?: Date) => number;
  getCategorySpentMinutes: (category: string, period?: 'WEEK' | 'MONTH', refDate?: Date) => number;
  
  // Analytics & Debrief
  generateDebrief: (period?: 'DAY' | 'WEEK' | 'MONTH', refDate?: Date) => Promise<AICoachDebrief>;
  getDebriefForPeriod: (period: 'DAY' | 'WEEK' | 'MONTH', refDate: Date) => AICoachDebrief | null;
  getCategoryStats: () => CategoryStat[];
  getDetectedGap: () => { hasGap: boolean; gapMinutes: number; lastEndTime: number } | null;
}


export const useTimeStore = create<TimeStore>((set, get) => {
  let initialActivities = storage.getActivities();
  const isUserCleared = typeof localStorage !== 'undefined' && localStorage.getItem('chronosflow_user_cleared_v1') === 'true';
  if (initialActivities.length === 0 && !isUserCleared) {
    initialActivities = generateFiveWeeksDemoActivities();
    storage.saveActivities(initialActivities);
  }
  const initialSettings = storage.getSettings();
  const initialBudgets = storage.getCategoryBudgets();
  const initialProjects = storage.getProjectGoals();
  const activeOne = initialActivities.find((a) => a.status === 'IN_PROGRESS') || null;

  return {
    activities: initialActivities,
    activeActivity: activeOne,
    settings: initialSettings,
    categoryBudgets: initialBudgets,
    projectGoals: initialProjects,
    currentDebrief: storage.getTodayDebrief(),
    isDebriefLoading: false,
    activeTab: 'TIMELINE',
    isCommandBarOpen: false,
    isManualModalOpen: false,
    manualPrefill: null,
    toast: null,

    setActiveTab: (tab) => set({ activeTab: tab }),
    setCommandBarOpen: (open) => set({ isCommandBarOpen: open }),
    setManualModalOpen: (open, prefill = null) =>
      set({ isManualModalOpen: open, manualPrefill: prefill }),

    showToast: (title, message, type = 'SUCCESS') => {
      set({
        toast: {
          id: `toast-${Date.now()}`,
          title,
          message,
          type,
        },
      });
    },

    hideToast: () => set({ toast: null }),

    updateSettings: (newSettings) => {
      const merged = { ...get().settings, ...newSettings };
      storage.saveSettings(merged);
      set({ settings: merged });
      get().showToast('配置已更新', '系统偏好设置已成功保存到本地', 'SUCCESS');
    },

    submitNaturalInput: async (input: string) => {
      const { settings, activities, activeActivity } = get();

      // 如果当前有正在进行的任务，而输入了“完成了”或“收工”
      if (/^(完成[了]?|收工|结束|搞定|停)/.test(input.trim()) && activeActivity) {
        get().finishActiveActivity();
        return activeActivity;
      }

      // 如果当前有活跃任务，而用户又启动新任务，则自动结算上一任务
      if (activeActivity) {
        get().finishActiveActivity('自动切换下一任务结算');
      }

      const parsed = await parseWithAI(input, settings, get().projectGoals);
      const now = Date.now();

      if (parsed.isRealtimeStart) {
        // 启动实时计时
        const newActivity: Activity = {
          id: `act-${now}`,
          rawInput: input,
          title: parsed.title,
          category: parsed.category,
          tags: parsed.tags,
          startTime: now,
          endTime: null,
          durationMinutes: 0,
          status: 'IN_PROGRESS',
          mood: parsed.mood,
          projectId: parsed.projectId,
        };

        const updated = [newActivity, ...activities];
        storage.saveActivities(updated);
        set({ activities: updated, activeActivity: newActivity });
        
        get().showToast(
          '🎯 实时专注已启动',
          `已开启「${parsed.title}」(${parsed.category})${parsed.projectId ? ' · 已关联专属项目' : ''}，计时中...`,
          'SUCCESS'
        );
        return newActivity;
      } else {
        // 事后补录（支持精确定位起止时间段）
        const startTime = parsed.exactStartTime || (now - (parsed.durationMinutes || 30) * 60 * 1000);
        const endTime = parsed.exactEndTime || now;
        const durationMinutes = parsed.durationMinutes || Math.max(1, Math.round((endTime - startTime) / 60000));

        const newActivity: Activity = {
          id: `act-${now}`,
          rawInput: input,
          title: parsed.title,
          category: parsed.category,
          tags: parsed.tags,
          startTime,
          endTime,
          durationMinutes,
          status: 'COMPLETED',
          mood: parsed.mood,
          isFuzzyTime: parsed.isFuzzyTime,
          projectId: parsed.projectId,
        };

        const updated = [newActivity, ...activities];
        storage.saveActivities(updated);
        set({ activities: updated });
        
        get().showToast(
          '✨ 时间流已成功保存',
          `「${parsed.title}」· ${parsed.category} · ${formatDuration(durationMinutes)}`,
          'SUCCESS'
        );
        return newActivity;
      }
    },

    addManualActivity: (data) => {
      const now = Date.now();
      const newActivity: Activity = {
        ...data,
        id: `act-${now}`,
      };
      const updated = [newActivity, ...get().activities];
      storage.saveActivities(updated);
      set({ activities: updated });
      get().showToast(
        '✨ 时间块已精确归档',
        `「${data.title}」· ${data.category} · ${formatDuration(data.durationMinutes)}`,
        'SUCCESS'
      );
      return newActivity;
    },

    startRealtimeActivity: (title, category, tags, projectId) => {
      const now = Date.now();
      const newActivity: Activity = {
        id: `act-${now}`,
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
      const updated = [newActivity, ...get().activities];
      storage.saveActivities(updated);
      set({ activities: updated, activeActivity: newActivity });
      get().showToast(
        '🎯 实时专注已启动',
        `已开启「${title}」(${category})，计时中...`,
        'SUCCESS'
      );
      return newActivity;
    },

    updateCategoryBudget: (category, updates, silent = false) => {
      const current = get().categoryBudgets;
      const updated = current.map((b) => (b.category === category ? { ...b, ...updates } : b));
      // 若原先不存在则追加
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
        get().showToast('🎯 预算已更新', `「${category}」周目标已调整`, 'SUCCESS');
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
      get().showToast('🚀 新项目已建立', `目标项目「${newProject.name}」已添加`, 'SUCCESS');
      return newProject;
    },

    updateProjectGoal: (id, updates) => {
      const updated = get().projectGoals.map((p) => (p.id === id ? { ...p, ...updates } : p));
      storage.saveProjectGoals(updated);
      set({ projectGoals: updated });
      get().showToast('✏️ 项目已更新', '目标配置与参数已保存', 'SUCCESS');
    },

    deleteProjectGoal: (id) => {
      const target = get().projectGoals.find((p) => p.id === id);
      const updated = get().projectGoals.filter((p) => p.id !== id);
      storage.saveProjectGoals(updated);
      // 清理解绑该项目的关联
      const updatedActs = get().activities.map((a) => (a.projectId === id ? { ...a, projectId: undefined } : a));
      storage.saveActivities(updatedActs);
      set({ projectGoals: updated, activities: updatedActs });
      get().showToast('🗑️ 项目已移除', target ? `已删除项目「${target.name}」` : '项目已删除', 'INFO');
    },

    toggleArchiveProject: (id) => {
      const updated = get().projectGoals.map((p) => (p.id === id ? { ...p, isArchived: !p.isArchived } : p));
      storage.saveProjectGoals(updated);
      set({ projectGoals: updated });
      const target = updated.find((p) => p.id === id);
      get().showToast(
        target?.isArchived ? '📦 项目已归档' : '📂 项目已解除归档',
        `「${target?.name}」状态已变更为 ${target?.isArchived ? '已归档' : '进行中'}`,
        'INFO'
      );
    },

    getProjectDurationMinutes: (projectId, period = 'TOTAL', refDate = new Date()) => {
      const completed = get().activities.filter((a) => a.status === 'COMPLETED' && a.projectId === projectId);
      if (period === 'WEEK' || period === 'WEEKLY') {
        const range = getWeekRange(refDate);
        return completed
          .filter((a) => isTimestampInWeek(a.startTime, range))
          .reduce((sum, a) => sum + a.durationMinutes, 0);
      }
      return completed.reduce((sum, a) => sum + a.durationMinutes, 0);
    },

    getCategorySpentMinutes: (category, period = 'WEEK', refDate = new Date()) => {
      const completed = get().activities.filter((a) => a.status === 'COMPLETED' && a.category === category);
      if (period === 'MONTH') {
        const range = getMonthRange(refDate);
        return completed
          .filter((a) => isTimestampInMonth(a.startTime, range))
          .reduce((sum, a) => sum + a.durationMinutes, 0);
      }
      const range = getWeekRange(refDate);
      return completed
        .filter((a) => isTimestampInWeek(a.startTime, range))
        .reduce((sum, a) => sum + a.durationMinutes, 0);
    },

    finishActiveActivity: (notes?: string) => {
      const { activeActivity, activities } = get();
      if (!activeActivity) return;

      const now = Date.now();
      const durationMin = Math.max(1, Math.round((now - activeActivity.startTime) / 60000));

      const updated = activities.map((a) => {
        if (a.id === activeActivity.id) {
          return {
            ...a,
            endTime: now,
            durationMinutes: durationMin,
            status: 'COMPLETED' as const,
            notes: notes || a.notes,
          };
        }
        return a;
      });

      storage.saveActivities(updated);
      set({ activities: updated, activeActivity: null });
      get().showToast(
        '✅ 任务已结算归档',
        `「${activeActivity.title}」已归档，专注用时 ${formatDuration(durationMin)}`,
        'SUCCESS'
      );
    },

    deleteActivity: (id: string) => {
      const { activities, activeActivity } = get();
      const target = activities.find((a) => a.id === id);
      const updated = activities.filter((a) => a.id !== id);
      storage.saveActivities(updated);
      set({
        activities: updated,
        activeActivity: activeActivity?.id === id ? null : activeActivity,
      });
      get().showToast(
        '🗑️ 记录已删除',
        target ? `已移出「${target.title}」` : '该时间块已成功删除',
        'INFO'
      );
    },

    clearAllActivities: () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('chronosflow_user_cleared_v1', 'true');
      }
      storage.clearActivities();
      set({
        activities: [],
        activeActivity: null,
      });
      get().showToast('🧹 数据已清空', '所有时间流记录已重置为空白状态', 'INFO');
    },

    loadFiveWeeksDemoData: () => {
      const demoActivities = generateFiveWeeksDemoActivities(new Date());
      storage.saveActivities(demoActivities);
      set({
        activities: demoActivities,
        activeActivity: null,
      });
      get().showToast(
        '🎉 5 周生活与工作示例已导入',
        `已成功导入 35 天共 ${demoActivities.length} 条真实记录（含微信QQ、游戏、短视频、刷帖、运动、睡眠等）`,
        'SUCCESS'
      );
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
        const { activities, settings } = get();
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

        const debrief = await generateAICoachDebrief(targetActivities, settings, period, periodLabel, get().categoryBudgets);
        storage.saveDebrief(cacheKey, debrief);

        if (period === 'DAY' && isSameDay(refDate, new Date())) {
          set({ currentDebrief: debrief });
        }

        get().showToast(
          '🌟 AI 复盘生成完成',
          `${period === 'WEEK' ? '周度' : period === 'MONTH' ? '月度' : '日度'}时间精力复盘已生成并本地缓存`,
          'SUCCESS'
        );
        return debrief;
      } finally {
        set({ isDebriefLoading: false });
      }
    },

    getCategoryStats: () => {
      const completed = get().activities.filter((a) => a.status === 'COMPLETED');
      const totalMin = completed.reduce((sum, a) => sum + a.durationMinutes, 0);
      if (totalMin === 0) return [];

      const map: Record<string, number> = {};
      for (const a of completed) {
        map[a.category] = (map[a.category] || 0) + a.durationMinutes;
      }

      return Object.entries(map).map(([category, minutes]) => ({
        category,
        minutes,
        percentage: Math.round((minutes / totalMin) * 100),
        color: getCategoryColor(category),
      }));
    },

    getDetectedGap: () => {
      const { activities, activeActivity, settings } = get();
      if (!settings.enableSmartGapAlert || activeActivity) return null;

      const completed = activities
        .filter((a) => a.status === 'COMPLETED' && a.endTime !== null)
        .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));

      if (completed.length === 0) return null;

      const lastEndTime = completed[0].endTime!;
      const diffMinutes = Math.round((Date.now() - lastEndTime) / 60000);

      // 如果距离上个任务结束超过 45 分钟未打卡，提示时间空白
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

if (typeof window !== 'undefined') {
  (window as unknown as { __loadDemoData?: () => void }).__loadDemoData = () => {
    useTimeStore.getState().loadFiveWeeksDemoData();
  };
}
