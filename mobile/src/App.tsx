import React, { Component, ErrorInfo, ReactNode, useEffect } from 'react';
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
import {
  checkUsagePermission,
  registerBackHandler,
  triggerHapticFeedback,
} from './services/nativeBridge';

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

  // 应用从后台恢复或跨天唤醒时，自动重检权限并刷新最新应用使用时长
  useEffect(() => {
    let lastResumeScan = 0;
    const handleAppResume = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      const now = Date.now();
      if (now - lastResumeScan < 800) return;
      lastResumeScan = now;

      const store = useTimeStore.getState();
      const granted = checkUsagePermission();
      if (granted !== store.hasUsagePermission) {
        store.refreshUsagePermission();
      } else if (granted && store.settings.enableAutoAppUsageSync !== false) {
        store.scanAppUsage(false);
      }
    };

    window.addEventListener('chronosappresume', handleAppResume);
    window.addEventListener('focus', handleAppResume);
    document.addEventListener('visibilitychange', handleAppResume);
    return () => {
      window.removeEventListener('chronosappresume', handleAppResume);
      window.removeEventListener('focus', handleAppResume);
      document.removeEventListener('visibilitychange', handleAppResume);
    };
  }, []);

  // 原生 Android 物理返回键全局层级分发
  useEffect(() => {
    return registerBackHandler(() => {
      const store = useTimeStore.getState();
      // 1. 若当前在专属目标页，返回统计看板
      if (store.currentTab === 'goals') {
        triggerHapticFeedback(15);
        store.setCurrentTab('analytics');
        return true;
      }
      // 2. 若在非时间流页面，返回时间流首页
      if (store.currentTab !== 'timeline') {
        triggerHapticFeedback(15);
        store.setCurrentTab('timeline');
        return true;
      }
      // 3. 在首页无弹窗，放行由 Android 系统最小化至后台
      return false;
    });
  }, []);

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

      {/* Toast 底部轻量胶囊提示 (显示在下方，居中浮动，极简避让遮挡) */}
      <div 
        className="fixed left-0 right-0 z-50 pointer-events-none flex flex-col items-center space-y-1.5 px-4 transition-all"
        style={{
          bottom: 'calc(4.2rem + var(--safe-bottom, 0px))',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto max-w-[90%] sm:max-w-xs rounded-full bg-slate-900/95 border border-slate-700/80 px-3.5 py-1.5 shadow-2xl flex items-center space-x-2 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {toast.type === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
            {toast.type === 'WARNING' && <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            {toast.type === 'INFO' && <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            <div className="flex items-center space-x-1.5 min-w-0 text-xs text-white truncate">
              <span className="font-bold shrink-0">{toast.title}</span>
              {toast.message && (
                <>
                  <span className="text-slate-500 text-[10px]">·</span>
                  <span className="text-slate-300 text-[11px] truncate font-normal">{toast.message}</span>
                </>
              )}
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
