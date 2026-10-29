import React, { useState, useMemo } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration, formatTimeRange, getCategoryColor } from '../lib/utils';
import {
  formatDate,
  formatChineseDate,
  getWeekdayName,
  getWeekRange,
  getMonthRange,
  isTimestampInWeek,
  isTimestampInMonth,
  isSameDay,
} from '../lib/dateUtils';
import type { ActivityMood, CategoryStat } from '../types';
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

  const deepWorkPercentage = totalMinutes > 0 ? Math.round((deepWorkMinutes / totalMinutes) * 100) : 0;

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

  // 分类统计
  const categoryStats: CategoryStat[] = useMemo(() => {
    if (totalMinutes === 0) return [];
    const map: Record<string, number> = {};
    for (const a of filteredActivities) {
      map[a.category] = (map[a.category] || 0) + a.durationMinutes;
    }
    return Object.entries(map)
      .map(([category, minutes]) => ({
        category,
        minutes,
        percentage: Math.round((minutes / totalMinutes) * 100),
        color: getCategoryColor(category),
      }))
      .sort((a, b) => b.minutes - a.minutes);
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
      heightPercent: d.minutes > 0 ? Math.max(12, Math.round((d.minutes / maxMinutes) * 100)) : 6,
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
      heightPercent: w.minutes > 0 ? Math.max(12, Math.round((w.minutes / maxWeekMin) * 100)) : 6,
    }));
  }, [period, currentMonthRange, filteredActivities]);

  // 周期标题文字
  const periodTitle = useMemo(() => {
    if (period === 'WEEK') {
      return currentWeekRange.label;
    }
    if (period === 'MONTH') {
      return currentMonthRange.label;
    }
    if (period === 'DAY') {
      return `${formatChineseDate(refDate)} ${getWeekdayName(refDate)}`;
    }
    return '历史累计全部数据';
  }, [period, currentWeekRange, currentMonthRange, refDate]);

  const isResetVisible = (period === 'WEEK' && !isCurrentWeek) ||
    (period === 'MONTH' && !isCurrentMonth) ||
    (period === 'DAY' && !isCurrentDay);

  return (
    <div className="space-y-4">
      {/* 模块顶部切换药丸：统计看板 VS 目标周预算 */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs shadow-md">
        <button
          onClick={() => {
            triggerHapticFeedback(15);
            setActiveModule('ANALYTICS');
          }}
          className={`py-1.5 rounded-lg text-center font-bold flex items-center justify-center space-x-1.5 transition-all ${
            activeModule === 'ANALYTICS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>多维统计看板</span>
        </button>
        <button
          onClick={() => {
            triggerHapticFeedback(15);
            setActiveModule('GOALS');
          }}
          className={`py-1.5 rounded-lg text-center font-bold flex items-center justify-center space-x-1.5 transition-all ${
            activeModule === 'GOALS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>目标与周预算</span>
        </button>
      </div>

      {activeModule === 'GOALS' ? (
        <MobileGoals />
      ) : (
        <>
          {/* 头部标题与 4 维切换控制 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  周期洞察分析
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {filteredActivities.length} 条记录
              </span>
            </div>

        {/* 4 维周期药丸选择器 */}
        <div className="grid grid-cols-4 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
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
                className={`py-1.5 rounded-lg text-center font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 周期日期翻页导航 (ALL 维度隐藏导航) */}
        {period !== 'ALL' && (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-700 active:scale-95 transition"
              title="上一周期"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-center min-w-0">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200 truncate">{periodTitle}</span>
              {isResetVisible && (
                <button
                  onClick={handleGoCurrent}
                  className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-medium border border-indigo-500/30 shrink-0 flex items-center space-x-1 active:scale-95 transition"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>回到当前</span>
                </button>
              )}
            </div>

            <button
              onClick={handleNext}
              className="p-1.5 rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-700 active:scale-95 transition"
              title="下一周期"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 4 格核心数据指标卡片 */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 总专注时长 */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px]">总投入时长</span>
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-base font-extrabold text-white font-mono tracking-tight">
            {formatDuration(totalMinutes)}
          </div>
          <div className="text-[10px] text-slate-500">
            {filteredActivities.length} 个时间块打卡
          </div>
        </div>

        {/* 深度心流时长 */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px]">深度心流 (≥30m)</span>
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
          </div>
          <div className="text-base font-extrabold text-amber-300 font-mono tracking-tight">
            {formatDuration(deepWorkMinutes)}
          </div>
          <div className="text-[10px] text-amber-400/80 font-medium">
            深度占比 {deepWorkPercentage}%
          </div>
        </div>

        {/* 日均专注时长 / 出勤统计 */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px]">
              {period === 'MONTH' ? '当月出勤天数' : '日均专注投入'}
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-extrabold text-emerald-300 font-mono tracking-tight">
            {period === 'MONTH'
              ? `${activeDaysCount} / ${currentMonthRange.daysCount} 天`
              : formatDuration(dailyAverageMinutes)}
          </div>
          <div className="text-[10px] text-slate-500">
            {period === 'MONTH'
              ? `出勤率 ${Math.round((activeDaysCount / currentMonthRange.daysCount) * 100)}%`
              : `周期出勤 ${activeDaysCount} 天`}
          </div>
        </div>

        {/* 心流巅峰频次 */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px]">心流巅峰次数</span>
            <Zap className="w-3.5 h-3.5 text-violet-400 fill-violet-400/20" />
          </div>
          <div className="text-base font-extrabold text-violet-300 font-mono tracking-tight">
            {flowCount} <span className="text-xs font-normal text-slate-400">次沉浸</span>
          </div>
          <div className="text-[10px] text-violet-400/80 font-medium">
            {flowCount > 0 ? '极高注意力品质' : '待激活心流'}
          </div>
        </div>
      </div>

      {/* 周度视图专属：周一至周日 7 天柱状分布图 */}
      {period === 'WEEK' && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-white">周度 7 天专注分布</h4>
            </div>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>👑 标记最高产日 (Peak)</span>
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 pt-4 pb-1 items-end">
            {weekDaysData.map((d) => {
              return (
                <div key={d.dateStr} className="flex flex-col items-center space-y-1.5">
                  {/* 柱顶标记 (Peak / 心流 / 时长) */}
                  <div className="h-6 flex items-center justify-center">
                    {d.isPeak ? (
                      <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] border border-amber-500/30 whitespace-nowrap">
                        Peak
                      </span>
                    ) : d.isDayFlow ? (
                      <Flame className="w-3 h-3 text-violet-400 fill-violet-400/30" />
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500">
                        {d.minutes > 0 ? `${Math.round((d.minutes / 60) * 10) / 10}h` : '-'}
                      </span>
                    )}
                  </div>

                  {/* 柱体条形 */}
                  <div className="w-full h-24 bg-slate-800/60 rounded-xl flex items-end p-1 relative overflow-hidden">
                    <div
                      style={{ height: `${d.heightPercent}%` }}
                      className={`w-full rounded-lg transition-all duration-500 ${
                        d.isPeak
                          ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-lg shadow-amber-500/30'
                          : d.isToday
                          ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-md shadow-indigo-500/30'
                          : d.minutes > 0
                          ? 'bg-gradient-to-t from-slate-700 to-slate-500'
                          : 'bg-transparent'
                      }`}
                    />
                  </div>

                  {/* 柱底日期与星期 */}
                  <div
                    className={`flex flex-col items-center justify-center w-full py-1 rounded-lg ${
                      d.isToday ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300' : 'text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] font-bold">{d.weekdayName.slice(-1)}</span>
                    <span className="text-[9px] font-mono opacity-80">{d.dayOfMonth}日</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 月度视图专属：按周趋势柱状图 */}
      {period === 'MONTH' && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-white">月度周次专注趋势</h4>
            </div>
            <span className="text-[10px] text-slate-400">
              共 {currentMonthRange.daysCount} 天
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {monthWeeksData.map((w) => {
              return (
                <div key={w.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{w.label}</span>
                    <span className="text-indigo-400 font-mono font-bold">
                      {formatDuration(w.minutes)}
                      <span className="text-[10px] text-slate-500 ml-1.5">({w.count}次)</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${w.heightPercent}%` }}
                      className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 分类时间投入比例堆叠进度条与列表 */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <PieChart className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-white">分类时间投入比例</h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {categoryStats.length} 个分类
          </span>
        </div>

        {totalMinutes === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            当前周期暂无活动分类数据
          </div>
        ) : (
          <>
            {/* 多色块堆叠进度条 */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800 shadow-inner">
              {categoryStats.map((c) => (
                <div
                  key={c.category}
                  style={{
                    width: `${c.percentage}%`,
                    backgroundColor: c.color,
                  }}
                  className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  title={`${c.category}: ${c.percentage}%`}
                />
              ))}
            </div>

            {/* 分类明细清单 */}
            <div className="space-y-2 pt-1">
              {categoryStats.map((c) => (
                <div
                  key={c.category}
                  className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-slate-200 font-medium truncate">{c.category}</span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 font-mono">
                    <span className="text-slate-400 text-[11px]">{formatDuration(c.minutes)}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                      style={{
                        backgroundColor: `${c.color}20`,
                        color: c.color,
                      }}
                    >
                      {c.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 6 维情绪与精力状态频次分布 */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h4 className="text-xs font-bold text-white">情绪与精力状态分布</h4>
          </div>
          <span className="text-[10px] text-slate-400">6 维认知状态</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* FLOW 心流 */}
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Flame className="w-3.5 h-3.5 text-violet-400 fill-violet-400" />
              <span className="text-violet-300 font-medium text-[11px]">心流沉浸</span>
            </div>
            <span className="font-mono font-bold text-violet-300">{moodStats.FLOW} 次</span>
          </div>

          {/* FOCUSED 专注 */}
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Smile className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 font-medium text-[11px]">专注投入</span>
            </div>
            <span className="font-mono font-bold text-blue-300">{moodStats.FOCUSED} 次</span>
          </div>

          {/* NORMAL 平常 */}
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 font-medium text-[11px]">常规推进</span>
            </div>
            <span className="font-mono font-bold text-slate-300">{moodStats.NORMAL} 次</span>
          </div>

          {/* TIRED 疲惫 */}
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 font-medium text-[11px]">疲惫力竭</span>
            </div>
            <span className="font-mono font-bold text-amber-300">{moodStats.TIRED} 次</span>
          </div>

          {/* FRUSTRATED 卡壳受挫 */}
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Frown className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-300 font-medium text-[11px]">卡壳受挫</span>
            </div>
            <span className="font-mono font-bold text-rose-300">{moodStats.FRUSTRATED} 次</span>
          </div>

          {/* DISTRACTED 分心走神 */}
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-orange-300 font-medium text-[11px]">杂念分心</span>
            </div>
            <span className="font-mono font-bold text-orange-300">{moodStats.DISTRACTED} 次</span>
          </div>
        </div>
      </div>

      {/* 本周期时间流水折叠卡片 */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
        <button
          onClick={() => {
            triggerHapticFeedback(10);
            setIsActivityListOpen(!isActivityListOpen);
          }}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-white">本周期时间块流水明细</h4>
            <span className="text-[10px] text-slate-500 font-mono">
              ({filteredActivities.length})
            </span>
          </div>
          <div className="flex items-center space-x-1 text-slate-400 text-xs">
            <span>{isActivityListOpen ? '收起' : '展开'}</span>
            {isActivityListOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {isActivityListOpen && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80 max-h-80 overflow-y-auto no-scrollbar">
            {filteredActivities.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                该周期暂无打卡记录
              </div>
            ) : (
              filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className="text-[9px] px-1.5 py-0.2 rounded font-medium text-white"
                        style={{ backgroundColor: getCategoryColor(act.category) }}
                      >
                        {act.category}
                      </span>
                      {act.isAutoDetected && (
                        <span className="flex items-center space-x-0.5 text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                          <Smartphone className="w-2.5 h-2.5" />
                          <span>感知</span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatTimeRange(act.startTime, act.endTime, act.isFuzzyTime)}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-200 truncate">{act.title}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {act.durationMinutes > 0 ? `${act.durationMinutes}m` : '进行中'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
