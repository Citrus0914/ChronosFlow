import type { Activity, AICoachDebrief, AppSettings, CategoryBudget, ProjectGoal, TrackedAppConfig } from '../types';
import { DEFAULT_SETTINGS, normalizeCategory } from '../types';

const ACTIVITIES_KEY = 'chronosflow_activities_v1';
const SETTINGS_KEY = 'chronosflow_settings_v1';
const DEBRIEF_KEY_PREFIX = 'chronosflow_debrief_';
const CATEGORY_BUDGETS_KEY = 'chronosflow_category_budgets_v1';
const PROJECT_GOALS_KEY = 'chronosflow_project_goals_v1';
const TRACKED_APP_CONFIGS_KEY = 'chronosflow_tracked_app_configs_v1';

export const DEFAULT_CATEGORY_BUDGETS: CategoryBudget[] = [
  { category: '工作/业务', weeklyTargetHours: 0, budgetType: 'AT_LEAST', isEnabled: false },
  { category: '开发/技术', weeklyTargetHours: 0, budgetType: 'AT_LEAST', isEnabled: false },
  { category: '学习/提升', weeklyTargetHours: 0, budgetType: 'AT_LEAST', isEnabled: false },
  { category: '社交/沟通', weeklyTargetHours: 0, budgetType: 'AT_MOST', isEnabled: false },
  { category: '休闲/娱乐', weeklyTargetHours: 0, budgetType: 'AT_MOST', isEnabled: false },
  { category: '健康/运动', weeklyTargetHours: 0, budgetType: 'AT_LEAST', isEnabled: false },
  { category: '生活/日常', weeklyTargetHours: 0, budgetType: 'AT_MOST', isEnabled: false },
  { category: '创作/灵感', weeklyTargetHours: 0, budgetType: 'AT_LEAST', isEnabled: false },
  { category: '休息/睡眠', weeklyTargetHours: 0, budgetType: 'AT_LEAST', isEnabled: false },
];

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
      
      // 🌟 全量归一化分类名称（消除“休闲娱乐”与“休闲/娱乐”重名）
      let dirty = filtered.length !== parsed.length;
      const normalizedActivities = filtered.map((a: Activity) => {
        const normCat = normalizeCategory(a.category);
        const normCats = a.categories && a.categories.length > 0
          ? Array.from(new Set(a.categories.map((c) => normalizeCategory(c))))
          : [normCat];
        if (a.category !== normCat || (a.categories && a.categories.some((c, i) => c !== normCats[i]))) {
          dirty = true;
        }
        return {
          ...a,
          category: normCat,
          categories: normCats,
        };
      });

      if (dirty) {
        safeStorage.setItem(ACTIVITIES_KEY, JSON.stringify(normalizedActivities));
      }
      return normalizedActivities;
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

  getCategoryBudgets(): CategoryBudget[] {
    try {
      const data = safeStorage.getItem(CATEGORY_BUDGETS_KEY);
      if (!data) return DEFAULT_CATEGORY_BUDGETS;
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 彻底归一化所有历史分类名称（如“休闲娱乐”与“休闲/生活”彻底归并为“休闲/娱乐”）
        const map = new Map<string, CategoryBudget>();
        for (const item of parsed) {
          if (!item?.category) continue;
          const normalized = normalizeCategory(item.category);
          if (normalized === '默认/其他' || normalized === '其他工作') continue;
          const existing = map.get(normalized);
          if (existing) {
            existing.weeklyTargetHours = Math.max(existing.weeklyTargetHours, item.weeklyTargetHours || 0);
            existing.isEnabled = existing.isEnabled || Boolean(item.isEnabled);
          } else {
            map.set(normalized, { ...item, category: normalized });
          }
        }
        // 补齐标准 9 大分类
        DEFAULT_CATEGORY_BUDGETS.forEach((def) => {
          if (!map.has(def.category)) {
            map.set(def.category, { ...def });
          }
        });
        const unified = Array.from(map.values());
        // 若发生了分类归并或修正，立即回写清洗本地存储
        if (unified.length !== parsed.length || parsed.some((b: CategoryBudget) => b.category !== normalizeCategory(b.category))) {
          safeStorage.setItem(CATEGORY_BUDGETS_KEY, JSON.stringify(unified));
        }
        return unified;
      }
      return DEFAULT_CATEGORY_BUDGETS;
    } catch {
      return DEFAULT_CATEGORY_BUDGETS;
    }
  },

  saveCategoryBudgets(budgets: CategoryBudget[]): void {
    try {
      safeStorage.setItem(CATEGORY_BUDGETS_KEY, JSON.stringify(budgets));
    } catch (e) {
      console.error('Failed to save category budgets:', e);
    }
  },

  getProjectGoals(): ProjectGoal[] {
    try {
      const data = safeStorage.getItem(PROJECT_GOALS_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveProjectGoals(goals: ProjectGoal[]): void {
    try {
      safeStorage.setItem(PROJECT_GOALS_KEY, JSON.stringify(goals));
    } catch (e) {
      console.error('Failed to save project goals:', e);
    }
  },

  getTrackedAppConfigs(): Record<string, TrackedAppConfig> {
    try {
      const data = safeStorage.getItem(TRACKED_APP_CONFIGS_KEY);
      if (!data) return {};
      const parsed = JSON.parse(data);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  },

  saveTrackedAppConfigs(configs: Record<string, TrackedAppConfig>): void {
    try {
      safeStorage.setItem(TRACKED_APP_CONFIGS_KEY, JSON.stringify(configs));
    } catch (e) {
      console.error('Failed to save tracked app configs:', e);
    }
  },
};
