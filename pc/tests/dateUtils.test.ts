import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatChineseDate,
  getWeekdayName,
  getStartOfDay,
  getEndOfDay,
  isSameDay,
  getWeekRange,
  getMonthRange,
  isTimestampInWeek,
  isTimestampInMonth,
} from '../src/lib/dateUtils';

describe('ChronosFlow Date Utils', () => {
  it('正确格式化年月日与中文日期', () => {
    const d = new Date(2026, 9, 29, 14, 30); // 2026-10-29
    expect(formatDate(d)).toBe('2026-10-29');
    expect(formatChineseDate(d)).toBe('2026年10月29日');
    expect(getWeekdayName(d)).toBe('周四');
  });

  it('正确计算一天的起止时间戳', () => {
    const d = new Date(2026, 9, 29, 14, 30);
    const start = new Date(getStartOfDay(d));
    const end = new Date(getEndOfDay(d));

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);

    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);

    expect(isSameDay(start, end)).toBe(true);
  });

  it('正确计算自然周（周一至周日）', () => {
    // 2026-10-29 是周四
    const d = new Date(2026, 9, 29);
    const week = getWeekRange(d);

    expect(week.days.length).toBe(7);
    expect(week.days[0].weekdayName).toBe('周一');
    expect(week.days[0].dateStr).toBe('2026-10-26');
    expect(week.days[6].weekdayName).toBe('周日');
    expect(week.days[6].dateStr).toBe('2026-11-01');

    // 检查周四是否在区间内
    expect(isTimestampInWeek(d.getTime(), week)).toBe(true);
  });

  it('周日应当正确归属于本周最后一天（非下一周）', () => {
    // 2026-11-01 是周日
    const sunday = new Date(2026, 10, 1, 15, 0);
    const week = getWeekRange(sunday);

    expect(week.days[0].dateStr).toBe('2026-10-26');
    expect(week.days[6].dateStr).toBe('2026-11-01');
    expect(isTimestampInWeek(sunday.getTime(), week)).toBe(true);
  });

  it('正确计算自然月区间与包含判断', () => {
    const d = new Date(2026, 9, 15); // 10月15日
    const month = getMonthRange(d);

    expect(month.year).toBe(2026);
    expect(month.month).toBe(10);
    expect(month.daysCount).toBe(31);
    expect(formatDate(month.start)).toBe('2026-10-01');
    expect(formatDate(month.end)).toBe('2026-10-31');

    expect(isTimestampInMonth(d.getTime(), month)).toBe(true);
    expect(isTimestampInMonth(new Date(2026, 10, 1).getTime(), month)).toBe(false);
  });
});
