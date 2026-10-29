import React, { useState } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { Key, Globe, Cpu, Check, ShieldCheck, Coins, Database, Trash2, Sparkles } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    activities,
    clearAllActivities,
    loadFiveWeeksDemoData,
  } = useTimeStore();
  const [baseUrl, setBaseUrl] = useState(settings.apiBaseUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [fastModel, setFastModel] = useState(settings.fastModel);
  const [deepModel, setDeepModel] = useState(settings.deepModel);
  const [smartGap, setSmartGap] = useState(settings.enableSmartGapAlert);
  const [enableAIQuickParse, setEnableAIQuickParse] = useState(settings.enableAIQuickParse);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      apiBaseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      fastModel: fastModel.trim(),
      deepModel: deepModel.trim(),
      enableSmartGapAlert: smartGap,
      enableAIQuickParse,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white">系统设置与 AI 配置</h2>
        <p className="text-xs text-slate-400">
          支持任何兼容 OpenAI 协议的模型接口（如 DeepSeek、OpenAI、Claude、Ollama 本地服务）。
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* API 接入设置 */}
        <div className="p-5 rounded-2xl bg-[#131b2e]/60 border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase text-indigo-400">
            <Globe className="w-4 h-4" />
            <span>API 服务端点与密钥</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              API Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com/v1"
              className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <p className="text-[11px] text-slate-500">
              本地 Ollama 可填：<code>http://localhost:11434/v1</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              API Key (本地加密存储，100% 隐私)
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
            <p className="text-[11px] text-slate-500">
              若留空，应用将自动启用内置的<b>智能规则离线引擎</b>，无需任何联网与费用。
            </p>
          </div>
        </div>

        {/* 模型选型 */}
        <div className="p-5 rounded-2xl bg-[#131b2e]/60 border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase text-purple-400">
            <Cpu className="w-4 h-4" />
            <span>分级双擎模型配置</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                快速解析模型 (Fast LLM)
              </label>
              <input
                type="text"
                value={fastModel}
                onChange={(e) => setFastModel(e.target.value)}
                placeholder="deepseek-chat"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              <p className="text-[11px] text-slate-500">用于随手记毫秒级结构化提取</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                深度复盘模型 (Reasoning LLM)
              </label>
              <input
                type="text"
                value={deepModel}
                onChange={(e) => setDeepModel(e.target.value)}
                placeholder="deepseek-reasoner"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              <p className="text-[11px] text-slate-500">用于全天时间精力与认知复盘</p>
            </div>
          </div>
        </div>

        {/* Token 消耗控制与交互体验 */}
        <div className="p-5 rounded-2xl bg-[#131b2e]/60 border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase text-emerald-400">
            <Coins className="w-4 h-4" />
            <span>Token 成本与消耗控制</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">随手记优先使用本地零消耗规则</div>
              <p className="text-xs text-slate-400">
                开启后，每次快捷键输入任务纯本地正则毫秒级解析，0 Token 消耗；仅每日复盘时手动调用大模型。
              </p>
            </div>
            <input
              type="checkbox"
              checked={!enableAIQuickParse}
              onChange={(e) => setEnableAIQuickParse(!e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-white/10 border-white/20 cursor-pointer"
            />
          </div>

          <div className="border-t border-white/5 pt-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">智能空白断层感知提醒</div>
              <p className="text-xs text-slate-400">
                当检测到距离上一任务结束已超过 45 分钟无记录时，在时间流中温和提示补录。
              </p>
            </div>
            <input
              type="checkbox"
              checked={smartGap}
              onChange={(e) => setSmartGap(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-white/10 border-white/20 cursor-pointer"
            />
          </div>
        </div>

        {/* 本地数据管理 */}
        <div className="p-5 rounded-2xl bg-[#131b2e]/60 border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase text-slate-400">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>本地数据与演示管理</span>
          </div>

          {/* 快捷载入演示数据 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white flex items-center space-x-1.5">
                <span>快捷载入真实演示数据 (35 天)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-normal border border-indigo-500/20">
                  体验 / 演示推荐
                </span>
              </div>
              <p className="text-xs text-slate-400 pt-0.5">
                一键生成近 5 周（包含工作、学习、微信QQ、游戏、健身、深度心流与情绪）的真实数据，方便直接体验统计洞察与 AI 复盘。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                loadFiveWeeksDemoData();
              }}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>载入 35 天演示数据</span>
            </button>
          </div>

          {/* 清空所有数据 */}
          <div className="border-t border-white/5 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">清空所有时间流数据</div>
              <p className="text-xs text-slate-400 pt-0.5">
                当前本地已记录 {activities.length} 个时间块。清空后恢复纯净空白状态。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (activities.length === 0) return;
                clearAllActivities();
              }}
              disabled={activities.length === 0}
              className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空所有记录</span>
            </button>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center text-xs text-emerald-400 space-x-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>所有配置与时间数据保存在本地计算机，绝不上传私有服务器</span>
          </div>

          <div className="flex items-center space-x-3">
            {savedToast && (
              <span className="text-xs text-emerald-400 flex items-center">
                <Check className="w-3.5 h-3.5 mr-1" />
                已保存配置
              </span>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              保存设置
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
