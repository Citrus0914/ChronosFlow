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
