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
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-1 pt-1.5 flex items-center justify-around shadow-2xl transition-all"
      style={{
        paddingBottom: 'max(var(--safe-bottom, 0px), 8px)',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => {
              triggerHapticFeedback(15);
              setCurrentTab(tab.id);
            }}
            className={`flex flex-col items-center justify-center py-0.5 px-2 rounded-xl transition-all relative ${
              isActive ? 'text-indigo-400 font-semibold' : 'text-slate-500 hover:text-slate-400 font-normal'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105 text-indigo-400' : ''}`} />
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-400 rounded-full" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
