import React, { useState, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration } from '../lib/utils';
import { formatDate } from '../lib/dateUtils';
import type { ActivityMood } from '../types';
import { Clock, Calendar, X, Flame, Smile, Frown, BatteryCharging, Sparkles, History, HelpCircle } from 'lucide-react';

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
  const [date, setDate] = useState(() => formatDate(new Date()));
  
  // 时间模式：EXACT (精确起止时段) | FUZZY (未知时段，仅记时长)
  const [timeMode, setTimeMode] = useState<'EXACT' | 'FUZZY'>('EXACT');
  const [startTimeStr, setStartTimeStr] = useState('14:00');
  const [endTimeStr, setEndTimeStr] = useState('15:30');
  const [fuzzyHours, setFuzzyHours] = useState<string>('1');
  const [fuzzyMinutes, setFuzzyMinutes] = useState<string>('0');

  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 快捷日期计算
  const todayStr = formatDate(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = formatDate(yesterdayObj);

  const beforeYesterdayObj = new Date();
  beforeYesterdayObj.setDate(beforeYesterdayObj.getDate() - 2);
  const beforeYesterdayStr = formatDate(beforeYesterdayObj);

  // 监听 prefill 注入
  useEffect(() => {
    if (isManualModalOpen) {
      const now = new Date();
      if (manualPrefill?.defaultDate) {
        setDate(manualPrefill.defaultDate);
      } else if (manualPrefill?.startTime) {
        const sD = new Date(manualPrefill.startTime);
        setDate(formatDate(sD));
      } else {
        setDate(todayStr);
      }

      if (manualPrefill?.isFuzzyTime) {
        setTimeMode('FUZZY');
      } else {
        setTimeMode('EXACT');
      }

      if (manualPrefill?.startTime && manualPrefill?.endTime) {
        const sD = new Date(manualPrefill.startTime);
        const eD = new Date(manualPrefill.endTime);
        setStartTimeStr(sD.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }));
        setEndTimeStr(eD.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }));
        
        const diffM = Math.max(1, Math.round((eD.getTime() - sD.getTime()) / 60000));
        setFuzzyHours(Math.floor(diffM / 60).toString());
        setFuzzyMinutes((diffM % 60).toString());
      } else {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const curH = now.getHours();
        const prevH = curH > 1 ? curH - 2 : 9;
        setStartTimeStr(`${pad(prevH)}:00`);
        setEndTimeStr(`${pad(curH > 0 ? curH : 11)}:00`);
        setFuzzyHours('1');
        setFuzzyMinutes('0');
      }

      setTitle(manualPrefill?.title || '');
      setCategory(manualPrefill?.category || '工作/业务');
      setNotes('');
      setErrorMsg('');
    }
  }, [isManualModalOpen, manualPrefill, todayStr]);

  if (!isManualModalOpen) return null;

  // 计算精确模式下的时长
  const computeExactDurationMinutes = () => {
    const [sH, sM] = startTimeStr.split(':').map(Number);
    const [eH, eM] = endTimeStr.split(':').map(Number);
    const startM = sH * 60 + sM;
    const endM = eH * 60 + eM;
    return endM - startM;
  };

  const exactDurationMin = computeExactDurationMinutes();
  const parsedFuzzyH = parseInt(fuzzyHours, 10) || 0;
  const parsedFuzzyM = parseInt(fuzzyMinutes, 10) || 0;
  const fuzzyDurationMin = parsedFuzzyH * 60 + parsedFuzzyM;
  const currentDurationMin = timeMode === 'EXACT' ? exactDurationMin : fuzzyDurationMin;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('请输入具体做了什么事情');
      return;
    }

    if (currentDurationMin <= 0) {
      setErrorMsg(timeMode === 'EXACT' ? '结束时间必须晚于开始时间' : '请输入大于 0 分钟的有效时长');
      return;
    }

    const [y, m, d] = date.split('-').map(Number);
    let startTimestamp: number;
    let endTimestamp: number;

    if (timeMode === 'EXACT') {
      const [sH, sM] = startTimeStr.split(':').map(Number);
      const [eH, eM] = endTimeStr.split(':').map(Number);
      startTimestamp = new Date(y, m - 1, d, sH, sM, 0, 0).getTime();
      endTimestamp = new Date(y, m - 1, d, eH, eM, 0, 0).getTime();
    } else {
      // 未知时段：锚定在当日中午 12:00，便于按日期统一归集与统计
      startTimestamp = new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
      endTimestamp = startTimestamp + fuzzyDurationMin * 60 * 1000;
    }

    addManualActivity({
      rawInput:
        timeMode === 'EXACT'
          ? `${date} ${startTimeStr}-${endTimeStr} ${title}`
          : `${date} 未知时段 (${formatDuration(fuzzyDurationMin)}) ${title}`,
      title: title.trim(),
      category,
      tags: [category.split('/')[0]],
      startTime: startTimestamp,
      endTime: endTimestamp,
      durationMinutes: currentDurationMin,
      status: 'COMPLETED',
      mood,
      notes: notes.trim() || undefined,
      isFuzzyTime: timeMode === 'FUZZY',
    });

    setManualModalOpen(false);
  };

  // 快捷时间段填充（精确模式）
  const setQuickTimeSlot = (start: string, end: string) => {
    setStartTimeStr(start);
    setEndTimeStr(end);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-white">补齐过去的记录 / 精确时间块</h3>
              <p className="text-xs text-slate-400">支持追溯历史日期，可选择精确时段或仅记时长</p>
            </div>
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
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 快捷日期切换与选择 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                记录日期
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  className={`text-[11px] px-2 py-0.5 rounded-md transition cursor-pointer ${
                    date === todayStr
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  今天
                </button>
                <button
                  type="button"
                  onClick={() => setDate(yesterdayStr)}
                  className={`text-[11px] px-2 py-0.5 rounded-md transition cursor-pointer ${
                    date === yesterdayStr
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  昨天
                </button>
                <button
                  type="button"
                  onClick={() => setDate(beforeYesterdayStr)}
                  className={`text-[11px] px-2 py-0.5 rounded-md transition cursor-pointer ${
                    date === beforeYesterdayStr
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  前天
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* 事项名称 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              做了什么事情 / 任务名称 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：架构方案评审、修复跨域报错、阅读论文..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              autoFocus
            />
          </div>

          {/* 时段与时长模式切换 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                时间时段模式
              </label>

              {/* 模式切换药丸 */}
              <div className="flex items-center p-0.5 rounded-lg bg-white/5 border border-white/5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTimeMode('EXACT')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium ${
                    timeMode === 'EXACT'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  精确起止时段
                </button>
                <button
                  type="button"
                  onClick={() => setTimeMode('FUZZY')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium ${
                    timeMode === 'FUZZY'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  未知时段 (只填时长)
                </button>
              </div>
            </div>

            {timeMode === 'EXACT' ? (
              /* 精确起止时间输入面板 */
              <div className="space-y-2 p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] text-slate-400">设定具体的开始与结束时间点</span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setQuickTimeSlot('09:30', '11:30')}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      上午
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTimeSlot('14:00', '16:30')}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      下午
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTimeSlot('19:30', '21:30')}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      晚间
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">开始时间</span>
                    <input
                      type="time"
                      value={startTimeStr}
                      onChange={(e) => setStartTimeStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">结束时间</span>
                    <input
                      type="time"
                      value={endTimeStr}
                      onChange={(e) => setEndTimeStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {exactDurationMin > 0 && (
                  <div className="text-[11px] text-indigo-300 font-medium pt-0.5 flex items-center justify-between">
                    <span>持续耗时：{formatDuration(exactDurationMin)}</span>
                    <span className="text-slate-500">跨度 {exactDurationMin} 分钟</span>
                  </div>
                )}
              </div>
            ) : (
              /* 未知时段 (只填时长) 输入面板 */
              <div className="space-y-3 p-3.5 rounded-xl bg-white/5 border border-indigo-500/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] text-slate-300 flex items-center">
                    <HelpCircle className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                    具体钟点记不清了？直接填写投入时长：
                  </span>
                  {/* 快捷时长预置 */}
                  <div className="flex items-center space-x-1">
                    {[
                      { label: '30分', h: 0, m: 30 },
                      { label: '45分', h: 0, m: 45 },
                      { label: '1小时', h: 1, m: 0 },
                      { label: '1.5h', h: 1, m: 30 },
                      { label: '2小时', h: 2, m: 0 },
                      { label: '3小时', h: 3, m: 0 },
                    ].map((slot) => (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => {
                          setFuzzyHours(slot.h.toString());
                          setFuzzyMinutes(slot.m.toString());
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition cursor-pointer ${
                          parsedFuzzyH === slot.h && parsedFuzzyM === slot.m
                            ? 'bg-indigo-600 text-white font-medium'
                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 小时与分钟数值调节 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">小时数</span>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="1"
                        value={fuzzyHours}
                        onChange={(e) => setFuzzyHours(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500 transition pr-8"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500">小时</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">分钟数</span>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="1"
                        value={fuzzyMinutes}
                        onChange={(e) => setFuzzyMinutes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500 transition pr-8"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500">分钟</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-indigo-300 font-medium flex items-center justify-between pt-0.5">
                  <span>总计记录时长：{formatDuration(fuzzyDurationMin)}</span>
                  <span className="text-slate-500">计入该日、周、月统计，不占具体钟点</span>
                </div>
              </div>
            )}
          </div>

          {/* 分类选择 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">事项分类</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                    category === cat
                      ? 'bg-indigo-600/30 border-indigo-500 text-white font-semibold'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 专注心流情绪状态 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">精力与专注情绪</label>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMood(m.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                    mood === m.id
                      ? 'bg-indigo-600/30 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {m.icon}
                  <span className="text-[11px] mt-1">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 备注 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">备注（可选）</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录卡点、关键产出或心得..."
              className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* 提交按钮 */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center space-x-1.5"
            >
              <span>确认归档时间块</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
