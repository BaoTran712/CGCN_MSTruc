import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';

export interface ToastMessage {
  text: string;
  type: 'success' | 'info';
}

interface ToastProps {
  message: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white rounded-lg shadow-lg border border-slate-800 animate-in fade-in slide-in-from-bottom-5 duration-200 text-xs"
    >
      {message.type === 'info' ? (
        <Info className="w-4 h-4 text-sky-400 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      )}
      <span>{message.text}</span>
    </div>
  );
};
