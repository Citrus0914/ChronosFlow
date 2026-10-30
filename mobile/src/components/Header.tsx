import React from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react';
import { requestUsagePermission, triggerHapticFeedback } from '../services/nativeBridge';

export const Header: React.FC = () => {
  const { hasUsagePermission, isScanningUsage, lastScanDateKey, scanAppUsage } = useTimeStore();
  // 订阅 lastScanDateKey 保证跨零点唤醒时顶栏日期自动同步更新
  void lastScanDateKey;

  const todayStr = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());

  const handleRefresh = () => {
    triggerHapticFeedback(20);
    scanAppUsage(true);
  };

  return (
    <header
      className="sticky top-0 z-30 bg-slate-950/82 backdrop-blur-xl border-b border-white/[0.07] px-4 pb-3 flex items-center justify-between gap-2 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.65)]"
      style={{
        paddingTop: 'calc(0.75rem + var(--safe-top, 0px))',
      }}
    >
      <div className="flex items-center space-x-3 min-w-0">
        {/* 定制时流品牌流光徽标 */}
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-5 h-5 text-white"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="8.5" className="opacity-35" />
            <path d="M12 7.5v4.8l3.2 2" />
            <path d="M16.5 4.8A9 9 0 0 1 20.2 10" />
          </svg>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[15px] font-extrabold text-white tracking-tight whitespace-nowrap leading-snug">
              时流 Chronos
            </h1>
            <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 leading-none rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-400/25 whitespace-nowrap shrink-0">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5 whitespace-nowrap">
            {todayStr}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 shrink-0">
        {/* 权限状态胶囊指示器 */}
        <button
          onClick={hasUsagePermission ? handleRefresh : () => requestUsagePermission()}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 active:scale-95 ${
            hasUsagePermission
              ? 'bg-emerald-500/12 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20'
              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 animate-pulse'
          }`}
        >
          {hasUsagePermission ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>感知就绪</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>待授权</span>
            </>
          )}
        </button>

        {/* 刷新应用数据按钮 */}
        <button
          onClick={handleRefresh}
          disabled={isScanningUsage}
          className="w-8 h-8 rounded-xl bg-slate-900/90 border border-white/[0.07] text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center active:scale-95 transition-all shrink-0"
          title="刷新应用时长"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanningUsage ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
