import React, { useState, useEffect } from 'react';
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
  Plus,
  Check,
  Percent,
} from 'lucide-react';
import { registerBackHandler, triggerHapticFeedback } from '../services/nativeBridge';
import { AppUsageItem, STANDARD_CATEGORIES } from '../types';
import { getCategoryColor } from '../lib/utils';

interface AppDetailModalProps {
  app: AppUsageItem;
  totalMinutes?: number;
  onClose: () => void;
}

const CATEGORY_PRESETS = STANDARD_CATEGORIES;

export const AppDetailModal: React.FC<AppDetailModalProps> = ({ app, totalMinutes, onClose }) => {
  const {
    updateAppConfig,
    importAppUsageToTimeline,
    addToast,
    trackedAppConfigs,
    projectGoals,
  } = useTimeStore();

  const activeProjects = projectGoals.filter((p) => !p.isArchived);
  const currentConfig = trackedAppConfigs[app.packageName];

  // 1. 初始化名称别名
  const [customName, setCustomName] = useState(
    currentConfig?.customName ?? (app.appName !== app.packageName ? app.appName : '')
  );

  // 2. 初始化多分类列表（🌟 支持同一项记录同时隶属于多个分类）
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    if (currentConfig?.categories && currentConfig.categories.length > 0) {
      return Array.from(new Set(currentConfig.categories));
    }
    if (app.categories && app.categories.length > 0) {
      return Array.from(new Set(app.categories));
    }
    const fallback = currentConfig?.category || app.category || '默认/其他';
    return [fallback];
  });

  // 3. 专属目标项目多选/单选
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() => {
    if (currentConfig?.projectIds && currentConfig.projectIds.length > 0) {
      return currentConfig.projectIds;
    }
    if (app.projectIds && app.projectIds.length > 0) {
      return app.projectIds;
    }
    const single = currentConfig?.projectId || app.projectId;
    return single ? [single] : [];
  });

  // 4. 自定义专属分类输入
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [notes, setNotes] = useState(currentConfig?.notes ?? (app.notes || ''));
  const [isTracked, setIsTracked] = useState(currentConfig?.isTracked ?? !!app.isTracked);

  // 监听物理返回键，按返回键先关闭弹窗
  useEffect(() => {
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [onClose]);

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

  // 添加自定义专属分类
  const handleAddCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    triggerHapticFeedback(15);
    if (!selectedCategories.includes(trimmed)) {
      setSelectedCategories((prev) => [...prev, trimmed]);
    }
    setCustomCategoryInput('');
    setShowCustomInput(false);
    addToast('SUCCESS', '专属分类已添加', `已为该应用附加专属分类「${trimmed}」`);
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

  const handleSave = () => {
    triggerHapticFeedback(15);
    const primaryCat = selectedCategories[0] || '默认/其他';
    updateAppConfig(app.packageName, {
      customName: customName.trim(),
      category: primaryCat,
      categories: selectedCategories,
      projectId: selectedProjectIds[0] || undefined,
      projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
      notes: notes.trim(),
      isTracked,
    });
    addToast('SUCCESS', '配置已保存', `「${customName.trim() || app.appName}」的多分类与配置已更新`);
    onClose();
  };

  const handleResetName = () => {
    triggerHapticFeedback(10);
    const fallback = app.originalAppName || app.appName;
    setCustomName(fallback !== app.packageName ? fallback : '');
  };

  const handleToggleTrack = () => {
    triggerHapticFeedback(15);
    setIsTracked(!isTracked);
  };

  const handleImport = () => {
    triggerHapticFeedback(20);
    const primaryCat = selectedCategories[0] || '默认/其他';
    // 先保存最新配置，再导入
    updateAppConfig(app.packageName, {
      customName: customName.trim(),
      category: primaryCat,
      categories: selectedCategories,
      projectId: selectedProjectIds[0] || undefined,
      projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
      notes: notes.trim(),
      isTracked,
    });
    importAppUsageToTimeline({
      ...app,
      appName: customName.trim() || app.originalAppName || app.packageName,
      category: primaryCat,
      categories: selectedCategories,
      projectId: selectedProjectIds[0] || undefined,
      projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
      notes: notes.trim(),
      isTracked,
    });
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* 遮罩背景点击退出 */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] z-10 animate-in slide-in-from-bottom duration-300"
        style={{
          paddingBottom: 'max(var(--safe-bottom, 0px) + 1rem, 1.25rem)',
        }}
      >
        {/* 顶部指示条（手机抽屉式） */}
        <div className="w-10 h-1 bg-slate-700/60 rounded-full mx-auto mb-3 sm:hidden" />

        {/* 头部：应用标识与百分比总览 */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 font-bold text-lg shadow-inner">
              {(customName || app.appName || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">
                {customName.trim() || app.appName}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5 flex-wrap gap-y-1">
                <span className="flex items-center gap-1 font-mono text-slate-200 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {minutes} 分钟 ({hours}h)
                </span>

                {/* 🌟 百分比功能展示徽章 */}
                {effectiveTotalMin > 0 && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-mono text-indigo-300 font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[11px]">
                      <Percent className="w-2.5 h-2.5" />
                      占比 {percentStr}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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

        {/* 中间表单区域（滚动） */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-0.5 no-scrollbar">
          {/* 1. 追踪开关快捷操作 */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center space-x-2.5">
              <div
                className={`p-2 rounded-lg ${
                  isTracked ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {isTracked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  {isTracked ? '已选定追踪该应用' : '未纳入追踪列表'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isTracked ? '该应用将展示在主页活跃榜并计入追踪总时长' : '从日常主榜中隐藏，仅在全量列表中可查'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleTrack}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
              {(customName || app.originalAppName) && (
                <button
                  type="button"
                  onClick={handleResetName}
                  className="text-[11px] text-slate-500 hover:text-indigo-400 flex items-center gap-1"
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
                placeholder={app.originalAppName || app.packageName}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              改名后将直接在主页感知榜与时间流中呈现，再也不用看复杂的 <code className="text-slate-400">com.xxx</code> 包名。
            </p>
          </div>

          {/* 3. 分类设置 (🌟 多分类与专属分类) */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/90">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <span>分类归属 (支持多选)</span>
              </label>
              <span className="text-[10px] text-indigo-300 font-medium">
                同一应用可同时属于多个分类
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

            {/* C: 专属自定义分类与输入 */}
            <div className="pt-1.5 space-y-1.5">
              {showCustomInput ? (
                <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-950 border border-indigo-500/50 animate-in fade-in">
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="输入专属自定义分类名 (如: 英语听力、副业运营)..."
                    className="flex-1 bg-transparent px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition active:scale-95"
                  >
                    添加
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium py-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ 添加专属自定义分类...</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. 专属备注 / 目标提示 */}
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
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            />
          </div>

          {/* 5. 底层包名与调试信息 */}
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

          {/* 6. 未知时段入流说明 */}
          <div className="p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-indigo-300/80 flex items-start space-x-2 leading-relaxed">
            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              应用时长为全天零星使用累计，生成时间块时<strong>默认按照【未知时段】</strong>记录，并完整归属于所选的多个分类，不强行霸占具体起止钟点。
            </span>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handleImport}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-98"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>生成时间块</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>保存修改</span>
          </button>
        </div>
      </div>
    </div>
  );
};