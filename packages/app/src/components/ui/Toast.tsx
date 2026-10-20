import React from 'react';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export interface ToastMessage {
  message: string;
  type: 'success' | 'warning' | 'error';
}

interface ToastProps {
  toast: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 left-4 sm:left-auto z-50 animate-slideIn bg-surface-container/95 backdrop-blur-md border border-surface-container-high/80 rounded-xl p-4 shadow-xl flex items-center gap-3 max-w-sm">
      {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-status-healthy shrink-0" />}
      {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-status-warning shrink-0" />}
      {toast.type === 'error' && <XCircle className="w-5 h-5 text-status-critical shrink-0" />}
      <span className="text-sm font-medium text-on-surface leading-relaxed">{toast.message}</span>
    </div>
  );
};
