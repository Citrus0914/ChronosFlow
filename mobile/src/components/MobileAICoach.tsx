import React, { useState } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { generateAICoachDebrief } from '../services/aiDebrief';
import { AICoachDebrief } from '../types';
import { Brain, Sparkles, RefreshCw, Zap, Lightbulb, Compass, AlertCircle } from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';

export const MobileAICoach: React.FC = () => {
  const { activities, settings, addToast } = useTimeStore();
  const [debrief, setDebrief] = useState<AICoachDebrief | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (activities.length === 0) {
      addToast('WARNING', '无法生成复盘', '今日暂无任何活动或应用记录');
      return;
    }

    triggerHapticFeedback(30);
    setIsGenerating(true);
    try {
      const result = await generateAICoachDebrief(activities, settings, 'DAY', '今日');
      setDebrief(result);
      addToast('SUCCESS', '复盘完成', 'AI 认知教练已为您生成今日深度诊断');
    } catch (e) {
      console.error('复盘失败:', e);
      addToast('WARNING', '生成异常', '已自动切换为本地心理学规则分析');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 头部引导卡片 */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-900/40 via-slate-900 to-slate-900 border border-violet-500/30 p-5 space-y-3 shadow-xl">
        <div className="flex items-center space-x-2 text-violet-400">
          <Brain className="w-5 h-5" />
          <h2 className="text-base font-bold text-white">AI 认知精力教练</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          基于认知心理学注意力模型，综合今日手动打卡与手机应用自动感知时长，深度解析多任务切换摩擦与精力曲线。
        </p>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || activities.length === 0}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-violet-600/30 transition-all active:scale-98"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>深度认知推演中...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{debrief ? '重新生成今日认知复盘' : '生成今日精力与分心复盘'}</span>
            </>
          )}
        </button>
      </div>

      {/* 复盘报告正文 */}
      {debrief ? (
        <div className="space-y-3">
          {/* 综述 */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-violet-400" />
              <span>今日节奏总览</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">{debrief.overview}</p>
          </div>

          {/* 深度工作与切换损耗 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>深度投入</span>
              </div>
              <div className="text-sm font-bold text-white">{debrief.deepWorkDuration}</div>
            </div>

            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>多任务切换损耗</span>
              </div>
              <div className="text-sm font-bold text-white">{debrief.contextSwitchEvaluation}</div>
            </div>
          </div>

          {/* 核心卡点与认知摩擦 */}
          {debrief.frictionPoints && debrief.frictionPoints.length > 0 && (
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                注意力卡点与数字摩擦
              </h4>
              <ul className="space-y-1.5">
                {debrief.frictionPoints.map((point, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2">
                    <span className="text-rose-400 shrink-0">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 明日微行动指南 */}
          {debrief.recommendations && debrief.recommendations.length > 0 && (
            <div className="rounded-2xl bg-emerald-950/20 border border-emerald-500/30 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-emerald-400" />
                <span>明日微行动指南</span>
              </h4>
              <ul className="space-y-1.5">
                {debrief.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-emerald-200/90 flex items-start space-x-2">
                    <span className="text-emerald-400 shrink-0 font-bold">✓</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500 text-xs">
          点击上方按钮，开启属于您的移动端认知精力复盘
        </div>
      )}
    </div>
  );
};
