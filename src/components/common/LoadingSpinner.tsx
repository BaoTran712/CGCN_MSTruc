import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Đang tải dữ liệu hệ thống...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] gap-3 text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
      <p className="text-xs font-medium text-slate-600">{message}</p>
    </div>
  );
};
