import React, { useState, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration, formatTimeRange } from '../lib/utils';
import { formatDate, formatChineseDate, getWeekdayName, isSameDay } from '../lib/dateUtils';
import {
  Check,
  Trash2,
  Clock,
  AlertCircle,
  Sparkles,
  Flame,
  Smile,
  Frown,
  BatteryCharging,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
} from 'lucide-react';
import type { ActivityMood } from '../types';

export const TimelineView: React.FC = () => {
  const {
    activities,
    activeActivity,
    projectGoals,
    finishActiveActivity,
    deleteActivity,
    getDetectedGap,
    setManualModalOpen,
  } = useTimeStore();

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'DAY' | 'ALL'>('DAY');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isToday = isSameDay(selectedDate, new Date());
  const isYesterday = isSameDay(selectedDate, new Date(Date.now() - 86400000));
  const gap = isToday ? getDetectedGap() : null;

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

  // 切换日期
  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleGoToday = () => {
    setSelectedDate(new Date());
  };

  // 过滤展示记录
  const completedActivities = activities.filter((a) => a.status === 'COMPLETED');
  const displayedActivities =
    viewMode === 'ALL'
      ? completedActivities.sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
      : completedActivities
          .filter((a) => isSameDay(a.startTime, selectedDate))
          .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));

  const totalMinutes = displayedActivities.reduce((sum, a) => sum + a.durationMinutes, 0);

  return (
    <div className="space-y-6">
      {/* 顶部日期导航工具栏 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#131b2e]/70 border border-white/5">
        {/* 日期前进/后退控制器 */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-white/5 rounded-xl p-1 border border-white/5">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="前一天"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-2 px-2.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">
                {formatChineseDate(selectedDate)}
              </span>
              <span className="text-xs text-slate-400">
                {getWeekdayName(selectedDate)}
              </span>
              {isToday ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  今天
                </span>
              ) : isYesterday ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  昨天
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-white/10">
                  历史记录
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="后一天"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isToday && (
            <button
              type="button"
              onClick={handleGoToday}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition cursor-pointer border border-white/5"
              title="一键回到今天"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>回到今天</span>
            </button>
          )}

          {/* 自由选取日期控件 */}
          <input
            type="date"
            value={formatDate(selectedDate)}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-').map(Number);
                setSelectedDate(new Date(y, m - 1, d));
              }
            }}
            className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/5 cursor-pointer focus:outline-none focus:border-indigo-500"
            title="选择具体日期"
          />
        </div>

        {/* 视图模式切换与补齐入口 */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('DAY')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'DAY'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              单日时间轴
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ALL')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'ALL'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              全部流水
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              setManualModalOpen(true, {
                defaultDate: formatDate(selectedDate),
              })
            }
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>补齐此日记录</span>
          </button>
        </div>
      </div>

      {/* 正在进行中的活跃任务卡片（仅今天展示） */}
      {isToday && activeActivity && (
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
                {activeActivity.projectId && (() => {
                  const activeProj = projectGoals.find((p) => p.id === activeActivity.projectId);
                  return activeProj ? (
                    <span
                      className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-md border font-medium"
                      style={{
                        backgroundColor: `${activeProj.color}20`,
                        borderColor: `${activeProj.color}40`,
                        color: activeProj.color,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeProj.color }} />
                      <span>{activeProj.name}</span>
                    </span>
                  ) : null;
                })()}
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

      {/* 智能断层空白填补提醒（仅今天展示） */}
      {isToday && gap && (
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
                defaultDate: formatDate(new Date()),
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

      {/* 时间流列表 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-indigo-400" />
            {viewMode === 'ALL'
              ? '全量历史时间流轨迹'
              : `${formatChineseDate(selectedDate)} 时间流轨迹`}
          </h2>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() =>
                setManualModalOpen(true, {
                  defaultDate: formatDate(selectedDate),
                })
              }
              className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>补齐此日时间块</span>
            </button>
            <span className="text-xs text-slate-500">
              共 {displayedActivities.length} 个时间块 · 合计 {formatDuration(totalMinutes)}
            </span>
          </div>
        </div>

        {displayedActivities.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#131b2e]/40 border border-white/5 text-center text-slate-400 space-y-3">
            <Sparkles className="w-8 h-8 mx-auto text-indigo-400/60" />
            <p className="text-sm">
              {viewMode === 'DAY'
                ? `${formatChineseDate(selectedDate)} 暂无记录时间流`
                : '暂无任何时间记录'}
            </p>
            <p className="text-xs text-slate-500">
              您可以随时在上方或下方点击按钮补齐过去的记录，或按 Alt + Space 快速随手记一条！
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  setManualModalOpen(true, {
                    defaultDate: formatDate(selectedDate),
                  })
                }
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>立即补齐 {formatDate(selectedDate)} 记录</span>
              </button>
            </div>
          </div>
        ) : (
          displayedActivities.map((activity) => (
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
                    {activity.projectId && (() => {
                      const proj = projectGoals.find((p) => p.id === activity.projectId);
                      return proj ? (
                        <span
                          className="inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded border font-medium"
                          style={{
                            backgroundColor: `${proj.color}15`,
                            borderColor: `${proj.color}35`,
                            color: proj.color,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }} />
                          <span>{proj.name}</span>
                        </span>
                      ) : null;
                    })()}
                    {renderMoodBadge(activity.mood)}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center space-x-2">
                    {viewMode === 'ALL' && (
                      <>
                        <span className="text-indigo-400 font-mono">
                          {formatDate(activity.startTime)}
                        </span>
                        <span>·</span>
                      </>
                    )}
                    {activity.isFuzzyTime ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-medium">
                        🕒 未知时段 (仅记时长)
                      </span>
                    ) : (
                      <span>{formatTimeRange(activity.startTime, activity.endTime)}</span>
                    )}
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
