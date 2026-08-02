export type TabId = 'home' | 'calendar' | 'clients' | 'documents' | 'profile' | 'settings';

export interface NavItem {
  id: TabId;
  label: string;
}

// ===== Модели данных =====

export type ClientStatus = 'active' | 'archived';

export interface Client {
  id: string;                  // UUID
  name: string;                // ФИО (обязательное)
  phone: string;               // Телефон
  email: string;               // Email
  workPlace: string;           // Место работы/учёбы (опционально)
  status: ClientStatus;        // 'active' | 'archived'
  sessions: string[];          // Список дат сеансов (ISO-строки)
  notes: string;               // Заметки (краткое описание)
  createdAt: string;           // ISO-строка
  updatedAt: string;           // ISO-строка
}

export type DocumentType = 'txt' | 'pdf' | 'docx';

export interface Document {
  id: string;
  title: string;
  type: DocumentType;              // 'txt' | 'pdf' | 'docx'
  content: string;                 // txt/редактор — JSON от TipTap; pdf/docx — извлечённый текст (для предпросмотра)
  originalFileBase64?: string;     // только для импортированных pdf/docx — оригинальный файл в base64 (для скачивания)
  clientId: string | null;
  isPersonal: boolean;
  createdAt: string;
  updatedAt: string;
  origin?: 'created' | 'imported';
}

export interface CalendarEvent {
  id: string;                  // UUID
  date: string;                // ISO-строка (YYYY-MM-DD)
  time: string;                // "HH:MM"
  clientId: string | null;     // null — если личное событие
  title: string;               // Название события (если личное)
  note: string;                // Заметка (опционально)
  isPersonal: boolean;         // true — личное событие
  createdAt: string;           // ISO-строка
}

export interface UserProfile {
  id: string;                  // UUID
  name: string;                // ФИО пользователя
  email: string;               // Почта
  avatar: string | null;       // base64 или null
  description: string;         // Описание сайта (информативная заметка)
  createdAt: string;           // ISO-строка
  updatedAt: string;           // ISO-строка
}

export type ThemeId = 'dawn' | 'dusk' | 'onyx';

export interface AppSettings {
  id: string;                  // UUID
  theme: ThemeId;     // Тема
  language: 'ru' | 'en';       // Язык
  updatedAt: string;           // ISO-строка
}