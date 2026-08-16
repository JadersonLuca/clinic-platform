'use client';

import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastTone = 'error' | 'info' | 'success' | 'warning';

interface ToastInput {
  message: string;
  tone?: ToastTone;
}

interface Toast extends Required<ToastInput> {
  id: number;
}

interface ToastContextValue {
  showToast(input: ToastInput): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const toast: Toast = {
        id,
        message: input.message,
        tone: input.tone ?? 'info',
      };

      setToasts((current) => [...current, toast].slice(-4));
      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toastViewport" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => {
          const Icon =
            toast.tone === 'success' ? CheckCircle2
            : toast.tone === 'error' || toast.tone === 'warning' ? CircleAlert
            : Info;

          return (
            <div className={`toast toast${toast.tone}`} key={toast.id}>
              <Icon size={18} />
              <span>{toast.message}</span>
              <button aria-label="Fechar aviso" onClick={() => dismissToast(toast.id)} type="button">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
}
