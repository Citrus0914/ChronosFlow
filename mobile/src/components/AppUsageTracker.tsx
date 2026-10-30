import React, { useEffect, useState } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import {
  ShieldAlert,
  Smartphone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  PlusCircle,
  Layers,
  HelpCircle,
  History,
  ChevronRight,
  ChevronLeft,
  FileText,
  Plus,
  Eye,
  Check,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import {
  requestUsagePermission,
  isAndroidNative,
  toggleMockPermission,
  triggerHapticFeedback,
} from '../services/nativeBridge';
import { AppDetailModal } from './AppDetailModal';
import { AppSelectorModal } from './AppSelectorModal';
import { formatCompactDuration, getCategoryColor } from '../lib/utils';
import { formatShortChineseDate, getWeekdayName } from '../lib/dateUtils';
import { getActivityCategories } from '../types';

export const AppUsageTracker: React.FC = () => {
  const {
    hasUsagePermission,
    appUsageList,
    isScanningUsage,
    trackerDayOffset,
    setTrackerDayOffset,
    scanAppUsage,
    refreshUsagePermission,
    importAppUsageToTimeline,
    importAllAppUsages,
    syncPastSevenDaysAppUsage,
    selectedAppForDetail,
    setSelectedAppForDetail,
  } = useTimeStore();

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tracked' | 'all'>('tracked');

  useEffect(() => {
    scanAppUsage();
  }, [scanAppUsage]);

  // 计算当前追踪的目标自然日
  const targetDate = new Date();
  if (trackerDayOffset !== 0) {
    targetDate.setDate(targetDate.getDate() + trackerDayOffset);
  }
  const dayBadgeText =
    trackerDayOffset === 0
      ? '今日'
      : trackerDayOffset === -1
      ? '昨日'
      : `${Math.abs(trackerDayOffset)}天前`;

  // 1. 过滤选定追踪的应用与全量列表
  const trackedList = appUsageList
    .filter((item) => item.isTracked)
    .sort((a, b) => b.foregroundMs - a.foregroundMs);

  const allList = [...appUsageList].sort((a, b) => b.foregroundMs - a.foregroundMs);

  const displayList = viewMode === 'tracked' ? trackedList : allList;

  // 2. 计算选定应用总时长 vs 全量总时长
  const trackedMs = trackedList.reduce((acc, curr) => acc + curr.foregroundMs, 0);
  const trackedMinutes = Math.round(trackedMs / 60000);
  const trackedHours = (trackedMinutes / 60).toFixed(1);

  const allMs = allList.reduce((acc, curr) => acc + curr.foregroundMs, 0);
  const allMinutes = Math.round(allMs / 60000);
  const allHours = (allMinutes / 60).toFixed(1);

  const currentTotalMinutes = viewMode === 'tracked' ? trackedMinutes : allMinutes;
  const currentTotalHours = viewMode === 'tracked' ? trackedHours : allHours;

  // 3. 统计【首次未入流】与【已入流但时长继续增加】的追踪项
  const activeTrackedCount = trackedList.filter(
    (i) => Math.round(i.foregroundMs / 60000) >= 1
  ).length;
  const pendingNewList = trackedList.filter(
    (i) => !i.isImported && Math.round(i.foregroundMs / 60000) >= 1
  );
  const pendingUpdateList = trackedList.filter(
    (i) => i.isImported && (i.unsyncedMinutes ?? 0) > 0
  );
  const pendingAddedMinutes = pendingUpdateList.reduce(
    (sum, i) => sum + (i.unsyncedMinutes || 0),
    0
  );

  // 顶部光谱条分段数据（取前 5 款有时长的应用）
  const spectrumApps = displayList
    .map((item) => ({
      packageName: item.packageName,
      appName: item.appName,
      minutes: Math.round(item.foregroundMs / 60000),
      color: getCategoryColor(getActivityCategories(item)[0] || item.category),
    }))
    .filter((i) => i.minutes >= 1)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* 顶部总览英雄卡片 */}
      <div className="relative overflow-hidden rounded-3xl chronos-hero-card p-4 sm:p-5 space-y-3.5">
        {/* 轻量日期切换条（右侧保留历史回今日快捷入口） */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
          <div className="flex items-center space-x-1 min-w-0">
            <button
              type="button"
              disabled={trackerDayOffset <= -6}
              onClick={() => {
                triggerHapticFeedback(12);
                setTrackerDayOffset(trackerDayOffset - 1);
              }}
              className="w-7 h-7 rounded-xl bg-slate-900/80 border border-white/[0.06] text-slate-300 hover:text-white disabled:opacity-30 flex items-center justify-center transition active:scale-95 shrink-0"
              title="查看前一天应用时长"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-950/75 border border-white/[0.07] text-xs whitespace-nowrap">
              <span className="font-bold text-white">{formatShortChineseDate(targetDate)}</span>
              <span className="text-[11px] text-slate-400">{getWeekdayName(targetDate)}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 leading-none rounded-md font-bold whitespace-nowrap ${
                  trackerDayOffset === 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {dayBadgeText}
              </span>
            </div>

            <button
              type="button"
              disabled={trackerDayOffset >= 0}
              onClick={() => {
                triggerHapticFeedback(12);
                setTrackerDayOffset(trackerDayOffset + 1);
              }}
              className="w-7 h-7 rounded-xl bg-slate-900/80 border border-white/[0.06] text-slate-300 hover:text-white disabled:opacity-30 flex items-center justify-center transition active:scale-95 shrink-0"
              title="后一天"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {trackerDayOffset < 0 && (
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(15);
                setTrackerDayOffset(0);
              }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-[11px] font-bold whitespace-nowrap shrink-0 active:scale-95 transition"
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span>回今日</span>
            </button>
          )}
        </div>

        {/* 核心时长大数字与原位置的一键同步前七天记录按钮 */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-300 mb-1">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">
                {viewMode === 'tracked'
                  ? `${dayBadgeText}重点追踪感知`
                  : `${dayBadgeText}全机应用感知`}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-3xl font-extrabold text-white tracking-tight font-mono tabular-nums leading-none">
                {currentTotalHours}
              </span>
              <span className="text-xs font-semibold text-indigo-200/80 whitespace-nowrap">
                小时
              </span>
              <span className="text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
                · {currentTotalMinutes} 分钟
              </span>
            </div>
          </div>

          {/* 原「管理选定」位置改为一键同步前七天记录 */}
          <button
            type="button"
            disabled={isScanningUsage}
            onClick={() => {
              triggerHapticFeedback(20);
              syncPastSevenDaysAppUsage();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 text-xs font-bold shadow-sm whitespace-nowrap shrink-0 transition-all active:scale-95 disabled:opacity-50"
            title="一键将前七天选定追踪应用的使用记录同步至时间流"
          >
            <History className={`w-3.5 h-3.5 text-indigo-300 shrink-0 ${isScanningUsage ? 'animate-spin' : ''}`} />
            <span>同步前7天记录</span>
          </button>
        </div>

        {/* 新增视觉图形：应用时长光谱分布条 + Top3 微图例 */}
        {currentTotalMinutes > 0 && spectrumApps.length > 0 ? (
          <div className="space-y-2 pt-0.5">
            <div className="w-full h-2.5 rounded-full bg-slate-950/80 border border-white/[0.06] overflow-hidden flex p-0.5 gap-0.5">
              {spectrumApps.map((seg) => {
                const widthPct = Math.max(5, Math.round((seg.minutes / currentTotalMinutes) * 100));
                return (
                  <div
                    key={seg.packageName}
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: seg.color,
                    }}
                    className="h-full rounded-full transition-all duration-500"
                    title={`${seg.appName}: ${seg.minutes}m`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[10px] text-slate-400">
              {spectrumApps.slice(0, 3).map((seg) => (
                <span
                  key={seg.packageName}
                  className="inline-flex items-center space-x-1 min-w-0 max-w-[110px]"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate text-slate-300 font-medium">{seg.appName}</span>
                  <span className="font-mono tabular-nums text-slate-400 shrink-0">
                    {formatCompactDuration(seg.minutes)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 leading-relaxed">
            {viewMode === 'tracked'
              ? trackedList.length > 0
                ? `已锁定追踪 ${trackedList.length} 款核心 App，时长增加后可随时再次同步更新。`
                : '尚未选定重点应用，点击下方「增减应用」挑选您最关心的 App 开启无感追踪。'
              : `${dayBadgeText}共检测到 ${allList.length} 款应用，点击任意卡片可改名或加入追踪。`}
          </p>
        )}

        {/* 一键同步与增量状态坞（独立分区防挤压） */}
        {hasUsagePermission && trackedList.length > 0 && (
          <div className="p-2.5 rounded-2xl bg-slate-950/65 border border-white/[0.08] flex items-center justify-between gap-2.5">
            <div className="text-xs text-slate-300 min-w-0 leading-snug">
              {pendingNewList.length > 0 && pendingUpdateList.length > 0 ? (
                <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                  <span className="whitespace-nowrap">
                    <strong className="text-indigo-300 font-mono">{pendingNewList.length}</strong> 款待入流
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-300 whitespace-nowrap">
                    <strong className="font-mono">{pendingUpdateList.length}</strong> 款新增 (+{pendingAddedMinutes}m)
                  </span>
                </div>
              ) : pendingUpdateList.length > 0 ? (
                <span className="text-amber-300 font-medium">
                  <strong className="text-amber-200 font-mono">{pendingUpdateList.length}</strong> 款新增时长{' '}
                  <span className="font-mono font-bold whitespace-nowrap">(+{pendingAddedMinutes}m)</span>
                </span>
              ) : pendingNewList.length > 0 ? (
                <span>
                  有 <strong className="text-indigo-300 font-mono">{pendingNewList.length}</strong> 款追踪项待入流
                </span>
              ) : activeTrackedCount > 0 ? (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{dayBadgeText}时长已全部同步</span>
                </span>
              ) : (
                <span className="text-slate-500">{dayBadgeText}暂未满 1 分钟</span>
              )}
            </div>

            <button
              onClick={() => {
                triggerHapticFeedback(20);
                importAllAppUsages();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-md whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                pendingUpdateList.length > 0 && pendingNewList.length === 0
                  ? 'bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 shadow-amber-600/25'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/25'
              }`}
            >
              {pendingUpdateList.length > 0 && pendingNewList.length === 0 ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>同步新增</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>一键同步入流</span>
                </>
              )}
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
              <h4 className="text-sm font-bold text-amber-200">未开启「使用情况访问权限」</h4>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                请在安卓系统设置中允许时流访问应用使用情况，即可精准统计重点 App 的前台时长。
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHapticFeedback(15);
              requestUsagePermission();
              setTimeout(() => refreshUsagePermission(), 1500);
            }}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-[0.98]"
          >
            <span>一键前往开启权限</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 电脑仿真环境下的调试小贴士 */}
      {!isAndroidNative() && (
        <div className="rounded-xl chronos-card p-3 text-xs text-slate-400 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">当前为 PC 浏览器仿真模式</span>
          </div>
          <button
            onClick={() => {
              triggerHapticFeedback(10);
              toggleMockPermission(!hasUsagePermission);
              refreshUsagePermission();
            }}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-300 hover:bg-slate-700 font-mono whitespace-nowrap shrink-0"
          >
            模拟权限: {hasUsagePermission ? '已授权' : '未授权'}
          </button>
        </div>
      )}

      {/* 视图切换胶囊与标题 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-0.5">
          {/* 切换 Tab */}
          <div className="flex items-center bg-slate-900/90 border border-white/[0.07] rounded-xl p-1">
            <button
              onClick={() => {
                triggerHapticFeedback(10);
                setViewMode('tracked');
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                viewMode === 'tracked'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>追踪中 ({trackedList.length})</span>
            </button>
            <button
              onClick={() => {
                triggerHapticFeedback(10);
                setViewMode('all');
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                viewMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>全部感知 ({allList.length})</span>
            </button>
          </div>

          <button
            onClick={() => {
              triggerHapticFeedback(15);
              setIsSelectorOpen(true);
            }}
            className="text-xs text-indigo-300 hover:text-indigo-200 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1 font-semibold whitespace-nowrap shrink-0 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>增减应用</span>
          </button>
        </div>

        {/* 列表渲染 */}
        {displayList.length === 0 ? (
          <div className="rounded-2xl chronos-card border-dashed p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-200">
                {viewMode === 'tracked' ? '尚未选定追踪应用' : `${dayBadgeText}暂未捕获到应用数据`}
              </div>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                {viewMode === 'tracked'
                  ? '选定几个您日常最常使用的核心 App，拒绝无关系统应用干扰。'
                  : '请确认已开启使用情况访问权限并正常使用手机应用。'}
              </p>
            </div>
            {viewMode === 'tracked' && (
              <button
                onClick={() => {
                  triggerHapticFeedback(15);
                  setIsSelectorOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>挑选追踪应用</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayList.map((item) => {
              const minutes = Math.round(item.foregroundMs / 60000);
              const percent =
                currentTotalMinutes > 0 && minutes > 0
                  ? Math.min(100, Math.round((minutes / currentTotalMinutes) * 100))
                  : 0;

              const isRenamed =
                item.appName !== item.packageName &&
                item.originalAppName &&
                item.appName !== item.originalAppName;
              const hasNotes = !!item.notes?.trim();
              const unsyncedMin = item.unsyncedMinutes ?? 0;
              const importedMin = item.importedMinutes ?? 0;
              const hasIncrementalUpdate = !!item.isImported && unsyncedMin > 0;
              const categories = getActivityCategories(item);
              const primaryCol = getCategoryColor(categories[0] || item.category);

              return (
                <div
                  key={item.packageName}
                  onClick={() => {
                    triggerHapticFeedback(15);
                    setSelectedAppForDetail(item);
                  }}
                  className="rounded-2xl chronos-card p-3.5 hover:border-indigo-500/35 transition-all flex flex-col space-y-2.5 active:scale-[0.99] cursor-pointer"
                >
                  {/* 第一行：分类着色圆角图标、标题、分类胶囊与右侧时长 */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-2xl border flex items-center justify-center font-extrabold text-sm shrink-0 shadow-inner"
                        style={{
                          backgroundColor: `${primaryCol}1a`,
                          borderColor: `${primaryCol}40`,
                          color: primaryCol,
                        }}
                      >
                        {item.appName.slice(0, 1).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white truncate leading-snug">
                            {item.appName}
                          </span>
                        </div>

                        {/* 多个分类彩色徽章（充足垂直内边距 + 禁止生硬断词） */}
                        <div className="flex items-center flex-wrap gap-1 mt-1">
                          {categories.map((cat) => {
                            const catCol = getCategoryColor(cat);
                            return (
                              <span
                                key={cat}
                                className="text-[10px] px-1.5 py-0.5 leading-none rounded-md font-semibold border whitespace-nowrap"
                                style={{
                                  backgroundColor: `${catCol}18`,
                                  borderColor: `${catCol}38`,
                                  color: catCol,
                                }}
                              >
                                {cat}
                              </span>
                            );
                          })}
                        </div>

                        {isRenamed && (
                          <div className="text-[10px] text-slate-500 truncate mt-1">
                            原名: {item.originalAppName}
                          </div>
                        )}
                        {!isRenamed && item.appName === item.packageName && (
                          <div className="text-[10px] text-slate-500 truncate mt-1">
                            点击可自定义显示名称与分类
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 右侧时长与百分比 */}
                    <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-xs font-mono tabular-nums font-extrabold whitespace-nowrap ${
                            minutes >= 1 ? 'text-white' : 'text-slate-500'
                          }`}
                        >
                          {formatCompactDuration(minutes)}
                        </span>
                        {currentTotalMinutes > 0 && minutes > 0 && (
                          <span className="text-[10px] font-mono tabular-nums text-slate-400 font-medium whitespace-nowrap mt-0.5">
                            {percent}%
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                    </div>
                  </div>

                  {/* 若存在用户备注，展示在卡片上 */}
                  {hasNotes && (
                    <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/60 border border-white/[0.05] text-[11px] text-slate-300 truncate">
                      <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="truncate">{item.notes}</span>
                    </div>
                  )}

                  {/* 进度条与一键入流/增量更新 */}
                  <div className="flex items-center space-x-2.5 pt-0.5">
                    {/* 分类着色进度条 */}
                    <div className="flex-1 min-w-[64px] h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: minutes >= 1 ? `${Math.max(5, percent)}%` : '0%',
                          backgroundColor: minutes >= 1 ? primaryCol : 'transparent',
                        }}
                      />
                    </div>

                    {/* 快捷入流 / 增量同步按钮 */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {minutes < 1 ? (
                        <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded-lg bg-slate-800/60 whitespace-nowrap">
                          未满1分钟
                        </span>
                      ) : hasIncrementalUpdate ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-400 font-mono tabular-nums whitespace-nowrap">
                            已入流{importedMin}m
                          </span>
                          <button
                            onClick={() => {
                              triggerHapticFeedback(15);
                              importAppUsageToTimeline(item);
                            }}
                            className="flex items-center space-x-1 text-[11px] text-amber-200 hover:text-white px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-600 border border-amber-500/35 transition-colors font-bold whitespace-nowrap active:scale-95"
                          >
                            <RefreshCw className="w-3 h-3 shrink-0" />
                            <span>+{unsyncedMin}m 同步</span>
                          </button>
                        </div>
                      ) : item.isImported ? (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-300 font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-500/12 border border-emerald-500/25 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>已入流 {importedMin || minutes}m</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            triggerHapticFeedback(15);
                            importAppUsageToTimeline(item);
                          }}
                          className="flex items-center space-x-1 text-[11px] text-indigo-300 hover:text-white px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-600 border border-indigo-500/30 transition-colors font-semibold whitespace-nowrap active:scale-95"
                        >
                          <PlusCircle className="w-3 h-3 shrink-0" />
                          <span>生成时间块</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 单个应用详情与配置弹窗 */}
      {selectedAppForDetail && (
        <AppDetailModal
          app={selectedAppForDetail}
          totalMinutes={currentTotalMinutes}
          onClose={() => setSelectedAppForDetail(null)}
        />
      )}

      {/* 选定追踪应用管理弹窗 */}
      {isSelectorOpen && (
        <AppSelectorModal onClose={() => setIsSelectorOpen(false)} />
      )}
    </div>
  );
};
