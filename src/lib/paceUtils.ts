import type { BudgetType, PaceStatus } from '../types';

export interface PaceEvaluation {
  status: PaceStatus;
  label: string;
  badgeClass: string;
  description: string;
  percent: number; // 目标达成率 (0~100+)
  timeProgressPercent: number; // 当前自然周已流逝的时间百分比 (0~100)
}

/**
 * 计算当前自然周已经流逝的时间占全周总时间的比例 (0.0 ~ 1.0)
 * 以周一 00:00:00 为起始，周日 23:59:59 为结束 (共 168 小时)
 */
export function getCurrentWeekTimeProgress(now: Date = new Date()): number {
  const day = now.getDay(); // 0 是周日, 1-6 是周一到周六
  const dayOffset = day === 0 ? 6 : day - 1; // 转换为周一为第0天
  const hours = now.getHours();
  const minutes = now.getMinutes();

  const totalMinutesInWeek = 7 * 24 * 60; // 10080
  const elapsedMinutes = dayOffset * 24 * 60 + hours * 60 + minutes;

  return Math.min(1, Math.max(0, elapsedMinutes / totalMinutesInWeek));
}

/**
 * 评估预算达成节奏与健康度
 * @param actualMinutes 实际投入分钟数
 * @param targetHours 目标小时数
 * @param budgetType 至少投入 (AT_LEAST) | 不超过上限 (AT_MOST)
 * @param now 当前时间戳，默认当前时刻
 */
export function evaluatePace(
  actualMinutes: number,
  targetHours: number,
  budgetType: BudgetType,
  now: Date = new Date()
): PaceEvaluation {
  const targetMinutes = Math.max(1, targetHours * 60);
  const actualRatio = actualMinutes / targetMinutes;
  const percent = Math.round(actualRatio * 100);

  const timeProgress = getCurrentWeekTimeProgress(now);
  const timeProgressPercent = Math.round(timeProgress * 100);

  if (budgetType === 'AT_LEAST') {
    // 至少投入型 (越多越好 / 达到目标)
    if (actualRatio >= 1.0) {
      return {
        status: 'COMPLETED',
        label: '已达成',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        description: `已超额达成周目标 (${percent}%)，干得漂亮！`,
        percent,
        timeProgressPercent,
      };
    }

    if (actualRatio >= timeProgress + 0.1) {
      return {
        status: 'AHEAD',
        label: '进度超前',
        badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        description: `投入进度 (${percent}%) 领先时间节奏 (${timeProgressPercent}%)`,
        percent,
        timeProgressPercent,
      };
    }

    if (actualRatio >= timeProgress - 0.15) {
      return {
        status: 'ON_TRACK',
        label: '节奏良好',
        badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        description: `稳步推进中，与本周时间流速基本匹配`,
        percent,
        timeProgressPercent,
      };
    }

    return {
      status: 'BEHIND',
      label: '进度滞后',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: `落后于时间进度 (${percent}% < ${timeProgressPercent}%)，需关注精力分配`,
      percent,
      timeProgressPercent,
    };
  }

  // 不超过上限型 (AT_MOST: 休闲/娱乐等克制型)
  if (actualRatio > 1.0) {
    return {
      status: 'EXCEEDED',
      label: '已超预算',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      description: `已超出上限预算 (${percent}%)，注意收拢时间投入！`,
      percent,
      timeProgressPercent,
    };
  }

  if (actualRatio > timeProgress + 0.12) {
    return {
      status: 'WARNING',
      label: '消耗过快',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: `消耗比例 (${percent}%) 明显过快，警惕周末时间赤字`,
      percent,
      timeProgressPercent,
    };
  }

  return {
    status: 'HEALTHY',
    label: '克制健康',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: `保持良好克制 (${percent}%)，低于周时间线上限`,
    percent,
    timeProgressPercent,
  };
}
