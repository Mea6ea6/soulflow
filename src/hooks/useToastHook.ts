import { useContext } from 'react';
import { ToastContext, type ToastContextValue } from '../context/ToastContextDef';

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast должен использоваться внутри ToastProvider');
  return ctx;
}