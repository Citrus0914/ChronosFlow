import React from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration } from '../lib/utils';
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
} from 'lucide-react';

export const AICoachView: React.FC = () => {
  const { currentDebrief, isDebriefLoading, generateDebrief, settings, activities } = useTimeStore();
  const completed = activities.filter((a) => a.status === 'COMPLETED');
  const totalMinutes = completed.reduce((sum, a) => sum + a.durationMinutes, 0);

  return (
    <div className="space-y-6">
      {/* 头部标题与状态栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-purple-950/30 to-slate-900 border border-indigo-500/20 shadow-xl">
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
            今日时间利用与精力流动深度复盘
          </h2>
          <div className="flex items-center space-x-3 text-xs text-slate-400 pt-0.5">
            <span className="flex items-center">
              <Coins className="w-3.5 h-3.5 mr-1 text-amber-400" />
              触发策略：手动按需点击分析（零自动消耗）
            </span>
            <span>·</span>
            <span>
              模型：{settings.apiKey ? settings.deepModel : '本地认知心理学离线规则引擎'}
            </span>
          </div>
        </div>

        {/* 若已生成复盘，右上角提供重新推理按钮 */}
        {currentDebrief && (
          <button
            type="button"
            onClick={() => generateDebrief()}
            disabled={isDebriefLoading}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            title="今日若新增了时间记录，可点击重新触发大模型推理"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDebriefLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isDebriefLoading ? '重新分析中...' : '重新生成复盘'}</span>
          </button>
        )}
      </div>

      {isDebriefLoading ? (
        /* 分析中加载态 */
        <div className="p-16 rounded-2xl border border-white/5 bg-[#131b2e]/40 text-center space-y-4">
          <BrainCircuit className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
          <p className="text-slate-200 font-medium text-sm">
            AI 教练正在汇总全天时间流、分析心流分布与上下文切换损耗...
          </p>
          <p className="text-slate-500 text-xs">
            正在调用 {settings.apiKey ? settings.deepModel : '认知心理学规则'} 提炼卡点与微行动建议
          </p>
        </div>
      ) : !currentDebrief ? (
        /* 手动点击开始分析引导卡片 */
        <div className="p-10 rounded-2xl bg-[#131b2e]/60 border border-indigo-500/20 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mx-auto flex items-center justify-center text-indigo-400">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              今日待复盘数据已就绪
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              基于您今日记录的各项时间块与情绪状态，AI 教练将为您全面诊断注意力集中度、识别思维阻力卡点，并给出明天的精准行动微建议。
            </p>
          </div>

          {/* 今日数据摘要徽章 */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>今日有效记录：<b>{formatDuration(totalMinutes)}</b></span>
            </div>
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>时间块数量：<b>{completed.length} 个</b></span>
            </div>
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Token 保护：<b>手动触发</b></span>
            </div>
          </div>

          {/* 主动触发分析大按钮 */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => generateDebrief()}
              disabled={completed.length === 0}
              className="inline-flex items-center space-x-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-102 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>开始 AI 深度复盘分析</span>
            </button>
            {completed.length === 0 ? (
              <p className="text-[11px] text-slate-500 pt-3">
                今日暂无完成的时间块，先按下 Alt + Space 记一条吧！
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 pt-3">
                💡 仅在点击后调用一次 API 推理并自动缓存，日常切换与记录 0 Token 消耗。
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
              <span>今日节奏洞察 (Executive Summary)</span>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">
              {currentDebrief.overview}
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
                {currentDebrief.deepWorkDuration}
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
                {currentDebrief.contextSwitchEvaluation}
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
              {currentDebrief.frictionPoints.map((point, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 明日可执行微建议 */}
          <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Lightbulb className="w-4 h-4" />
              <span>教练微建议：明日行动指南 (Actionable Steps)</span>
            </div>
            <div className="space-y-2.5">
              {currentDebrief.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2.5 text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 精力曲线点评 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400 flex items-center justify-between">
            <span>💡 {currentDebrief.energyCurveNote}</span>
          </div>
        </div>
      )}
    </div>
  );
};
