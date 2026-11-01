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
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const { activeTab, setCommandBarOpen } = useTimeStore();
  const shortcutLabels = getPlatformShortcutLabel();

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-indigo-500/30 relative">
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

      {/* 右下角极简常驻悬浮录入按钮 (FAB) */}
      <button
        type="button"
        onClick={() => setCommandBarOpen(true)}
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20 backdrop-blur-md"
        title={`随手记快速命令条 (支持快捷键: ${shortcutLabels.primary} 或 ${shortcutLabels.secondary})`}
      >
        <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-semibold tracking-wide">随手记</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-black/25 rounded text-indigo-100 border border-white/10">
          {shortcutLabels.primary}
        </kbd>
      </button>

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
