import { createContext } from 'react';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncContextValue {
  isConnected: boolean;
  status: SyncStatus;
  lastSyncAt: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  syncNow: () => Promise<void>;
}

export const SyncContext = createContext<SyncContextValue | null>(null);