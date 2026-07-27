import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Client, Document, CalendarEvent } from '../types';
import { encryptObject, decryptObject } from '../utils/encryption';

// ===== Клиенты =====

export function useClients(key: CryptoKey | null) {
  return useLiveQuery(async () => {
    if (!key) return [];
    const records = await db.clients.toArray();
    const decrypted = await Promise.all(
      records.map(async (record) => {
        try {
          return await decryptObject<Client>(record.encryptedData, key);
        } catch {
          return null;
        }
      })
    );
    return decrypted.filter((c): c is Client => c !== null);
  }, [key]);
}

export function useClient(id: string, key: CryptoKey | null) {
  return useLiveQuery(async () => {
    if (!key) return undefined;
    const record = await db.clients.get(id);
    if (!record) return undefined;
    try {
      return await decryptObject<Client>(record.encryptedData, key);
    } catch {
      return undefined;
    }
  }, [id, key]);
}

export async function addClient(
  client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
  key: CryptoKey
) {
  const now = new Date().toISOString();
  const fullClient: Client = {
    ...client,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  const encryptedData = await encryptObject(fullClient, key);
  await db.clients.add({ id: fullClient.id, encryptedData });
  return fullClient.id;
}

export async function updateClient(
  id: string,
  updates: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>,
  key: CryptoKey
) {
  const record = await db.clients.get(id);
  if (!record) throw new Error('Клиент не найден');

  const current = await decryptObject<Client>(record.encryptedData, key);
  const updated: Client = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const encryptedData = await encryptObject(updated, key);
  await db.clients.update(id, { encryptedData });
}

export async function deleteClient(id: string) {
  return await db.clients.delete(id);
}

// ===== Документы =====

export function useDocuments(key: CryptoKey | null) {
  return useLiveQuery(async () => {
    if (!key) return [];
    const records = await db.documents.toArray();
    const decrypted = await Promise.all(
      records.map(async (record) => {
        try {
          return await decryptObject<Document>(record.encryptedData, key);
        } catch {
          return null;
        }
      })
    );
    return decrypted.filter((d): d is Document => d !== null);
  }, [key]);
}

export function useDocument(id: string, key: CryptoKey | null) {
  return useLiveQuery(async () => {
    if (!key) return undefined;
    const record = await db.documents.get(id);
    if (!record) return undefined;
    try {
      return await decryptObject<Document>(record.encryptedData, key);
    } catch {
      return undefined;
    }
  }, [id, key]);
}

export function useClientDocuments(clientId: string, key: CryptoKey | null) {
  return useLiveQuery(async () => {
    if (!key) return [];
    const records = await db.documents.toArray();
    const decrypted = await Promise.all(
      records.map(async (record) => {
        try {
          return await decryptObject<Document>(record.encryptedData, key);
        } catch {
          return null;
        }
      })
    );
    return decrypted.filter(
      (d): d is Document => d !== null && d.clientId === clientId
    );
  }, [clientId, key]);
}

export function usePersonalDocuments(key: CryptoKey | null) {
  return useLiveQuery(async () => {
    if (!key) return [];
    const records = await db.documents.toArray();
    const decrypted = await Promise.all(
      records.map(async (record) => {
        try {
          return await decryptObject<Document>(record.encryptedData, key);
        } catch {
          return null;
        }
      })
    );
    return decrypted.filter((d): d is Document => d !== null && d.isPersonal);
  }, [key]);
}

export async function addDocument(
  doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>,
  key: CryptoKey
) {
  const now = new Date().toISOString();
  const fullDoc: Document = {
    ...doc,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  const encryptedData = await encryptObject(fullDoc, key);
  await db.documents.add({ id: fullDoc.id, encryptedData });
  return fullDoc.id;
}

export async function updateDocument(
  id: string,
  updates: Partial<Omit<Document, 'id' | 'createdAt' | 'updatedAt'>>,
  key: CryptoKey
) {
  const record = await db.documents.get(id);
  if (!record) throw new Error('Документ не найден');

  const current = await decryptObject<Document>(record.encryptedData, key);
  const updated: Document = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const encryptedData = await encryptObject(updated, key);
  await db.documents.update(id, { encryptedData });
}

export async function deleteDocument(id: string) {
  return await db.documents.delete(id);
}

// ===== События календаря =====

export function useCalendarEvents(key: CryptoKey | null) {
  return useLiveQuery(async () => {
    if (!key) return [];
    const records = await db.calendarEvents.toArray();
    const decrypted = await Promise.all(
      records.map(async (record) => {
        try {
          return await decryptObject<CalendarEvent>(record.encryptedData, key);
        } catch {
          return null;
        }
      })
    );
    return decrypted.filter((e): e is CalendarEvent => e !== null);
  }, [key]);
}

export function useCalendarEvent(id: string, key: CryptoKey | null) {
  return useLiveQuery(async () => {
    if (!key) return undefined;
    const record = await db.calendarEvents.get(id);
    if (!record) return undefined;
    try {
      return await decryptObject<CalendarEvent>(record.encryptedData, key);
    } catch {
      return undefined;
    }
  }, [id, key]);
}

export function useDayEvents(date: string, key: CryptoKey | null) {
  return useLiveQuery(async () => {
    if (!key) return [];
    const records = await db.calendarEvents.toArray();
    const decrypted = await Promise.all(
      records.map(async (record) => {
        try {
          return await decryptObject<CalendarEvent>(record.encryptedData, key);
        } catch {
          return null;
        }
      })
    );
    return decrypted.filter(
      (e): e is CalendarEvent => e !== null && e.date === date
    );
  }, [date, key]);
}

export function useClientEvents(clientId: string, key: CryptoKey | null) {
  return useLiveQuery(async () => {
    if (!key) return [];
    const records = await db.calendarEvents.toArray();
    const decrypted = await Promise.all(
      records.map(async (record) => {
        try {
          return await decryptObject<CalendarEvent>(record.encryptedData, key);
        } catch {
          return null;
        }
      })
    );
    return decrypted.filter(
      (e): e is CalendarEvent => e !== null && e.clientId === clientId
    );
  }, [clientId, key]);
}

export async function addCalendarEvent(
  event: Omit<CalendarEvent, 'id' | 'createdAt'>,
  key: CryptoKey
) {
  const fullEvent: CalendarEvent = {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const encryptedData = await encryptObject(fullEvent, key);
  await db.calendarEvents.add({ id: fullEvent.id, encryptedData });
  return fullEvent.id;
}

export async function updateCalendarEvent(
  id: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>,
  key: CryptoKey
) {
  const record = await db.calendarEvents.get(id);
  if (!record) throw new Error('Событие не найдено');

  const current = await decryptObject<CalendarEvent>(record.encryptedData, key);
  const updated: CalendarEvent = { ...current, ...updates };

  const encryptedData = await encryptObject(updated, key);
  await db.calendarEvents.update(id, { encryptedData });
}

export async function deleteCalendarEvent(id: string) {
  return await db.calendarEvents.delete(id);
}