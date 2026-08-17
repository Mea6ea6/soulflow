// Заготовка структуры для будущей интеграции с общей серверной базой данных.
// Цель: при публикации на собственном домене хранить (email + соль +
// зашифрованный профиль) не только локально в браузере, но и на сервере —
// чтобы служба поддержки могла подтвердить существование конкретного
// аккаунта при обращении (кража доступа, потеря устройства и т.д.).
//
// Важно: сервер НИКОГДА не должен получать сам мастер-пароль или ключ,
// выведенный из него — только то же самое, что уже хранится локально
// (email в открытом виде, соль, и AES-GCM зашифрованный профиль). Это
// сохраняет модель "нулевого знания": даже с полным доступом к серверной
// базе никто не сможет расшифровать данные пользователя без пароля.
//
// Ничего из функций ниже сейчас не вызывается по-настоящему — это только
// типы и заглушки-каркас, чтобы реальное подключение позже было быстрой
// правкой (заменить тело функций на fetch к своему API), а не
// проектированием с нуля.

export interface AccountDirectoryRecord {
  email: string;
  saltBase64: string;
  encryptedProfileBlob: string;
  updatedAt: string;
}

export interface AccountDirectoryClient {
  registerAccount(record: AccountDirectoryRecord): Promise<void>;
  updateAccount(record: AccountDirectoryRecord): Promise<void>;
  accountExists(email: string): Promise<boolean>;
  deleteAccount(email: string): Promise<void>;
}

// Заглушка-реализация: ничего никуда не отправляет, только логирует
// намерение в консоль разработчика. Заменить на реальный HTTP-клиент,
// когда появится серверный API (см. TODO в useAuth.tsx).
export const accountDirectoryStub: AccountDirectoryClient = {
  async registerAccount(record) {
    console.debug('[accountDirectory stub] registerAccount', record.email);
  },
  async updateAccount(record) {
    console.debug('[accountDirectory stub] updateAccount', record.email);
  },
  async accountExists(email) {
    console.debug('[accountDirectory stub] accountExists', email);
    return false;
  },
  async deleteAccount(email) {
    console.debug('[accountDirectory stub] deleteAccount', email);
  },
};