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
    <div className="fixed bottom-6 right-6 z-50 animate-slideIn bg-surface-container-high/90 backdrop-blur-md border border-outline-variant/60 rounded-xl p-4 shadow-xl flex items-center gap-3 max-w-sm">
      {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-status-healthy" />}
      {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-status-warning" />}
      {toast.type === 'error' && <XCircle className="w-5 h-5 text-status-critical" />}
      <span className="text-sm font-medium text-white leading-relaxed">{toast.message}</span>
    </div>
  );
};
