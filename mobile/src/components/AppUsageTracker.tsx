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
  SlidersHorizontal,
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
import { getCategoryColor } from '../lib/utils';
import { formatChineseDate, getWeekdayName } from '../lib/dateUtils';
import { getActivityCategories } from '../types';

export const AppUsageTracker: React.FC = () => {
  const {
    hasUsagePermission,
    appUsageList,
    trackerDayOffset,
    setTrackerDayOffset,
    scanAppUsage,
    refreshUsagePermission,
    importAppUsageToTimeline,
    importAllAppUsages,
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

  return (
    <div className="space-y-4">
      {/* 顶部总览卡片 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 p-5 shadow-xl">
        {/* 轻量日期切换条（默认实时今日，亦支持回溯昨天补同步） */}
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800/70">
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              disabled={trackerDayOffset <= -6}
              onClick={() => {
                triggerHapticFeedback(12);
                setTrackerDayOffset(trackerDayOffset - 1);
              }}
              className="p-1 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white disabled:opacity-30 transition active:scale-95"
              title="查看前一天应用时长"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
              <span className="font-bold text-white">{formatChineseDate(targetDate)}</span>
              <span className="text-[11px] text-slate-400">{getWeekdayName(targetDate)}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
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
              className="p-1 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white disabled:opacity-30 transition active:scale-95"
              title="后一天"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {trackerDayOffset < 0 && (
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(15);
                setTrackerDayOffset(0);
              }}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold active:scale-95 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>回到今日</span>
            </button>
          )}
        </div>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-medium text-indigo-400 mb-1">
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                {viewMode === 'tracked'
                  ? `${dayBadgeText}重点追踪应用感知`
                  : `${dayBadgeText}全部应用感知`}
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {currentTotalHours}
              </span>
              <span className="text-sm text-slate-400">小时 ({currentTotalMinutes} 分钟)</span>
            </div>
          </div>

          {/* 选定追踪管理入口按钮 */}
          <button
            onClick={() => {
              triggerHapticFeedback(15);
              setIsSelectorOpen(true);
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>选定应用 ({trackedList.length})</span>
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          {viewMode === 'tracked'
            ? trackedList.length > 0
              ? `已锁定追踪 ${trackedList.length} 款核心 App，时长增加后可随时再次同步更新当天时间块。`
              : '尚未选定任何重点应用，点击右上角挑选您最关心的 App 进行追踪。'
            : `${dayBadgeText}检测到共 ${allList.length} 款应用记录，点击任意卡片即可改名或加入重点追踪。`}
        </p>

        {/* 一键全部同步与增量状态栏 */}
        {hasUsagePermission && trackedList.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 min-w-0 truncate">
              {pendingNewList.length > 0 && pendingUpdateList.length > 0 ? (
                <>
                  <strong className="text-indigo-400">{pendingNewList.length}</strong> 款待入流 ·{' '}
                  <strong className="text-amber-400">{pendingUpdateList.length}</strong> 款新增 (+{pendingAddedMinutes}m)
                </>
              ) : pendingUpdateList.length > 0 ? (
                <span className="text-amber-300">
                  有 <strong className="text-amber-400">{pendingUpdateList.length}</strong> 款新增时长 (+{pendingAddedMinutes}分钟)
                </span>
              ) : pendingNewList.length > 0 ? (
                <>
                  有 <strong className="text-indigo-400">{pendingNewList.length}</strong> 款待同步
                </>
              ) : activeTrackedCount > 0 ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{dayBadgeText}最新时长已全部同步</span>
                </span>
              ) : (
                <span className="text-slate-500">{dayBadgeText}暂未满 1 分钟</span>
              )}
            </span>
            <button
              onClick={() => {
                triggerHapticFeedback(20);
                importAllAppUsages();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold shadow-md transition-all active:scale-95 shrink-0 ${
                pendingUpdateList.length > 0 && pendingNewList.length === 0
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              {pendingUpdateList.length > 0 && pendingNewList.length === 0 ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>同步新增时长</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>同步追踪项到时间流</span>
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
              <h4 className="text-sm font-bold text-amber-200">未开启“使用情况访问权限”</h4>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                安卓系统需要您在系统设置中允许【有权查看使用情况的应用】，时流才能精准统计重点 App 的前台时长。
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHapticFeedback(15);
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
            <span>当前为 PC 浏览器仿真模式</span>
          </div>
          <button
            onClick={() => {
              triggerHapticFeedback(10);
              toggleMockPermission(!hasUsagePermission);
              refreshUsagePermission();
            }}
            className="text-[11px] px-2 py-1 rounded bg-slate-800 text-indigo-300 hover:bg-slate-700 font-mono"
          >
            模拟权限: {hasUsagePermission ? '已授权' : '未授权'}
          </button>
        </div>
      )}

      {/* 视图切换胶囊与标题 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          {/* 切换 Tab */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => {
                triggerHapticFeedback(10);
                setViewMode('tracked');
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'tracked'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>追踪中 ({trackedList.length})</span>
            </button>
            <button
              onClick={() => {
                triggerHapticFeedback(10);
                setViewMode('all');
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
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
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>增减应用</span>
          </button>
        </div>

        {/* 列表渲染 */}
        {displayList.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-300">
                {viewMode === 'tracked' ? '尚未选定追踪应用' : `${dayBadgeText}暂未捕获到应用数据`}
              </div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {viewMode === 'tracked'
                  ? '选定几个您日常最常使用的核心 App，避免大量无关系统应用打扰。'
                  : '请确认已开启使用情况访问权限并正常使用手机应用。'}
              </p>
            </div>
            {viewMode === 'tracked' && (
              <button
                onClick={() => {
                  triggerHapticFeedback(15);
                  setIsSelectorOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ 挑选追踪应用</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
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

              return (
                <div
                  key={item.packageName}
                  onClick={() => {
                    triggerHapticFeedback(15);
                    setSelectedAppForDetail(item);
                  }}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 hover:border-indigo-500/40 transition-all flex flex-col space-y-2.5 active:bg-slate-900 cursor-pointer shadow-sm"
                >
                  {/* 第一行：应用图标首字母、标题、分类与时长 */}
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                        {item.appName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-white truncate">
                            {item.appName}
                          </span>
                        </div>
                        {/* 🌟 支持展示多个分类彩色徽章 */}
                        <div className="flex items-center space-x-1 flex-wrap gap-y-0.5 mt-0.5">
                          {getActivityCategories(item).map((cat) => {
                            const catCol = getCategoryColor(cat);
                            return (
                              <span
                                key={cat}
                                className="text-[9px] px-1.5 py-0.2 rounded font-bold border"
                                style={{
                                  backgroundColor: `${catCol}15`,
                                  borderColor: `${catCol}30`,
                                  color: catCol,
                                }}
                              >
                                {cat}
                              </span>
                            );
                          })}
                        </div>
                        {/* 如果被改过名，以小字轻量标明原名 */}
                        {isRenamed && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            原名: {item.originalAppName}
                          </div>
                        )}
                        {!isRenamed && item.appName === item.packageName && (
                          <div className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                            点击可改名字与分类
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 右侧时长与百分比 */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-xs font-mono font-bold ${
                            minutes >= 1 ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {minutes} 分钟
                        </span>
                        {currentTotalMinutes > 0 && minutes > 0 && (
                          <span className="text-[10px] font-mono text-indigo-400 font-bold">
                            占比 {percent}%
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </div>
                  </div>

                  {/* 若存在用户备注，展示在卡片上 */}
                  {hasNotes && (
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950/50 border border-slate-800/60 text-[11px] text-slate-400 truncate">
                      <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="truncate">{item.notes}</span>
                    </div>
                  )}

                  {/* 进度条与一键入流/增量更新 */}
                  <div className="flex items-center space-x-3 pt-0.5">
                    {/* 进度条 */}
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          minutes >= 1
                            ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                            : 'bg-slate-700/40'
                        }`}
                        style={{ width: minutes >= 1 ? `${Math.max(4, percent)}%` : '0%' }}
                      />
                    </div>

                    {/* 快捷入流 / 增量同步按钮 */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {minutes < 1 ? (
                        <span className="text-[11px] text-slate-500 px-2 py-0.5 rounded bg-slate-800/50">
                          未满1分钟
                        </span>
                      ) : hasIncrementalUpdate ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            已入流{importedMin}m
                          </span>
                          <button
                            onClick={() => {
                              triggerHapticFeedback(15);
                              importAppUsageToTimeline(item);
                            }}
                            className="flex items-center space-x-1 text-[11px] text-amber-300 hover:text-white px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-600 border border-amber-500/30 transition-colors font-semibold active:scale-95"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>同步 +{unsyncedMin}m</span>
                          </button>
                        </div>
                      ) : item.isImported ? (
                        <span className="flex items-center space-x-1 text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>已入流 ({importedMin || minutes}m)</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            triggerHapticFeedback(15);
                            importAppUsageToTimeline(item);
                          }}
                          className="flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-white px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-600 transition-colors font-medium active:scale-95"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
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
