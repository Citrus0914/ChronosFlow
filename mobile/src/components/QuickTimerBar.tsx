import React, { useState, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { parseWithRules } from '../services/nlpParser';
import { Play, Square, Sparkles, Plus, Zap } from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';

export const QuickTimerBar: React.FC = () => {
  const {
    activeActivity,
    startActivity,
    stopActiveActivity,
    addActivity,
    addToast,
    setManualModalOpen,
  } = useTimeStore();
  const [inputText, setInputText] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);

  // 活跃任务走秒计时
  useEffect(() => {
    if (!activeActivity) {
      setElapsedSec(0);
      return;
    }

    const updateTimer = () => {
      const sec = Math.max(0, Math.floor((Date.now() - activeActivity.startTime) / 1000));
      setElapsedSec(sec);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activeActivity]);

  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
        .toString()
        .padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    triggerHapticFeedback(25);
    const parsed = parseWithRules(inputText);

    if (!parsed.isRealtimeStart && parsed.durationMinutes && parsed.durationMinutes > 0) {
      // 事后追溯补录
      const now = Date.now();
      const endTime = now;
      const startTime = now - parsed.durationMinutes * 60000;

      addActivity({
        id: 'act_' + now + '_' + Math.random().toString(36).slice(2, 6),
        rawInput: inputText,
        title: parsed.title,
        category: parsed.category,
        tags: parsed.tags,
        startTime,
        endTime,
        durationMinutes: parsed.durationMinutes,
        status: 'COMPLETED',
        mood: parsed.mood,
      });

      addToast('SUCCESS', '补录成功', `已归档「${parsed.title}」(${parsed.durationMinutes}分钟)`);
    } else {
      // 实时启动计时
      startActivity(parsed.title, parsed.category, inputText);
      addToast('INFO', '计时已开始', `正在进行「${parsed.title}」`);
    }

    setInputText('');
  };

  return (
    <div className="space-y-3">
      {/* 若有活跃任务，呈现全宽呼吸走字卡片 */}
      {activeActivity && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950/75 via-slate-900/95 to-slate-900 border border-emerald-500/35 p-3.5 shadow-lg shadow-emerald-950/30 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-bold leading-none whitespace-nowrap">
                {activeActivity.category} · 专注进行中
              </div>
              <div className="text-sm font-bold text-white truncate mt-1">
                {activeActivity.title}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <span className="font-mono tabular-nums text-lg font-extrabold text-emerald-400 tracking-tight whitespace-nowrap">
              {formatTime(elapsedSec)}
            </span>
            <button
              onClick={() => {
                triggerHapticFeedback(40);
                stopActiveActivity();
              }}
              className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/35 hover:bg-rose-500 hover:text-white transition-all active:scale-95 shrink-0"
              title="结算归档"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* 自然语言极简打卡输入框 */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 text-indigo-400/80">
          <Zap className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            activeActivity
              ? '切换任务或补录，如：刚刚看了20分钟书'
              : '随手记：开始写方案 / 刚刚读了30分钟论文'
          }
          className="w-full chronos-card focus:border-indigo-500/70 rounded-2xl py-3 pl-9 pr-12 text-xs text-white placeholder-slate-500 outline-none transition-all"
        />
        {inputText.trim() ? (
          <button
            type="submit"
            className="absolute right-2 p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            title="提交记录"
          >
            {inputText.includes('刚刚') || inputText.includes('花了') ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(15);
              setManualModalOpen(true);
            }}
            className="absolute right-2 p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-white/[0.06] text-slate-300 hover:text-indigo-300 transition-all active:scale-95"
            title="打开手动补录弹窗"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );
};
