import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { BackupContext } from './BackupContextDef';
import { readBackupConfig, writeBackupConfig, type BackupConfig, type BackupFrequency } from '../utils/backupStorage';
import { exportAllData } from '../utils/exportImport';
import { useToast } from '../hooks/useToastHook';
import { useTranslation } from 'react-i18next';

const CHECK_INTERVAL_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function backupFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `soulflow-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}

export function BackupProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [frequency, setFrequencyState] = useState<BackupFrequency>('off');
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [needsReauthorization, setNeedsReauthorization] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isSupported) return;
    readBackupConfig().then(async (config) => {
      setFrequencyState(config.frequency);
      setLastBackupAt(config.lastBackupAt);
      if (config.folderHandle) {
        setFolderHandle(config.folderHandle);
        setFolderName(config.folderHandle.name);
        try {
          const perm = await config.folderHandle.queryPermission({ mode: 'readwrite' });
          setNeedsReauthorization(perm !== 'granted');
        } catch {
          setNeedsReauthorization(true);
        }
      }
    });
  }, [isSupported]);

  const persist = useCallback(async (partial: Partial<BackupConfig>) => {
    const current = await readBackupConfig();
    await writeBackupConfig({ ...current, ...partial });
  }, []);

  const createBackupNow = useCallback(async (silent = false) => {
    if (!folderHandle) return;
    setIsBackingUp(true);
    try {
      const perm = await folderHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        setNeedsReauthorization(true);
        if (!silent) showToast('error', t('settings.backupPermissionDenied'));
        return;
      }
      setNeedsReauthorization(false);

      const blob = await exportAllData();
      const fileHandle = await folderHandle.getFileHandle(backupFilename(), { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      const now = new Date().toISOString();
      setLastBackupAt(now);
      await persist({ lastBackupAt: now });
      if (!silent) showToast('success', t('settings.backupCreated'));
    } catch {
      if (!silent) showToast('error', t('settings.backupFailed'));
    } finally {
      setIsBackingUp(false);
    }
  }, [folderHandle, persist, showToast, t]);

  const chooseFolder = useCallback(async () => {
    if (!isSupported) return;
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setFolderHandle(handle);
      setFolderName(handle.name);
      setNeedsReauthorization(false);
      await persist({ folderHandle: handle });
    } catch {
      /* пользователь закрыл системный диалог выбора папки — ничего не делаем */
    }
  }, [isSupported, persist]);

  const reauthorize = useCallback(async () => {
    if (!folderHandle) return;
    const perm = await folderHandle.requestPermission({ mode: 'readwrite' });
    setNeedsReauthorization(perm !== 'granted');
  }, [folderHandle]);

  const clearFolder = useCallback(async () => {
    setFolderHandle(null);
    setFolderName(null);
    setNeedsReauthorization(false);
    await persist({ folderHandle: null });
  }, [persist]);

  const setFrequency = useCallback(async (freq: BackupFrequency) => {
    setFrequencyState(freq);
    await persist({ frequency: freq });
  }, [persist]);

  useEffect(() => {
    if (!isSupported) return;
    intervalRef.current = setInterval(() => {
      if (frequency === 'off' || !folderHandle || needsReauthorization) return;
      const intervalMs = frequency === 'daily' ? DAY_MS : WEEK_MS;
      const last = lastBackupAt ? new Date(lastBackupAt).getTime() : 0;
      if (Date.now() - last >= intervalMs) {
        createBackupNow(true); // тихий автоматический бэкап, без тоста
      }
    }, CHECK_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isSupported, frequency, folderHandle, needsReauthorization, lastBackupAt, createBackupNow]);

  return (
    <BackupContext.Provider
      value={{
        isSupported, folderName, frequency, lastBackupAt, isBackingUp, needsReauthorization,
        chooseFolder, reauthorize, clearFolder, setFrequency,
        createBackupNow: () => createBackupNow(false),
      }}
    >
      {children}
    </BackupContext.Provider>
  );
}