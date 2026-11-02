import React from 'react';
import { CheckCircle2, Info, AlertTriangle, AlertCircle } from 'lucide-react';

export interface ToastMessage {
  text: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

interface ToastProps {
  message: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  const renderIcon = () => {
    switch (message.type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'info':
        return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'success':
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white rounded-lg shadow-lg border border-slate-800 animate-in fade-in slide-in-from-bottom-5 duration-200 text-xs"
    >
      {renderIcon()}
      <span>{message.text}</span>
    </div>
  );
};
