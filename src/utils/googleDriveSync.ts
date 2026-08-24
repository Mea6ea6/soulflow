import { GOOGLE_CLIENT_ID, GOOGLE_DRIVE_SCOPE } from '../config/googleAuth';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }): { requestAccessToken: (overrideConfig?: { prompt?: string }) => void };
          revoke(token: string, callback?: () => void): void;
        };
      };
    };
  }
}

let gisScriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Не удалось загрузить Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

// Токен живёт только в памяти вкладки (не sessionStorage/localStorage) —
// при закрытии вкладки/браузера пропадает, при следующей синхронизации
// Google Identity Services тихо переиспользует уже данное пользователем
// согласие (без повторного попапа), пока жива сессия самого Google в браузере
let cachedToken: CachedToken | null = null;

export async function getAccessToken(forceConsent: boolean): Promise<string> {
  if (!forceConsent && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  await loadGisScript();
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services недоступен');
  }

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Не удалось получить доступ к Google Drive'));
          return;
        }
        cachedToken = { token: response.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
        resolve(response.access_token);
      },
    });
    client.requestAccessToken({ prompt: forceConsent ? 'consent' : '' });
  });
}

export function clearCachedToken() {
  if (cachedToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(cachedToken.token, () => {});
  }
  cachedToken = null;
}

const SYNC_FILE_NAME = 'soulflow-sync.json';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

export interface DriveSyncFile {
  id: string;
  modifiedTime: string;
}

export async function findSyncFile(accessToken: string): Promise<DriveSyncFile | null> {
  const url = `${DRIVE_FILES_URL}?spaces=appDataFolder&fields=files(id,modifiedTime,name)&q=${encodeURIComponent(`name='${SYNC_FILE_NAME}'`)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Drive API: ${res.status}`);
  const data = await res.json();
  const file = data.files?.[0];
  return file ? { id: file.id, modifiedTime: file.modifiedTime } : null;
}

export async function downloadSyncFile(accessToken: string, fileId: string): Promise<Blob> {
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive API: ${res.status}`);
  return res.blob();
}

export async function uploadSyncFile(accessToken: string, blob: Blob, existingFileId: string | null): Promise<DriveSyncFile> {
  const metadata = existingFileId
    ? { name: SYNC_FILE_NAME }
    : { name: SYNC_FILE_NAME, parents: ['appDataFolder'] };

  const boundary = 'soulflow-sync-boundary';
  const fileText = await blob.text();
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${fileText}\r\n` +
    `--${boundary}--`;

  const url = existingFileId
    ? `${DRIVE_UPLOAD_URL}/${existingFileId}?uploadType=multipart&fields=id,modifiedTime`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,modifiedTime`;

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Drive API: ${res.status}`);
  const data = await res.json();
  return { id: data.id, modifiedTime: data.modifiedTime };
}