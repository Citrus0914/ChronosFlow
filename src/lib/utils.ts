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
  '开发/技术': '#3b82f6', // blue
  '工作/业务': '#10b981', // emerald
  '学习/提升': '#8b5cf6', // purple
  '健康/运动': '#f59e0b', // amber
  '休闲/生活': '#ec4899', // pink
  '其他工作': '#64748b', // slate
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

export function getCategoryColor(category: string): string {
  if (PRESET_CATEGORY_COLORS[category]) {
    return PRESET_CATEGORY_COLORS[category];
  }
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DYNAMIC_PALETTE.length;
  return DYNAMIC_PALETTE[index];
}
