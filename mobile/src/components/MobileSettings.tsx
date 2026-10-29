import React, { useState } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { Settings, Key, Shield, Smartphone, Trash2, CheckCircle2 } from 'lucide-react';
import { requestUsagePermission, triggerHapticFeedback } from '../services/nativeBridge';

export const MobileSettings: React.FC = () => {
  const { settings, updateSettings, addToast, hasUsagePermission, refreshUsagePermission } = useTimeStore();
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || '');
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState(settings.apiBaseUrl || 'https://api.openai.com/v1');

  const handleSaveApi = () => {
    triggerHapticFeedback(20);
    updateSettings({
      apiKey: apiKeyInput.trim(),
      apiBaseUrl: apiBaseUrlInput.trim(),
    });
    addToast('SUCCESS', '配置已保存', 'AI 大模型接口配置已安全保存在本地');
  };

  const handleClearAll = () => {
    if (confirm('确定要清空手机端的所有时间记录吗？该操作不可撤回。')) {
      triggerHapticFeedback(50);
      localStorage.removeItem('chronos_activities');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 px-1">
        <Settings className="w-4 h-4 text-slate-400" />
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">系统与感知设置</h3>
      </div>

      {/* 原生使用时长感知权限管理 */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>安卓应用使用情况感知</span>
            </h4>
            <p className="text-xs text-slate-400">
              通过系统 UsageStats 机制自动读取前台活跃时长
            </p>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              hasUsagePermission ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}
          >
            {hasUsagePermission ? '已授权' : '未开启'}
          </span>
        </div>

        <button
          onClick={() => {
            requestUsagePermission();
            setTimeout(() => refreshUsagePermission(), 1500);
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center space-x-2 transition-colors active:scale-98"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>前往系统设置查看或授权</span>
        </button>
      </div>

      {/* AI 大模型接口设置 */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <Key className="w-4 h-4 text-violet-400" />
          <h4 className="text-sm font-bold text-white">AI 深度复盘引擎配置</h4>
        </div>
        <p className="text-xs text-slate-400">
          若留空，时流将自动启用内置的认知心理学离线规则引擎，零网络消耗。
        </p>

        <div className="space-y-2">
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

          <button
            onClick={handleSaveApi}
            className="w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white flex items-center justify-center space-x-1.5 shadow-md shadow-violet-600/20 transition-all active:scale-98"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>保存 AI 配置</span>
          </button>
        </div>
      </div>

      {/* 数据重置与清空 */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>本地数据管理</span>
        </h4>
        <p className="text-xs text-slate-400">
          所有数据 100% 存储于手机本地，绝不上云。
        </p>

        <button
          onClick={handleClearAll}
          className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 flex items-center justify-center space-x-1.5 transition-colors active:scale-98"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>清空手机端所有时间记录</span>
        </button>
      </div>

      {/* 版本信息 */}
      <div className="text-center text-[11px] text-slate-600 space-y-1 pt-2">
        <p>ChronosFlow 手机版 v1.0.0 (Android Release)</p>
        <p>对齐 StockTwin 架构标准 · 原生沉浸容器 + 纯本地存储</p>
      </div>
    </div>
  );
};
