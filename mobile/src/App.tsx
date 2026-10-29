import React from 'react';
import { useTimeStore } from './store/useTimeStore';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { AppUsageTracker } from './components/AppUsageTracker';
import { MobileTimeline } from './components/MobileTimeline';
import { MobileAICoach } from './components/MobileAICoach';
import { MobileSettings } from './components/MobileSettings';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const App: React.FC = () => {
  const { currentTab, toasts } = useTimeStore();

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 max-w-md mx-auto relative select-none shadow-2xl">
      {/* 沉浸式顶栏 */}
      <Header />

      {/* 页面主视图 */}
      <main className="flex-1 p-4 overflow-y-auto no-scrollbar">
        {currentTab === 'tracker' && <AppUsageTracker />}
        {currentTab === 'timeline' && <MobileTimeline />}
        {currentTab === 'coach' && <MobileAICoach />}
        {currentTab === 'settings' && <MobileSettings />}
      </main>

      {/* 底部导航 */}
      <TabBar />

      {/* Toast 消息提示 */}
      <div className="fixed top-16 left-4 right-4 z-50 pointer-events-none space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-xl bg-slate-900/95 border border-slate-700 p-3 shadow-2xl flex items-start space-x-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {toast.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'WARNING' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
            {toast.type === 'INFO' && <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">{toast.title}</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{toast.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
