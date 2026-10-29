import React from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { QuickTimerBar } from './QuickTimerBar';
import { Clock, Smartphone, Trash2, Tag, Calendar } from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';

export const MobileTimeline: React.FC = () => {
  const { activities, deleteActivity, addToast } = useTimeStore();

  const formatClock = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMoodBadge = (mood: string) => {
    switch (mood) {
      case 'FLOW':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-medium">心流</span>;
      case 'FOCUSED':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">专注</span>;
      case 'DISTRACTED':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">分心</span>;
      case 'TIRED':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">疲劳</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* 快捷计时与输入条 */}
      <QuickTimerBar />

      <div className="flex items-center justify-between px-1 pt-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>今日时间流轨迹 ({activities.length})</span>
        </h3>
      </div>

      {activities.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <Calendar className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-xs text-slate-500">今日暂无活动记录</p>
          <p className="text-[11px] text-slate-600">
            可前往【应用追踪】一键同步今日手机使用时长，或在上方快速打卡
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activities.map((act) => {
            const isAuto = !!act.isAutoDetected;

            return (
              <div
                key={act.id}
                className={`rounded-2xl p-4 border transition-all flex items-start justify-between space-x-3 ${
                  isAuto
                    ? 'bg-slate-900/90 border-indigo-500/30 hover:border-indigo-500/50'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    {/* 自动感知徽章 */}
                    {isAuto && (
                      <span className="flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                        <Smartphone className="w-3 h-3" />
                        <span>自动感知</span>
                      </span>
                    )}

                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                      {act.category}
                    </span>

                    {getMoodBadge(act.mood)}

                    <span className="text-xs font-mono text-slate-400">
                      {formatClock(act.startTime)}
                      {act.endTime ? ` - ${formatClock(act.endTime)}` : ' 至今'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white truncate">{act.title}</h4>

                  {act.rawInput && act.rawInput !== act.title && (
                    <p className="text-xs text-slate-400 line-clamp-1 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{act.rawInput}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-2 shrink-0">
                  <span className="text-sm font-mono font-extrabold text-indigo-400">
                    {act.durationMinutes > 0 ? `${act.durationMinutes}m` : '进行中'}
                  </span>

                  <button
                    onClick={() => {
                      triggerHapticFeedback(15);
                      deleteActivity(act.id);
                      addToast('INFO', '已删除', `已移除活动「${act.title}」`);
                    }}
                    className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
