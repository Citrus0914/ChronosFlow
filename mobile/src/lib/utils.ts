import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 分钟';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0 && m > 0) return `${h} 小时 ${m} 分钟`;
  if (h > 0) return `${h} 小时`;
  return `${m} 分钟`;
}

export function formatTimeRange(start: number, end: number | null, isFuzzyTime?: boolean): string {
  if (isFuzzyTime) return '未知时段 (仅记时长)';
  const startDate = new Date(start);
  const sStr = startDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (!end) return `${sStr} - 进行中`;
  const endDate = new Date(end);
  const eStr = endDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${sStr} - ${eStr}`;
}

const PRESET_CATEGORY_COLORS: Record<string, string> = {
  '工作/业务': '#10b981', // 翡翠绿 emerald
  '开发/技术': '#3b82f6', // 科技蓝 blue
  '学习/提升': '#8b5cf6', // 智慧紫 purple
  '社交/沟通': '#06b6d4', // 交流青 cyan
  '休闲/娱乐': '#ec4899', // 活力粉 pink
  '健康/运动': '#f59e0b', // 阳光橙 amber
  '生活/日常': '#14b8a6', // 生活青绿 teal
  '创作/灵感': '#a855f7', // 灵感紫 violet
  '休息/睡眠': '#6366f1', // 静谧靛蓝 indigo
  '默认/其他': '#64748b', // 沉稳板岩灰 slate
  // 兼容旧版历史数据名称
  '休闲/生活': '#ec4899',
  '沟通协作': '#06b6d4',
  '休闲娱乐': '#ec4899',
  '学习/阅读': '#8b5cf6',
  '开发/工作': '#3b82f6',
  '其他': '#64748b',
};

const DYNAMIC_PALETTE = [
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#a855f7', // purple
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#e11d48', // rose
];

let cachedProjectsMap: Record<string, string> | null = null;
let lastCacheTime = 0;

export function getCategoryColor(category: string): string {
  if (PRESET_CATEGORY_COLORS[category]) {
    return PRESET_CATEGORY_COLORS[category];
  }

  // 专属独立目标配色读取
  try {
    const now = Date.now();
    if (!cachedProjectsMap || now - lastCacheTime > 2000) {
      cachedProjectsMap = {};
      const data = typeof localStorage !== 'undefined' ? localStorage.getItem('chronosflow_project_goals_v1') : null;
      if (data) {
        const goals = JSON.parse(data);
        if (Array.isArray(goals)) {
          goals.forEach((g: any) => {
            if (g && g.name && g.color) {
              cachedProjectsMap![g.name] = g.color;
            }
          });
        }
      }
      lastCacheTime = now;
    }
    if (cachedProjectsMap && cachedProjectsMap[category]) {
      return cachedProjectsMap[category];
    }
  } catch {}

  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DYNAMIC_PALETTE.length;
  return DYNAMIC_PALETTE[index];
}
