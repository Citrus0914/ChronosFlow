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
} from 'lucide-react';
import { requestUsagePermission, triggerHapticFeedback } from '../services/nativeBridge';

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
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState(settings.apiBaseUrl || 'https://api.openai.com/v1');
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
    addToast('INFO', next ? '已开启断层预警' : '已关闭断层预警', next ? '超过 45 分钟未打卡时将自动提示' : '时间断层提示已关闭');
  };

  const handleToggleAIQuickParse = () => {
    triggerHapticFeedback(15);
    const next = !settings.enableAIQuickParse;
    updateSettings({ enableAIQuickParse: next });
    addToast('INFO', next ? '已开启 AI 智能解析' : '已切换至纯本地规则', next ? '随手记将优先调用大模型语义提炼' : '随手记将使用 0 毫秒离线规则解析');
  };

  const handleToggleAutoUsageSync = () => {
    triggerHapticFeedback(15);
    const next = !settings.enableAutoAppUsageSync;
    updateSettings({ enableAutoAppUsageSync: next });
    addToast('INFO', next ? '已开启应用感知同步' : '已暂停应用感知同步', next ? '前台应用时长将自动同步' : '停止自动同步应用数据');
  };

  const handleClearAll = () => {
    triggerHapticFeedback(30);
    if (confirm('确定要清空手机端的所有时间记录吗？该操作将重置为纯净空白状态，不可撤回。')) {
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
    // 重置 input 以支持重复选择相同文件
    e.target.value = '';
  };

  return (
    <div
      className="space-y-4 pb-12"
      style={{
        paddingBottom: 'calc(3.5rem + var(--safe-bottom, 0px))',
      }}
    >
      <div className="flex items-center space-x-2 px-1">
        <Settings className="w-4 h-4 text-slate-400" />
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">系统设置与数据自治</h3>
      </div>

      {/* 原生使用时长感知权限管理 */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-md">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>安卓应用使用感知权限</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              通过 Android 系统 UsageStats 机制自动读取前台活跃时长
            </p>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              hasUsagePermission ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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
          className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center space-x-2 transition-all active:scale-98"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>前往系统设置授权「应用使用情况」</span>
        </button>

        {/* 自动感知同步开关 */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="space-y-0.5">
            <span className="text-xs text-slate-200 font-medium">应用使用时长自动感知同步</span>
            <p className="text-[11px] text-slate-500">启动与切换时自动感知前台应用</p>
          </div>
          <button
            type="button"
            onClick={handleToggleAutoUsageSync}
            className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.enableAutoAppUsageSync ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                settings.enableAutoAppUsageSync ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 智能辅助与断层感知 */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-md">
        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-amber-400" />
          <span>智能辅助与断层预警</span>
        </h4>

        {/* 空白断层预警开关 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs text-slate-200 font-medium">智能空白断层预警 (Smart Gap)</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              超过 45 分钟未打卡且无活跃任务时，在时间流顶部提示空白并支持一键补录
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleGapAlert}
            className={`w-10 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              settings.enableSmartGapAlert ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                settings.enableSmartGapAlert ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 随手记优先 AI 还是本地规则 */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs text-slate-200 font-medium">随手记优先使用 AI 大模型解析</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              关闭时使用 0 毫秒离线心理学规则引擎；开启且配置了 Key 时调用大模型
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleAIQuickParse}
            className={`w-10 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              settings.enableAIQuickParse ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                settings.enableAIQuickParse ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* AI 大模型接口与模型名称配置 */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-md">
        <div className="flex items-center space-x-2">
          <Key className="w-4 h-4 text-violet-400" />
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">API Key</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">快速解析模型 (Fast)</label>
              <input
                type="text"
                value={fastModelInput}
                onChange={(e) => setFastModelInput(e.target.value)}
                placeholder="deepseek-chat"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">深度复盘模型 (Deep)</label>
              <input
                type="text"
                value={deepModelInput}
                onChange={(e) => setDeepModelInput(e.target.value)}
                placeholder="deepseek-reasoner"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500 font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleSaveApi}
            className="w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white flex items-center justify-center space-x-1.5 shadow-md shadow-violet-600/20 transition-all active:scale-98"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>保存 AI 模型配置</span>
          </button>
        </div>
      </div>

      {/* 本地数据管理与演示体验 */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>本地数据自治与备份</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            已记录 <strong className="text-white">{activities.length}</strong> 个时间块
          </span>
        </div>

        {/* 一键载入 35 天全景演示数据 */}
        <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>快捷体验：载入 35 天全景真实演示数据</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            生成过去 5 周的生活作息、技术研发、业务会议、微信QQ聊天、游戏娱乐、短视频与健身运动，体验周月统计看板与 AI 认知复盘。
          </p>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(20);
              loadFiveWeeksDemoData();
            }}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/30 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-98"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>载入 35 天全景演示数据</span>
          </button>
        </div>

        {/* 备份导出与导入 */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(15);
              exportDataBackup();
            }}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center justify-center space-x-1.5 transition-all active:scale-98"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>导出 JSON 备份</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(15);
              fileInputRef.current?.click();
            }}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center justify-center space-x-1.5 transition-all active:scale-98"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
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
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={handleClearAll}
            disabled={activities.length === 0}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空手机端所有时间记录 (纯净重置)</span>
          </button>
        </div>
      </div>

      {/* 版本信息 */}
      <div className="text-center text-[11px] text-slate-600 space-y-0.5 pt-2">
        <p>ChronosFlow 手机版 v1.0.0 (Android Release)</p>
        <p>100% 本地存储 · 安全沙箱隔离 · 杜绝数据上云</p>
      </div>
    </div>
  );
};
