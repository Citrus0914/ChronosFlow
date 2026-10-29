import type { Activity, AICoachDebrief, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const ACTIVITIES_KEY = 'chronosflow_activities_v1';
const SETTINGS_KEY = 'chronosflow_settings_v1';
const DEBRIEF_KEY_PREFIX = 'chronosflow_debrief_';

const memoryStore = new Map<string, string>();

const safeStorage = {
  getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return memoryStore.get(key) || null;
  },
  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    } else {
      memoryStore.set(key, value);
    }
  },
};

export const storage = {
  /**
   * 获取所有时间块数据。
   * 软件从纯净空白状态开始，不预置任何假数据或预先写好的事项。
   * 同时自动过滤并清理任何历史可能遗留的假种子数据（以 seed- 开头）。
   */
  getActivities(): Activity[] {
    try {
      const data = safeStorage.getItem(ACTIVITIES_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];

      // 彻底清理并剔除任何预设/种子数据，确保软件纯净空白，仅保留用户真实记录
      const filtered = parsed.filter((a: any) => !a.id?.startsWith('seed-'));
      if (filtered.length !== parsed.length) {
        safeStorage.setItem(ACTIVITIES_KEY, JSON.stringify(filtered));
      }
      return filtered;
    } catch {
      return [];
    }
  },

  saveActivities(activities: Activity[]): void {
    try {
      safeStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
    } catch (e) {
      console.error('Failed to save activities:', e);
    }
  },

  clearActivities(): void {
    try {
      safeStorage.setItem(ACTIVITIES_KEY, JSON.stringify([]));
    } catch (e) {
      console.error('Failed to clear activities:', e);
    }
  },

  getSettings(): AppSettings {
    try {
      const data = safeStorage.getItem(SETTINGS_KEY);
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    try {
      safeStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  getDebrief(cacheKey: string): AICoachDebrief | null {
    try {
      const data = safeStorage.getItem(`${DEBRIEF_KEY_PREFIX}${cacheKey}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveDebrief(cacheKey: string, debrief: AICoachDebrief | null): void {
    try {
      if (debrief) {
        safeStorage.setItem(`${DEBRIEF_KEY_PREFIX}${cacheKey}`, JSON.stringify(debrief));
      } else {
        safeStorage.setItem(`${DEBRIEF_KEY_PREFIX}${cacheKey}`, '');
      }
    } catch (e) {
      console.error('Failed to save debrief:', e);
    }
  },

  getTodayDebrief(): AICoachDebrief | null {
    const today = new Date().toISOString().split('T')[0];
    return this.getDebrief(`day_${today}`);
  },

  saveTodayDebrief(debrief: AICoachDebrief | null): void {
    const today = new Date().toISOString().split('T')[0];
    this.saveDebrief(`day_${today}`, debrief);
  },
};
