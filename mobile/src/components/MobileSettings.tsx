import React, { useState, useRef } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import {
  Settings,
  Key,
  Shield,
  Smartphone,
  Trash2,
  CheckCircle2,
  Sparkles,
  Download,
  Upload,
  Database,
  Radio,
  Zap,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import {
  requestUsagePermission,
  triggerHapticFeedback,
  hasAdbBatteryStatsPermission,
} from '../services/nativeBridge';

export const MobileSettings: React.FC = () => {
  const {
    settings,
    updateSettings,
    addToast,
    hasUsagePermission,
    refreshUsagePermission,
    activities,
    clearAllActivities,
    loadFiveWeeksDemoData,
    exportDataBackup,
    importDataBackup,
  } = useTimeStore();

  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || '');
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState(
    settings.apiBaseUrl || 'https://api.openai.com/v1'
  );
  const [fastModelInput, setFastModelInput] = useState(settings.fastModel || 'deepseek-chat');
  const [deepModelInput, setDeepModelInput] = useState(settings.deepModel || 'deepseek-reasoner');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveApi = () => {
    triggerHapticFeedback(20);
    updateSettings({
      apiKey: apiKeyInput.trim(),
      apiBaseUrl: apiBaseUrlInput.trim(),
      fastModel: fastModelInput.trim() || 'deepseek-chat',
      deepModel: deepModelInput.trim() || 'deepseek-reasoner',
    });
    addToast('SUCCESS', '配置已保存', 'AI 大模型接口配置已安全保存在本地');
  };

  const handleToggleGapAlert = () => {
    triggerHapticFeedback(15);
    const next = !settings.enableSmartGapAlert;
    updateSettings({ enableSmartGapAlert: next });
    addToast(
      'INFO',
      next ? '已开启断层预警' : '已关闭断层预警',
      next ? '超过 45 分钟未打卡时将自动提示' : '时间断层提示已关闭'
    );
  };

  const handleToggleAIQuickParse = () => {
    triggerHapticFeedback(15);
    const next = !settings.enableAIQuickParse;
    updateSettings({ enableAIQuickParse: next });
    addToast(
      'INFO',
      next ? '已开启 AI 智能解析' : '已切换至纯本地规则',
      next ? '随手记将优先调用大模型语义提炼' : '随手记将使用 0 毫秒离线规则解析'
    );
  };

  const handleToggleAutoUsageSync = () => {
    triggerHapticFeedback(15);
    const next = !settings.enableAutoAppUsageSync;
    updateSettings({ enableAutoAppUsageSync: next });
    addToast(
      'INFO',
      next ? '已开启应用感知同步' : '已暂停应用感知同步',
      next ? '前台应用时长将自动同步' : '停止自动同步应用数据'
    );
  };

  const hasAdbPermission = hasAdbBatteryStatsPermission();

  const handleToggleBatteryTracking = () => {
    triggerHapticFeedback(15);
    const next = settings.enableBatteryTracking === false;
    updateSettings({ enableBatteryTracking: next });
    addToast(
      'INFO',
      next ? '已开启耗电感知' : '已暂停耗电感知',
      next ? '将在应用跟踪中展示电量消耗' : '已关闭耗电量指标展示'
    );
  };

  const handleCopyAdbCommand = () => {
    triggerHapticFeedback(15);
    const cmd = 'adb shell pm grant com.chronosflow.app android.permission.BATTERY_STATS';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cmd);
      addToast('SUCCESS', '命令已复制到剪贴板', '请在电脑命令终端中粘贴并回车执行');
    }
  };

  const handleClearAll = () => {
    triggerHapticFeedback(30);
    if (
      confirm('确定要清空手机端的所有时间记录吗？该操作将重置为纯净空白状态，不可撤回。')
    ) {
      clearAllActivities();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importDataBackup(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="space-y-4 pb-12"
      style={{
        paddingBottom: 'calc(2.5rem + var(--safe-bottom, 0px))',
      }}
    >
      <div className="flex items-center space-x-2 px-1">
        <Settings className="w-4 h-4 text-indigo-400 shrink-0" />
        <h3 className="text-xs font-semibold text-slate-300 tracking-wide">
          系统设置与数据自治
        </h3>
      </div>

      {/* 原生使用时长感知权限管理 */}
      <div className="rounded-3xl chronos-card p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="space-y-1 min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>安卓应用使用感知权限</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              通过 Android 系统 UsageEvents 事件流精准读取前台活跃时长
            </p>
          </div>
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 ${
              hasUsagePermission
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
            }`}
          >
            {hasUsagePermission ? '已授权' : '未开启'}
          </span>
        </div>

        <button
          onClick={() => {
            triggerHapticFeedback(15);
            requestUsagePermission();
            setTimeout(() => refreshUsagePermission(), 1500);
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-white/[0.06] text-xs font-semibold text-slate-200 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>前往系统设置管理「应用使用情况」权限</span>
        </button>

        {/* 自动感知同步开关 */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/[0.06]">
          <div className="space-y-0.5 min-w-0 flex-1">
            <span className="text-xs text-slate-100 font-semibold block">
              前台恢复自动刷新感知时长
            </span>
            <p className="text-[11px] text-slate-400">切回时流或跨天唤醒时自动重算时长</p>
          </div>
          <button
            type="button"
            onClick={handleToggleAutoUsageSync}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              settings.enableAutoAppUsageSync ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                settings.enableAutoAppUsageSync ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 🔋 应用耗电量测量与精准度配置 */}
      <div className="rounded-3xl chronos-card p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
            <span>应用耗电量感知与精准度</span>
          </h4>
          {hasAdbPermission ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
              ADB 内核实测就绪
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold">
              算法预估模式
            </span>
          )}
        </div>

        {/* 耗电量感知总开关 */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0 flex-1">
            <span className="text-xs text-slate-100 font-semibold block">
              启用应用耗电量感知与评估
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              在应用追踪列表和各 App 详情中展示放电量 (mAh) 与能耗评级
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleBatteryTracking}
            className={`mt-0.5 w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              settings.enableBatteryTracking !== false ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                settings.enableBatteryTracking !== false ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* ⚠️ 权威精准度说明与 ADB 提权指引 */}
        <div className="pt-2.5 border-t border-white/[0.06] space-y-2.5">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center space-x-1.5 font-bold text-slate-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>测量准确度与系统权限说明</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-amber-300 font-medium">不用 ADB 时准确度较低：</strong>
              Android 系统对电池统计设有严格的特权隔离，在未获得 ADB 授权时，系统仅能依据前台活跃时长与标准芯片/屏幕功耗模型进行自适应模拟估算，<strong>无法感知屏幕实时高亮变化、基带弱网重传和瞬时发热放电</strong>。
            </p>

            {hasAdbPermission ? (
              <div className="flex items-center space-x-1.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>恭喜！本机已激活 ADB BATTERY_STATS 特权，当前已开启 100% 硬件内核实测！</span>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] text-slate-300 font-medium">
                  如需极致精准的物理内核级实测，请在电脑终端执行：
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-700/80 font-mono text-[10px] text-indigo-300 overflow-x-auto select-all">
                  <span className="truncate">
                    adb shell pm grant com.chronosflow.app android.permission.BATTERY_STATS
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAdbCommand}
                    className="p-1 px-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-[10px] shrink-0 font-sans font-bold transition active:scale-95 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>复制命令</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 智能辅助与断层感知 */}
      <div className="rounded-3xl chronos-card p-4 space-y-3.5">
        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-amber-400 shrink-0" />
          <span>智能辅助与断层预警</span>
        </h4>

        {/* 空白断层预警开关 */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0 flex-1">
            <span className="text-xs text-slate-100 font-semibold block">
              智能空白断层预警 (Smart Gap)
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              超过 45 分钟未打卡且无活跃任务时，在时间流顶部提示空白并支持一键补录
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleGapAlert}
            className={`mt-0.5 w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              settings.enableSmartGapAlert ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                settings.enableSmartGapAlert ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 随手记优先 AI 还是本地规则 */}
        <div className="flex items-start justify-between gap-3 pt-2.5 border-t border-white/[0.06]">
          <div className="space-y-0.5 min-w-0 flex-1">
            <span className="text-xs text-slate-100 font-semibold block">
              随手记优先使用 AI 大模型解析
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              关闭时使用 0 毫秒离线心理学规则引擎；开启且配置了 Key 时调用大模型
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleAIQuickParse}
            className={`mt-0.5 w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              settings.enableAIQuickParse ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                settings.enableAIQuickParse ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* AI 大模型接口与模型名称配置 */}
      <div className="rounded-3xl chronos-card p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <Key className="w-4 h-4 text-violet-400 shrink-0" />
          <h4 className="text-sm font-bold text-white">AI 接口与模型配置</h4>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          留空时自动启用内置离线心理学认知规则，0 网络与 0 Token 消耗。
        </p>

        <div className="space-y-2.5">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">API Base URL</label>
            <input
              type="text"
              value={apiBaseUrlInput}
              onChange={(e) => setApiBaseUrlInput(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full bg-slate-950/90 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">API Key</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-950/90 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 whitespace-nowrap">
                快速解析模型 (Fast)
              </label>
              <input
                type="text"
                value={fastModelInput}
                onChange={(e) => setFastModelInput(e.target.value)}
                placeholder="deepseek-chat"
                className="w-full bg-slate-950/90 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 whitespace-nowrap">
                深度复盘模型 (Deep)
              </label>
              <input
                type="text"
                value={deepModelInput}
                onChange={(e) => setDeepModelInput(e.target.value)}
                placeholder="deepseek-reasoner"
                className="w-full bg-slate-950/90 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500 font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleSaveApi}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-bold text-white flex items-center justify-center space-x-1.5 shadow-md shadow-violet-600/20 transition-all active:scale-[0.98]"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>保存 AI 模型配置</span>
          </button>
        </div>
      </div>

      {/* 本地数据管理与演示体验 */}
      <div className="rounded-3xl chronos-card p-4 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5 min-w-0">
            <Database className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">本地数据自治与备份</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums whitespace-nowrap shrink-0">
            共 <strong className="text-white">{activities.length}</strong> 条
          </span>
        </div>

        {/* 一键载入 35 天全景演示数据 */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/35 border border-indigo-500/25 space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>快捷体验：载入 35 天全景演示数据</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            生成过去 5 周的作息、研发、会议、社交与运动数据，一键预览周月环形图、7 天分布柱图与 AI 复盘。
          </p>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(20);
              loadFiveWeeksDemoData();
            }}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-100 border border-indigo-400/30 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>载入 35 天全景演示数据</span>
          </button>
        </div>

        {/* 备份导出与导入 */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(15);
              exportDataBackup();
            }}
            className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/[0.06] flex items-center justify-center space-x-1.5 whitespace-nowrap transition-all active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>导出 JSON 备份</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(15);
              fileInputRef.current?.click();
            }}
            className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/[0.06] flex items-center justify-center space-x-1.5 whitespace-nowrap transition-all active:scale-[0.98]"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>导入备份文件</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* 清空所有数据按钮 */}
        <div className="pt-2 border-t border-white/[0.06]">
          <button
            onClick={handleClearAll}
            disabled={activities.length === 0}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 border border-rose-500/25 flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>清空手机端所有时间记录 (纯净重置)</span>
          </button>
        </div>
      </div>

      {/* 版本信息 */}
      <div className="text-center text-[11px] text-slate-500 space-y-0.5 pt-2">
        <p className="font-medium text-slate-400">ChronosFlow 手机版 v1.0.0</p>
        <p>100% 本地存储 · 安全沙箱隔离 · 零数据上云</p>
      </div>
    </div>
  );
};
