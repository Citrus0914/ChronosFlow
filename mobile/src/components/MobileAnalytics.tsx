import React, { useState, useMemo } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import {
  formatDuration,
  formatCompactDuration,
  formatTimeRange,
  getCategoryColor,
} from '../lib/utils';
import {
  formatDate,
  formatShortChineseDate,
  getWeekdayName,
  getWeekRange,
  getMonthRange,
  isTimestampInWeek,
  isTimestampInMonth,
  isSameDay,
} from '../lib/dateUtils';
import { getActivityCategories, type ActivityMood, type CategoryStat } from '../types';
import {
  BarChart2,
  PieChart,
  Clock,
  Flame,
  Zap,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Smile,
  Frown,
  BatteryCharging,
  Sparkles,
  TrendingUp,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Target,
  Crown,
} from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';
import { MobileGoals } from './MobileGoals';

export type AnalyticsPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'ALL';

export const MobileAnalytics: React.FC = () => {
  const { activities } = useTimeStore();

  const [activeModule, setActiveModule] = useState<'ANALYTICS' | 'GOALS'>('ANALYTICS');
  const [period, setPeriod] = useState<AnalyticsPeriod>('WEEK');
  const [refDate, setRefDate] = useState<Date>(() => new Date());
  const [isActivityListOpen, setIsActivityListOpen] = useState(false);

  // 计算当前周期范围
  const currentWeekRange = useMemo(() => getWeekRange(refDate), [refDate]);
  const currentMonthRange = useMemo(() => getMonthRange(refDate), [refDate]);

  // 判断是否为实时所在的周/月/日
  const isCurrentWeek = useMemo(() => {
    const nowWeek = getWeekRange(new Date());
    return currentWeekRange.label === nowWeek.label;
  }, [currentWeekRange]);

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return (
      currentMonthRange.year === now.getFullYear() &&
      currentMonthRange.month === now.getMonth() + 1
    );
  }, [currentMonthRange]);

  const isCurrentDay = useMemo(() => isSameDay(refDate, new Date()), [refDate]);

  // 周期前后切换
  const handlePrev = () => {
    triggerHapticFeedback(15);
    const d = new Date(refDate);
    if (period === 'WEEK') {
      d.setDate(d.getDate() - 7);
    } else if (period === 'MONTH') {
      d.setMonth(d.getMonth() - 1);
    } else if (period === 'DAY') {
      d.setDate(d.getDate() - 1);
    }
    setRefDate(d);
  };

  const handleNext = () => {
    triggerHapticFeedback(15);
    const d = new Date(refDate);
    if (period === 'WEEK') {
      d.setDate(d.getDate() + 7);
    } else if (period === 'MONTH') {
      d.setMonth(d.getMonth() + 1);
    } else if (period === 'DAY') {
      d.setDate(d.getDate() + 1);
    }
    setRefDate(d);
  };

  const handleGoCurrent = () => {
    triggerHapticFeedback(20);
    setRefDate(new Date());
  };

  // 过滤所选周期内的活动（进行中任务如果发生在本周期也计算已流逝时长）
  const filteredActivities = useMemo(() => {
    const now = Date.now();
    const list = activities.map((a) => {
      if (a.status === 'IN_PROGRESS') {
        const elapsed = Math.max(1, Math.round((now - a.startTime) / 60000));
        return { ...a, durationMinutes: elapsed };
      }
      return a;
    });

    if (period === 'ALL') {
      return list;
    }
    if (period === 'WEEK') {
      return list.filter((a) => isTimestampInWeek(a.startTime, currentWeekRange));
    }
    if (period === 'MONTH') {
      return list.filter((a) => isTimestampInMonth(a.startTime, currentMonthRange));
    }
    if (period === 'DAY') {
      return list.filter((a) => isSameDay(a.startTime, refDate));
    }
    return list;
  }, [activities, period, currentWeekRange, currentMonthRange, refDate]);

  // 基础统计指标
  const totalMinutes = useMemo(() => {
    return filteredActivities.reduce((sum, a) => sum + a.durationMinutes, 0);
  }, [filteredActivities]);

  const deepWorkMinutes = useMemo(() => {
    return filteredActivities
      .filter((a) => a.durationMinutes >= 30 && (a.mood === 'FLOW' || a.mood === 'FOCUSED'))
      .reduce((sum, a) => sum + a.durationMinutes, 0);
  }, [filteredActivities]);

  const deepWorkPercentage =
    totalMinutes > 0 ? Math.round((deepWorkMinutes / totalMinutes) * 100) : 0;

  const flowCount = useMemo(() => {
    return filteredActivities.filter((a) => a.mood === 'FLOW').length;
  }, [filteredActivities]);

  // 活跃出勤天数统计
  const activeDaysSet = useMemo(() => {
    return new Set(filteredActivities.map((a) => formatDate(a.startTime)));
  }, [filteredActivities]);
  const activeDaysCount = activeDaysSet.size;

  // 日均时长
  const dailyAverageMinutes = useMemo(() => {
    if (period === 'WEEK') {
      return Math.round(totalMinutes / 7);
    }
    if (period === 'MONTH') {
      return Math.round(totalMinutes / currentMonthRange.daysCount);
    }
    if (period === 'DAY') {
      return totalMinutes;
    }
    return activeDaysCount > 0 ? Math.round(totalMinutes / activeDaysCount) : 0;
  }, [period, totalMinutes, currentMonthRange.daysCount, activeDaysCount]);

  // 分类统计（完整兼容多分类归属，并计算精确环形图占比）
  const { categoryStats, totalAttributedMinutes } = useMemo(() => {
    if (totalMinutes === 0) {
      return { categoryStats: [] as CategoryStat[], totalAttributedMinutes: 0 };
    }
    const map: Record<string, number> = {};
    let attributedSum = 0;
    for (const a of filteredActivities) {
      const cats = getActivityCategories(a);
      for (const cat of cats) {
        map[cat] = (map[cat] || 0) + a.durationMinutes;
        attributedSum += a.durationMinutes;
      }
    }
    const denom = Math.max(1, attributedSum);
    const stats = Object.entries(map)
      .map(([category, minutes]) => ({
        category,
        minutes,
        percentage: Math.round((minutes / denom) * 100),
        color: getCategoryColor(category),
      }))
      .sort((a, b) => b.minutes - a.minutes);

    return { categoryStats: stats, totalAttributedMinutes: denom };
  }, [filteredActivities, totalMinutes]);

  // 6 维情绪精力频次分布
  const moodStats = useMemo(() => {
    const map: Record<ActivityMood, number> = {
      FLOW: 0,
      FOCUSED: 0,
      NORMAL: 0,
      TIRED: 0,
      FRUSTRATED: 0,
      DISTRACTED: 0,
    };
    for (const a of filteredActivities) {
      if (a.mood && map[a.mood] !== undefined) {
        map[a.mood] += 1;
      } else {
        map.NORMAL += 1;
      }
    }
    return map;
  }, [filteredActivities]);

  // 周视图专属：周一至周日 7 天柱状分布
  const weekDaysData = useMemo(() => {
    if (period !== 'WEEK') return [];

    const days = currentWeekRange.days.map((day) => {
      const dayActs = filteredActivities.filter((a) => formatDate(a.startTime) === day.dateStr);
      const minutes = dayActs.reduce((sum, a) => sum + a.durationMinutes, 0);
      const isDayFlow = dayActs.some((a) => a.mood === 'FLOW');
      return {
        ...day,
        minutes,
        count: dayActs.length,
        isDayFlow,
        isToday: isSameDay(day.date, new Date()),
      };
    });

    const maxMinutes = Math.max(...days.map((d) => d.minutes), 1);
    return days.map((d) => ({
      ...d,
      heightPercent: d.minutes > 0 ? Math.max(10, Math.round((d.minutes / maxMinutes) * 100)) : 0,
      isPeak: d.minutes > 0 && d.minutes === maxMinutes,
    }));
  }, [period, currentWeekRange, filteredActivities]);

  // 月视图专属：按周统计月内走势
  const monthWeeksData = useMemo(() => {
    if (period !== 'MONTH') return [];
    const weeks: { label: string; shortLabel: string; minutes: number; count: number }[] = [];
    const totalDays = currentMonthRange.daysCount;
    const weekCount = Math.ceil(totalDays / 7);

    for (let w = 0; w < weekCount; w++) {
      const startDay = w * 7 + 1;
      const endDay = Math.min((w + 1) * 7, totalDays);
      const label = `第${w + 1}周 (${startDay}-${endDay}日)`;
      const shortLabel = `第${w + 1}周`;

      const weekActs = filteredActivities.filter((a) => {
        const d = new Date(a.startTime);
        const dayOfMonth = d.getDate();
        return dayOfMonth >= startDay && dayOfMonth <= endDay;
      });

      const minutes = weekActs.reduce((sum, a) => sum + a.durationMinutes, 0);
      weeks.push({ label, shortLabel, minutes, count: weekActs.length });
    }

    const maxWeekMin = Math.max(...weeks.map((w) => w.minutes), 1);
    return weeks.map((w) => ({
      ...w,
      heightPercent: w.minutes > 0 ? Math.max(10, Math.round((w.minutes / maxWeekMin) * 100)) : 4,
    }));
  }, [period, currentMonthRange, filteredActivities]);

  const isResetVisible =
    (period === 'WEEK' && !isCurrentWeek) ||
    (period === 'MONTH' && !isCurrentMonth) ||
    (period === 'DAY' && !isCurrentDay);

  // SVG 环形图几何参数
  const donutRadius = 46;
  const donutCircumference = 2 * Math.PI * donutRadius;

  // 紧凑柱顶时长文本
  const formatBarLabel = (minutes: number) => {
    if (minutes <= 0) return '';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.round((minutes / 60) * 10) / 10;
    return `${h}h`;
  };

  const totalActCount = Math.max(1, filteredActivities.length);
  const moodCards: {
    id: ActivityMood;
    label: string;
    count: number;
    icon: React.ReactNode;
    barColor: string;
    textClass: string;
    cardClass: string;
  }[] = [
    {
      id: 'FLOW',
      label: '心流沉浸',
      count: moodStats.FLOW,
      icon: <Flame className="w-3.5 h-3.5 text-violet-400 fill-violet-400/40 shrink-0" />,
      barColor: '#8b5cf6',
      textClass: 'text-violet-200',
      cardClass: 'bg-violet-500/8 border-violet-500/20',
    },
    {
      id: 'FOCUSED',
      label: '专注投入',
      count: moodStats.FOCUSED,
      icon: <Smile className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
      barColor: '#38bdf8',
      textClass: 'text-sky-200',
      cardClass: 'bg-sky-500/8 border-sky-500/20',
    },
    {
      id: 'NORMAL',
      label: '常规推进',
      count: moodStats.NORMAL,
      icon: <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
      barColor: '#94a3b8',
      textClass: 'text-slate-200',
      cardClass: 'bg-slate-800/50 border-white/[0.07]',
    },
    {
      id: 'TIRED',
      label: '疲惫力竭',
      count: moodStats.TIRED,
      icon: <BatteryCharging className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      barColor: '#f59e0b',
      textClass: 'text-amber-200',
      cardClass: 'bg-amber-500/8 border-amber-500/20',
    },
    {
      id: 'FRUSTRATED',
      label: '卡壳受挫',
      count: moodStats.FRUSTRATED,
      icon: <Frown className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
      barColor: '#f43f5e',
      textClass: 'text-rose-200',
      cardClass: 'bg-rose-500/8 border-rose-500/20',
    },
    {
      id: 'DISTRACTED',
      label: '杂念分心',
      count: moodStats.DISTRACTED,
      icon: <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
      barColor: '#f97316',
      textClass: 'text-orange-200',
      cardClass: 'bg-orange-500/8 border-orange-500/20',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 模块顶部切换药丸：统计看板 VS 目标周预算 */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-900/90 border border-white/[0.07] text-xs shadow-md">
        <button
          onClick={() => {
            triggerHapticFeedback(15);
            setActiveModule('ANALYTICS');
          }}
          className={`py-2 rounded-xl text-center font-bold flex items-center justify-center space-x-1.5 whitespace-nowrap transition-all ${
            activeModule === 'ANALYTICS'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 shrink-0" />
          <span>多维统计看板</span>
        </button>
        <button
          onClick={() => {
            triggerHapticFeedback(15);
            setActiveModule('GOALS');
          }}
          className={`py-2 rounded-xl text-center font-bold flex items-center justify-center space-x-1.5 whitespace-nowrap transition-all ${
            activeModule === 'GOALS'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span>目标与周预算</span>
        </button>
      </div>

      {activeModule === 'GOALS' ? (
        <MobileGoals />
      ) : (
        <>
          {/* 头部周期维度切换与双层无截断导航栏 */}
          <div className="space-y-2.5">
            {/* 4 维周期药丸选择器 */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-900/90 border border-white/[0.07] text-xs">
              {(
                [
                  { key: 'DAY', label: '日度' },
                  { key: 'WEEK', label: '周度' },
                  { key: 'MONTH', label: '月度' },
                  { key: 'ALL', label: '全部' },
                ] as const
              ).map((item) => {
                const isActive = period === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      triggerHapticFeedback(15);
                      setPeriod(item.key);
                    }}
                    className={`py-1.5 rounded-xl text-center font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* 周期日期翻页导航 (双行主副标题，彻底告别长文本挤断) */}
            {period !== 'ALL' && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl chronos-card">
                <button
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-xl bg-slate-800/90 border border-white/[0.06] text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center active:scale-95 transition shrink-0"
                  title="上一周期"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center justify-center min-w-0 flex-1 px-1">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-xs font-extrabold text-white whitespace-nowrap">
                      {period === 'WEEK'
                        ? currentWeekRange.shortTitle
                        : period === 'MONTH'
                        ? currentMonthRange.label
                        : `${formatShortChineseDate(refDate)} ${getWeekdayName(refDate)}`}
                    </span>

                    {!isResetVisible ? (
                      <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold whitespace-nowrap">
                        {period === 'WEEK' ? '本周' : period === 'MONTH' ? '本月' : '今天'}
                      </span>
                    ) : (
                      <button
                        onClick={handleGoCurrent}
                        className="px-2 py-0.5 leading-none rounded-md bg-indigo-500/20 text-indigo-200 text-[10px] font-bold border border-indigo-400/30 shrink-0 inline-flex items-center space-x-1 whitespace-nowrap active:scale-95 transition"
                      >
                        <RotateCcw className="w-2.5 h-2.5 shrink-0" />
                        <span>{period === 'WEEK' ? '回本周' : period === 'MONTH' ? '回本月' : '回今天'}</span>
                      </button>
                    )}
                  </div>

                  {period === 'WEEK' && (
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5 whitespace-nowrap">
                      {currentWeekRange.dateSpan}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="w-8 h-8 rounded-xl bg-slate-800/90 border border-white/[0.06] text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center active:scale-95 transition shrink-0"
                  title="下一周期"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 4 格核心数据指标卡片（带微光氛围与等宽数字） */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 总专注时长 */}
            <div className="p-3.5 rounded-2xl chronos-card space-y-1.5 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-4 -top-4 w-16 h-16 rounded-full bg-indigo-500/15 blur-xl" />
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium whitespace-nowrap">总投入时长</span>
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              </div>
              <div className="text-base font-extrabold text-white font-mono tabular-nums tracking-tight">
                {formatDuration(totalMinutes)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                共 {filteredActivities.length} 个时间块
              </div>
            </div>

            {/* 深度心流时长 */}
            <div className="p-3.5 rounded-2xl chronos-card space-y-1.5 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-4 -top-4 w-16 h-16 rounded-full bg-amber-500/15 blur-xl" />
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium whitespace-nowrap">深度专注 (≥30m)</span>
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 shrink-0" />
              </div>
              <div className="text-base font-extrabold text-amber-300 font-mono tabular-nums tracking-tight">
                {formatDuration(deepWorkMinutes)}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-amber-300/90 font-semibold whitespace-nowrap">
                  占比 {deepWorkPercentage}%
                </span>
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden max-w-[56px]">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${Math.min(100, deepWorkPercentage)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 日均专注时长 / 出勤统计 */}
            <div className="p-3.5 rounded-2xl chronos-card space-y-1.5 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-4 -top-4 w-16 h-16 rounded-full bg-emerald-500/15 blur-xl" />
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium whitespace-nowrap">
                  {period === 'MONTH' ? '当月活跃天数' : '日均专注投入'}
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
              <div className="text-base font-extrabold text-emerald-300 font-mono tabular-nums tracking-tight">
                {period === 'MONTH'
                  ? `${activeDaysCount} / ${currentMonthRange.daysCount} 天`
                  : formatDuration(dailyAverageMinutes)}
              </div>
              <div className="text-[10px] text-slate-400">
                {period === 'MONTH'
                  ? `活跃率 ${Math.round((activeDaysCount / currentMonthRange.daysCount) * 100)}%`
                  : `累计活跃 ${activeDaysCount} 天`}
              </div>
            </div>

            {/* 心流巅峰频次 */}
            <div className="p-3.5 rounded-2xl chronos-card space-y-1.5 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-4 -top-4 w-16 h-16 rounded-full bg-violet-500/15 blur-xl" />
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium whitespace-nowrap">心流巅峰频次</span>
                <Zap className="w-3.5 h-3.5 text-violet-400 fill-violet-400/20 shrink-0" />
              </div>
              <div className="text-base font-extrabold text-violet-300 font-mono tabular-nums tracking-tight">
                {flowCount} <span className="text-xs font-medium text-slate-400">次沉浸</span>
              </div>
              <div className="text-[10px] text-violet-300/80 font-medium">
                {flowCount > 0 ? '高密度注意力体验' : '待触发心流时刻'}
              </div>
            </div>
          </div>

          {/* 周度视图专属：升级版 7 天参考线柱状分布图 */}
          {period === 'WEEK' && (
            <div className="rounded-3xl chronos-card p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <BarChart2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <h4 className="text-xs font-bold text-white whitespace-nowrap">
                    周度 7 天专注分布
                  </h4>
                </div>
                <div className="flex items-center space-x-2.5 text-[10px] text-slate-400 shrink-0">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>峰值日</span>
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <span>今日</span>
                  </span>
                </div>
              </div>

              {/* 绘图区（带水平虚线刻度参考网） */}
              <div className="relative pt-2">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-8 h-28 flex flex-col justify-between"
                >
                  <div className="border-b border-dashed border-white/[0.06]" />
                  <div className="border-b border-dashed border-white/[0.06]" />
                  <div className="border-b border-white/[0.08]" />
                </div>

                <div className="relative z-10 grid grid-cols-7 gap-1.5 items-end">
                  {weekDaysData.map((d) => {
                    return (
                      <div key={d.dateStr} className="flex flex-col items-center">
                        {/* 柱顶数值与皇冠徽记（不拥挤、不裁切） */}
                        <div className="h-6 flex flex-col items-center justify-end mb-1">
                          {d.isPeak ? (
                            <div className="flex items-center gap-0.5 text-amber-300 font-mono tabular-nums font-extrabold text-[10px] leading-none whitespace-nowrap">
                              <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              <span>{formatBarLabel(d.minutes)}</span>
                            </div>
                          ) : d.minutes > 0 ? (
                            <span className="text-[10px] font-mono tabular-nums text-slate-300 font-semibold leading-none whitespace-nowrap">
                              {formatBarLabel(d.minutes)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-600 leading-none">
                              -
                            </span>
                          )}
                        </div>

                        {/* 柱体槽与渐变柱 */}
                        <div className="w-full h-28 flex items-end justify-center px-1">
                          <div className="w-full max-w-[24px] h-full rounded-t-xl rounded-b-md bg-slate-900/70 border border-white/[0.04] flex items-end overflow-hidden">
                            {d.minutes > 0 ? (
                              <div
                                style={{ height: `${d.heightPercent}%` }}
                                className={`w-full rounded-t-lg transition-all duration-500 ${
                                  d.isPeak
                                    ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-300 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
                                    : d.isToday
                                    ? 'bg-gradient-to-t from-indigo-600 via-indigo-500 to-sky-400 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                                    : d.isDayFlow
                                    ? 'bg-gradient-to-t from-violet-700 to-violet-400'
                                    : 'bg-gradient-to-t from-slate-700 to-slate-400'
                                }`}
                              />
                            ) : (
                              <div className="w-full h-1 bg-slate-800/80 rounded-full" />
                            )}
                          </div>
                        </div>

                        {/* 柱底星期与日期胶囊 */}
                        <div
                          className={`mt-2 flex flex-col items-center justify-center w-full py-1 rounded-xl transition-colors ${
                            d.isToday
                              ? 'bg-indigo-500/20 border border-indigo-400/35 text-indigo-200'
                              : d.isPeak
                              ? 'bg-amber-500/12 border border-amber-500/25 text-amber-200'
                              : 'text-slate-400'
                          }`}
                        >
                          <span className="text-[10px] font-bold leading-tight whitespace-nowrap">
                            {d.weekdayName.slice(-1)}
                          </span>
                          <span className="text-[9px] font-mono tabular-nums opacity-75 leading-tight mt-0.5 whitespace-nowrap">
                            {d.dayOfMonth}日
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 月度视图专属：按周趋势条形图 */}
          {period === 'MONTH' && (
            <div className="rounded-3xl chronos-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <BarChart2 className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white">月度周次专注趋势</h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  共 {currentMonthRange.daysCount} 天
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                {monthWeeksData.map((w) => {
                  return (
                    <div key={w.label} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-200 font-medium whitespace-nowrap">
                          {w.label}
                        </span>
                        <span className="text-indigo-300 font-mono tabular-nums font-bold whitespace-nowrap">
                          {formatCompactDuration(w.minutes)}
                          <span className="text-[10px] text-slate-500 font-normal ml-1">
                            ({w.count}次)
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${w.heightPercent}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 升级版分类时间投入：真实 SVG 环形饼图 + 进度明细清单 */}
          <div className="rounded-3xl chronos-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <PieChart className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white">分类时间投入结构</h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                {categoryStats.length} 个分类维度
              </span>
            </div>

            {totalMinutes === 0 || categoryStats.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                当前周期暂无活动分类数据
              </div>
            ) : (
              <>
                {/* 环形图 + Top 摘要对称展示 */}
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-950/55 border border-white/[0.05]">
                  {/* 左侧精致 SVG 环形图 */}
                  <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle
                        cx="60"
                        cy="60"
                        r={donutRadius}
                        fill="transparent"
                        stroke="rgba(30, 41, 59, 0.85)"
                        strokeWidth="13"
                      />
                      {(() => {
                        let cumulativeLength = 0;
                        const gapPx = categoryStats.length > 1 ? 2.2 : 0;
                        return categoryStats.map((seg) => {
                          const rawLen =
                            (seg.minutes / Math.max(1, totalAttributedMinutes)) *
                            donutCircumference;
                          const visibleLen = Math.max(1.5, rawLen - gapPx);
                          const dashArray = `${visibleLen} ${Math.max(
                            0,
                            donutCircumference - visibleLen
                          )}`;
                          const dashOffset = -cumulativeLength;
                          cumulativeLength += rawLen;
                          return (
                            <circle
                              key={seg.category}
                              cx="60"
                              cy="60"
                              r={donutRadius}
                              fill="transparent"
                              stroke={seg.color}
                              strokeWidth="13"
                              strokeDasharray={dashArray}
                              strokeDashoffset={dashOffset}
                              strokeLinecap="butt"
                              className="transition-all duration-500"
                            />
                          );
                        });
                      })()}
                    </svg>

                    {/* 环心总览读数 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[9px] text-slate-400 font-medium leading-none">
                        总投入
                      </span>
                      <span className="text-sm font-extrabold text-white font-mono tabular-nums leading-tight mt-0.5">
                        {formatCompactDuration(totalMinutes)}
                      </span>
                      <span className="text-[9px] text-indigo-300 font-mono leading-none mt-0.5">
                        {categoryStats.length} 类
                      </span>
                    </div>
                  </div>

                  {/* 右侧 Top 分类速览 */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {categoryStats.slice(0, 4).map((c) => (
                      <div
                        key={c.category}
                        className="flex items-center justify-between gap-1.5 text-xs"
                      >
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="text-slate-200 font-medium truncate text-[11px]">
                            {c.category}
                          </span>
                        </div>
                        <span
                          className="text-[10px] font-mono tabular-nums font-bold shrink-0"
                          style={{ color: c.color }}
                        >
                          {c.percentage}%
                        </span>
                      </div>
                    ))}
                    {categoryStats.length > 4 && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        + 其余 {categoryStats.length - 4} 个分类见下方明细
                      </div>
                    )}
                  </div>
                </div>

                {/* 全部分类比例条与时长明细清单 */}
                <div className="space-y-2.5">
                  {categoryStats.map((c) => (
                    <div key={c.category} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="text-slate-200 font-semibold truncate">
                            {c.category}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0 font-mono tabular-nums">
                          <span className="text-slate-400 text-[11px] whitespace-nowrap">
                            {formatDuration(c.minutes)}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 leading-none rounded-md font-bold whitespace-nowrap"
                            style={{
                              backgroundColor: `${c.color}20`,
                              color: c.color,
                            }}
                          >
                            {c.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(3, c.percentage)}%`,
                            backgroundColor: c.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 升级版 6 维情绪与精力状态分布（带比例微计量条） */}
          <div className="rounded-3xl chronos-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h4 className="text-xs font-bold text-white">情绪与精力状态分布</h4>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">6 维认知能量</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {moodCards.map((m) => {
                const ratio =
                  filteredActivities.length > 0
                    ? Math.round((m.count / totalActCount) * 100)
                    : 0;
                return (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-2xl border space-y-2 ${m.cardClass}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        {m.icon}
                        <span className={`font-semibold text-[11px] whitespace-nowrap ${m.textClass}`}>
                          {m.label}
                        </span>
                      </div>
                      <span className={`font-mono tabular-nums font-bold text-xs whitespace-nowrap ${m.textClass}`}>
                        {m.count}次
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: m.count > 0 ? `${Math.max(8, ratio)}%` : '0%',
                          backgroundColor: m.barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 本周期时间流水折叠卡片（彻底修复分类徽章竖排断字问题） */}
          <div className="rounded-3xl chronos-card p-4 space-y-3">
            <button
              onClick={() => {
                triggerHapticFeedback(10);
                setIsActivityListOpen(!isActivityListOpen);
              }}
              className="w-full flex items-center justify-between gap-2 text-left"
            >
              <div className="flex items-center space-x-1.5 min-w-0">
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                <h4 className="text-xs font-bold text-white whitespace-nowrap">
                  本周期时间块流水明细
                </h4>
                <span className="text-[10px] text-slate-500 font-mono tabular-nums shrink-0">
                  ({filteredActivities.length})
                </span>
              </div>
              <div className="flex items-center space-x-1 text-slate-400 text-xs whitespace-nowrap shrink-0">
                <span>{isActivityListOpen ? '收起' : '展开'}</span>
                {isActivityListOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {isActivityListOpen && (
              <div className="space-y-2 pt-2 border-t border-white/[0.06] max-h-80 overflow-y-auto no-scrollbar">
                {filteredActivities.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    该周期暂无打卡记录
                  </div>
                ) : (
                  filteredActivities.map((act) => {
                    const catCol = getCategoryColor(act.category);
                    return (
                      <div
                        key={act.id}
                        className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/[0.06] flex items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span
                              className="text-[10px] px-1.5 py-0.5 leading-none rounded-md font-semibold border whitespace-nowrap shrink-0"
                              style={{
                                backgroundColor: `${catCol}18`,
                                borderColor: `${catCol}38`,
                                color: catCol,
                              }}
                            >
                              {act.category}
                            </span>
                            {act.isAutoDetected && (
                              <span className="inline-flex items-center space-x-0.5 text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-indigo-500/20 text-indigo-300 whitespace-nowrap shrink-0">
                                <Smartphone className="w-2.5 h-2.5 shrink-0" />
                                <span>感知</span>
                              </span>
                            )}
                            <span className="text-[10px] font-mono tabular-nums text-slate-400 whitespace-nowrap">
                              {formatTimeRange(act.startTime, act.endTime, act.isFuzzyTime)}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-100 truncate">
                            {act.title}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono tabular-nums font-extrabold text-indigo-300 whitespace-nowrap">
                            {act.durationMinutes > 0
                              ? formatCompactDuration(act.durationMinutes)
                              : '进行中'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
