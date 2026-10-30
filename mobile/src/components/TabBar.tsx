import React from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { Smartphone, Clock, BarChart2, Brain, Settings } from 'lucide-react';
import { triggerHapticFeedback } from '../services/nativeBridge';

export const TabBar: React.FC = () => {
  const { currentTab, setCurrentTab } = useTimeStore();

  const tabs = [
    { id: 'tracker' as const, label: '应用追踪', icon: Smartphone },
    { id: 'timeline' as const, label: '时间流', icon: Clock },
    { id: 'analytics' as const, label: '统计', icon: BarChart2 },
    { id: 'coach' as const, label: 'AI教练', icon: Brain },
    { id: 'settings' as const, label: '设置', icon: Settings },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-slate-950/90 backdrop-blur-xl border-t border-white/[0.08] px-2 pt-1.5 flex items-center justify-between shadow-[0_-8px_30px_-8px_rgba(0,0,0,0.75)]"
      style={{
        paddingBottom: 'max(var(--safe-bottom, 0px), 8px)',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          currentTab === tab.id || (tab.id === 'analytics' && currentTab === 'goals');

        return (
          <button
            key={tab.id}
            onClick={() => {
              triggerHapticFeedback(15);
              setCurrentTab(tab.id);
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all relative min-w-0 active:scale-95 ${
              isActive
                ? 'text-indigo-300 font-bold'
                : 'text-slate-500 hover:text-slate-300 font-medium'
            }`}
          >
            {/* 激活态胶囊底座，彻底消除圆点与图标底边重叠问题 */}
            <div
              className={`px-3.5 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                isActive
                  ? 'bg-indigo-500/18 text-indigo-300 ring-1 ring-indigo-400/30 shadow-sm shadow-indigo-500/20'
                  : 'bg-transparent'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] transition-transform duration-200 ${
                  isActive ? 'scale-105 stroke-[2.3]' : 'stroke-[1.9]'
                }`}
              />
            </div>
            <span className="text-[10px] leading-none mt-1 tracking-tight whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
