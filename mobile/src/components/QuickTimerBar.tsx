import React, { useState, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { parseWithRules } from '../services/nlpParser';
import { Play, Square, Sparkles } from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';

export const QuickTimerBar: React.FC = () => {
  const { activeActivity, startActivity, stopActiveActivity, addActivity, addToast } = useTimeStore();
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
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
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
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div className="text-xs text-emerald-400 font-semibold">{activeActivity.category}</div>
              <div className="text-sm font-bold text-white truncate max-w-[180px]">{activeActivity.title}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="font-mono text-xl font-extrabold text-emerald-400 tracking-wider">
              {formatTime(elapsedSec)}
            </span>
            <button
              onClick={() => {
                triggerHapticFeedback(40);
                stopActiveActivity();
              }}
              className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
              title="结算归档"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 自然语言极简打卡输入框 */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={activeActivity ? '切换任务或事后补录，如：刚刚看了20分钟书' : '输入任务，如：开始开发手机版 / 刚刚写了30分钟文档'}
          className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 rounded-2xl py-3 pl-4 pr-12 text-xs text-white placeholder-slate-500 outline-none transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="absolute right-2 p-2 rounded-xl bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-all active:scale-95"
        >
          {inputText.includes('刚刚') || inputText.includes('花了') ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
};
