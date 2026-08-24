import { useState, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { SyncContext, type SyncStatus } from './SyncContextDef';
import { getAccessToken, clearCachedToken, findSyncFile, downloadSyncFile, uploadSyncFile } from '../utils/googleDriveSync';
import { exportAllData, importAllData } from '../utils/exportImport';

interface StoredSyncState {
  driveFileId: string | null;
  lastSyncAt: string | null;
}

function storageKey(email: string) {
  return `soulflow_gdrive_sync_${email}`;
}

function readSyncState(email: string): StoredSyncState {
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (raw) return JSON.parse(raw);
  } catch {
    /* игнорируем повреждённые данные */
  }
  return { driveFileId: null, lastSyncAt: null };
}

function writeSyncState(email: string, state: StoredSyncState) {
  localStorage.setItem(storageKey(email), JSON.stringify(state));
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [status, setStatus] = useState<SyncStatus>('idle');
  // Инкрементируется после каждой успешной синхронизации/отключения, чтобы
  // форсировать перечитывание localStorage — сам localStorage не реактивен
  const [syncStateVersion, setSyncStateVersion] = useState(0);

  // Вычисляется прямо при рендере из userProfile + localStorage — это
  // производное состояние, а не эффект: userProfile уже доступен синхронно,
  // никакой внешней системы для "синхронизации" здесь нет
  const currentSyncState = userProfile ? readSyncState(userProfile.email) : { driveFileId: null, lastSyncAt: null };
  void syncStateVersion;
  const isConnected = !!currentSyncState.driveFileId;
  const lastSyncAt = currentSyncState.lastSyncAt;

  const runSync = useCallback(async (forceConsent: boolean) => {
    if (!userProfile) return;
    setStatus('syncing');
    try {
      const accessToken = await getAccessToken(forceConsent);
      const state = readSyncState(userProfile.email);
      const remote = await findSyncFile(accessToken);

      if (!remote) {
        const blob = await exportAllData();
        const uploaded = await uploadSyncFile(accessToken, blob, null);
        writeSyncState(userProfile.email, { driveFileId: uploaded.id, lastSyncAt: uploaded.modifiedTime });
      } else if (state.lastSyncAt && new Date(remote.modifiedTime).getTime() > new Date(state.lastSyncAt).getTime()) {
        const blob = await downloadSyncFile(accessToken, remote.id);
        const file = new File([blob], 'soulflow-sync.json', { type: 'application/json' });
        await importAllData(file);
        writeSyncState(userProfile.email, { driveFileId: remote.id, lastSyncAt: remote.modifiedTime });
        showToast('success', t('settings.syncPulledToast'));
      } else {
        const blob = await exportAllData();
        const uploaded = await uploadSyncFile(accessToken, blob, remote.id);
        writeSyncState(userProfile.email, { driveFileId: uploaded.id, lastSyncAt: uploaded.modifiedTime });
      }

      setSyncStateVersion((v) => v + 1);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      throw err;
    }
  }, [userProfile, showToast, t]);

  const connect = useCallback(async () => {
    try {
      await runSync(true);
      showToast('success', t('settings.syncConnectedToast'));
    } catch {
      showToast('error', t('settings.syncFailedToast'));
    }
  }, [runSync, showToast, t]);

  const syncNow = useCallback(async () => {
    try {
      await runSync(false);
      showToast('success', t('settings.syncDoneToast'));
    } catch {
      showToast('error', t('settings.syncFailedToast'));
    }
  }, [runSync, showToast, t]);

  const disconnect = useCallback(() => {
    if (!userProfile) return;
    clearCachedToken();
    localStorage.removeItem(storageKey(userProfile.email));
    setSyncStateVersion((v) => v + 1);
  }, [userProfile]);

  return (
    <SyncContext.Provider value={{ isConnected, status, lastSyncAt, connect, disconnect, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}