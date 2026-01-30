import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

// Types
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration ?? 4000;
    
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]); // Max 5 toasts
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 6000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Container
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => (
  <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
    {toasts.map((toast) => (
      <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
    ))}
  </div>
);

// Toast Item
const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const icons = {
    success: <CheckCircle size={16} className="text-green-500" />,
    error: <XCircle size={16} className="text-red-500" />,
    warning: <AlertTriangle size={16} className="text-yellow-500" />,
    info: <Info size={16} className="text-accent" />,
  };

  return (
    <div
      className={`
        pointer-events-auto bg-bg-secondary border border-border-subtle rounded-md p-3 shadow-lg
        transition-all duration-200
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">{icons[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-text-secondary mt-0.5 truncate">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onRemove}
          className="p-0.5 text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
