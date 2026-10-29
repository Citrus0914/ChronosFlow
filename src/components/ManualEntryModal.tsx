import React, { useState, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration } from '../lib/utils';
import type { ActivityMood } from '../types';
import { Clock, Calendar, X, Check, Flame, Smile, Frown, BatteryCharging, Sparkles } from 'lucide-react';

const CATEGORIES = [
  '开发/技术',
  '工作/业务',
  '学习/提升',
  '健康/运动',
  '休闲/生活',
  '其他工作',
];

const MOODS: { id: ActivityMood; label: string; icon: React.ReactNode }[] = [
  { id: 'NORMAL', label: '平稳', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'FOCUSED', label: '专注', icon: <Smile className="w-3.5 h-3.5" /> },
  { id: 'FLOW', label: '心流', icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
  { id: 'TIRED', label: '疲惫', icon: <BatteryCharging className="w-3.5 h-3.5 text-yellow-400" /> },
  { id: 'FRUSTRATED', label: '卡壳', icon: <Frown className="w-3.5 h-3.5 text-rose-400" /> },
];

export const ManualEntryModal: React.FC = () => {
  const { isManualModalOpen, setManualModalOpen, manualPrefill, addManualActivity } = useTimeStore();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('工作/业务');
  const [mood, setMood] = useState<ActivityMood>('NORMAL');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTimeStr, setStartTimeStr] = useState('14:00');
  const [endTimeStr, setEndTimeStr] = useState('15:00');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 监听 prefill 注入
  useEffect(() => {
    if (isManualModalOpen) {
      const now = new Date();
      if (manualPrefill?.startTime && manualPrefill?.endTime) {
        const sD = new Date(manualPrefill.startTime);
        const eD = new Date(manualPrefill.endTime);
        setDate(sD.toISOString().split('T')[0]);
        setStartTimeStr(sD.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }));
        setEndTimeStr(eD.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }));
      } else {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const curH = now.getHours();
        const prevH = curH > 0 ? curH - 1 : 0;
        setStartTimeStr(`${pad(prevH)}:00`);
        setEndTimeStr(`${pad(curH)}:00`);
      }
      setTitle('');
      setNotes('');
      setErrorMsg('');
    }
  }, [isManualModalOpen, manualPrefill]);

  if (!isManualModalOpen) return null;

  // 计算时长
  const computeDurationMinutes = () => {
    const [sH, sM] = startTimeStr.split(':').map(Number);
    const [eH, eM] = endTimeStr.split(':').map(Number);
    const startM = sH * 60 + sM;
    const endM = eH * 60 + eM;
    return endM - startM;
  };

  const durationMin = computeDurationMinutes();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('请输入具体做了什么事情');
      return;
    }

    if (durationMin <= 0) {
      setErrorMsg('结束时间必须晚于开始时间');
      return;
    }

    const [y, m, d] = date.split('-').map(Number);
    const [sH, sM] = startTimeStr.split(':').map(Number);
    const [eH, eM] = endTimeStr.split(':').map(Number);

    const startTimestamp = new Date(y, m - 1, d, sH, sM, 0, 0).getTime();
    const endTimestamp = new Date(y, m - 1, d, eH, eM, 0, 0).getTime();

    addManualActivity({
      rawInput: `${date} ${startTimeStr}-${endTimeStr} ${title}`,
      title: title.trim(),
      category,
      tags: [category.split('/')[0]],
      startTime: startTimestamp,
      endTime: endTimestamp,
      durationMinutes: durationMin,
      status: 'COMPLETED',
      mood,
      notes: notes.trim() || undefined,
    });

    setManualModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Clock className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-base text-white">精确记录指定时间段</h3>
          </div>
          <button
            type="button"
            onClick={() => setManualModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 事项名称 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              做了什么事情 / 任务名称 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：架构方案评审、修复跨域报错、看技术论文..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              autoFocus
            />
          </div>

          {/* 日期与起止时间段 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                日期
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                开始时间
              </label>
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                结束时间
              </label>
              <input
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* 时长计算预览条 */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-xs">
            <span className="text-slate-400">时间跨度：</span>
            <span className={`font-semibold ${durationMin > 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
              {durationMin > 0 ? `${formatDuration(durationMin)} (${durationMin} 分钟)` : '结束时间必须晚于开始时间'}
            </span>
          </div>

          {/* 分类选择 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">任务分类</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    category === cat
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 状态情绪标签 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">专注与情绪状态</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMood(m.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    mood === m.id
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>保存时间块</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
