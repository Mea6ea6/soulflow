import { useState, useCallback, type ReactNode } from 'react';
import { CheckCircleIcon, XCircleIcon, WarningIcon, InfoIcon, XIcon } from '@phosphor-icons/react';
import { ToastContext, type ToastType } from '../context/ToastContextDef';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

const COLORS: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 bg-surface border border-border rounded-lg shadow-card-hover px-4 py-3 animate-toast-in"
            >
              <Icon size={20} className={`shrink-0 mt-0.5 ${COLORS[toast.type]}`} weight="fill" />
              <p className="text-sm text-text-primary flex-1">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-text-tertiary hover:text-text-secondary"
              >
                <XIcon size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}