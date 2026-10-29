import React from 'react';
import { useTimeStore } from './store/useTimeStore';
import { Header } from './components/Header';
import { CommandBar } from './components/CommandBar';
import { TimelineView } from './components/TimelineView';
import { AnalyticsView } from './components/AnalyticsView';
import { AICoachView } from './components/AICoachView';
import { SettingsView } from './components/SettingsView';

export const App: React.FC = () => {
  const { activeTab } = useTimeStore();

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-indigo-500/30">
      {/* 随叫随到的居中命令条浮窗 */}
      <CommandBar />

      {/* 顶部现代化导航 */}
      <Header />

      {/* 主视图内容区域 */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {activeTab === 'TIMELINE' && <TimelineView />}
        {activeTab === 'ANALYTICS' && <AnalyticsView />}
        {activeTab === 'DEBRIEF' && <AICoachView />}
        {activeTab === 'SETTINGS' && <SettingsView />}
      </main>

      {/* 底部轻量提示 */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-600">
        ChronosFlow · 极简时间管理 · 全局快捷键 <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">Alt + Space</kbd> 随时记录
      </footer>
    </div>
  );
};

export default App;
