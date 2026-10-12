import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastMessage } from '../components/common/Toast';

interface ToastContextValue {
  toastMessage: ToastMessage | null;
  showToast: (text: string, type?: 'success' | 'info') => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastContext.Provider value={{ toastMessage, showToast }}>
      {children}
      <Toast message={toastMessage} />
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
