import { db, type EncryptedRecord } from '../db/database';
import type { AppSettings } from '../types';

interface ExportPayload {
  version: 1;
  exportedAt: string;
  clients: EncryptedRecord[];
  documents: EncryptedRecord[];
  calendarEvents: EncryptedRecord[];
  appSettings: AppSettings[];
  authStorage: string | null; // содержимое localStorage.soulflow_auth как есть
}

const AUTH_STORAGE_KEY = 'soulflow_auth';

export async function exportAllData(): Promise<Blob> {
  const [clients, documents, calendarEvents, appSettings] = await Promise.all([
    db.clients.toArray(),
    db.documents.toArray(),
    db.calendarEvents.toArray(),
    db.appSettings.toArray(),
  ]);

  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    clients,
    documents,
    calendarEvents,
    appSettings,
    authStorage: localStorage.getItem(AUTH_STORAGE_KEY),
  };

  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export function downloadExport(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `soulflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importAllData(file: File): Promise<void> {
  const text = await file.text();
  let payload: ExportPayload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Файл повреждён или имеет неверный формат');
  }

  if (payload.version !== 1) {
    throw new Error('Неподдерживаемая версия файла резервной копии');
  }

  await db.transaction('rw', db.clients, db.documents, db.calendarEvents, db.appSettings, async () => {
    await db.clients.clear();
    await db.documents.clear();
    await db.calendarEvents.clear();
    await db.appSettings.clear();

    await db.clients.bulkAdd(payload.clients);
    await db.documents.bulkAdd(payload.documents);
    await db.calendarEvents.bulkAdd(payload.calendarEvents);
    await db.appSettings.bulkAdd(payload.appSettings);
  });

  if (payload.authStorage) {
    localStorage.setItem(AUTH_STORAGE_KEY, payload.authStorage);
  }
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.clients, db.documents, db.calendarEvents, db.appSettings, async () => {
    await db.clients.clear();
    await db.documents.clear();
    await db.calendarEvents.clear();
    await db.appSettings.clear();
  });
  localStorage.removeItem(AUTH_STORAGE_KEY);
}