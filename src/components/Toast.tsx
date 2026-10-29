import React, { useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { CheckCircle2, Sparkles, AlertCircle, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, hideToast } = useTimeStore();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      hideToast();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  const renderIcon = () => {
    switch (toast.type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'WARNING':
        return <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'SUCCESS':
        return 'border-emerald-500/40 shadow-emerald-950/40';
      case 'WARNING':
        return 'border-amber-500/40 shadow-amber-950/40';
      default:
        return 'border-indigo-500/40 shadow-indigo-950/40';
    }
  };

  return (
    <div className="fixed top-6 right-6 z-[100] max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-200">
      <div
        className={`flex items-start justify-between p-4 rounded-2xl bg-[#111827]/95 backdrop-blur-xl border ${getBorderColor()} shadow-2xl text-slate-100`}
      >
        <div className="flex items-start space-x-3">
          <div className="mt-0.5">{renderIcon()}</div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-white tracking-tight">
              {toast.title}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {toast.message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={hideToast}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition ml-2 shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
