import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTimeStore } from '../store/useTimeStore';
import {
  X,
  Edit3,
  Tag,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  Copy,
  Smartphone,
  Eye,
  EyeOff,
  RotateCcw,
  Target,
  Check,
  Percent,
  Info,
  Smile,
  Flame,
  BatteryCharging,
  Frown,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { registerBackHandler, triggerHapticFeedback, getDeviceBatteryCapacity } from '../services/nativeBridge';
import { AppUsageItem, STANDARD_CATEGORIES, ActivityMood, resolveAppDailyState } from '../types';
import { getCategoryColor } from '../lib/utils';
import { formatShortChineseDate } from '../lib/dateUtils';
import { calculateAppPower } from '../lib/powerUtils';
import { useSheetSwipeToClose } from '../lib/useSheetSwipeToClose';

interface AppDetailModalProps {
  app: AppUsageItem;
  totalMinutes?: number;
  targetDate?: Date;
  onClose: () => void;
}

const CATEGORY_PRESETS = STANDARD_CATEGORIES;

const MOODS: { id: ActivityMood; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'NORMAL', label: '平常', icon: <Sparkles className="w-3.5 h-3.5" />, color: '#94a3b8' },
  { id: 'FOCUSED', label: '专注', icon: <Smile className="w-3.5 h-3.5" />, color: '#3b82f6' },
  { id: 'FLOW', label: '心流', icon: <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />, color: '#8b5cf6' },
  { id: 'TIRED', label: '疲惫', icon: <BatteryCharging className="w-3.5 h-3.5" />, color: '#f59e0b' },
  { id: 'FRUSTRATED', label: '受挫', icon: <Frown className="w-3.5 h-3.5" />, color: '#ef4444' },
  { id: 'DISTRACTED', label: '分心', icon: <Zap className="w-3.5 h-3.5" />, color: '#f97316' },
];

export const AppDetailModal: React.FC<AppDetailModalProps> = ({
  app,
  totalMinutes,
  targetDate,
  onClose,
}) => {
  const {
    settings,
    updateAppConfig,
    importAppUsageToTimeline,
    addToast,
    trackedAppConfigs,
    projectGoals,
    activities,
  } = useTimeStore();

  const activeDate = targetDate || new Date();

  const activeProjects = projectGoals.filter((p) => !p.isArchived);
  const currentConfig = trackedAppConfigs[app.packageName];

  // 🌟 单日独立状态解析：优先当天显式配置，未知状态自动向后回溯继承前一天的状态
  const dailyState = resolveAppDailyState(app.packageName, activeDate, currentConfig, activities);

  const defaultDisplayName =
    app.originalAppName && app.originalAppName !== app.packageName
      ? app.originalAppName
      : app.appName !== app.packageName
      ? app.appName
      : '';

  // 1. 初始化名称别名（应用级属性）
  const [customName, setCustomName] = useState(() => {
    if (currentConfig?.customName && currentConfig.customName.trim()) {
      return currentConfig.customName;
    }
    return defaultDisplayName;
  });

  // 2. 初始化多分类列表（🌟 单日独立）
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    return dailyState.categories.length > 0 ? dailyState.categories : ['默认/其他'];
  });

  // 3. 专属目标项目多选/单选（🌟 单日独立）
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() => {
    return dailyState.projectIds || (dailyState.projectId ? [dailyState.projectId] : []);
  });

  // 4. 初始化情绪与精力状态（🌟 单日独立：若今日未知，已默认按前一天状态继承）
  const [mood, setMood] = useState<ActivityMood>(() => {
    return dailyState.mood;
  });

  // 5. 初始化备注（🌟 单日独立）
  const [notes, setNotes] = useState(() => dailyState.notes);
  const [isTracked, setIsTracked] = useState(currentConfig?.isTracked ?? !!app.isTracked);

  const { backdropRef, sheetRef, scrollRef, closeWithAnimation } = useSheetSwipeToClose({
    onClose,
  });

  // 监听物理/边缘手势返回键，丝滑下滑关闭弹窗
  useEffect(() => {
    return registerBackHandler(() => {
      closeWithAnimation();
      return true;
    });
  }, [closeWithAnimation]);

  // 切换分类勾选 (Toggle)
  const handleToggleCategory = (cat: string) => {
    triggerHapticFeedback(10);
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        if (prev.length <= 1) {
          addToast('INFO', '提示', '应用至少需保留一个分类归属');
          return prev;
        }
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  // 切换专属目标勾选 (Toggle)
  const handleToggleProject = (projectId: string, projectName: string) => {
    triggerHapticFeedback(15);
    const isSelected = selectedProjectIds.includes(projectId);
    if (isSelected) {
      setSelectedProjectIds((prev) => prev.filter((id) => id !== projectId));
      // 同时如果该目标名在分类中且不止一个分类，则移除
      setSelectedCategories((prev) => {
        if (prev.includes(projectName) && prev.length > 1) {
          return prev.filter((c) => c !== projectName);
        }
        return prev;
      });
    } else {
      setSelectedProjectIds((prev) => [...prev, projectId]);
      // 将专属项目名也作为分类标签之一加入
      setSelectedCategories((prev) => {
        if (!prev.includes(projectName)) {
          return [...prev, projectName];
        }
        return prev;
      });
    }
  };

  // 移除指定分类
  const handleRemoveCategory = (cat: string) => {
    triggerHapticFeedback(10);
    if (selectedCategories.length <= 1) {
      addToast('INFO', '提示', '应用至少需保留一个分类归属');
      return;
    }
    setSelectedCategories((prev) => prev.filter((c) => c !== cat));
  };

  const resolveNormalizedCustomName = () => {
    const trimmed = customName.trim();
    if (!trimmed) return '';
    if (app.originalAppName && trimmed === app.originalAppName) return '';
    return trimmed;
  };

  const handleSave = () => {
    triggerHapticFeedback(18);
    const primaryCat = selectedCategories[0] || '默认/其他';
    const normalizedCustomName = resolveNormalizedCustomName();
    updateAppConfig(
      app.packageName,
      {
        customName: normalizedCustomName,
        category: primaryCat,
        categories: selectedCategories,
        projectId: selectedProjectIds[0] || undefined,
        projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
        notes: notes.trim(),
        isTracked,
        mood,
      },
      { targetDate: activeDate }
    );
    onClose();
  };

  const handleResetName = () => {
    triggerHapticFeedback(10);
    setCustomName(defaultDisplayName);
  };

  const handleToggleTrack = () => {
    triggerHapticFeedback(15);
    setIsTracked(!isTracked);
  };

  const handleImport = () => {
    triggerHapticFeedback(20);
    const primaryCat = selectedCategories[0] || '默认/其他';
    const normalizedCustomName = resolveNormalizedCustomName();
    const resolvedDisplayName =
      normalizedCustomName || defaultDisplayName || app.originalAppName || app.packageName;

    // 先静默保存最新配置（写入当天的 dailyOverrides 与当天时间块），再同步到时间流并收起弹窗
    updateAppConfig(
      app.packageName,
      {
        customName: normalizedCustomName,
        category: primaryCat,
        categories: selectedCategories,
        projectId: selectedProjectIds[0] || undefined,
        projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
        notes: notes.trim(),
        isTracked,
        mood,
      },
      { silentToast: true, targetDate: activeDate }
    );
    importAppUsageToTimeline({
      ...app,
      appName: resolvedDisplayName,
      category: primaryCat,
      categories: selectedCategories,
      projectId: selectedProjectIds[0] || undefined,
      projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
      notes: notes.trim(),
      isTracked,
      mood,
    });
    onClose();
  };

  const copyPackageName = () => {
    triggerHapticFeedback(10);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(app.packageName);
      addToast('INFO', '已复制包名', app.packageName);
    }
  };

  // 时长与百分比计算
  const minutes = Math.round(app.foregroundMs / 60000);
  const hours = (minutes / 60).toFixed(1);
  const effectiveTotalMin = totalMinutes && totalMinutes > 0 ? totalMinutes : 0;
  const percentNum = effectiveTotalMin > 0 ? Math.min(100, (minutes / effectiveTotalMin) * 100) : 0;
  const percentStr = percentNum > 0 ? (percentNum < 1 ? '<1%' : `${Math.round(percentNum)}%`) : '0%';
  const previewTitle = customName.trim() || defaultDisplayName || app.appName || app.packageName;
  const batteryCapacity = getDeviceBatteryCapacity();
  const power = calculateAppPower({
    foregroundMs: app.foregroundMs,
    appName: previewTitle,
    packageName: app.packageName,
    category: selectedCategories[0] || app.category,
    batteryCapacityMah: batteryCapacity,
    hardwareMah: app.hardwareMah,
  });

  const modalNode = (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      {/* 遮罩背景点击退出 */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-slate-950/82 backdrop-blur-md"
        onClick={closeWithAnimation}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-slate-900 border-t border-x sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl px-5 pt-2.5 shadow-2xl flex flex-col max-h-[90vh] z-10 will-change-transform"
        style={{
          paddingBottom: 'max(calc(var(--safe-bottom, 0px) + 0.875rem), 1.25rem)',
        }}
      >
        {/* 顶部拖拽把手与头部区域（支持随时按住向下滑动返回） */}
        <div
          data-sheet-drag-handle="true"
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="pt-1 pb-2.5 flex flex-col items-center justify-center sm:hidden">
            <div className="w-11 h-1.5 bg-slate-600/80 rounded-full" />
          </div>

          {/* 头部：应用标识与百分比总览 */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {(() => {
                const avatarCol = getCategoryColor(selectedCategories[0] || app.category);
                return (
                  <div
                    className="w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 font-extrabold text-lg shadow-inner"
                    style={{
                      backgroundColor: `${avatarCol}1f`,
                      borderColor: `${avatarCol}45`,
                      color: avatarCol,
                    }}
                  >
                    {previewTitle.slice(0, 1).toUpperCase()}
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white truncate">
                  {previewTitle}
                </h3>
                <div className="flex items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 whitespace-nowrap">
                    📅 {formatShortChineseDate(activeDate)} · 单日独立
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-200 font-semibold whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    {minutes} 分钟 ({hours}h)
                  </span>

                  {/* 百分比功能展示徽章 */}
                  {effectiveTotalMin > 0 && (
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums text-indigo-300 font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[11px] whitespace-nowrap">
                      <Percent className="w-2.5 h-2.5 shrink-0" />
                      占比 {percentStr}
                    </span>
                  )}

                  {/* ⚡ 预估/实测耗电量徽章 */}
                  {settings.enableBatteryTracking !== false && (
                    <span
                      className={`inline-flex items-center gap-1 font-mono tabular-nums font-bold px-2 py-0.5 rounded-full border text-[11px] whitespace-nowrap ${power.badgeBg} ${power.badgeBorder} ${power.badgeText}`}
                    >
                      <Zap className="w-2.5 h-2.5 fill-current shrink-0" />
                      {power.isHardwareMeasured ? '实测耗电 ' : '耗电 ~'}
                      {power.mah} mAh ({power.percent}%)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={closeWithAnimation}
              className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
              aria-label="关闭应用详情"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 🌟 使用时长百分比进度条 */}
        {effectiveTotalMin > 0 && (
          <div className="py-2 px-3 mt-2 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center space-x-3">
            <div className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
              <span>应用时长占比:</span>
              <strong className="text-indigo-400 font-mono font-bold">{percentStr}</strong>
            </div>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, percentNum)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono shrink-0">
              {minutes}/{effectiveTotalMin}m
            </span>
          </div>
        )}

        {/* 中间表单区域（滚动至顶部时继续下拉即可关闭抽屉） */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain py-3 space-y-4 pr-0.5 no-scrollbar"
        >
          {/* 🔋 电池与单应用能耗分析卡片 */}
          {settings.enableBatteryTracking !== false && (
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Zap className="w-3.5 h-3.5 fill-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>电池与能耗分析</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({batteryCapacity}mAh 硬件基准)
                      </span>
                    </h4>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${power.badgeBg} ${power.badgeBorder} ${power.badgeText}`}
                >
                  {power.levelLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 font-medium">
                    {power.isHardwareMeasured ? '系统内核实测电量' : '预估总消耗电量'}
                  </div>
                  <div className="text-base font-extrabold text-white font-mono mt-0.5 flex items-baseline gap-1">
                    <span>{power.mah}</span>
                    <span className="text-[10px] text-slate-400 font-normal">mAh</span>
                    <span
                      className={`text-xs font-semibold ml-0.5 ${
                        power.isHardwareMeasured ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      ({power.percent}%)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 font-medium">典型放电速率</div>
                  <div className="text-base font-extrabold text-white font-mono mt-0.5 flex items-baseline gap-1">
                    <span>~{power.hourlyRateMah}</span>
                    <span className="text-[10px] text-slate-400 font-normal">mAh/h</span>
                    <span className="text-xs text-slate-400 font-medium ml-0.5">
                      ({power.hourlyRatePercent}%/h)
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/40 rounded-xl p-2.5 border border-white/[0.03] space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong className="text-slate-300">能耗成因：</strong>
                    {power.breakdown}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 text-[10px] pt-1.5 border-t border-white/[0.04] ${
                    power.isHardwareMeasured
                      ? 'text-emerald-400 font-semibold'
                      : 'text-amber-300/90'
                  }`}
                >
                  {power.isHardwareMeasured ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  )}
                  <span>{power.accuracyNotice}</span>
                </div>
              </div>
            </div>
          )}
          {/* 1. 追踪开关快捷操作 */}
          <div className="flex items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isTracked ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {isTracked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white">
                  {isTracked ? '已选定追踪该应用' : '未纳入追踪列表'}
                </div>
                <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  {isTracked ? '展示在主页追踪榜并计入追踪时长' : '主页默认隐藏，仅在全量列表中可查'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleTrack}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                isTracked
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {isTracked ? '追踪中' : '加入追踪'}
            </button>
          </div>

          {/* 2. 修改应用名称 (改名字) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>自定义应用显示名称 (别名)</span>
              </label>
              {customName.trim() !== defaultDisplayName && (
                <button
                  type="button"
                  onClick={handleResetName}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>恢复初始名称</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={defaultDisplayName || app.packageName}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium select-text"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              改名后将直接在主页感知榜与时间流中呈现，再也不用看复杂的 <code className="text-slate-400">com.xxx</code> 包名。
            </p>
          </div>

          {/* 3. 分类设置 (🌟 多分类与专属分类) */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/90">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>分类归属</span>
              </label>
              <span className="text-[10px] text-indigo-300 font-medium whitespace-nowrap">
                支持同时隶属多个分类
              </span>
            </div>

            {/* 当前已选多分类胶囊预览展示区 */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[11px] text-slate-400 shrink-0">已选 ({selectedCategories.length}):</span>
              {selectedCategories.map((cat) => {
                const color = getCategoryColor(cat);
                const isProject = activeProjects.some((p) => p.name === cat);
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center space-x-1 text-xs px-2.5 py-0.5 rounded-lg font-bold border transition-all animate-in fade-in"
                    style={{
                      borderColor: `${color}60`,
                      backgroundColor: `${color}20`,
                      color: color,
                    }}
                  >
                    {isProject && <Target className="w-3 h-3 mr-0.5" />}
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="ml-1 p-0.5 hover:bg-white/20 rounded-full text-slate-300 hover:text-white"
                      title="移除此分类"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>

            {/* A: 关联专属目标项目 */}
            {activeProjects.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1 text-indigo-400">
                    <Target className="w-3 h-3" />
                    <span>关联专属目标项目</span>
                  </span>
                  <span className="text-[10px] text-slate-500">自动计入目标进度</span>
                </div>
                <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
                  {activeProjects.map((p) => {
                    const isSelected = selectedProjectIds.includes(p.id) || selectedCategories.includes(p.name);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleToggleProject(p.id, p.name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all border shrink-0 ${
                          isSelected
                            ? 'ring-2 ring-white/40 text-white shadow-md'
                            : 'opacity-70 hover:opacity-100 text-slate-200 border-slate-700/60 bg-slate-800/80'
                        }`}
                        style={{
                          backgroundColor: isSelected ? p.color : undefined,
                          borderColor: isSelected ? p.color : undefined,
                        }}
                      >
                        <Target className="w-3 h-3" />
                        <span>{p.name}</span>
                        {isSelected && <Check className="w-3 h-3 ml-0.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* B: 基础标准分类 (多选 Toggle) */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                <span>基础标准分类</span>
                <span className="text-[10px] text-slate-500">点击多选 / 反选</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {CATEGORY_PRESETS.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  const catColor = getCategoryColor(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm ring-1 ring-indigo-500/50'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: catColor }}
                        />
                        <span className="truncate">{cat}</span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-indigo-400 shrink-0 ml-1 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. 情绪与精力状态 (单选) */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/90">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                <Smile className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>情绪与精力状态</span>
              </label>
              <span className="text-[10px] text-indigo-300 font-medium whitespace-nowrap">
                生成时间块时自动继承
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {MOODS.map((m) => {
                const isSelected = mood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback(10);
                      setMood(m.id);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5 border transition-all active:scale-95 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-600/20 text-white font-bold ring-1 ring-indigo-500/50 shadow-sm'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span style={{ color: isSelected ? undefined : m.color }}>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
            {dailyState.isMoodInheritedFromPreviousDay && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl mt-2">
                <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>
                  具体状态未知，已默认按前一天 ({dailyState.inheritedFromDateKey?.slice(5) || '前一日'})「
                  {MOODS.find((m) => m.id === dailyState.mood)?.label || '专注'}」状态延续
                </span>
              </div>
            )}
          </div>

          {/* 5. 专属备注 / 目标提示 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>备注与使用备忘</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：每日尽量控制在半小时以内；或工作沟通专用打卡等..."
              rows={2}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none select-text"
            />
          </div>

          {/* 6. 底层包名与调试信息 */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-slate-500" />
                <span>原生系统包名</span>
              </span>
              <button
                type="button"
                onClick={copyPackageName}
                className="text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                <Copy className="w-3 h-3" />
                <span>复制</span>
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-500 truncate select-all">
              {app.packageName}
            </div>
          </div>

          {/* 7. 未知时段入流说明 */}
          <div className="p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-indigo-300/80 flex items-start space-x-2 leading-relaxed">
            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              应用时长为全天零星使用累计，生成时间块时<strong>默认按照【未知时段】</strong>记录，并完整归属于所选的多个分类，不强行霸占具体起止钟点。
            </span>
          </div>

          {/* 8. 多分类预算与混合场景防重复记说明 */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold text-xs">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>多分类预算与混合应用防重复记说明</span>
            </div>
            <p className="text-slate-400">
              若同时勾选多个分类，各分类的周预算与图表均会<strong>全额计入</strong>此应用时长。
            </p>
            <p className="text-slate-400">
              对于<strong>微信、钉钉</strong>等兼具多种用途的应用，为避免周预算重复累加与时长冲突，建议：
            </p>
            <div className="pl-2 border-l-2 border-amber-500/40 text-slate-300 space-y-1">
              <div>• <strong>只记最主要活动</strong>：仅勾选该应用最主要的用途分类（如闲聊为主则选「社交/沟通」，办公为主则选「工作/业务」）；</div>
              <div>• <strong>不建议重复补录</strong>：无需对同一应用内的次要活动进行零星额外补录，抓大放小，彻底避免时长与预算虚增重合。</div>
            </div>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center space-x-2.5">
          <button
            type="button"
            disabled={minutes < 1}
            onClick={handleImport}
            className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 whitespace-nowrap transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
              app.isImported && (app.unsyncedMinutes ?? 0) > 0
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-indigo-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              {minutes < 1
                ? '未满1分钟'
                : app.isImported && (app.unsyncedMinutes ?? 0) > 0
                ? `同步新增 (+${app.unsyncedMinutes}m)`
                : app.isImported
                ? `刷新时间块 (${minutes}m)`
                : `生成时间块 (${minutes}m)`}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 whitespace-nowrap shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>保存修改</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};