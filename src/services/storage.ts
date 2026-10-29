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
  getActivities(): Activity[] {
    try {
      const data = safeStorage.getItem(ACTIVITIES_KEY);
      if (!data) return getInitialSeedData();
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return getInitialSeedData();
      }
      return parsed;
    } catch {
      return getInitialSeedData();
    }
  },

  saveActivities(activities: Activity[]): void {
    try {
      safeStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
    } catch (e) {
      console.error('Failed to save activities:', e);
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

  getTodayDebrief(): AICoachDebrief | null {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = safeStorage.getItem(`${DEBRIEF_KEY_PREFIX}${today}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveTodayDebrief(debrief: AICoachDebrief | null): void {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (debrief) {
        safeStorage.setItem(`${DEBRIEF_KEY_PREFIX}${today}`, JSON.stringify(debrief));
      } else {
        safeStorage.setItem(`${DEBRIEF_KEY_PREFIX}${today}`, '');
      }
    } catch (e) {
      console.error('Failed to save debrief:', e);
    }
  },
};

/**
 * 初始化多天种子数据，确保周度与月度分析开箱即用，具备真实的日分布、周走势与分类比例
 */
function getInitialSeedData(): Activity[] {
  const now = new Date();

  const createActivity = (
    id: string,
    dayOffset: number,
    startHour: number,
    startMin: number,
    durationMin: number,
    title: string,
    category: string,
    mood: 'FLOW' | 'FOCUSED' | 'TIRED' | 'DISTRACTED' | 'FRUSTRATED' | 'NORMAL',
    rawInput: string
  ): Activity => {
    const d = new Date(now);
    d.setDate(d.getDate() - dayOffset);
    d.setHours(startHour, startMin, 0, 0);
    const startTime = d.getTime();
    const endTime = startTime + durationMin * 60 * 1000;
    return {
      id,
      rawInput,
      title,
      category,
      tags: [category.split('/')[0]],
      startTime,
      endTime,
      durationMinutes: durationMin,
      status: 'COMPLETED',
      mood,
    };
  };

  return [
    // 今天 (Day 0)
    createActivity('seed-1', 0, 9, 30, 30, '整理周报与邮件回复', '工作/业务', 'NORMAL', '9点半到10点，整理团队周报与邮件沟通'),
    createActivity('seed-2', 0, 10, 15, 100, 'ChronosFlow 核心状态管理编码', '开发/技术', 'FLOW', '深度写 ChronosFlow 前端核心状态管理代码，很顺手'),
    createActivity('seed-3', 0, 14, 0, 50, '排查跨域登录问题', '开发/技术', 'FRUSTRATED', '改了一个特别恶心的登录跨域 Bug，改吐了'),

    // 昨天 (Day -1)
    createActivity('seed-4', 1, 9, 30, 45, '晨间需求对齐与站会', '工作/业务', 'NORMAL', '昨天上午9点半到10点15开站会'),
    createActivity('seed-5', 1, 10, 30, 120, '技术方案架构重构与推演', '开发/技术', 'FLOW', '昨天深度架构方案推演，进入极致心流'),
    createActivity('seed-6', 1, 14, 30, 90, '阅读大模型时态解析论文', '学习/提升', 'FOCUSED', '昨天下午看大模型论文 1.5小时'),
    createActivity('seed-7', 1, 17, 0, 40, '体能慢跑与拉伸', '健康/运动', 'NORMAL', '昨天傍晚跑步40分钟'),

    // 前天 (Day -2)
    createActivity('seed-8', 2, 10, 0, 120, '核心算法单元测试编写', '开发/技术', 'FOCUSED', '前天上午写测试用例 2小时'),
    createActivity('seed-9', 2, 14, 0, 60, '跨团队产品方案评审会', '工作/业务', 'NORMAL', '前天下午2点到3点方案评审会'),
    createActivity('seed-10', 2, 15, 30, 75, 'TypeScript 严格类型调优', '开发/技术', 'TIRED', '前天调优严格类型，有点累'),

    // 大前天 (Day -3)
    createActivity('seed-11', 3, 9, 30, 90, '系统性能基准压测与分析', '开发/技术', 'FLOW', '大前天系统压测与分析，很顺手'),
    createActivity('seed-12', 3, 14, 0, 60, '阅读技术书籍《深入理解计算机系统》', '学习/提升', 'FOCUSED', '大前天阅读技术专著 1小时'),
    createActivity('seed-13', 3, 16, 0, 45, '羽毛球运动放松', '健康/运动', 'NORMAL', '大前天打羽毛球45分钟'),

    // 4天前 (Day -4)
    createActivity('seed-14', 4, 10, 0, 110, '前端工程化与打包构建优化', '开发/技术', 'FOCUSED', '4天前优化 Vite 构建流水线'),
    createActivity('seed-15', 4, 14, 30, 60, '周度客户答疑与复盘', '工作/业务', 'NORMAL', '4天前下午客户答疑会'),
  ];
}
