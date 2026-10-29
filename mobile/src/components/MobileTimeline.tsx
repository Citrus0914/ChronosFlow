import React from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { QuickTimerBar } from './QuickTimerBar';
import { Clock, Smartphone, Trash2, Tag, Calendar, Plus, Edit3, Target, HelpCircle } from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';
import { Activity } from '../types';

export const MobileTimeline: React.FC = () => {
  const { activities, deleteActivity, addToast, setManualModalOpen, projectGoals } = useTimeStore();

  const formatClock = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMoodBadge = (mood: string) => {
    switch (mood) {
      case 'FLOW':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-medium border border-violet-500/30">心流</span>;
      case 'FOCUSED':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30">专注</span>;
      case 'DISTRACTED':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-medium border border-orange-500/30">分心</span>;
      case 'TIRED':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">疲劳</span>;
      case 'FRUSTRATED':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30">受挫</span>;
      default:
        return null;
    }
  };

  const handleEdit = (act: Activity) => {
    triggerHapticFeedback(20);
    setManualModalOpen(true, {
      id: act.id,
      title: act.title,
      category: act.category,
      startTime: act.startTime,
      endTime: act.endTime || undefined,
      durationMinutes: act.durationMinutes,
      mood: act.mood,
      notes: act.notes,
      isFuzzyTime: act.isFuzzyTime,
      projectId: act.projectId,
    });
  };

  return (
    <div className="space-y-4">
      {/* 快捷计时与输入条 */}
      <QuickTimerBar />

      {/* 时间流水顶栏 */}
      <div className="flex items-center justify-between px-1 pt-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>今日时间流轨迹 ({activities.length})</span>
        </h3>

        {/* 手动补录按钮 */}
        <button
          onClick={() => {
            triggerHapticFeedback(20);
            setManualModalOpen(true);
          }}
          className="px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center space-x-1 active:scale-95 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>补录</span>
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 p-6">
          <Calendar className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">今日暂无活动记录</p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
            可在上方输入框随手打字、点击【补录】弹窗精确补记，或在【应用追踪】一键同步手机应用使用时长
          </p>
          <button
            onClick={() => {
              triggerHapticFeedback(20);
              setManualModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30 inline-flex items-center space-x-1 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>立即补录第一条</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activities.map((act) => {
            const isAuto = !!act.isAutoDetected;
            const project = act.projectId ? projectGoals.find((p) => p.id === act.projectId) : null;

            return (
              <div
                key={act.id}
                className={`rounded-2xl p-3.5 border transition-all flex items-start justify-between space-x-3 ${
                  isAuto
                    ? 'bg-slate-900/90 border-indigo-500/30 hover:border-indigo-500/50'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* 卡片左侧主要内容区，点击直接唤起二次编辑 */}
                <div
                  onClick={() => handleEdit(act)}
                  className="flex-1 min-w-0 space-y-1.5 cursor-pointer"
                >
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    {/* 自动感知徽章 */}
                    {isAuto && (
                      <span className="flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                        <Smartphone className="w-3 h-3" />
                        <span>自动感知</span>
                      </span>
                    )}

                    {/* 关联专属项目目标彩色徽章 */}
                    {project && (
                      <span
                        className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-md font-bold text-white shadow-sm"
                        style={{ backgroundColor: project.color }}
                      >
                        <Target className="w-2.5 h-2.5" />
                        <span>{project.name}</span>
                      </span>
                    )}

                    {/* 分类标签 */}
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                      {act.category}
                    </span>

                    {/* 情绪状态徽章 */}
                    {getMoodBadge(act.mood)}

                    {/* 时间跨度或未知时段标记 */}
                    {act.isFuzzyTime ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300/90 font-medium flex items-center gap-0.5">
                        <HelpCircle className="w-2.5 h-2.5" />
                        <span>未知时段</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">
                        {formatClock(act.startTime)}
                        {act.endTime ? ` - ${formatClock(act.endTime)}` : ' 至今'}
                      </span>
                    )}
                  </div>

                  {/* 标题 */}
                  <h4 className="text-sm font-bold text-white truncate hover:text-indigo-300 transition-colors">
                    {act.title}
                  </h4>

                  {/* 原始自然语言输入 */}
                  {act.rawInput && act.rawInput !== act.title && (
                    <p className="text-xs text-slate-400 line-clamp-1 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{act.rawInput}</span>
                    </p>
                  )}

                  {/* 心得体会备注 */}
                  {act.notes && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/40 px-2 py-1 rounded-lg border border-slate-800/60 line-clamp-2">
                      “{act.notes}”
                    </p>
                  )}
                </div>

                {/* 卡片右侧：时长与操作按钮 */}
                <div className="flex flex-col items-end space-y-2 shrink-0">
                  <span className="text-sm font-mono font-extrabold text-indigo-400">
                    {act.durationMinutes > 0 ? `${act.durationMinutes}m` : '进行中'}
                  </span>

                  <div className="flex items-center space-x-1">
                    {/* 点击编辑按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(act);
                      }}
                      className="p-1 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                      title="编辑此记录"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确定要删除「${act.title}」吗？`)) {
                          triggerHapticFeedback(15);
                          deleteActivity(act.id);
                          addToast('INFO', '已删除', `已移除活动「${act.title}」`);
                        }
                      }}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
