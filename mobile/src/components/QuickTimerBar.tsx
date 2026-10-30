import React, { useState, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { parseWithRules } from '../services/nlpParser';
import { Play, Square, Sparkles, Plus, Zap, Clock, Bell } from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';
import { FocusDurationModal } from './FocusDurationModal';

export const QuickTimerBar: React.FC = () => {
  const {
    activeActivity,
    startActivity,
    stopActiveActivity,
    addActivity,
    addToast,
    setManualModalOpen,
    setFocusTargetDuration,
  } = useTimeStore();

  const [inputText, setInputText] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [showRemaining, setShowRemaining] = useState(true);

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

    if (!parsed.isRealtimeStart && parsed.durationMinutes && parsed.durationMinutes > 0 && !parsed.isFuzzyTime) {
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
      // 🎯 实时启动计时：始终启动纯净实时计时，由用户在开启专注后点击按键手动指定提醒时长
      startActivity(parsed.title, parsed.category, inputText);
      addToast(
        'INFO',
        '🎯 实时专注已开始',
        `正在进行「${parsed.title}」`
      );
    }

    setInputText('');
  };

  const targetMin = activeActivity?.targetDurationMinutes || 0;
  const targetSec = targetMin * 60;
  const isTimeUp = targetMin > 0 && elapsedSec >= targetSec;
  const remainSec = Math.max(0, targetSec - elapsedSec);
  const progressPercent = targetMin > 0 ? Math.min(100, Math.round((elapsedSec / targetSec) * 100)) : 0;

  return (
    <div className="space-y-3">
      {/* 若有活跃任务，呈现全宽呼吸走字卡片 */}
      {activeActivity && (
        <div className={`rounded-2xl border p-3.5 shadow-lg transition-all flex flex-col gap-2.5 ${
          isTimeUp
            ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border-amber-500/40 shadow-amber-950/30'
            : 'bg-gradient-to-r from-emerald-950/75 via-slate-900/95 to-slate-900 border-emerald-500/35 shadow-emerald-950/30'
        }`}>
          {/* 上半部分：分类标签、任务名称、实时走字与结算按钮 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isTimeUp ? 'bg-amber-400' : 'bg-emerald-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  isTimeUp ? 'bg-amber-500' : 'bg-emerald-500'
                }`}></span>
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
              {/* 点击时间数字可切换显示：倒计时 / 正向已用时长 */}
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback(10);
                  setShowRemaining((prev) => !prev);
                }}
                className="flex flex-col items-end active:scale-95 transition-transform"
                title="点击切换倒计时/正向计时"
              >
                <span className={`font-mono tabular-nums text-lg font-extrabold tracking-tight whitespace-nowrap ${
                  isTimeUp
                    ? 'text-amber-400 animate-pulse'
                    : 'text-emerald-400'
                }`}>
                  {targetMin > 0 && showRemaining
                    ? isTimeUp
                      ? `+${formatTime(elapsedSec - targetSec)}`
                      : formatTime(remainSec)
                    : formatTime(elapsedSec)}
                </span>
                <span className="text-[9px] text-slate-400 leading-none">
                  {targetMin > 0
                    ? showRemaining
                      ? isTimeUp
                        ? '已超时专注'
                        : '剩余时间'
                      : '已用时长'
                    : '进行中'}
                </span>
              </button>

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

          {/* 🎯 核心交互：开启专注后点击按键手动指定时间 */}
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(15);
                setIsDurationModalOpen(true);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm ${
                targetMin > 0
                  ? isTimeUp
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 hover:bg-indigo-500/30'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 text-indigo-300 hover:text-white border border-indigo-500/35'
              }`}
            >
              {targetMin > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    {isTimeUp
                      ? `⏰ 目标 ${targetMin}m 到期 (点击改时)`
                      : `⏰ 目标: ${targetMin}分钟 (点击修改)`}
                  </span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>⏰ 设置提醒时长 (到期响铃)</span>
                </>
              )}
            </button>

            {targetMin > 0 && (
              <span className="text-[10px] text-slate-400 font-mono">
                {progressPercent}%
              </span>
            )}
          </div>

          {/* 🎯 进度指示条 (有预设目标时长时呈现) */}
          {targetMin > 0 && (
            <div className="w-full bg-slate-950/70 rounded-full h-1.5 overflow-hidden border border-white/[0.04]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isTimeUp
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
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
              : '随手记：开始写方案 / 刚刚读了30分钟书'
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

      {/* 🎯 专注时长手动配置弹窗 (开启专注后点击按键呼出) */}
      <FocusDurationModal
        isOpen={isDurationModalOpen}
        onClose={() => setIsDurationModalOpen(false)}
        currentMinutes={activeActivity?.targetDurationMinutes}
        onSave={(minutes) => setFocusTargetDuration(minutes)}
      />
    </div>
  );
};
