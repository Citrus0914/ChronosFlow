import React from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { ShieldAlert, ShieldCheck, RefreshCw, Smartphone, Target } from 'lucide-react';
import { requestUsagePermission, triggerHapticFeedback } from '../services/nativeBridge';

export const Header: React.FC = () => {
  const { hasUsagePermission, isScanningUsage, scanAppUsage, currentTab, setCurrentTab } = useTimeStore();

  const todayStr = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());

  return (
    <header 
      className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 pb-3 flex items-center justify-between"
      style={{
        paddingTop: 'calc(0.75rem + var(--safe-top, 0px))',
      }}
    >
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Smartphone className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            时流 Chronos
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Mobile
            </span>
          </h1>
          <p className="text-xs text-slate-400">{todayStr}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* 权限状态指示器 */}
        <button
          onClick={hasUsagePermission ? () => scanAppUsage() : () => requestUsagePermission()}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            hasUsagePermission
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 animate-pulse'
          }`}
        >
          {hasUsagePermission ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>感知就绪</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>待授权</span>
            </>
          )}
        </button>

        {/* 目标与周预算快捷入口 */}
        <button
          onClick={() => {
            triggerHapticFeedback(15);
            setCurrentTab(currentTab === 'goals' ? 'analytics' : 'goals');
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            currentTab === 'goals'
              ? 'text-indigo-400 bg-indigo-500/20 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="目标与分类周预算"
        >
          <Target className="w-4 h-4" />
        </button>

        {/* 刷新应用数据 */}
        <button
          onClick={() => scanAppUsage()}
          disabled={isScanningUsage}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="刷新应用时长"
        >
          <RefreshCw className={`w-4 h-4 ${isScanningUsage ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
