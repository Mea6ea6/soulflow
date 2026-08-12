const DB_NAME = 'soulflow_backup';
const STORE_NAME = 'config';
const RECORD_ID = 'main';

export type BackupFrequency = 'off' | 'daily' | 'weekly';

export interface BackupConfig {
  folderHandle: FileSystemDirectoryHandle | null;
  frequency: BackupFrequency;
  lastBackupAt: string | null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function readBackupConfig(): Promise<BackupConfig> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(RECORD_ID);
    req.onsuccess = () => resolve(req.result ?? { folderHandle: null, frequency: 'off', lastBackupAt: null });
    req.onerror = () => reject(req.error);
  });
}

export async function writeBackupConfig(config: BackupConfig): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(config, RECORD_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}