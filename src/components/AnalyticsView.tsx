import React from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration } from '../lib/utils';
import { PieChart, Clock, Flame, Zap, Layers } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { activities, getCategoryStats } = useTimeStore();
  const completed = activities.filter((a) => a.status === 'COMPLETED');
  const totalMinutes = completed.reduce((sum, a) => sum + a.durationMinutes, 0);

  const deepWorkMinutes = completed
    .filter((a) => a.durationMinutes >= 45 && (a.mood === 'FLOW' || a.mood === 'FOCUSED'))
    .reduce((sum, a) => sum + a.durationMinutes, 0);

  const flowCount = completed.filter((a) => a.mood === 'FLOW').length;
  const categoryStats = getCategoryStats();

  return (
    <div className="space-y-6">
      {/* 核心指标统计横幅 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#131b2e]/60 border border-white/5 space-y-1">
          <div className="flex items-center text-xs text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            有效记录总耗时
          </div>
          <div className="text-xl font-bold text-white">
            {formatDuration(totalMinutes)}
          </div>
          <div className="text-[11px] text-slate-500">{completed.length} 个时间块</div>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e]/60 border border-white/5 space-y-1">
          <div className="flex items-center text-xs text-slate-400 font-medium">
            <Flame className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            深度工作时长
          </div>
          <div className="text-xl font-bold text-white">
            {formatDuration(deepWorkMinutes)}
          </div>
          <div className="text-[11px] text-slate-500">
            占比 {totalMinutes > 0 ? Math.round((deepWorkMinutes / totalMinutes) * 100) : 0}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e]/60 border border-white/5 space-y-1">
          <div className="flex items-center text-xs text-slate-400 font-medium">
            <Zap className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            心流巅峰时段
          </div>
          <div className="text-xl font-bold text-white">{flowCount} 次</div>
          <div className="text-[11px] text-slate-500">超高产出状态</div>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e]/60 border border-white/5 space-y-1">
          <div className="flex items-center text-xs text-slate-400 font-medium">
            <Layers className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
            任务切换次数
          </div>
          <div className="text-xl font-bold text-white">
            {Math.max(0, completed.length - 1)}
          </div>
          <div className="text-[11px] text-slate-500">注意力碎片度</div>
        </div>
      </div>

      {/* 分类耗时结构 */}
      <div className="p-6 rounded-2xl bg-[#131b2e]/50 border border-white/5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center">
            <PieChart className="w-4 h-4 mr-2 text-indigo-400" />
            分类时间投入比例
          </h3>
          <span className="text-xs text-slate-500">按分钟统计</span>
        </div>

        {categoryStats.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">暂无分类统计数据</p>
        ) : (
          <div className="space-y-4">
            {/* 堆叠进度条 */}
            <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden flex">
              {categoryStats.map((item) => (
                <div
                  key={item.category}
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                  title={`${item.category}: ${item.percentage}%`}
                />
              ))}
            </div>

            {/* 详细条目列表 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {categoryStats.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-slate-200">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-white">
                      {formatDuration(item.minutes)}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
