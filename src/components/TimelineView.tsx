import React, { useState, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration, formatTimeRange } from '../lib/utils';
import { Check, Trash2, Clock, AlertCircle, Sparkles, Flame, Smile, Frown, BatteryCharging, CalendarPlus } from 'lucide-react';
import type { ActivityMood } from '../types';

export const TimelineView: React.FC = () => {
  const {
    activities,
    activeActivity,
    finishActiveActivity,
    deleteActivity,
    getDetectedGap,
    setManualModalOpen,
  } = useTimeStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const gap = getDetectedGap();

  // 活跃任务计时器
  useEffect(() => {
    if (!activeActivity) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const sec = Math.floor((Date.now() - activeActivity.startTime) / 1000);
      setElapsedSeconds(sec);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activeActivity]);

  const renderMoodBadge = (mood: ActivityMood) => {
    switch (mood) {
      case 'FLOW':
        return (
          <span className="flex items-center text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Flame className="w-3 h-3 mr-1 text-indigo-400 fill-indigo-400" />
            心流
          </span>
        );
      case 'FOCUSED':
        return (
          <span className="flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Smile className="w-3 h-3 mr-1" />
            专注
          </span>
        );
      case 'FRUSTRATED':
        return (
          <span className="flex items-center text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Frown className="w-3 h-3 mr-1" />
            卡壳受挫
          </span>
        );
      case 'TIRED':
        return (
          <span className="flex items-center text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BatteryCharging className="w-3 h-3 mr-1" />
            疲惫
          </span>
        );
      default:
        return null;
    }
  };

  const formatElapsed = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 正在进行中的活跃任务卡片 */}
      {activeActivity && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-slate-900 border border-indigo-500/30 p-5 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                  当前正在专注
                </span>
                <span className="text-xs text-slate-400">· {activeActivity.category}</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {activeActivity.title}
              </h3>
              <p className="text-xs text-slate-400">
                记录自：“{activeActivity.rawInput}”
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="font-mono text-3xl font-extrabold text-white tracking-wider">
                  {formatElapsed(elapsedSeconds)}
                </div>
                <div className="text-[11px] text-slate-400">已专注时长</div>
              </div>

              <button
                type="button"
                onClick={() => finishActiveActivity()}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>结算归档</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 智能断层空白填补提醒 */}
      {gap && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">检测到时间断层：</span>
              距离上一任务结束已过去约{' '}
              <span className="font-bold underline">{gap.gapMinutes} 分钟</span>，有未记录的事项吗？
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setManualModalOpen(true, {
                startTime: gap.lastEndTime,
                endTime: Date.now(),
              })
            }
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition cursor-pointer"
          >
            快速补录
          </button>
        </div>
      )}

      {/* 今日时间流列表 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-indigo-400" />
            今日时间流轨迹
          </h2>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setManualModalOpen(true)}
              className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>精确补录时间块</span>
            </button>
            <span className="text-xs text-slate-500">
              共 {activities.filter((a) => a.status === 'COMPLETED').length} 个时间块
            </span>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-3">
            <Sparkles className="w-8 h-8 mx-auto text-slate-600" />
            <p>今天还没有记录任何时间流，按下 Alt+Space 随手记一条吧！</p>
          </div>
        ) : (
          activities
            .filter((a) => a.status === 'COMPLETED')
            .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
            .map((activity) => (
              <div
                key={activity.id}
                className="group relative flex items-center justify-between p-4 rounded-xl bg-[#131b2e]/60 hover:bg-[#18233c] border border-white/5 hover:border-white/10 transition-all duration-150"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0 group-hover:scale-125 transition" />
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-slate-100 text-sm">
                        {activity.title}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400">
                        {activity.category}
                      </span>
                      {renderMoodBadge(activity.mood)}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center space-x-2">
                      <span>{formatTimeRange(activity.startTime, activity.endTime)}</span>
                      <span>·</span>
                      <span className="text-slate-400 italic">“{activity.rawInput}”</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="font-semibold text-slate-200 text-sm">
                      {formatDuration(activity.durationMinutes)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteActivity(activity.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                    title="删除此记录"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
