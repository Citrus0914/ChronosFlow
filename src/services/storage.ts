import type { Activity, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const ACTIVITIES_KEY = 'chronosflow_activities_v1';
const SETTINGS_KEY = 'chronosflow_settings_v1';

export const storage = {
  getActivities(): Activity[] {
    try {
      const data = localStorage.getItem(ACTIVITIES_KEY);
      if (!data) return getInitialSeedData();
      return JSON.parse(data);
    } catch {
      return getInitialSeedData();
    }
  },

  saveActivities(activities: Activity[]): void {
    try {
      localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
    } catch (e) {
      console.error('Failed to save activities:', e);
    }
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },
};

function getInitialSeedData(): Activity[] {
  const todayMorning = new Date();
  todayMorning.setHours(9, 30, 0, 0);

  return [
    {
      id: 'seed-1',
      rawInput: '9点半到10点，整理团队周报与邮件沟通',
      title: '整理周报与邮件回复',
      category: '工作/业务',
      tags: ['日常', '沟通'],
      startTime: todayMorning.getTime(),
      endTime: todayMorning.getTime() + 30 * 60 * 1000,
      durationMinutes: 30,
      status: 'COMPLETED',
      mood: 'NORMAL',
    },
    {
      id: 'seed-2',
      rawInput: '深度写 ChronosFlow 前端核心状态管理代码，很顺手',
      title: 'ChronosFlow 前端状态架构编码',
      category: '开发/技术',
      tags: ['研发', '心流'],
      startTime: todayMorning.getTime() + 45 * 60 * 1000,
      endTime: todayMorning.getTime() + 145 * 60 * 1000,
      durationMinutes: 100,
      status: 'COMPLETED',
      mood: 'FLOW',
    },
    {
      id: 'seed-3',
      rawInput: '改了一个特别恶心的登录跨域 Bug，改吐了',
      title: '排查登录跨域问题',
      category: '开发/技术',
      tags: ['Debug'],
      startTime: todayMorning.getTime() + 160 * 60 * 1000,
      endTime: todayMorning.getTime() + 210 * 60 * 1000,
      durationMinutes: 50,
      status: 'COMPLETED',
      mood: 'FRUSTRATED',
    },
  ];
}
