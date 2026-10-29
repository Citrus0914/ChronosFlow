import React, { useState, useEffect, useRef } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { parseWithRules } from '../services/nlpParser';
import { Sparkles, Play, Clock, X, Zap, CornerDownLeft, Loader2 } from 'lucide-react';

export const CommandBar: React.FC = () => {
  const { isCommandBarOpen, setCommandBarOpen, submitNaturalInput, activeActivity } = useTimeStore();
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 监听全局 Alt+Space 或 Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setCommandBarOpen(!isCommandBarOpen);
      } else if (e.key === 'Escape' && isCommandBarOpen) {
        setCommandBarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandBarOpen, setCommandBarOpen]);

  useEffect(() => {
    if (isCommandBarOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setInput('');
    }
  }, [isCommandBarOpen]);

  if (!isCommandBarOpen) return null;

  const preview = input.trim() ? parseWithRules(input) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitNaturalInput(input.trim());
      setCommandBarOpen(false);
      setInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickPresets = [
    '开始深度写代码',
    '刚才花了40分钟开架构评审会',
    '阅读论文 45分钟',
    '改登录Bug改吐了，用了1小时',
    '完成了',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#111827]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 输入框主区域 */}
        <form onSubmit={handleSubmit} className="relative flex items-center px-5 py-4 border-b border-white/10">
          <Sparkles className="w-6 h-6 text-indigo-400 mr-3 animate-pulse shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeActivity
                ? `当前进行中：${activeActivity.title} (输入"完成了"或输入新任务)...`
                : '输入自然语言（例如：“刚刚改了半小时Bug” 或 “开始写方案”）...'
            }
            className="w-full bg-transparent text-lg text-white placeholder-slate-400 focus:outline-none"
            disabled={isSubmitting}
          />
          <div className="flex items-center space-x-2 shrink-0">
            {input.trim() && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <span>保存</span>
                    <CornerDownLeft className="w-3 h-3 text-indigo-200" />
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setCommandBarOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* 实时本地规则解析预览条 */}
        {preview && (
          <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">将记录：</span>
              <span className="font-semibold text-white">{preview.title}</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {preview.category}
              </span>
              {preview.mood !== 'NORMAL' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {preview.mood}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {preview.isRealtimeStart ? (
                <span className="flex items-center text-emerald-400 font-medium">
                  <Play className="w-3.5 h-3.5 mr-1 fill-emerald-400" />
                  实时专注计时
                </span>
              ) : (
                <span className="flex items-center text-sky-400 font-medium">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  事后归档 ({preview.durationMinutes} 分钟)
                </span>
              )}
            </div>
          </div>
        )}

        {/* 快捷推荐提示 */}
        {!input.trim() && (
          <div className="px-5 py-3 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>快速示例：</span>
              <div className="flex flex-wrap gap-1.5">
                {quickPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setInput(preset)}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-slate-500 text-[11px]">按 Enter 提交 / Esc 关闭</span>
          </div>
        )}
      </div>
    </div>
  );
};
