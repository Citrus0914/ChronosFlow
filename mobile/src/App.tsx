import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTimeStore } from './store/useTimeStore';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { AppUsageTracker } from './components/AppUsageTracker';
import { MobileTimeline } from './components/MobileTimeline';
import { MobileAnalytics } from './components/MobileAnalytics';
import { MobileGoals } from './components/MobileGoals';
import { MobileManualModal } from './components/MobileManualModal';
import { MobileAICoach } from './components/MobileAICoach';
import { MobileSettings } from './components/MobileSettings';
import { CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold">界面加载遇到轻微异常</h2>
          <p className="text-xs text-slate-400 max-w-xs">{this.state.error?.message || '未知错误'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>重新加载</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AppContent: React.FC = () => {
  const { currentTab, toasts } = useTimeStore();

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 max-w-md mx-auto relative select-none shadow-2xl">
      {/* 沉浸式顶栏 */}
      <Header />

      {/* 页面主视图 */}
      <main 
        className="flex-1 px-4 overflow-y-auto no-scrollbar"
        style={{
          paddingTop: '0.75rem',
          paddingBottom: 'calc(3.8rem + var(--safe-bottom, 0px))',
        }}
      >
        {currentTab === 'tracker' && <AppUsageTracker />}
        {currentTab === 'timeline' && <MobileTimeline />}
        {currentTab === 'analytics' && <MobileAnalytics />}
        {currentTab === 'goals' && <MobileGoals />}
        {currentTab === 'coach' && <MobileAICoach />}
        {currentTab === 'settings' && <MobileSettings />}
      </main>

      {/* 底部导航 */}
      <TabBar />

      {/* 手动补录与编辑弹窗 */}
      <MobileManualModal />

      {/* Toast 消息提示 */}
      <div 
        className="fixed left-4 right-4 z-50 pointer-events-none space-y-2 transition-all"
        style={{
          top: 'calc(4.5rem + var(--safe-top, 0px))',
        }}
      >
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

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
