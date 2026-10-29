import { create } from 'zustand';
import type { Activity, AICoachDebrief, AppSettings, CategoryStat, ToastNotification } from '../types';
import { storage } from '../services/storage';
import { parseWithAI } from '../services/nlpParser';
import { generateAICoachDebrief } from '../services/aiDebrief';
import { formatDuration } from '../lib/utils';

export type ViewTab = 'TIMELINE' | 'ANALYTICS' | 'DEBRIEF' | 'SETTINGS';

interface TimeStore {
  activities: Activity[];
  activeActivity: Activity | null;
  settings: AppSettings;
  currentDebrief: AICoachDebrief | null;
  isDebriefLoading: boolean;
  activeTab: ViewTab;
  isCommandBarOpen: boolean;
  toast: ToastNotification | null;

  // Actions
  setActiveTab: (tab: ViewTab) => void;
  setCommandBarOpen: (open: boolean) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  showToast: (title: string, message: string, type?: 'SUCCESS' | 'INFO' | 'WARNING') => void;
  hideToast: () => void;
  
  // Activity actions
  submitNaturalInput: (input: string) => Promise<Activity>;
  startRealtimeActivity: (title: string, category: string, tags: string[]) => Activity;
  finishActiveActivity: (notes?: string) => void;
  deleteActivity: (id: string) => void;
  
  // Analytics & Debrief
  generateDebrief: () => Promise<void>;
  getCategoryStats: () => CategoryStat[];
  getDetectedGap: () => { hasGap: boolean; gapMinutes: number; lastEndTime: number } | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  '开发/技术': '#3b82f6', // blue
  '工作/业务': '#10b981', // emerald
  '学习/提升': '#8b5cf6', // purple
  '健康/运动': '#f59e0b', // amber
  '休闲/生活': '#ec4899', // pink
  '其他工作': '#64748b', // slate
};

export const useTimeStore = create<TimeStore>((set, get) => {
  const initialActivities = storage.getActivities();
  const initialSettings = storage.getSettings();
  const activeOne = initialActivities.find((a) => a.status === 'IN_PROGRESS') || null;

  return {
    activities: initialActivities,
    activeActivity: activeOne,
    settings: initialSettings,
    currentDebrief: storage.getTodayDebrief(),
    isDebriefLoading: false,
    activeTab: 'TIMELINE',
    isCommandBarOpen: false,
    toast: null,

    setActiveTab: (tab) => set({ activeTab: tab }),
    setCommandBarOpen: (open) => set({ isCommandBarOpen: open }),

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

      const parsed = await parseWithAI(input, settings);
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
        };

        const updated = [newActivity, ...activities];
        storage.saveActivities(updated);
        set({ activities: updated, activeActivity: newActivity });
        
        get().showToast(
          '🎯 实时专注已启动',
          `已开启「${parsed.title}」(${parsed.category})，计时中...`,
          'SUCCESS'
        );
        return newActivity;
      } else {
        // 事后补录
        const durationMinutes = parsed.durationMinutes || 30;
        const durationMs = durationMinutes * 60 * 1000;
        const newActivity: Activity = {
          id: `act-${now}`,
          rawInput: input,
          title: parsed.title,
          category: parsed.category,
          tags: parsed.tags,
          startTime: now - durationMs,
          endTime: now,
          durationMinutes,
          status: 'COMPLETED',
          mood: parsed.mood,
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

    startRealtimeActivity: (title, category, tags) => {
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

    generateDebrief: async () => {
      set({ isDebriefLoading: true });
      try {
        const { activities, settings } = get();
        const debrief = await generateAICoachDebrief(activities, settings);
        storage.saveTodayDebrief(debrief);
        set({ currentDebrief: debrief });
        get().showToast('🌟 AI 复盘生成完成', '今日时间利用与精力诊断已更新', 'SUCCESS');
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
        color: CATEGORY_COLORS[category] || '#64748b',
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
