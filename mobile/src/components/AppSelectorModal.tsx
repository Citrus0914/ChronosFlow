import React, { useState, useMemo, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import {
  X,
  Search,
  Check,
  Layers,
} from 'lucide-react';
import { registerBackHandler, triggerHapticFeedback } from '../services/nativeBridge';

interface AppSelectorModalProps {
  onClose: () => void;
}

export const AppSelectorModal: React.FC<AppSelectorModalProps> = ({ onClose }) => {
  const { appUsageList, batchSetTrackedApps, trackedAppConfigs } = useTimeStore();

  // 物理返回键支持
  useEffect(() => {
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [onClose]);

  const [searchTerm, setSearchTerm] = useState('');
  // 维护当前勾选的包名集合
  const [selectedSet, setSelectedSet] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    appUsageList.forEach((item) => {
      const cfg = trackedAppConfigs[item.packageName];
      if (cfg ? cfg.isTracked : item.isTracked) {
        initial.add(item.packageName);
      }
    });
    return initial;
  });

  // 排序：有时长排在前面
  const sortedApps = useMemo(() => {
    return [...appUsageList].sort((a, b) => b.foregroundMs - a.foregroundMs);
  }, [appUsageList]);

  // 搜索过滤
  const filteredApps = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sortedApps;
    return sortedApps.filter(
      (app) =>
        app.appName.toLowerCase().includes(term) ||
        app.packageName.toLowerCase().includes(term) ||
        app.category.toLowerCase().includes(term)
    );
  }, [sortedApps, searchTerm]);

  const handleToggle = (packageName: string) => {
    triggerHapticFeedback(10);
    const next = new Set(selectedSet);
    if (next.has(packageName)) {
      next.delete(packageName);
    } else {
      next.add(packageName);
    }
    setSelectedSet(next);
  };

  const handleSelectTop = (count = 4) => {
    triggerHapticFeedback(15);
    const topApps = sortedApps.slice(0, count).map((a) => a.packageName);
    setSelectedSet(new Set(topApps));
  };

  const handleSelectWithUsage = () => {
    triggerHapticFeedback(15);
    const withUsage = sortedApps
      .filter((a) => a.foregroundMs > 60000)
      .map((a) => a.packageName);
    setSelectedSet(new Set(withUsage));
  };

  const handleClearAll = () => {
    triggerHapticFeedback(15);
    setSelectedSet(new Set());
  };

  const handleSave = () => {
    triggerHapticFeedback(20);
    batchSetTrackedApps(Array.from(selectedSet));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* 遮罩背景 */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[92vh] z-10 animate-in slide-in-from-bottom duration-300"
        style={{
          paddingBottom: 'max(var(--safe-bottom, 0px) + 1rem, 1.25rem)',
        }}
      >
        {/* 顶部把手条 */}
        <div className="w-10 h-1 bg-slate-700/60 rounded-full mx-auto mb-3 sm:hidden" />

        {/* 标题栏 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">选定要追踪的应用</h3>
              <p className="text-[11px] text-slate-400">
                仅关注重点 App，拒绝杂乱展示，打造极简手机专注看板
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索框与快捷预设 */}
        <div className="pt-3 pb-2 space-y-2">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索应用名称或包名..."
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          {/* 快捷推荐过滤按钮 */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => handleSelectTop(4)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-medium whitespace-nowrap border border-indigo-500/20 transition-all active:scale-95"
            >
              ⭐ 推荐常用前4款
            </button>
            <button
              type="button"
              onClick={handleSelectWithUsage}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium whitespace-nowrap transition-all active:scale-95"
            >
              ⏱️ 仅选有时长的应用
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 font-medium whitespace-nowrap transition-all active:scale-95"
            >
              清空重置
            </button>
          </div>
        </div>

        {/* 统计提示条 */}
        <div className="py-1 px-1 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60">
          <span>
            已选定 <strong className="text-indigo-400 font-mono font-bold text-xs">{selectedSet.size}</strong> 款核心应用
          </span>
          <span>检测到共 {appUsageList.length} 款应用</span>
        </div>

        {/* 应用列表勾选区 */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1.5 pr-0.5 no-scrollbar">
          {filteredApps.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              未找到匹配的应用
            </div>
          ) : (
            filteredApps.map((item) => {
              const isChecked = selectedSet.has(item.packageName);
              const minutes = Math.round(item.foregroundMs / 60000);

              return (
                <div
                  key={item.packageName}
                  onClick={() => handleToggle(item.packageName)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-indigo-950/20 border-indigo-500/40 text-white'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Checkbox */}
                    <div className="shrink-0 text-indigo-400">
                      {isChecked ? (
                        <div className="w-5 h-5 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-lg border-2 border-slate-700 hover:border-slate-500" />
                      )}
                    </div>

                    {/* 应用信息 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className={`text-xs font-semibold truncate ${isChecked ? 'text-white' : 'text-slate-200'}`}>
                          {item.appName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-slate-800 text-slate-300 border border-white/[0.06] whitespace-nowrap shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                        {item.packageName}
                      </div>
                    </div>
                  </div>

                  {/* 时长信息 */}
                  <div className="text-right pl-2 shrink-0">
                    <span className={`text-xs font-mono tabular-nums font-semibold whitespace-nowrap ${minutes > 0 ? 'text-indigo-300' : 'text-slate-600'}`}>
                      {minutes > 0 ? `${minutes}m` : '暂无'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部确认按钮 */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 whitespace-nowrap shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>确认保存选定 ({selectedSet.size} 款)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
