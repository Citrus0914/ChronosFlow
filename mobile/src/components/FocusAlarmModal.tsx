import React from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { BellRing, BellOff, Plus, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';

export const FocusAlarmModal: React.FC = () => {
  const {
    isAlarmRinging,
    activeActivity,
    dismissAlarm,
    extendFocusTime,
    stopActiveActivity,
  } = useTimeStore();

  if (!isAlarmRinging || !activeActivity) {
    return null;
  }

  const targetMinutes = activeActivity.targetDurationMinutes || 25;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 p-6 shadow-2xl shadow-amber-950/40 flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-250">
        {/* 响铃动画图标 */}
        <div className="relative mt-1">
          <div className="absolute -inset-2 rounded-full bg-amber-500/25 blur-lg animate-pulse" />
          <div className="relative p-4 rounded-3xl bg-amber-500/15 text-amber-400 border border-amber-500/35 shadow-inner">
            <BellRing className="w-9 h-9 animate-bounce" />
          </div>
        </div>

        {/* 标题与文案 */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>专注时长达成</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            🔔 专注时间到了！
          </h2>
          <p className="text-xs text-slate-300 px-2 leading-relaxed">
            您已完成「<span className="font-bold text-amber-300">{activeActivity.title}</span>」预设的{' '}
            <span className="font-bold text-white">{targetMinutes} 分钟</span> 专注目标！
          </p>
        </div>

        {/* 任务胶囊标签 */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/[0.08] text-xs text-slate-300">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-medium text-emerald-300">{activeActivity.category}</span>
          <span className="text-slate-500">·</span>
          <span className="flex items-center space-x-1 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>目标 {targetMinutes} 分钟</span>
          </span>
        </div>

        {/* 操作按钮组 */}
        <div className="w-full space-y-2.5 pt-1">
          {/* 1. 结算并归档 */}
          <button
            onClick={() => {
              triggerHapticFeedback(40);
              dismissAlarm();
              stopActiveActivity();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-2 transition-all active:scale-98"
          >
            <CheckCircle className="w-4 h-4" />
            <span>完成并结算归档</span>
          </button>

          {/* 2. 再专注 5 分钟 */}
          <button
            onClick={() => {
              triggerHapticFeedback(25);
              extendFocusTime(5);
            }}
            className="w-full py-3 px-4 rounded-2xl bg-indigo-600/25 hover:bg-indigo-600/35 border border-indigo-500/35 text-indigo-200 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>再续 5 分钟专注</span>
          </button>

          {/* 3. 停止响铃 (保持继续自由专注) */}
          <button
            onClick={() => {
              triggerHapticFeedback(20);
              dismissAlarm();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.06] text-slate-400 hover:text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-98"
          >
            <BellOff className="w-3.5 h-3.5" />
            <span>停止响铃 (继续专注)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
