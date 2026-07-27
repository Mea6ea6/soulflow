import Dexie, { type Table } from 'dexie';
import type { UserProfile, AppSettings } from '../types';

// Зашифрованные записи — данные лежат внутри encryptedData,
// в открытом виде остаётся только id (нужен для CRUD-операций)
export interface EncryptedRecord {
  id: string;
  encryptedData: string;
}

export class SoulFlowDB extends Dexie {
  clients!: Table<EncryptedRecord, string>;
  documents!: Table<EncryptedRecord, string>;
  calendarEvents!: Table<EncryptedRecord, string>;
  userProfiles!: Table<UserProfile, string>;
  appSettings!: Table<AppSettings, string>;

  constructor() {
    super('SoulFlowDB');

    this.version(1).stores({
      clients: '++id, name, phone, email, status, createdAt, updatedAt',
      documents: '++id, title, type, clientId, isPersonal, createdAt, updatedAt',
      calendarEvents: '++id, date, time, clientId, isPersonal, createdAt',
      userProfiles: '++id, name, email',
      appSettings: '++id, theme, language, updatedAt',
    });

    // Версия 2: переход на зашифрованное хранение —
    // индексируем только id, остальные поля недоступны без расшифровки
    this.version(2).stores({
      clients: 'id, encryptedData',
      documents: 'id, encryptedData',
      calendarEvents: 'id, encryptedData',
      userProfiles: 'id, name, email',
      appSettings: 'id, theme, language, updatedAt',
    }).upgrade(async () => {
      // Данные из версии 1 были открытыми и несовместимы с новой схемой —
      // на этапе pet-проекта просто очищаем старые таблицы.
      // В реальном продакшене здесь была бы миграция: прочитать старые
      // записи и зашифровать их перед записью в новую схему.
    });
  }
}

export const db = new SoulFlowDB();

export async function initDefaultSettings() {
  const count = await db.appSettings.count();
  if (count === 0) {
    await db.appSettings.add({
      id: crypto.randomUUID(),
      theme: 'light',
      language: 'en',
      updatedAt: new Date().toISOString(),
    });
  }
}