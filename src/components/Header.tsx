import React from 'react';
import { useTimeStore, type ViewTab } from '../store/useTimeStore';
import { Clock, BarChart3, Sparkles, Settings, Plus, CalendarPlus, Target } from 'lucide-react';

export const Header: React.FC = () => {
  const { activeTab, setActiveTab, setCommandBarOpen, setManualModalOpen, activeActivity } = useTimeStore();

  const tabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'TIMELINE', label: '时间流', icon: <Clock className="w-4 h-4" /> },
    { id: 'ANALYTICS', label: '统计洞察', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'GOALS', label: '目标与预算', icon: <Target className="w-4 h-4" /> },
    { id: 'DEBRIEF', label: 'AI 教练复盘', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'SETTINGS', label: '设置', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0b0f17]/80 backdrop-blur-md px-6 py-3.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Logo 与活跃状态 */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-black text-lg">
            ⏳
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-base tracking-tight">
                ChronosFlow
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20">
                时流
              </span>
            </div>
            {activeActivity ? (
              <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>专注中：{activeActivity.title}</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500">PC 极简时间感知与 AI 复盘</span>
            )}
          </div>
        </div>

        {/* 中间 Tab 切换 */}
        <nav className="flex items-center p-1 rounded-xl bg-white/5 border border-white/5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 唤起快捷操作 */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setManualModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium transition cursor-pointer hover:border-indigo-500/40"
            title="补齐过去的记录或指定时间段记录"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">补齐过去/记录</span>
          </button>

          <button
            type="button"
            onClick={() => setCommandBarOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 text-xs font-medium transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>随手记</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded text-slate-100">
              Alt + Space
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
};
