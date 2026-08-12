import { useContext } from 'react';
import { BackupContext, type BackupContextValue } from '../context/BackupContextDef';

export function useBackup(): BackupContextValue {
  const ctx = useContext(BackupContext);
  if (!ctx) throw new Error('useBackup должен использоваться внутри BackupProvider');
  return ctx;
}