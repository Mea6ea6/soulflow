import { createContext } from 'react';
import type { BackupFrequency } from '../utils/backupStorage';

export interface BackupContextValue {
  isSupported: boolean;
  folderName: string | null;
  frequency: BackupFrequency;
  lastBackupAt: string | null;
  isBackingUp: boolean;
  needsReauthorization: boolean;
  chooseFolder: () => Promise<void>;
  reauthorize: () => Promise<void>;
  clearFolder: () => Promise<void>;
  setFrequency: (freq: BackupFrequency) => Promise<void>;
  createBackupNow: () => Promise<void>;
}

export const BackupContext = createContext<BackupContextValue | null>(null);