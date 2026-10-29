import React, { useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import {
  ShieldAlert,
  Smartphone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  PlusCircle,
  Clock,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  requestUsagePermission,
  isAndroidNative,
  toggleMockPermission,
} from '../services/nativeBridge';

export const AppUsageTracker: React.FC = () => {
  const {
    hasUsagePermission,
    appUsageList,
    isScanningUsage,
    scanAppUsage,
    refreshUsagePermission,
    importAppUsageToTimeline,
    importAllAppUsages,
  } = useTimeStore();

  useEffect(() => {
    scanAppUsage();
  }, [scanAppUsage]);

  // 计算今日所有感知应用的总使用时长
  const totalMs = appUsageList.reduce((acc, curr) => acc + curr.foregroundMs, 0);
  const totalMinutes = Math.round(totalMs / 60000);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // 排序前台应用
  const sortedList = [...appUsageList].sort((a, b) => b.foregroundMs - a.foregroundMs);

  return (
    <div className="space-y-4">
      {/* 顶部总览卡片 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-500/30 p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-medium text-indigo-400 mb-1">
              <Smartphone className="w-3.5 h-3.5" />
              <span>今日手机应用自动感知</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">{totalHours}</span>
              <span className="text-sm text-slate-400">小时 ({totalMinutes} 分钟)</span>
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          通过安卓底层 UsageStats 机制高精度捕获，无需手动打卡即可还原真实时间流向。
        </p>

        {/* 一键全部同步按钮 */}
        {hasUsagePermission && appUsageList.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              已捕获 <strong className="text-white">{appUsageList.length}</strong> 款应用
            </span>
            <button
              onClick={() => importAllAppUsages()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>一键同步到时间流</span>
            </button>
          </div>
        )}
      </div>

      {/* 权限未开启时的引导卡片 */}
      {!hasUsagePermission && (
        <div className="rounded-2xl bg-amber-950/30 border border-amber-500/30 p-4 space-y-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-200">未开启“使用情况访问权限”</h4>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                安卓系统需要您在系统设置中允许【有权查看使用情况的应用】，时流才能检测到微信、游戏等前台时长。
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              requestUsagePermission();
              setTimeout(() => refreshUsagePermission(), 1500);
            }}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-98"
          >
            <span>一键前往开启权限</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 电脑仿真环境下的调试小贴士 */}
      {!isAndroidNative() && (
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>当前为 PC 浏览器仿真预览模式</span>
          </div>
          <button
            onClick={() => {
              toggleMockPermission(!hasUsagePermission);
              refreshUsagePermission();
            }}
            className="text-[11px] px-2 py-1 rounded bg-slate-800 text-indigo-300 hover:bg-slate-700 font-mono"
          >
            切换模拟权限: {hasUsagePermission ? '已授权' : '未授权'}
          </button>
        </div>
      )}

      {/* 应用时长排行榜 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>应用前台活跃时长榜</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            {isScanningUsage ? '正在读取系统数据...' : `更新于 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`}
          </span>
        </div>

        {sortedList.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            {hasUsagePermission ? '暂未检测到前台活跃应用数据' : '授权后将在此自动展现各 App 使用时长'}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedList.map((item) => {
              const minutes = Math.round(item.foregroundMs / 60000);
              const percent = totalMinutes > 0 ? Math.min(100, Math.round((minutes / totalMinutes) * 100)) : 0;

              return (
                <div
                  key={item.packageName}
                  className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 hover:border-slate-700 transition-all flex items-center justify-between space-x-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="font-semibold text-sm text-white truncate">{item.appName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-medium text-slate-300 shrink-0">
                        {minutes} 分钟
                      </span>
                    </div>

                    {/* 进度条 */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, percent)}%` }}
                      />
                    </div>
                  </div>

                  {/* 导入操作按钮 */}
                  <div className="shrink-0">
                    {item.isImported ? (
                      <span className="flex items-center space-x-1 text-[11px] text-emerald-400 font-medium px-2 py-1 rounded bg-emerald-500/10">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>已入流</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => importAppUsageToTimeline(item)}
                        className="flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-white px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-600 transition-colors font-medium active:scale-95"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>生成时间块</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
