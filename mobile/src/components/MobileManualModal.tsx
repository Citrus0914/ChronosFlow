import React, { useState, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration, getCategoryColor } from '../lib/utils';
import { formatDate } from '../lib/dateUtils';
import type { ActivityMood } from '../types';
import {
  Clock,
  Calendar,
  X,
  Flame,
  Smile,
  Frown,
  BatteryCharging,
  Sparkles,
  Zap,
  Target,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';

const PRESET_CATEGORIES = [
  '开发/技术',
  '工作/业务',
  '学习/提升',
  '健康/运动',
  '休闲/生活',
];

const MOODS: { id: ActivityMood; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'NORMAL', label: '平常', icon: <Sparkles className="w-3.5 h-3.5" />, color: '#94a3b8' },
  { id: 'FOCUSED', label: '专注', icon: <Smile className="w-3.5 h-3.5" />, color: '#3b82f6' },
  { id: 'FLOW', label: '心流', icon: <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />, color: '#8b5cf6' },
  { id: 'TIRED', label: '疲惫', icon: <BatteryCharging className="w-3.5 h-3.5" />, color: '#f59e0b' },
  { id: 'FRUSTRATED', label: '受挫', icon: <Frown className="w-3.5 h-3.5" />, color: '#ef4444' },
  { id: 'DISTRACTED', label: '分心', icon: <Zap className="w-3.5 h-3.5" />, color: '#f97316' },
];

export const MobileManualModal: React.FC = () => {
  const {
    isManualModalOpen,
    setManualModalOpen,
    manualPrefill,
    addManualActivity,
    updateActivity,
    projectGoals,
  } = useTimeStore();

  const isEditMode = Boolean(manualPrefill?.id);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('开发/技术');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [mood, setMood] = useState<ActivityMood>('FOCUSED');
  const [date, setDate] = useState(() => formatDate(new Date()));

  // 时间模式：EXACT (精确起止时段) | FUZZY (未知时段，仅记时长)
  const [timeMode, setTimeMode] = useState<'EXACT' | 'FUZZY'>('EXACT');
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('10:30');
  const [fuzzyHours, setFuzzyHours] = useState('1');
  const [fuzzyMinutes, setFuzzyMinutes] = useState('0');

  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 快捷日期定义
  const todayStr = formatDate(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = formatDate(yesterdayObj);

  const beforeYesterdayObj = new Date();
  beforeYesterdayObj.setDate(beforeYesterdayObj.getDate() - 2);
  const beforeYesterdayStr = formatDate(beforeYesterdayObj);

  const activeProjects = projectGoals.filter((p) => !p.isArchived);

  // 初始化监听 prefill 数据
  useEffect(() => {
    if (isManualModalOpen) {
      if (manualPrefill?.defaultDate) {
        setDate(manualPrefill.defaultDate);
      } else if (manualPrefill?.startTime) {
        setDate(formatDate(new Date(manualPrefill.startTime)));
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
        const sH = sD.getHours().toString().padStart(2, '0');
        const sM = sD.getMinutes().toString().padStart(2, '0');
        const eH = eD.getHours().toString().padStart(2, '0');
        const eM = eD.getMinutes().toString().padStart(2, '0');
        setStartTimeStr(`${sH}:${sM}`);
        setEndTimeStr(`${eH}:${eM}`);

        const diffM = Math.max(1, Math.round((eD.getTime() - sD.getTime()) / 60000));
        setFuzzyHours(Math.floor(diffM / 60).toString());
        setFuzzyMinutes((diffM % 60).toString());
      } else if (manualPrefill?.durationMinutes) {
        const diffM = manualPrefill.durationMinutes;
        setFuzzyHours(Math.floor(diffM / 60).toString());
        setFuzzyMinutes((diffM % 60).toString());
        // 默认精确时段推测
        const now = new Date();
        const eStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const past = new Date(now.getTime() - diffM * 60000);
        const sStr = `${past.getHours().toString().padStart(2, '0')}:${past.getMinutes().toString().padStart(2, '0')}`;
        setStartTimeStr(sStr);
        setEndTimeStr(eStr);
      } else {
        // 默认 1 小时前至今
        const now = new Date();
        const eH = now.getHours().toString().padStart(2, '0');
        const eM = now.getMinutes().toString().padStart(2, '0');
        const past = new Date(now.getTime() - 60 * 60000);
        const sH = past.getHours().toString().padStart(2, '0');
        const sM = past.getMinutes().toString().padStart(2, '0');
        setStartTimeStr(`${sH}:${sM}`);
        setEndTimeStr(`${eH}:${eM}`);
        setFuzzyHours('1');
        setFuzzyMinutes('0');
      }

      setTitle(manualPrefill?.title || '');
      setSelectedProjectId(manualPrefill?.projectId || '');

      const initialCat = manualPrefill?.category || '开发/技术';
      setCategory(PRESET_CATEGORIES.includes(initialCat) ? initialCat : '开发/技术');
      setMood(manualPrefill?.mood || 'FOCUSED');
      setNotes(manualPrefill?.notes || '');
      setErrorMsg('');
    }
  }, [isManualModalOpen, manualPrefill, todayStr]);

  if (!isManualModalOpen) return null;

  // 精确时段持续时长计算
  const computeExactDurationMinutes = () => {
    if (!startTimeStr || !endTimeStr) return 0;
    const [sH, sM] = startTimeStr.split(':').map(Number);
    const [eH, eM] = endTimeStr.split(':').map(Number);
    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0;
    const startM = sH * 60 + sM;
    const endM = eH * 60 + eM;
    return endM - startM;
  };

  const exactDurationMin = computeExactDurationMinutes();
  const parsedFuzzyH = parseInt(fuzzyHours, 10) || 0;
  const parsedFuzzyM = parseInt(fuzzyMinutes, 10) || 0;
  const fuzzyDurationMin = parsedFuzzyH * 60 + parsedFuzzyM;
  const currentDurationMin = timeMode === 'EXACT' ? exactDurationMin : fuzzyDurationMin;

  // 快捷设置精确时段
  const handleQuickExactTime = (hoursAgo: number, durationMinutes: number) => {
    triggerHapticFeedback(15);
    const now = new Date();
    const end = new Date(now.getTime() - hoursAgo * 3600000);
    const start = new Date(end.getTime() - durationMinutes * 60000);

    const sH = start.getHours().toString().padStart(2, '0');
    const sM = start.getMinutes().toString().padStart(2, '0');
    const eH = end.getHours().toString().padStart(2, '0');
    const eM = end.getMinutes().toString().padStart(2, '0');

    setStartTimeStr(`${sH}:${sM}`);
    setEndTimeStr(`${eH}:${eM}`);
  };

  // 快捷累加模糊时长
  const handleAddFuzzyMinutes = (delta: number) => {
    triggerHapticFeedback(10);
    const currentTotal = (parseInt(fuzzyHours, 10) || 0) * 60 + (parseInt(fuzzyMinutes, 10) || 0);
    const nextTotal = Math.max(5, currentTotal + delta);
    setFuzzyHours(Math.floor(nextTotal / 60).toString());
    setFuzzyMinutes((nextTotal % 60).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('请输入具体做了什么事情');
      return;
    }

    if (timeMode === 'EXACT') {
      if (!startTimeStr || !endTimeStr) {
        setErrorMsg('请选择具体的开始与结束时间');
        return;
      }
      if (exactDurationMin <= 0) {
        setErrorMsg('结束时间必须晚于开始时间（不可跨天或倒流）');
        return;
      }
    } else {
      if (fuzzyDurationMin <= 0) {
        setErrorMsg('请输入大于 0 分钟的有效时长');
        return;
      }
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
      // 模糊模式：锚定在当天中午 12:00
      startTimestamp = new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
      endTimestamp = startTimestamp + fuzzyDurationMin * 60000;
    }

    triggerHapticFeedback(30);

    if (isEditMode && manualPrefill?.id) {
      updateActivity(manualPrefill.id, {
        title: title.trim(),
        category,
        startTime: startTimestamp,
        endTime: endTimestamp,
        durationMinutes: currentDurationMin,
        mood,
        notes: notes.trim() || undefined,
        isFuzzyTime: timeMode === 'FUZZY',
        projectId: selectedProjectId || undefined,
      });
    } else {
      addManualActivity({
        rawInput: `补录: ${title.trim()} (${formatDuration(currentDurationMin)})`,
        title: title.trim(),
        category,
        tags: [category, timeMode === 'FUZZY' ? '未知时段' : '精确补录'],
        startTime: startTimestamp,
        endTime: endTimestamp,
        durationMinutes: currentDurationMin,
        status: 'COMPLETED',
        mood,
        notes: notes.trim() || undefined,
        isFuzzyTime: timeMode === 'FUZZY',
        projectId: selectedProjectId || undefined,
      });
    }

    setManualModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* 弹窗顶栏 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">
              {isEditMode ? '编辑时间块记录' : '手动补录时间块'}
            </h3>
          </div>
          <button
            onClick={() => {
              triggerHapticFeedback(10);
              setManualModalOpen(false);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 时段模式切换：精确起止 VS 未知时段(仅记时长) */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(15);
                setTimeMode('EXACT');
              }}
              className={`py-1.5 rounded-lg text-center font-bold transition-all ${
                timeMode === 'EXACT'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⏰ 精确起止时段
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(15);
                setTimeMode('FUZZY');
              }}
              className={`py-1.5 rounded-lg text-center font-bold transition-all ${
                timeMode === 'FUZZY'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🕒 未知时段 (仅记时长)
            </button>
          </div>

          {/* 日期选择与快捷日期药丸 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>日期归档</span>
              </span>
              {/* 快捷日期药丸 */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(10);
                    setDate(todayStr);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition ${
                    date === todayStr
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                  }`}
                >
                  今天
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(10);
                    setDate(yesterdayStr);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition ${
                    date === yesterdayStr
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                  }`}
                >
                  昨天
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(10);
                    setDate(beforeYesterdayStr);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition ${
                    date === beforeYesterdayStr
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                  }`}
                >
                  前天
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* 模式 A：精确起止时段 */}
          {timeMode === 'EXACT' && (
            <div className="space-y-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">开始时间</label>
                  <input
                    type="time"
                    required
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">结束时间</label>
                  <input
                    type="time"
                    required
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* 快捷时段按钮 */}
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => handleQuickExactTime(0, 30)}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap shrink-0"
                >
                  刚刚 30m
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickExactTime(0, 60)}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap shrink-0"
                >
                  刚刚 1h
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartTimeStr('09:00');
                    setEndTimeStr('12:00');
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap shrink-0"
                >
                  上午 09:00-12:00
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartTimeStr('14:00');
                    setEndTimeStr('17:30');
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap shrink-0"
                >
                  下午 14:00-17:30
                </button>
              </div>

              {/* 时长汇总指示 */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 text-[11px]">有效专注跨度:</span>
                <span className={`font-mono font-bold ${exactDurationMin > 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                  {exactDurationMin > 0 ? formatDuration(exactDurationMin) : '结束时间必须晚于开始时间'}
                </span>
              </div>
            </div>
          )}

          {/* 模式 B：未知时段 (仅记时长) */}
          {timeMode === 'FUZZY' && (
            <div className="space-y-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="flex-1 flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={fuzzyHours}
                    onChange={(e) => setFuzzyHours(e.target.value)}
                    className="w-12 bg-transparent text-center text-xs font-bold text-white focus:outline-none font-mono"
                  />
                  <span className="text-xs text-slate-400 ml-1">小时</span>
                </div>
                <div className="flex-1 flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={fuzzyMinutes}
                    onChange={(e) => setFuzzyMinutes(e.target.value)}
                    className="w-12 bg-transparent text-center text-xs font-bold text-white focus:outline-none font-mono"
                  />
                  <span className="text-xs text-slate-400 ml-1">分钟</span>
                </div>
              </div>

              {/* 快捷增减药丸 */}
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                {[-30, 15, 30, 45, 60, 120].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => handleAddFuzzyMinutes(delta)}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono shrink-0"
                  >
                    {delta > 0 ? `+${delta}m` : `${delta}m`}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-slate-500" />
                  <span>不占钟点流速</span>
                </span>
                <span className="font-mono font-bold text-indigo-400">
                  共计 {formatDuration(fuzzyDurationMin)}
                </span>
              </div>
            </div>
          )}

          {/* 事项标题 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">事项名称 *</label>
            <input
              type="text"
              required
              placeholder="例如：重构后端接口、研读注意力机制论文..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* 5 大标准分类直选药丸 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">分类归属</label>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESET_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                const catColor = getCategoryColor(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback(10);
                      setCategory(cat);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                      isSelected
                        ? 'border-indigo-500/60 bg-indigo-600/20 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: catColor }}
                    />
                    <span className="truncate">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 关联专属目标项目 (Project Goals) */}
          {activeProjects.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <span>关联专属目标项目</span>
                </span>
                {selectedProjectId && (
                  <button
                    type="button"
                    onClick={() => setSelectedProjectId('')}
                    className="text-[10px] text-slate-500 hover:text-rose-400"
                  >
                    清除关联
                  </button>
                )}
              </label>

              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
                {activeProjects.map((p) => {
                  const isSelected = selectedProjectId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(10);
                        setSelectedProjectId(isSelected ? '' : p.id);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border flex items-center space-x-1.5 whitespace-nowrap shrink-0 transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-600/30 text-white shadow-md'
                          : 'border-slate-800 bg-slate-800/60 text-slate-400'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span>{p.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-indigo-400 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 情绪状态单选 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">情绪与精力状态</label>
            <div className="grid grid-cols-3 gap-1.5">
              {MOODS.map((m) => {
                const isSelected = mood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback(10);
                      setMood(m.id);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center space-x-1.5 border transition-all ${
                      isSelected
                        ? 'border-indigo-500/60 bg-indigo-600/20 text-white font-bold'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 心得与心得备注 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">心得体会 / 卡点记录 (选填)</label>
            <textarea
              rows={2}
              placeholder="记录本次专注的关键产出、顿悟或阻力..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* 底部保存按钮 */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(10);
                setManualModalOpen(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              {isEditMode ? '保存修改并更新' : '立即归档入时间流'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
