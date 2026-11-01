import React, { useState, useEffect, useRef } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { parseWithRules } from '../services/nlpParser';
import {
  isCommandBarShortcut,
  isEscapeKey,
  isSlashQuickKey,
  getPlatformShortcutLabel,
} from '../lib/shortcutUtils';
import { Sparkles, Play, Clock, X, Zap, CornerDownLeft, Loader2, Info } from 'lucide-react';

export const CommandBar: React.FC = () => {
  const { isCommandBarOpen, setCommandBarOpen, submitNaturalInput, activeActivity } = useTimeStore();
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const labels = getPlatformShortcutLabel();

  // 全局快捷键监听（在捕获阶段捕获，杜绝冒泡丢失或被浏览器默认抢占）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused = Boolean(
        target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
      );

      // 1. 判断是否按下 Ctrl+K / Cmd+K / Alt+Space / Ctrl+/
      if (isCommandBarShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        if ('stopImmediatePropagation' in e) {
          e.stopImmediatePropagation();
        }
        const currentOpen = useTimeStore.getState().isCommandBarOpen;
        useTimeStore.getState().setCommandBarOpen(!currentOpen);
        return;
      }

      // 2. 判断是否按下单键 '/' (未在输入框内时)
      if (isSlashQuickKey(e, isInputFocused)) {
        e.preventDefault();
        e.stopPropagation();
        useTimeStore.getState().setCommandBarOpen(true);
        return;
      }

      // 3. 判断是否按下 Escape (处于打开状态时关闭)
      if (isEscapeKey(e) && useTimeStore.getState().isCommandBarOpen) {
        e.preventDefault();
        e.stopPropagation();
        useTimeStore.getState().setCommandBarOpen(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // 增强抑制 Windows 在 Alt+Space 后的原生窗口菜单 (WM_SYSCOMMAND)
      if (e.altKey && (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 使用 capture: true 在捕获阶段最先拦截事件
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, []);

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
                : '输入自然语言（例如：“昨天下午2点到4点开会” 或 “前天花了2小时改Bug”）...'
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
              title="关闭 (Esc)"
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

        {/* 输入格式引导与快捷键提示条 */}
        <div className="px-5 py-3 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-black/10">
          <div className="flex items-center space-x-2 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>支持口语自然语言输入任意事项（实时计时、事后补录、指定时段）</span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-500 shrink-0">
            <span>呼出快捷键:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 font-mono border border-white/10">
              {labels.primary}
            </kbd>
            <span className="text-slate-600">/</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono border border-white/10">
              {labels.secondary}
            </kbd>
            <span className="text-slate-600">|</span>
            <span>Esc 退出</span>
          </div>
        </div>

        {/* Windows 系统菜单冲突贴心防坑提示条 */}
        <div className="px-5 py-2 bg-indigo-950/30 border-t border-indigo-500/10 flex items-center space-x-2 text-[11px] text-indigo-300/80">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            提示：在 Windows 浏览器中，系统默认将 Alt+Space 绑定为窗口操作菜单；如遇浏览器菜单抢占，强烈推荐使用 <b>{labels.primary}</b> 一键呼出。
          </span>
        </div>
      </div>
    </div>
  );
};
