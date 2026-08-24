import { useContext } from 'react';
import { SyncContext, type SyncContextValue } from '../context/SyncContextDef';

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync должен использоваться внутри SyncProvider');
  return ctx;
}