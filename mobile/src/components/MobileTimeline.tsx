import React, { useState, useMemo } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { QuickTimerBar } from './QuickTimerBar';
import {
  Smartphone,
  Trash2,
  Tag,
  Calendar,
  Plus,
  Edit3,
  Target,
  HelpCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';
import { Activity, getActivityCategories } from '../types';
import {
  formatDate,
  formatShortChineseDate,
  getWeekdayName,
  isSameDay,
} from '../lib/dateUtils';
import { formatDuration, formatCompactDuration, getCategoryColor } from '../lib/utils';

export const MobileTimeline: React.FC = () => {
  const {
    activities,
    deleteActivity,
    addToast,
    setManualModalOpen,
    projectGoals,
    getDetectedGap,
  } = useTimeStore();

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'DAY' | 'ALL'>('DAY');

  const isToday = isSameDay(selectedDate, new Date());
  const isYesterday = isSameDay(selectedDate, new Date(Date.now() - 86400000));
  const gap = isToday ? getDetectedGap() : null;

  // 格式化时间 HH:mm
  const formatClock = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getMoodBadge = (mood: string) => {
    switch (mood) {
      case 'FLOW':
        return (
          <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30 whitespace-nowrap">
            心流
          </span>
        );
      case 'FOCUSED':
        return (
          <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30 whitespace-nowrap">
            专注
          </span>
        );
      case 'DISTRACTED':
        return (
          <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30 whitespace-nowrap">
            分心
          </span>
        );
      case 'TIRED':
        return (
          <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 whitespace-nowrap">
            疲惫
          </span>
        );
      case 'FRUSTRATED':
        return (
          <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30 whitespace-nowrap">
            受挫
          </span>
        );
      default:
        return null;
    }
  };

  // 日期前后切换
  const handlePrevDay = () => {
    triggerHapticFeedback(15);
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    triggerHapticFeedback(15);
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleGoToday = () => {
    triggerHapticFeedback(20);
    setSelectedDate(new Date());
  };

  const handleEdit = (act: Activity) => {
    triggerHapticFeedback(20);
    setManualModalOpen(true, {
      id: act.id,
      title: act.title,
      category: act.category,
      categories: act.categories,
      startTime: act.startTime,
      endTime: act.endTime || undefined,
      durationMinutes: act.durationMinutes,
      mood: act.mood,
      notes: act.notes,
      isFuzzyTime: act.isFuzzyTime,
      projectId: act.projectId,
      projectIds: act.projectIds,
    });
  };

  // 过滤展示记录
  const displayedActivities = useMemo(() => {
    if (viewMode === 'ALL') {
      return [...activities].sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
    }
    return activities
      .filter((a) => isSameDay(a.startTime, selectedDate))
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
  }, [activities, viewMode, selectedDate]);

  const totalMinutes = useMemo(() => {
    return displayedActivities.reduce((sum, a) => sum + a.durationMinutes, 0);
  }, [displayedActivities]);

  return (
    <div className="space-y-4">
      {/* 快捷走秒与输入条 */}
      <QuickTimerBar />

      {/* 顶部日期与模式导航工具栏（双层防挤压排版） */}
      <div className="space-y-2.5 p-3 rounded-2xl chronos-card">
        {/* 第一层：日期控制器与回到今天 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1 min-w-0">
            <button
              type="button"
              onClick={handlePrevDay}
              className="w-8 h-8 rounded-xl bg-slate-800/90 border border-white/[0.06] text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center active:scale-95 transition shrink-0"
              title="前一天"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* 紧凑日期胶囊 + 透明原生日期拾取器 */}
            <div className="relative flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/75 border border-white/[0.07] overflow-hidden cursor-pointer active:scale-[0.98] transition whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-xs font-bold text-white tracking-tight">
                {formatShortChineseDate(selectedDate)}
              </span>
              <span className="text-[11px] text-slate-400">
                {getWeekdayName(selectedDate)}
              </span>

              {isToday ? (
                <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold whitespace-nowrap">
                  今天
                </span>
              ) : isYesterday ? (
                <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold whitespace-nowrap">
                  昨天
                </span>
              ) : null}

              <input
                type="date"
                value={formatDate(selectedDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    setSelectedDate(new Date(y, m - 1, d));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="点击选择任意日期"
              />
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="w-8 h-8 rounded-xl bg-slate-800/90 border border-white/[0.06] text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center active:scale-95 transition shrink-0"
              title="后一天"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isToday && (
            <button
              type="button"
              onClick={handleGoToday}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-[11px] font-bold active:scale-95 transition whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span>回今天</span>
            </button>
          )}
        </div>

        {/* 第二层：视图模式切换 + 紧凑投入徽章 + 补录按钮 */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950/90 border border-white/[0.06] shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(15);
                setViewMode('DAY');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                viewMode === 'DAY'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              单日轴
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(15);
                setViewMode('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                viewMode === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              全部流水
            </button>
          </div>

          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap truncate">
              共 <strong className="text-white font-bold">{formatCompactDuration(totalMinutes)}</strong>
            </span>
            <button
              onClick={() => {
                triggerHapticFeedback(20);
                setManualModalOpen(true, {
                  defaultDate: formatDate(selectedDate),
                });
              }}
              className="px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 text-xs font-bold border border-indigo-500/35 flex items-center space-x-1 whitespace-nowrap shrink-0 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>补录</span>
            </button>
          </div>
        </div>
      </div>

      {/* 智能空白断层感知预警卡片 (Smart Gap Alert) */}
      {isToday && gap && (
        <div className="flex items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 shadow-lg animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="flex items-start space-x-2.5 min-w-0 flex-1">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <div className="text-xs font-bold text-white flex items-center flex-wrap gap-1">
                <span className="whitespace-nowrap">发现时间断层</span>
                <span className="text-amber-300 font-mono tabular-nums whitespace-nowrap">
                  ({formatDuration(gap.gapMinutes)})
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                距上一任务结束已超 45 分钟未打卡，一键记录这段时间的去向。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(20);
              setManualModalOpen(true, {
                defaultDate: formatDate(new Date()),
                startTime: gap.lastEndTime,
                endTime: Date.now(),
              });
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 whitespace-nowrap shrink-0 active:scale-95 transition"
          >
            快速补录
          </button>
        </div>
      )}

      {/* 时间流列表（带左侧流光时间轴导轨与发光节点图形） */}
      {displayedActivities.length === 0 ? (
        <div className="py-14 text-center space-y-3 rounded-2xl chronos-card border-dashed p-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-200 font-bold">
            {viewMode === 'ALL'
              ? '暂无任何历史活动记录'
              : `${isToday ? '今日' : formatShortChineseDate(selectedDate)} 暂无时间块记录`}
          </p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            可在上方随手打字计时、点击「补录」精确记录，或前往「应用追踪」一键同步应用时长。
          </p>
          <button
            onClick={() => {
              triggerHapticFeedback(20);
              setManualModalOpen(true, {
                defaultDate: formatDate(selectedDate),
              });
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30 inline-flex items-center space-x-1.5 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>补记此日时间块</span>
          </button>
        </div>
      ) : (
        <div className="relative pl-5 space-y-3">
          {/* 纵向时间轴连贯流光导轨 */}
          <div
            aria-hidden="true"
            className="absolute left-[7px] top-3 bottom-3 w-[2px] rounded-full bg-gradient-to-b from-indigo-500/50 via-slate-800 to-slate-800/30"
          />

          {displayedActivities.map((act) => {
            const isAuto = !!act.isAutoDetected;
            const project = act.projectId ? projectGoals.find((p) => p.id === act.projectId) : null;
            const categories = getActivityCategories(act);
            const primaryColor = project?.color || getCategoryColor(categories[0] || act.category);
            const datePrefix =
              viewMode === 'ALL' ? `${formatShortChineseDate(act.startTime)} · ` : '';

            return (
              <div key={act.id} className="relative group">
                {/* 左侧时间轴节点圆环 */}
                <span
                  aria-hidden="true"
                  className="absolute -left-5 top-4 w-4 h-4 rounded-full bg-slate-950 flex items-center justify-center z-10"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full transition-transform group-active:scale-125"
                    style={{
                      backgroundColor: primaryColor,
                      boxShadow: `0 0 10px ${primaryColor}80`,
                    }}
                  />
                </span>

                {/* 时间块主体卡片 */}
                <div
                  className={`rounded-2xl p-3.5 border transition-all ${
                    isAuto
                      ? 'chronos-card border-indigo-500/25 hover:border-indigo-500/45'
                      : 'chronos-card hover:border-white/20'
                  }`}
                >
                  {/* 第一行：独立清爽的时段标尺 + 右侧时长胶囊与操作 */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div
                      onClick={() => handleEdit(act)}
                      className="flex items-center space-x-1.5 min-w-0 cursor-pointer"
                    >
                      {act.isFuzzyTime ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 leading-none rounded-md bg-slate-800/90 border border-white/[0.06] text-amber-300/90 font-medium whitespace-nowrap">
                          <HelpCircle className="w-2.5 h-2.5 shrink-0" />
                          <span>{datePrefix}全天累计</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-slate-400 font-medium whitespace-nowrap">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>
                            {datePrefix}
                            {formatClock(act.startTime)}
                            {act.endTime ? ` - ${formatClock(act.endTime)}` : ' - 进行中'}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <span
                        className="text-xs font-mono tabular-nums font-extrabold px-2 py-0.5 rounded-lg border whitespace-nowrap"
                        style={{
                          backgroundColor: `${primaryColor}16`,
                          borderColor: `${primaryColor}35`,
                          color: primaryColor,
                        }}
                      >
                        {act.durationMinutes > 0
                          ? formatCompactDuration(act.durationMinutes)
                          : '进行中'}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(act);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-300 hover:bg-slate-800/80 transition-colors"
                        title="编辑此记录"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确定要删除「${act.title}」吗？`)) {
                            triggerHapticFeedback(15);
                            deleteActivity(act.id);
                            addToast('INFO', '已删除', `已移除活动「${act.title}」`);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 第二行：主体事项标题与详情，点击直接唤起编辑 */}
                  <div
                    onClick={() => handleEdit(act)}
                    className="space-y-2 cursor-pointer"
                  >
                    <h4 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-indigo-200 transition-colors">
                      {act.title}
                    </h4>

                    {/* 第三行：多维标签胶囊行（独立成行，绝不挤压标题与时间） */}
                    <div className="flex items-center flex-wrap gap-1.5">
                      {isAuto && (
                        <span className="inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-indigo-500/18 text-indigo-300 font-semibold border border-indigo-500/30 whitespace-nowrap">
                          <Smartphone className="w-2.5 h-2.5 shrink-0" />
                          <span>自动感知</span>
                        </span>
                      )}

                      {project && (
                        <span
                          className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 leading-none rounded-md font-bold text-white shadow-sm whitespace-nowrap"
                          style={{ backgroundColor: project.color }}
                        >
                          <Target className="w-2.5 h-2.5 shrink-0" />
                          <span>{project.name}</span>
                        </span>
                      )}

                      {categories.map((catName) => {
                        if (project && catName === project.name) return null;
                        const catCol = getCategoryColor(catName);
                        return (
                          <span
                            key={catName}
                            className="text-[10px] px-2 py-0.5 leading-none rounded-md font-semibold border whitespace-nowrap"
                            style={{
                              backgroundColor: `${catCol}16`,
                              borderColor: `${catCol}38`,
                              color: catCol,
                            }}
                          >
                            {catName}
                          </span>
                        );
                      })}

                      {getMoodBadge(act.mood)}
                    </div>

                    {/* 原始自然语言输入 */}
                    {act.rawInput && act.rawInput !== act.title && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 flex items-center gap-1 pt-0.5">
                        <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{act.rawInput}</span>
                      </p>
                    )}

                    {/* 心得体会备注 */}
                    {act.notes && (
                      <p className="text-[11px] text-slate-300/90 bg-slate-950/55 px-2.5 py-1.5 rounded-xl border border-white/[0.05] line-clamp-2 leading-relaxed">
                        “{act.notes}”
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
