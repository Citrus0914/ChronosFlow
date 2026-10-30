/**
 * ChronosFlow 日期与周期计算工具集
 * 支持日、周（周一至周日）、月等维度的时间范围计算与格式化
 */

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date | number): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 格式化为中文日期，例如：2026年10月29日
 */
export function formatChineseDate(date: Date | number): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}年${m}月${day}日`;
}

/**
 * 格式化为紧凑中文日期（当年省去“XXXX年”，跨年自动保留年份），避免小屏顶栏挤压换行
 */
export function formatShortChineseDate(date: Date | number): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const currentYear = new Date().getFullYear();
  return y === currentYear ? `${m}月${day}日` : `${y}年${m}月${day}日`;
}

/**
 * 获取星期几中文名称（周一 ~ 周日）
 */
export function getWeekdayName(date: Date | number): string {
  const d = new Date(date);
  const day = d.getDay();
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[day];
}

/**
 * 获取一天的开始时间戳 (00:00:00.000)
 */
export function getStartOfDay(date: Date | number): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * 获取一天的结束时间戳 (23:59:59.999)
 */
export function getEndOfDay(date: Date | number): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * 判断两个时间是否在同一天
 */
export function isSameDay(d1: Date | number, d2: Date | number): boolean {
  return formatDate(d1) === formatDate(d2);
}

/**
 * 计算给定日期所在的自然周范围（周一为第一天，周日为最后一天）
 */
export interface WeekRange {
  start: Date;
  end: Date;
  weekNumber: number;
  label: string;
  shortTitle: string;
  dateSpan: string;
  days: {
    date: Date;
    dateStr: string;
    weekdayName: string;
    dayOfMonth: number;
  }[];
}

export function getWeekRange(refDate: Date | number = new Date()): WeekRange {
  const d = new Date(refDate);
  const day = d.getDay();
  // 周一作为一周第一天：周日(0)偏移为 -6，周一(1)偏移为 0，周二(2)偏移为 -1 ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // 计算周数（近似 ISO 周数）
  const firstJan = new Date(monday.getFullYear(), 0, 1);
  const pastDaysOfYear = (monday.getTime() - firstJan.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstJan.getDay() + 1) / 7);

  const mMonth = monday.getMonth() + 1;
  const mDate = monday.getDate();
  const sMonth = sunday.getMonth() + 1;
  const sDate = sunday.getDate();

  const shortTitle = `${monday.getFullYear()}年 第${weekNumber}周`;
  const dateSpan = `${mMonth}月${mDate}日 - ${sMonth}月${sDate}日`;
  const label = `${shortTitle} (${dateSpan})`;

  const days = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    days.push({
      date: cur,
      dateStr: formatDate(cur),
      weekdayName: getWeekdayName(cur),
      dayOfMonth: cur.getDate(),
    });
  }

  return {
    start: monday,
    end: sunday,
    weekNumber,
    label,
    shortTitle,
    dateSpan,
    days,
  };
}

/**
 * 计算给定日期所在的自然月范围
 */
export interface MonthRange {
  start: Date;
  end: Date;
  year: number;
  month: number; // 1-12
  daysCount: number;
  label: string;
}

export function getMonthRange(refDate: Date | number = new Date()): MonthRange {
  const d = new Date(refDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  const start = new Date(year, d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(year, d.getMonth() + 1, 0, 23, 59, 59, 999);
  const daysCount = end.getDate();

  const label = `${year}年 ${month}月`;

  return {
    start,
    end,
    year,
    month,
    daysCount,
    label,
  };
}

/**
 * 判断某时间戳是否属于指定周区间
 */
export function isTimestampInWeek(timestamp: number, week: WeekRange): boolean {
  return timestamp >= week.start.getTime() && timestamp <= week.end.getTime();
}

/**
 * 判断某时间戳是否属于指定月区间
 */
export function isTimestampInMonth(timestamp: number, month: MonthRange): boolean {
  return timestamp >= month.start.getTime() && timestamp <= month.end.getTime();
}
