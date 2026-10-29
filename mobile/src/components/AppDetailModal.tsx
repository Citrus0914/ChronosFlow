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
} from 'lucide-react';
import { registerBackHandler, triggerHapticFeedback } from '../services/nativeBridge';
import { AppUsageItem } from '../types';

interface AppDetailModalProps {
  app: AppUsageItem;
  onClose: () => void;
}

const CATEGORY_PRESETS = [
  '工作/业务',
  '开发/技术',
  '学习/提升',
  '休闲/生活',
  '健康/运动',
  '默认/其他',
];

export const AppDetailModal: React.FC<AppDetailModalProps> = ({ app, onClose }) => {
  const {
    updateAppConfig,
    importAppUsageToTimeline,
    addToast,
    trackedAppConfigs,
  } = useTimeStore();

  const currentConfig = trackedAppConfigs[app.packageName];

  // 本地表单状态
  const [customName, setCustomName] = useState(
    currentConfig?.customName ?? (app.appName !== app.packageName ? app.appName : '')
  );
  const [category, setCategory] = useState(currentConfig?.category ?? app.category);
  const [notes, setNotes] = useState(currentConfig?.notes ?? '');
  const [isTracked, setIsTracked] = useState(currentConfig?.isTracked ?? !!app.isTracked);

  // 监听物理返回键，按返回键先关闭弹窗
  useEffect(() => {
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [onClose]);

  const handleSave = () => {
    triggerHapticFeedback(15);
    updateAppConfig(app.packageName, {
      customName: customName.trim(),
      category: category.trim() || '默认/其他',
      notes: notes.trim(),
      isTracked,
    });
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
    // 先保存最新配置，再导入
    updateAppConfig(app.packageName, {
      customName: customName.trim(),
      category: category.trim() || '默认/其他',
      notes: notes.trim(),
      isTracked,
    });
    importAppUsageToTimeline({
      ...app,
      appName: customName.trim() || app.originalAppName || app.packageName,
      category: category.trim() || '默认/其他',
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

  const minutes = Math.round(app.foregroundMs / 60000);
  const hours = (minutes / 60).toFixed(1);

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

        {/* 头部：标题与关闭 */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 font-bold text-lg">
              {(customName || app.appName || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">
                {customName.trim() || app.appName}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  {minutes} 分钟 ({hours} 小时)
                </span>
                <span>•</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                  {category}
                </span>
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

        {/* 中间表单区域（滚动） */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-0.5 no-scrollbar">
          {/* 1. 追踪开关快捷操作 */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-lg ${isTracked ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
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
              改名后将直接在排行榜与导入的时间流中呈现，再也不用看恼人的 <code className="text-slate-400">com.xxx</code> 包名。
            </p>
          </div>

          {/* 3. 分类设置 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>应用专注分类</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_PRESETS.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback(10);
                      setCategory(cat);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-medium transition-all text-center border ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
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
              应用时长为全天零星使用累计，生成时间块时<strong>默认按照【未知时段】</strong>记录，完整计入今日专注与分类预算，不强行霸占具体起止钟点。
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
