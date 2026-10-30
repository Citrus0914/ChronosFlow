import React, { useState, useEffect } from 'react';
import { Clock, X, Check, Trash2, Plus, Minus } from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';

interface FocusDurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMinutes?: number;
  onSave: (minutes: number | null) => void;
}

const PRESET_DURATIONS = [
  { min: 15, label: '15 分钟', desc: '快速冲刺' },
  { min: 25, label: '25 分钟', desc: '经典番茄' },
  { min: 30, label: '30 分钟', desc: '标准专注' },
  { min: 45, label: '45 分钟', desc: '深度攻坚' },
  { min: 60, label: '60 分钟', desc: '极限心流' },
  { min: 90, label: '90 分钟', desc: '沉浸攻坚' },
];

export const FocusDurationModal: React.FC<FocusDurationModalProps> = ({
  isOpen,
  onClose,
  currentMinutes,
  onSave,
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(currentMinutes || 25);

  useEffect(() => {
    if (isOpen) {
      setSelectedMinutes(currentMinutes && currentMinutes > 0 ? currentMinutes : 25);
    }
  }, [isOpen, currentMinutes]);

  if (!isOpen) return null;

  const handleAdjust = (delta: number) => {
    triggerHapticFeedback(15);
    setSelectedMinutes((prev) => Math.max(1, Math.min(360, prev + delta)));
  };

  const handleConfirm = () => {
    triggerHapticFeedback(25);
    onSave(selectedMinutes);
    onClose();
  };

  const handleClear = () => {
    triggerHapticFeedback(20);
    onSave(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/10 p-5 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        style={{
          paddingBottom: 'calc(1.25rem + var(--safe-bottom, 0px))',
        }}
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">设置专注提醒时长</h3>
              <p className="text-[11px] text-slate-400">时长到达时将自动响铃并推送通知栏消息</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHapticFeedback(10);
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 快捷预设网格 (2列 x 3行) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400">常用预设时长</label>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_DURATIONS.map((preset) => {
              const isActive = selectedMinutes === preset.min;
              return (
                <button
                  key={preset.min}
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(15);
                    setSelectedMinutes(preset.min);
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-center transition-all active:scale-95 ${
                    isActive
                      ? 'bg-indigo-600/25 border-indigo-500/80 text-indigo-200 shadow-sm shadow-indigo-500/30'
                      : 'bg-slate-800/60 border-white/[0.06] text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold whitespace-nowrap">{preset.label}</span>
                  <span className="text-[9px] text-slate-400 whitespace-nowrap mt-0.5">{preset.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 手动微调数值控制 */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400">自定义时长 (分钟)</label>
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-950/70 border border-white/[0.08]">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleAdjust(-5)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/[0.06] active:scale-90 transition-all"
                title="减少5分钟"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAdjust(-1)}
                className="px-2 py-1 rounded-lg text-xs bg-slate-800/50 hover:bg-slate-700 text-slate-400 active:scale-90"
              >
                -1m
              </button>
            </div>

            <div className="flex items-baseline space-x-1">
              <input
                type="number"
                min="1"
                max="360"
                value={selectedMinutes}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setSelectedMinutes(Math.max(1, Math.min(360, val)));
                  }
                }}
                className="w-16 text-center font-mono text-2xl font-black text-indigo-300 bg-transparent outline-none"
              />
              <span className="text-xs font-bold text-slate-400">分钟</span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleAdjust(1)}
                className="px-2 py-1 rounded-lg text-xs bg-slate-800/50 hover:bg-slate-700 text-slate-400 active:scale-90"
              >
                +1m
              </button>
              <button
                type="button"
                onClick={() => handleAdjust(5)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/[0.06] active:scale-90 transition-all"
                title="增加5分钟"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="flex items-center space-x-2.5 pt-2">
          {currentMinutes && currentMinutes > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="py-3 px-3.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-300 text-xs font-semibold flex items-center justify-center space-x-1 shrink-0 active:scale-95 transition-all"
              title="清除目标，改为自由正向计时"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>自由计时</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/30 active:scale-98 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>确认启用 {selectedMinutes} 分钟提醒</span>
          </button>
        </div>
      </div>
    </div>
  );
};
