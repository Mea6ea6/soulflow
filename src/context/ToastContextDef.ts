import { createContext } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
export type { ToastType };