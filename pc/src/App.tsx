import React from 'react';
import { useTimeStore } from './store/useTimeStore';
import { Header } from './components/Header';
import { CommandBar } from './components/CommandBar';
import { TimelineView } from './components/TimelineView';
import { AnalyticsView } from './components/AnalyticsView';
import { GoalsView } from './components/GoalsView';
import { AICoachView } from './components/AICoachView';
import { SettingsView } from './components/SettingsView';
import { Toast } from './components/Toast';
import { ManualEntryModal } from './components/ManualEntryModal';
import { getPlatformShortcutLabel } from './lib/shortcutUtils';

export const App: React.FC = () => {
  const { activeTab } = useTimeStore();
  const shortcutLabels = getPlatformShortcutLabel();

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-indigo-500/30">
      {/* 全局反馈 Toast 提示 */}
      <Toast />

      {/* 手动指定时间段精确补录弹窗 */}
      <ManualEntryModal />

      {/* 随叫随到的居中命令条浮窗 */}
      <CommandBar />

      {/* 顶部现代化导航 */}
      <Header />

      {/* 主视图内容区域 */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {activeTab === 'TIMELINE' && <TimelineView />}
        {activeTab === 'ANALYTICS' && <AnalyticsView />}
        {activeTab === 'GOALS' && <GoalsView />}
        {activeTab === 'DEBRIEF' && <AICoachView />}
        {activeTab === 'SETTINGS' && <SettingsView />}
      </main>

      {/* 底部轻量提示 */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
        <span>ChronosFlow · 极简时间感知 · 快捷键</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[11px] border border-white/5">
          {shortcutLabels.primary}
        </kbd>
        <span>或</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[11px] border border-white/5">
          {shortcutLabels.secondary}
        </kbd>
        <span>随时记录</span>
      </footer>
    </div>
  );
};

export default App;
