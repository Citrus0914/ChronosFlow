import React, { useState, useMemo } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration, formatTimeRange } from '../lib/utils';
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
  PieChart,
  Clock,
  Flame,
  Zap,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CalendarPlus,
  BarChart2,
  Trash2,
  Smile,
  Frown,
  BatteryCharging,
  Sparkles,
  Award,
  TrendingUp,
} from 'lucide-react';

export type AnalyticsPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'ALL';

const CATEGORY_COLORS: Record<string, string> = {
  '开发/技术': '#3b82f6', // blue
  '工作/业务': '#10b981', // emerald
  '学习/提升': '#8b5cf6', // purple
  '健康/运动': '#f59e0b', // amber
  '休闲/生活': '#ec4899', // pink
  '其他工作': '#64748b', // slate
};

export const AnalyticsView: React.FC = () => {
  const { activities, deleteActivity, setManualModalOpen } = useTimeStore();

  const [period, setPeriod] = useState<AnalyticsPeriod>('WEEK');
  const [refDate, setRefDate] = useState<Date>(() => new Date());

  // 计算当前周期范围
  const currentWeekRange = useMemo(() => getWeekRange(refDate), [refDate]);
  const currentMonthRange = useMemo(() => getMonthRange(refDate), [refDate]);

  // 判断是否为当前实时所在的周/月/日
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

  // 周期导航切换
  const handlePrev = () => {
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
    setRefDate(new Date());
  };

  // 过滤所选周期内的活动
  const completedAll = activities.filter((a) => a.status === 'COMPLETED');

  const filteredActivities = useMemo(() => {
    if (period === 'ALL') {
      return completedAll;
    }
    if (period === 'WEEK') {
      return completedAll.filter((a) => isTimestampInWeek(a.startTime, currentWeekRange));
    }
    if (period === 'MONTH') {
      return completedAll.filter((a) => isTimestampInMonth(a.startTime, currentMonthRange));
    }
    if (period === 'DAY') {
      return completedAll.filter((a) => isSameDay(a.startTime, refDate));
    }
    return completedAll;
  }, [completedAll, period, currentWeekRange, currentMonthRange, refDate]);

  // 基础统计指标
  const totalMinutes = filteredActivities.reduce((sum, a) => sum + a.durationMinutes, 0);

  const deepWorkMinutes = filteredActivities
    .filter((a) => a.durationMinutes >= 45 && (a.mood === 'FLOW' || a.mood === 'FOCUSED'))
    .reduce((sum, a) => sum + a.durationMinutes, 0);

  const flowCount = filteredActivities.filter((a) => a.mood === 'FLOW').length;

  // 活跃天数统计（周期内有记录的不重复日期数）
  const activeDaysSet = new Set(filteredActivities.map((a) => formatDate(a.startTime)));
  const activeDaysCount = activeDaysSet.size;

  // 计算日均专注时长
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
    return Object.entries(map).map(([category, minutes]) => ({
      category,
      minutes,
      percentage: Math.round((minutes / totalMinutes) * 100),
      color: CATEGORY_COLORS[category] || '#64748b',
    })).sort((a, b) => b.minutes - a.minutes);
  }, [filteredActivities, totalMinutes]);

  // 情绪分布统计
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
      map[a.mood] = (map[a.mood] || 0) + 1;
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
      heightPercent: Math.max(6, Math.round((d.minutes / maxMinutes) * 100)),
      isPeak: d.minutes > 0 && d.minutes === maxMinutes,
    }));
  }, [period, currentWeekRange, filteredActivities]);

  // 月视图专属：按周统计月内走势
  const monthWeeksData = useMemo(() => {
    if (period !== 'MONTH') return [];
    // 将月份划分为 4-5 个区间
    const weeks: { label: string; minutes: number; count: number }[] = [];
    const totalDays = currentMonthRange.daysCount;
    const weekCount = Math.ceil(totalDays / 7);

    for (let w = 0; w < weekCount; w++) {
      const startDay = w * 7 + 1;
      const endDay = Math.min((w + 1) * 7, totalDays);
      const label = `第${w + 1}周 (${startDay}-${endDay}日)`;

      const weekActs = filteredActivities.filter((a) => {
        const d = new Date(a.startTime);
        const dayOfMonth = d.getDate();
        return dayOfMonth >= startDay && dayOfMonth <= endDay;
      });

      const minutes = weekActs.reduce((sum, a) => sum + a.durationMinutes, 0);
      weeks.push({ label, minutes, count: weekActs.length });
    }

    const maxWeekMin = Math.max(...weeks.map((w) => w.minutes), 1);
    return weeks.map((w) => ({
      ...w,
      heightPercent: Math.max(8, Math.round((w.minutes / maxWeekMin) * 100)),
    }));
  }, [period, currentMonthRange, filteredActivities]);

  const renderMoodBadge = (mood: ActivityMood) => {
    switch (mood) {
      case 'FLOW':
        return (
          <span className="flex items-center text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Flame className="w-3 h-3 mr-1 text-indigo-400 fill-indigo-400" />
            心流
          </span>
        );
      case 'FOCUSED':
        return (
          <span className="flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Smile className="w-3 h-3 mr-1" />
            专注
          </span>
        );
      case 'FRUSTRATED':
        return (
          <span className="flex items-center text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Frown className="w-3 h-3 mr-1" />
            卡壳受挫
          </span>
        );
      case 'TIRED':
        return (
          <span className="flex items-center text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BatteryCharging className="w-3 h-3 mr-1" />
            疲惫
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部控制面板：维度切换与周期导航 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#131b2e]/70 border border-white/5">
        {/* 维度切换药丸 */}
        <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/5 text-xs">
          <button
            type="button"
            onClick={() => setPeriod('WEEK')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
              period === 'WEEK'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            周度分析 (星期)
          </button>
          <button
            type="button"
            onClick={() => setPeriod('MONTH')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
              period === 'MONTH'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            月度分析 (月)
          </button>
          <button
            type="button"
            onClick={() => setPeriod('DAY')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
              period === 'DAY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            日度分析 (日)
          </button>
          <button
            type="button"
            onClick={() => setPeriod('ALL')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
              period === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            全部总览
          </button>
        </div>

        {/* 周期切换与补齐入口 */}
        <div className="flex items-center space-x-2">
          {period !== 'ALL' && (
            <div className="flex items-center space-x-1 bg-white/5 rounded-xl p-1 border border-white/5">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title={period === 'WEEK' ? '上一周' : period === 'MONTH' ? '上一月' : '前一天'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2 px-3 text-xs font-semibold text-white">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {period === 'WEEK' && currentWeekRange.label}
                  {period === 'MONTH' && currentMonthRange.label}
                  {period === 'DAY' && `${formatChineseDate(refDate)} (${getWeekdayName(refDate)})`}
                </span>
                {period === 'WEEK' && isCurrentWeek && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                    本周
                  </span>
                )}
                {period === 'MONTH' && isCurrentMonth && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                    本月
                  </span>
                )}
                {period === 'DAY' && isCurrentDay && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                    今天
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title={period === 'WEEK' ? '下一周' : period === 'MONTH' ? '下一月' : '后一天'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {period !== 'ALL' &&
            ((period === 'WEEK' && !isCurrentWeek) ||
              (period === 'MONTH' && !isCurrentMonth) ||
              (period === 'DAY' && !isCurrentDay)) && (
              <button
                type="button"
                onClick={handleGoCurrent}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition cursor-pointer border border-white/5"
                title="回到当前周期"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {period === 'WEEK' ? '本周' : period === 'MONTH' ? '本月' : '今天'}
                </span>
              </button>
            )}

          {/* 补齐历史记录按钮 */}
          <button
            type="button"
            onClick={() =>
              setManualModalOpen(true, {
                defaultDate: formatDate(refDate),
              })
            }
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>补齐记录</span>
          </button>
        </div>
      </div>

      {/* 核心指标统计横幅 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#131b2e]/60 border border-white/5 space-y-1">
          <div className="flex items-center text-xs text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            {period === 'WEEK' ? '本周总记录耗时' : period === 'MONTH' ? '本月总记录耗时' : '记录总耗时'}
          </div>
          <div className="text-xl font-bold text-white">
            {formatDuration(totalMinutes)}
          </div>
          <div className="text-[11px] text-slate-500">
            共 {filteredActivities.length} 个时间块
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e]/60 border border-white/5 space-y-1">
          <div className="flex items-center text-xs text-slate-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            日均专注时长
          </div>
          <div className="text-xl font-bold text-white">
            {formatDuration(dailyAverageMinutes)}
          </div>
          <div className="text-[11px] text-slate-500">
            活跃专注天数：{activeDaysCount} 天
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e]/60 border border-white/5 space-y-1">
          <div className="flex items-center text-xs text-slate-400 font-medium">
            <Flame className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            深度工作时长
          </div>
          <div className="text-xl font-bold text-white">
            {formatDuration(deepWorkMinutes)}
          </div>
          <div className="text-[11px] text-slate-500">
            深度占比 {totalMinutes > 0 ? Math.round((deepWorkMinutes / totalMinutes) * 100) : 0}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e]/60 border border-white/5 space-y-1">
          <div className="flex items-center text-xs text-slate-400 font-medium">
            <Zap className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            心流巅峰时段
          </div>
          <div className="text-xl font-bold text-white">{flowCount} 次</div>
          <div className="text-[11px] text-slate-500">极致沉浸状态</div>
        </div>
      </div>

      {/* 周度专属：周一至周日 7 天柱状分布图 */}
      {period === 'WEEK' && (
        <div className="p-6 rounded-2xl bg-[#131b2e]/50 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center">
              <BarChart2 className="w-4 h-4 mr-2 text-indigo-400" />
              周度每日专注时长分布 (周一 ~ 周日)
            </h3>
            <span className="text-xs text-slate-500">
              点击具体日期可快速补齐该天记录
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-6 pb-2 items-end min-h-[180px]">
            {weekDaysData.map((d) => (
              <div
                key={d.dateStr}
                onClick={() =>
                  setManualModalOpen(true, {
                    defaultDate: d.dateStr,
                  })
                }
                className="group flex flex-col items-center cursor-pointer"
                title={`${d.dateStr} (${d.weekdayName})：${formatDuration(d.minutes)}，${d.count} 个时间块。点击补齐此日记录`}
              >
                {/* 顶端标签与高光徽章 */}
                <div className="h-6 flex items-center justify-center mb-1 text-[11px]">
                  {d.isPeak && d.minutes > 0 ? (
                    <span className="flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                      <Award className="w-3 h-3 mr-0.5 text-amber-400" />
                      Peak
                    </span>
                  ) : (
                    <span className="text-slate-400 opacity-0 group-hover:opacity-100 transition font-mono">
                      {d.minutes > 0 ? formatDuration(d.minutes) : ''}
                    </span>
                  )}
                </div>

                {/* 柱状条轨道 */}
                <div className="w-full max-w-[42px] h-32 bg-white/5 rounded-xl flex items-end p-1 relative overflow-hidden group-hover:bg-white/10 transition">
                  <div
                    style={{ height: `${d.heightPercent}%` }}
                    className={`w-full rounded-lg transition-all duration-300 ${
                      d.minutes === 0
                        ? 'bg-transparent'
                        : d.isPeak
                        ? 'bg-gradient-to-t from-amber-500 via-indigo-500 to-indigo-400 shadow-lg shadow-indigo-500/30'
                        : 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                    }`}
                  />
                </div>

                {/* 底部日期与星期标签 */}
                <div className="mt-2 text-center">
                  <div
                    className={`text-xs font-semibold ${
                      d.isToday ? 'text-indigo-400' : 'text-slate-300'
                    }`}
                  >
                    {d.weekdayName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {d.date.getMonth() + 1}/{d.dayOfMonth}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {d.minutes > 0 ? `${(d.minutes / 60).toFixed(1)}h` : '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 月度专属：自然周节奏走势图 */}
      {period === 'MONTH' && (
        <div className="p-6 rounded-2xl bg-[#131b2e]/50 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center">
              <BarChart2 className="w-4 h-4 mr-2 text-indigo-400" />
              月度周节奏走势
            </h3>
            <span className="text-xs text-slate-400">
              当月出勤率：{activeDaysCount} / {currentMonthRange.daysCount} 天 (
              {Math.round((activeDaysCount / currentMonthRange.daysCount) * 100)}%)
            </span>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-5 gap-3 pt-4 pb-2 items-end min-h-[160px]">
            {monthWeeksData.map((w) => (
              <div key={w.label} className="flex flex-col items-center">
                <div className="text-[11px] text-slate-400 mb-1 font-mono">
                  {w.minutes > 0 ? formatDuration(w.minutes) : '0m'}
                </div>
                <div className="w-full max-w-[50px] h-28 bg-white/5 rounded-xl flex items-end p-1">
                  <div
                    style={{ height: `${w.heightPercent}%` }}
                    className="w-full rounded-lg bg-gradient-to-t from-indigo-600 to-purple-400 transition-all duration-300"
                  />
                </div>
                <div className="text-xs text-slate-300 font-medium mt-2">{w.label}</div>
                <div className="text-[10px] text-slate-500">{w.count} 个时间块</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 分类耗时结构 */}
      <div className="p-6 rounded-2xl bg-[#131b2e]/50 border border-white/5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center">
            <PieChart className="w-4 h-4 mr-2 text-indigo-400" />
            分类时间投入比例
          </h3>
          <span className="text-xs text-slate-500">按分钟与百分比统计</span>
        </div>

        {categoryStats.length === 0 ? (
          <div className="text-center py-8 text-slate-500 space-y-2">
            <p className="text-xs">所选周期暂无分类统计数据</p>
            <button
              type="button"
              onClick={() =>
                setManualModalOpen(true, {
                  defaultDate: formatDate(refDate),
                })
              }
              className="text-xs text-indigo-400 hover:underline cursor-pointer"
            >
              ➕ 为此周期补齐记录
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 堆叠进度条 */}
            <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden flex">
              {categoryStats.map((item) => (
                <div
                  key={item.category}
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                  title={`${item.category}: ${item.percentage}% (${formatDuration(item.minutes)})`}
                />
              ))}
            </div>

            {/* 详细条目列表 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {categoryStats.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-slate-200">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-white">
                      {formatDuration(item.minutes)}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 情绪与精力状态分布 */}
      <div className="p-6 rounded-2xl bg-[#131b2e]/50 border border-white/5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center">
          <Sparkles className="w-4 h-4 mr-2 text-indigo-400" />
          周期精力与情绪状态分布
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs text-slate-400">心流状态</div>
              <div className="text-base font-bold text-white">{moodStats.FLOW} 次</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Smile className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs text-slate-400">深度专注</div>
              <div className="text-base font-bold text-white">{moodStats.FOCUSED} 次</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-slate-500/20 text-slate-300">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs text-slate-400">平稳完成</div>
              <div className="text-base font-bold text-white">{moodStats.NORMAL} 次</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400">
              <BatteryCharging className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs text-slate-400">略显疲惫</div>
              <div className="text-base font-bold text-white">{moodStats.TIRED} 次</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <Frown className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs text-slate-400">卡壳受挫</div>
              <div className="text-base font-bold text-white">{moodStats.FRUSTRATED} 次</div>
            </div>
          </div>
        </div>
      </div>

      {/* 所选周期内的活动明细清单 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-indigo-400" />
            周期内时间块明细 ({filteredActivities.length} 项)
          </h2>
          <button
            type="button"
            onClick={() =>
              setManualModalOpen(true, {
                defaultDate: formatDate(refDate),
              })
            }
            className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>补齐此周期记录</span>
          </button>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#131b2e]/40 border border-white/5 text-center text-slate-400 space-y-2">
            <p className="text-sm">该周期暂无任何时间记录</p>
            <p className="text-xs text-slate-500">点击上方“补齐记录”随时补充过去时间块</p>
          </div>
        ) : (
          filteredActivities
            .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
            .map((activity) => (
              <div
                key={activity.id}
                className="group relative flex items-center justify-between p-3.5 rounded-xl bg-[#131b2e]/60 hover:bg-[#18233c] border border-white/5 hover:border-white/10 transition-all duration-150"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-slate-100 text-sm">
                        {activity.title}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400">
                        {activity.category}
                      </span>
                      {renderMoodBadge(activity.mood)}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center space-x-2">
                      <span className="text-indigo-400 font-mono">
                        {formatDate(activity.startTime)}
                      </span>
                      <span>·</span>
                      {activity.isFuzzyTime ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-medium">
                          🕒 未知时段 (仅记时长)
                        </span>
                      ) : (
                        <span>{formatTimeRange(activity.startTime, activity.endTime)}</span>
                      )}
                      <span>·</span>
                      <span className="text-slate-400 italic">“{activity.rawInput}”</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="font-semibold text-slate-200 text-sm">
                    {formatDuration(activity.durationMinutes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteActivity(activity.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                    title="删除此记录"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
