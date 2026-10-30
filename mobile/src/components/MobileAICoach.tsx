import React, { useState, useMemo, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration, formatCompactDuration } from '../lib/utils';
import {
  formatShortChineseDate,
  getWeekdayName,
  getWeekRange,
  getMonthRange,
  isTimestampInWeek,
  isTimestampInMonth,
  isSameDay,
} from '../lib/dateUtils';
import {
  Brain,
  Sparkles,
  RefreshCw,
  Zap,
  Lightbulb,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shield,
  Clock,
  BrainCircuit,
  TrendingUp,
  Play,
  Cpu,
} from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';
import type { AICoachDebrief } from '../types';

export type DebriefPeriod = 'WEEK' | 'MONTH' | 'DAY';

export const MobileAICoach: React.FC = () => {
  const {
    activities,
    settings,
    isDebriefLoading,
    generateDebrief,
    getDebriefForPeriod,
    addToast,
  } = useTimeStore();

  const [period, setPeriod] = useState<DebriefPeriod>('WEEK');
  const [refDate, setRefDate] = useState<Date>(() => new Date());

  // 周期范围计算
  const currentWeekRange = useMemo(() => getWeekRange(refDate), [refDate]);
  const currentMonthRange = useMemo(() => getMonthRange(refDate), [refDate]);

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

  // 周期主标题
  const periodMainTitle = useMemo(() => {
    if (period === 'WEEK') return currentWeekRange.shortTitle;
    if (period === 'MONTH') return currentMonthRange.label;
    return `${formatShortChineseDate(refDate)} ${getWeekdayName(refDate)}`;
  }, [period, currentWeekRange, currentMonthRange, refDate]);

  // 周期前后导航
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

  // 过滤所选周期内的已完成活动
  const completedAll = useMemo(
    () => activities.filter((a) => a.status === 'COMPLETED'),
    [activities]
  );

  const periodActivities = useMemo(() => {
    if (period === 'WEEK') {
      return completedAll.filter((a) => isTimestampInWeek(a.startTime, currentWeekRange));
    }
    if (period === 'MONTH') {
      return completedAll.filter((a) => isTimestampInMonth(a.startTime, currentMonthRange));
    }
    return completedAll.filter((a) => isSameDay(a.startTime, refDate));
  }, [completedAll, period, currentWeekRange, currentMonthRange, refDate]);

  const totalMinutes = useMemo(
    () => periodActivities.reduce((sum, a) => sum + a.durationMinutes, 0),
    [periodActivities]
  );

  const deepWorkMinutes = useMemo(
    () =>
      periodActivities
        .filter((a) => a.durationMinutes >= 45 && (a.mood === 'FLOW' || a.mood === 'FOCUSED'))
        .reduce((sum, a) => sum + a.durationMinutes, 0),
    [periodActivities]
  );

  const deepRatio = totalMinutes > 0 ? Math.round((deepWorkMinutes / totalMinutes) * 100) : 0;

  // 当前周期的复盘报告（优先读取本地持久化缓存）
  const [activeDebrief, setActiveDebrief] = useState<AICoachDebrief | null>(() => {
    return getDebriefForPeriod(period, refDate);
  });

  // 当切换周期或切换日期时，同步获取本地缓存
  useEffect(() => {
    setActiveDebrief(getDebriefForPeriod(period, refDate));
  }, [period, refDate, getDebriefForPeriod]);

  // 手动触发 AI 复盘推理
  const handleTriggerDebrief = async () => {
    if (periodActivities.length === 0) {
      addToast('WARNING', '无法生成复盘', '该周期内暂无任何完成的时间块或活动记录');
      return;
    }

    triggerHapticFeedback(30);
    try {
      const result = await generateDebrief(period, refDate);
      if (result) {
        setActiveDebrief(result);
      }
    } catch (e) {
      console.error('复盘生成失败:', e);
    }
  };

  const isResetVisible =
    (period === 'WEEK' && !isCurrentWeek) ||
    (period === 'MONTH' && !isCurrentMonth) ||
    (period === 'DAY' && !isCurrentDay);

  // SVG 专注度圆环几何参数
  const gaugeRadius = 34;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeStrokeLen = (Math.min(100, deepRatio) / 100) * gaugeCircumference;

  return (
    <div
      className="space-y-4 pb-12"
      style={{
        paddingBottom: 'calc(2rem + var(--safe-bottom, 0px))',
      }}
    >
      {/* 头部引导与周期控制英雄卡片 */}
      <div className="rounded-3xl chronos-hero-card p-4 sm:p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center space-x-2 text-indigo-300">
              <Brain className="w-5 h-5 text-indigo-400 shrink-0" />
              <h2 className="text-base font-extrabold text-white tracking-tight whitespace-nowrap">
                AI 认知精力教练
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              多周期注意力健康度建模，深度剖析精力流动、心流品质与切换损耗。
            </p>
          </div>

          {activeDebrief && !isDebriefLoading && (
            <button
              onClick={handleTriggerDebrief}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-slate-200 text-[11px] font-semibold flex items-center space-x-1 whitespace-nowrap shrink-0 active:scale-95 transition"
              title="重新生成此周期复盘"
            >
              <RefreshCw className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>重新推演</span>
            </button>
          )}
        </div>

        {/* 模型状态与 Token 策略独立徽章组（杜绝单行挤断） */}
        <div className="flex items-center flex-wrap gap-1.5 text-[10px]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 leading-none rounded-md bg-amber-500/12 border border-amber-500/25 text-amber-300 font-semibold whitespace-nowrap">
            <Shield className="w-2.5 h-2.5 shrink-0" />
            <span>按需触发 · 本地永久缓存</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 leading-none rounded-md bg-slate-900/90 border border-white/[0.07] text-slate-300 font-mono truncate max-w-[200px]">
            <Cpu className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
            <span className="truncate">
              {settings.apiKey ? settings.deepModel : '离线心理学规则引擎'}
            </span>
          </span>
        </div>

        {/* 周期维度 3 段药丸切换（精简文案，宽敞呼吸感） */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-950/80 border border-white/[0.07] text-xs">
          {(
            [
              { id: 'WEEK', label: '周度复盘' },
              { id: 'MONTH', label: '月度复盘' },
              { id: 'DAY', label: '日度复盘' },
            ] as const
          ).map((item) => {
            const isSelected = period === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHapticFeedback(15);
                  setPeriod(item.id);
                }}
                className={`py-1.5 rounded-xl text-center font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 周期时间双行防截断导航条 */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={handlePrev}
            className="w-8 h-8 rounded-xl bg-slate-900/85 border border-white/[0.06] text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition shrink-0"
            title="上一周期"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center justify-center min-w-0 flex-1 px-1">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-xs font-extrabold text-white whitespace-nowrap">
                {periodMainTitle}
              </span>
              {!isResetVisible ? (
                <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold whitespace-nowrap">
                  {period === 'WEEK' ? '本周' : period === 'MONTH' ? '本月' : '今天'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleGoCurrent}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 leading-none rounded-md bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-[10px] font-bold whitespace-nowrap active:scale-95 transition shrink-0"
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
            type="button"
            onClick={handleNext}
            className="w-8 h-8 rounded-xl bg-slate-900/85 border border-white/[0.06] text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition shrink-0"
            title="下一周期"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 分析加载中状态 */}
      {isDebriefLoading ? (
        <div className="py-14 rounded-3xl chronos-card text-center space-y-4 p-6">
          <BrainCircuit className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <p className="text-white font-bold text-sm">
              AI 认知教练正在推演{period === 'WEEK' ? '全周' : period === 'MONTH' ? '全月' : '今日'}精力流...
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">
              正在测算任务切换损耗、注意力阻力点与微行动指南
            </p>
          </div>
        </div>
      ) : !activeDebrief ? (
        /* 未生成状态：带专注仪表环的就绪卡片 */
        <div className="p-5 rounded-3xl chronos-card space-y-5">
          {/* 顶部仪表盘 + 文案 */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-950/60 border border-white/[0.06]">
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
                <circle
                  cx="42"
                  cy="42"
                  r={gaugeRadius}
                  fill="transparent"
                  stroke="rgba(30, 41, 59, 0.9)"
                  strokeWidth="8"
                />
                <circle
                  cx="42"
                  cy="42"
                  r={gaugeRadius}
                  fill="transparent"
                  stroke="url(#coachGaugeGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${gaugeStrokeLen} ${gaugeCircumference}`}
                />
                <defs>
                  <linearGradient id="coachGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-extrabold font-mono tabular-nums text-white leading-none">
                  {deepRatio}%
                </span>
                <span className="text-[9px] text-indigo-300 mt-0.5 leading-none">深度比</span>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-1 text-left">
              <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 leading-none rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-400/25 font-bold">
                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                <span>诊断数据已就绪</span>
              </div>
              <h3 className="text-sm font-bold text-white leading-snug">
                {periodMainTitle}
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                综合诊断心流专注度、识别认知摩擦卡点，并生成下阶段微调建议。
              </p>
            </div>
          </div>

          {/* 周期数据摘要药丸网格 */}
          <div className="grid grid-cols-3 gap-2 text-left">
            <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 whitespace-nowrap">
                <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>有效记录</span>
              </span>
              <span className="text-xs font-extrabold text-white font-mono tabular-nums block">
                {formatCompactDuration(totalMinutes)}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span>时间块数</span>
              </span>
              <span className="text-xs font-extrabold text-emerald-300 font-mono tabular-nums block">
                {periodActivities.length} 个
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 whitespace-nowrap">
                <Zap className="w-3 h-3 text-purple-400 shrink-0" />
                <span>深度专注</span>
              </span>
              <span className="text-xs font-extrabold text-purple-300 font-mono tabular-nums block">
                {formatCompactDuration(deepWorkMinutes)}
              </span>
            </div>
          </div>

          {/* 主动触发分析按钮 */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleTriggerDebrief}
              disabled={periodActivities.length === 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-white shrink-0" />
              <span>
                开始{period === 'WEEK' ? '周度' : period === 'MONTH' ? '月度' : '日度'} AI 认知复盘
              </span>
            </button>
            {periodActivities.length === 0 && (
              <p className="text-[11px] text-slate-500 text-center">
                该周期内暂无已完成的时间块，先通过补录或应用追踪同步吧！
              </p>
            )}
          </div>
        </div>
      ) : (
        /* 分析报告正文呈现区 */
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* 4 格核心数据指标卡片 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl chronos-card space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">周期有效记录</span>
              <span className="text-sm font-extrabold text-white font-mono tabular-nums">
                {formatDuration(totalMinutes)}
              </span>
            </div>
            <div className="p-3 rounded-2xl chronos-card space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">时间块数量</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
                {periodActivities.length} 个
              </span>
            </div>
            <div className="p-3 rounded-2xl chronos-card space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">深度心流专注</span>
              <span className="text-sm font-extrabold text-indigo-300 font-mono tabular-nums">
                {formatDuration(deepWorkMinutes)}
              </span>
            </div>
            <div className="p-3 rounded-2xl chronos-card space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">深度专注占比</span>
              <span className="text-sm font-extrabold text-purple-300 font-mono tabular-nums">
                {deepRatio}%
              </span>
            </div>
          </div>

          {/* 总体评价概览 (Executive Summary) */}
          <div className="rounded-2xl chronos-card p-4 space-y-2">
            <div className="flex items-center space-x-1.5 text-indigo-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                {period === 'WEEK'
                  ? '周度节奏与产出洞察'
                  : period === 'MONTH'
                  ? '月度宏观产出洞察'
                  : '今日节奏与心流洞察'}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-normal">
              {activeDebrief.overview}
            </p>
          </div>

          {/* 核心双指标：深度心流与多任务切换损耗（取消生硬截断，完整可读） */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl chronos-card p-3.5 space-y-1.5">
              <div className="text-[10px] text-slate-400 flex items-center gap-1 whitespace-nowrap">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>深度心流时长</span>
              </div>
              <div className="text-xs font-bold text-white leading-snug">
                {activeDebrief.deepWorkDuration}
              </div>
            </div>

            <div className="rounded-2xl chronos-card p-3.5 space-y-1.5">
              <div className="text-[10px] text-slate-400 flex items-center gap-1 whitespace-nowrap">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>多任务切换损耗</span>
              </div>
              <div className="text-xs font-bold text-slate-200 leading-snug">
                {activeDebrief.contextSwitchEvaluation}
              </div>
            </div>
          </div>

          {/* 注意力卡点与认知摩擦 */}
          {activeDebrief.frictionPoints && activeDebrief.frictionPoints.length > 0 && (
            <div className="rounded-2xl bg-rose-500/8 border border-rose-500/25 p-4 space-y-2.5">
              <div className="flex items-center space-x-1.5 text-rose-300 text-xs font-bold tracking-wide">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>注意力卡点与数字摩擦</span>
              </div>
              <ul className="space-y-1.5">
                {activeDebrief.frictionPoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-rose-100/90 flex items-start space-x-2 leading-relaxed"
                  >
                    <span className="text-rose-400 shrink-0 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 微行动指南与预算调优建议 */}
          {activeDebrief.recommendations && activeDebrief.recommendations.length > 0 && (
            <div className="rounded-2xl bg-emerald-500/8 border border-emerald-500/25 p-4 space-y-2.5">
              <div className="flex items-center space-x-1.5 text-emerald-300 text-xs font-bold tracking-wide">
                <Lightbulb className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {period === 'WEEK'
                    ? '下周行动调整指南'
                    : period === 'MONTH'
                    ? '下月目标与精力调优建议'
                    : '明日可落地微行动指南'}
                </span>
              </div>
              <div className="space-y-2">
                {activeDebrief.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2 text-xs text-emerald-100/90 leading-relaxed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 精力节律与曲线点评 */}
          {activeDebrief.energyCurveNote && (
            <div className="rounded-2xl chronos-card p-3.5 flex items-start space-x-2.5 text-xs text-slate-300">
              <Compass className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-[10px] text-indigo-300 font-bold block tracking-wide">
                  精力节律与曲线点评
                </span>
                <p className="leading-relaxed text-xs text-slate-300">
                  {activeDebrief.energyCurveNote}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
