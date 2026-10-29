import React, { useState, useMemo, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration } from '../lib/utils';
import {
  formatChineseDate,
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

  // 周期中文标签
  const periodLabel = useMemo(() => {
    if (period === 'WEEK') return currentWeekRange.label;
    if (period === 'MONTH') return currentMonthRange.label;
    return isCurrentDay ? '今日' : `${formatChineseDate(refDate)} (${getWeekdayName(refDate)})`;
  }, [period, currentWeekRange, currentMonthRange, refDate, isCurrentDay]);

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
  const completedAll = useMemo(() => activities.filter((a) => a.status === 'COMPLETED'), [activities]);

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

  return (
    <div
      className="space-y-4 pb-12"
      style={{
        paddingBottom: 'calc(3rem + var(--safe-bottom, 0px))',
      }}
    >
      {/* 头部引导与周期控制卡片 */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/30 p-4.5 space-y-3.5 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Brain className="w-5 h-5" />
              <h2 className="text-base font-bold text-white tracking-tight">AI 认知精力教练</h2>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              多周期注意力健康度建模，深度剖析精力流动、心流深度与切换损耗。
            </p>
          </div>

          {/* 重新生成按钮（若当前周期已有报告） */}
          {activeDebrief && !isDebriefLoading && (
            <button
              onClick={handleTriggerDebrief}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-medium flex items-center space-x-1 shrink-0 active:scale-95 transition"
              title="重新生成此周期复盘"
            >
              <RefreshCw className="w-3 h-3 text-indigo-400" />
              <span>重新生成</span>
            </button>
          )}
        </div>

        {/* 模型状态与 Token 零消耗策略徽章 */}
        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center text-amber-400/90 gap-1">
            <Shield className="w-3 h-3" />
            <span>按需触发 · 本地永久缓存</span>
          </span>
          <span>·</span>
          <span className="truncate max-w-[170px] text-slate-400">
            {settings.apiKey ? settings.deepModel : '心理学离线规则引擎'}
          </span>
        </div>

        {/* 周期维度 3 段药丸切换 (周 / 月 / 日) */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-950/80 border border-white/5 text-xs shadow-inner">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(15);
              setPeriod('WEEK');
            }}
            className={`py-1.5 rounded-lg text-center font-bold transition-all ${
              period === 'WEEK'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            周度复盘 (周)
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(15);
              setPeriod('MONTH');
            }}
            className={`py-1.5 rounded-lg text-center font-bold transition-all ${
              period === 'MONTH'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            月度复盘 (月)
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(15);
              setPeriod('DAY');
            }}
            className={`py-1.5 rounded-lg text-center font-bold transition-all ${
              period === 'DAY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            日度复盘 (日)
          </button>
        </div>

        {/* 周期时间导航条 */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <div className="flex items-center space-x-1 bg-slate-950/60 rounded-xl p-1 border border-white/5 flex-1 min-w-0 mr-2">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition shrink-0"
              title="上一周期"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center space-x-1.5 px-2 text-xs font-semibold text-white flex-1 min-w-0 truncate">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate text-[11px]">{periodLabel}</span>
              {period === 'WEEK' && isCurrentWeek && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium shrink-0">
                  本周
                </span>
              )}
              {period === 'MONTH' && isCurrentMonth && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium shrink-0">
                  本月
                </span>
              )}
              {period === 'DAY' && isCurrentDay && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium shrink-0">
                  今天
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition shrink-0"
              title="下一周期"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 回到当前周期按钮 */}
          {((period === 'WEEK' && !isCurrentWeek) ||
            (period === 'MONTH' && !isCurrentMonth) ||
            (period === 'DAY' && !isCurrentDay)) && (
            <button
              type="button"
              onClick={handleGoCurrent}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 active:scale-95 transition border border-slate-700 shrink-0"
            >
              <RotateCcw className="w-3 h-3 text-indigo-400" />
              <span>{period === 'WEEK' ? '本周' : period === 'MONTH' ? '本月' : '今天'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 分析加载中状态 */}
      {isDebriefLoading ? (
        <div className="py-14 rounded-3xl border border-indigo-500/20 bg-slate-900/60 text-center space-y-4 p-6 shadow-xl">
          <BrainCircuit className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <p className="text-white font-bold text-sm">
              AI 认知教练正在推演【{period === 'WEEK' ? '全周' : period === 'MONTH' ? '全月' : '今日'}】精力流...
            </p>
            <p className="text-slate-400 text-xs">
              正在全面测算任务切换损耗、注意力卡点与下阶段微行动指南
            </p>
          </div>
        </div>
      ) : !activeDebrief ? (
        /* 未生成状态：数据前置就绪卡片与大按钮 */
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-indigo-500/20 text-center space-y-5 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mx-auto flex items-center justify-center text-indigo-400 shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-white tracking-tight">
              【{periodLabel}】数据已就绪
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              AI 教练将为您全面诊断注意力集中度、识别思维阻力卡点，并结合分类预算偏差给出针对性的微调整建议。
            </p>
          </div>

          {/* 周期数据摘要药丸网格 */}
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>周期有效记录</span>
              </span>
              <span className="text-xs font-bold text-white font-mono">
                {formatDuration(totalMinutes)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>时间块数量</span>
              </span>
              <span className="text-xs font-bold text-emerald-300 font-mono">
                {periodActivities.length} 个
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>深度专注预估</span>
              </span>
              <span className="text-xs font-bold text-purple-300 font-mono">
                {formatDuration(deepWorkMinutes)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>深度专注占比</span>
              </span>
              <span className="text-xs font-bold text-amber-300 font-mono">
                {deepRatio}%
              </span>
            </div>
          </div>

          {/* 主动触发分析按钮 */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTriggerDebrief}
              disabled={periodActivities.length === 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-98"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>
                开始【{period === 'WEEK' ? '周度' : period === 'MONTH' ? '月度' : '日度'}】AI 认知复盘
              </span>
            </button>
            {periodActivities.length === 0 && (
              <p className="text-[11px] text-slate-500 pt-2">
                该周期内暂无已完成的时间块，先通过补录或打卡记录吧！
              </p>
            )}
          </div>
        </div>
      ) : (
        /* 分析报告正文呈现区 */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* 4 格核心数据指标卡片 (2x2 网格) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">周期有效记录</span>
              <span className="text-sm font-bold text-white font-mono">{formatDuration(totalMinutes)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">时间块数量</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{periodActivities.length} 个</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">深度心流专注</span>
              <span className="text-sm font-bold text-indigo-400 font-mono">{formatDuration(deepWorkMinutes)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">深度专注占比</span>
              <span className="text-sm font-bold text-purple-400 font-mono">{deepRatio}%</span>
            </div>
          </div>

          {/* 总体评价概览 (Executive Summary) */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-2 shadow-md">
            <div className="flex items-center space-x-1.5 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
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

          {/* 核心双指标：深度心流与多任务切换损耗 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-1 shadow-sm">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>深度心流时长</span>
              </div>
              <div className="text-xs font-bold text-white">{activeDebrief.deepWorkDuration}</div>
            </div>

            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-1 shadow-sm">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                <span>多任务切换损耗</span>
              </div>
              <div className="text-xs font-bold text-slate-200 truncate" title={activeDebrief.contextSwitchEvaluation}>
                {activeDebrief.contextSwitchEvaluation}
              </div>
            </div>
          </div>

          {/* 注意力卡点与认知摩擦 */}
          {activeDebrief.frictionPoints && activeDebrief.frictionPoints.length > 0 && (
            <div className="rounded-2xl bg-rose-500/5 border border-rose-500/20 p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>注意力卡点与数字摩擦</span>
              </div>
              <ul className="space-y-1.5">
                {activeDebrief.frictionPoints.map((point, idx) => (
                  <li key={idx} className="text-xs text-rose-200/90 flex items-start space-x-2 leading-relaxed">
                    <span className="text-rose-400 shrink-0 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 微行动指南与预算调优建议 */}
          {activeDebrief.recommendations && activeDebrief.recommendations.length > 0 && (
            <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5" />
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
                  <div key={idx} className="flex items-start space-x-2 text-xs text-emerald-200/90 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 精力节律与曲线点评 */}
          {activeDebrief.energyCurveNote && (
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 flex items-start space-x-2 text-xs text-slate-300">
              <Compass className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  精力节律与曲线点评
                </span>
                <p className="leading-relaxed text-[11px] text-slate-300">
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
