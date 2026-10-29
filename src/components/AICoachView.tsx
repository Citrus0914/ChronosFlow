import React, { useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { Sparkles, Bot, BrainCircuit, RefreshCw, AlertTriangle, Lightbulb, TrendingUp, CheckCircle2 } from 'lucide-react';

export const AICoachView: React.FC = () => {
  const { currentDebrief, isDebriefLoading, generateDebrief, settings } = useTimeStore();

  useEffect(() => {
    if (!currentDebrief) {
      generateDebrief();
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* 头部标题与操作 */}
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
          <p className="text-xs text-slate-400">
            模型驱动：{settings.apiKey ? settings.deepModel : '本地认知心理学推理规则引擎 (免 API Key 离线模式)'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => generateDebrief()}
          disabled={isDebriefLoading}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isDebriefLoading ? 'animate-spin' : ''}`} />
          <span>{isDebriefLoading ? '正在深入推理...' : '重新生成复盘'}</span>
        </button>
      </div>

      {isDebriefLoading ? (
        <div className="p-16 rounded-2xl border border-white/5 bg-[#131b2e]/40 text-center space-y-4">
          <BrainCircuit className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
          <p className="text-slate-300 font-medium text-sm">
            AI 教练正在汇总全天时间流、分析心流分布与上下文切换损耗...
          </p>
          <p className="text-slate-500 text-xs">
            正在提炼阻碍因素与明日可落地的微习惯建议
          </p>
        </div>
      ) : currentDebrief ? (
        <div className="space-y-6">
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
      ) : null}
    </div>
  );
};
