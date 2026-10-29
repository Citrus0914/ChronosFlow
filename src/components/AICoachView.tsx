import React, { useState, useMemo } from 'react';
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
  Sparkles,
  Bot,
  BrainCircuit,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  Play,
  Clock,
  Coins,
  Shield,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

export type DebriefPeriod = 'WEEK' | 'MONTH' | 'DAY';

export const AICoachView: React.FC = () => {
  const {
    isDebriefLoading,
    generateDebrief,
    getDebriefForPeriod,
    settings,
    activities,
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

  // 周期标签
  const periodLabel = useMemo(() => {
    if (period === 'WEEK') return currentWeekRange.label;
    if (period === 'MONTH') return currentMonthRange.label;
    return isCurrentDay ? '今日' : `${formatChineseDate(refDate)} (${getWeekdayName(refDate)})`;
  }, [period, currentWeekRange, currentMonthRange, refDate, isCurrentDay]);

  // 切换周期导航
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
  const periodActivities = useMemo(() => {
    if (period === 'WEEK') {
      return completedAll.filter((a) => isTimestampInWeek(a.startTime, currentWeekRange));
    }
    if (period === 'MONTH') {
      return completedAll.filter((a) => isTimestampInMonth(a.startTime, currentMonthRange));
    }
    return completedAll.filter((a) => isSameDay(a.startTime, refDate));
  }, [completedAll, period, currentWeekRange, currentMonthRange, refDate]);

  const totalMinutes = periodActivities.reduce((sum, a) => sum + a.durationMinutes, 0);
  const deepWorkMinutes = periodActivities
    .filter((a) => a.durationMinutes >= 45 && (a.mood === 'FLOW' || a.mood === 'FOCUSED'))
    .reduce((sum, a) => sum + a.durationMinutes, 0);

  // 获取当前周期的本地缓存复盘
  const activeDebrief = useMemo(() => {
    return getDebriefForPeriod(period, refDate);
  }, [getDebriefForPeriod, period, refDate]);

  const handleTriggerDebrief = async () => {
    await generateDebrief(period, refDate);
  };

  return (
    <div className="space-y-6">
      {/* 头部标题与周期控制条 */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-purple-950/30 to-slate-900 border border-indigo-500/20 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Bot className="w-5 h-5" />
              </span>
              <span className="text-xs uppercase tracking-wider text-indigo-300 font-bold">
                AI 认知精力与时间教练
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {period === 'WEEK'
                ? '周度时间效能与心流深度复盘'
                : period === 'MONTH'
                ? '月度宏观产出与精力深度复盘'
                : '日度时间利用与精力流动深度复盘'}
            </h2>
            <div className="flex items-center space-x-3 text-xs text-slate-400 pt-0.5">
              <span className="flex items-center">
                <Coins className="w-3.5 h-3.5 mr-1 text-amber-400" />
                策略：手动按需点击分析（零自动消耗）
              </span>
              <span>·</span>
              <span>
                模型：{settings.apiKey ? settings.deepModel : '本地认知心理学离线规则引擎'}
              </span>
            </div>
          </div>

          {/* 若已生成复盘，右上角提供重新推理按钮 */}
          {activeDebrief && (
            <button
              type="button"
              onClick={handleTriggerDebrief}
              disabled={isDebriefLoading}
              className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="若该周期新增了记录，可点击重新触发大模型推理"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDebriefLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{isDebriefLoading ? '重新分析中...' : '重新生成此周期复盘'}</span>
            </button>
          )}
        </div>

        {/* 周期切换药丸与时间导航条 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-white/5">
          {/* 周期维度切换药丸 */}
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
              周度复盘 (星期)
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
              月度复盘 (月)
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
              日度复盘 (日)
            </button>
          </div>

          {/* 周期时间导航器 */}
          <div className="flex items-center space-x-2">
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
                <span>{periodLabel}</span>
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

            {((period === 'WEEK' && !isCurrentWeek) ||
              (period === 'MONTH' && !isCurrentMonth) ||
              (period === 'DAY' && !isCurrentDay)) && (
              <button
                type="button"
                onClick={handleGoCurrent}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition cursor-pointer border border-white/5"
                title="回到当前周期"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>{period === 'WEEK' ? '本周' : period === 'MONTH' ? '本月' : '今天'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {isDebriefLoading ? (
        /* 分析中加载态 */
        <div className="p-16 rounded-2xl border border-white/5 bg-[#131b2e]/40 text-center space-y-4">
          <BrainCircuit className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
          <p className="text-slate-200 font-medium text-sm">
            AI 教练正在汇总【{periodLabel}】全量时间流、分析心流分布与上下文切换损耗...
          </p>
          <p className="text-slate-500 text-xs">
            正在调用 {settings.apiKey ? settings.deepModel : '本地认知心理学规则引擎'} 提炼核心卡点与行动指南
          </p>
        </div>
      ) : !activeDebrief ? (
        /* 手动点击开始分析引导卡片 */
        <div className="p-10 rounded-2xl bg-[#131b2e]/60 border border-indigo-500/20 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mx-auto flex items-center justify-center text-indigo-400">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              【{periodLabel}】待复盘数据已就绪
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              基于您在【{periodLabel}】记录的各项时间块与情绪状态，AI 教练将为您全面诊断注意力集中度、识别思维阻力卡点，并给出针对性的下阶段行动微建议。
            </p>
          </div>

          {/* 周期数据摘要徽章 */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                周期有效记录：<b>{formatDuration(totalMinutes)}</b>
              </span>
            </div>
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                时间块数量：<b>{periodActivities.length} 个</b>
              </span>
            </div>
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>
                深度专注预估：<b>{formatDuration(deepWorkMinutes)}</b>
              </span>
            </div>
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Token 保护：<b>手动按需触发</b></span>
            </div>
          </div>

          {/* 主动触发分析大按钮 */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTriggerDebrief}
              disabled={periodActivities.length === 0}
              className="inline-flex items-center space-x-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-102 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>
                开始【{period === 'WEEK' ? '周度' : period === 'MONTH' ? '月度' : '日度'}】AI 深度复盘分析
              </span>
            </button>
            {periodActivities.length === 0 ? (
              <p className="text-[11px] text-slate-500 pt-3">
                该周期内暂无完成的时间块，先通过快捷键 Alt + Space 记一条吧！
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 pt-3">
                💡 仅在点击后调用一次推理并自动本地缓存，跨周期切换或重启 0 Token 消耗。
              </p>
            )}
          </div>
        </div>
      ) : (
        /* 分析报告展示区 */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 总体评价概览 */}
          <div className="p-5 rounded-2xl bg-[#131b2e]/70 border border-white/5 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>
                {period === 'WEEK'
                  ? '周度节奏与产出洞察 (Weekly Executive Summary)'
                  : period === 'MONTH'
                  ? '月度宏观产出洞察 (Monthly Executive Summary)'
                  : '今日节奏洞察 (Daily Executive Summary)'}
              </span>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">
              {activeDebrief.overview}
            </p>
          </div>

          {/* 核心指标双卡片：深度工作与多任务切换 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#131b2e]/50 border border-white/5 space-y-2">
              <div className="text-xs text-slate-400 font-medium flex items-center">
                <BrainCircuit className="w-4 h-4 mr-1.5 text-emerald-400" />
                深度心流与专注时长
              </div>
              <div className="text-2xl font-bold text-white">
                {activeDebrief.deepWorkDuration}
              </div>
              <p className="text-xs text-slate-400">
                连续 45 分钟以上且标记为“心流/专注”的高价值生产力时段。
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#131b2e]/50 border border-white/5 space-y-2">
              <div className="text-xs text-slate-400 font-medium flex items-center">
                <TrendingUp className="w-4 h-4 mr-1.5 text-sky-400" />
                上下文切换损耗评估
              </div>
              <div className="text-sm font-semibold text-slate-100">
                {activeDebrief.contextSwitchEvaluation}
              </div>
              <p className="text-xs text-slate-400">
                频繁在不同任务之间反复横跳会造成大量的注意残留（Attention Residue）。
              </p>
            </div>
          </div>

          {/* 阻力与卡点剖析 */}
          <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-3">
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>情绪与思维卡点剖析 (Friction & Resistance)</span>
            </div>
            <ul className="space-y-2">
              {activeDebrief.frictionPoints.map((point, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 明日/下周/下月可执行微建议 */}
          <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Lightbulb className="w-4 h-4" />
              <span>
                教练微建议：
                {period === 'WEEK'
                  ? '下周行动调整指南 (Next Week Steps)'
                  : period === 'MONTH'
                  ? '下月目标与精力调优建议 (Next Month Steps)'
                  : '明日行动指南 (Tomorrow Steps)'}
              </span>
            </div>
            <div className="space-y-2.5">
              {activeDebrief.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2.5 text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 精力曲线点评 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400 flex items-center justify-between">
            <span>💡 {activeDebrief.energyCurveNote}</span>
          </div>
        </div>
      )}
    </div>
  );
};
