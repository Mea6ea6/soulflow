import { useState, useCallback, type ReactNode } from 'react';
import type { UserProfile } from '../types';
import {
  deriveKey, encryptData, decryptData, generateSalt, uint8ArrayToBase64, base64ToUint8Array,
  generateDataKey, wrapDataKey, unwrapDataKey,
} from './useEncryption';
import { AuthContext, type AuthContextValue, type StoredAccountSummary } from '../context/AuthContext';
import { reencryptAllRecords } from '../utils/reencrypt';
import { accountDirectoryStub } from '../utils/accountDirectory';

interface StoredBackupCode {
  salt: string;
  wrappedDataKey: string;
}

interface StoredAuthData {
  email: string;
  salt: string;
  wrappedDataKey?: string;
  encryptedProfile: string;
  backupCodes?: StoredBackupCode[];
  backupCodesGeneratedAt?: string;
}

const ACCOUNTS_STORAGE_KEY = 'soulflow_accounts';
const ACTIVE_ACCOUNT_STORAGE_KEY = 'soulflow_active_account';
const LEGACY_AUTH_STORAGE_KEY = 'soulflow_auth';

const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateBackupCodeString(): string {
  const part = (len: number) =>
    Array.from(crypto.getRandomValues(new Uint8Array(len)))
      .map((b) => BACKUP_CODE_ALPHABET[b % BACKUP_CODE_ALPHABET.length])
      .join('');
  return `${part(5)}-${part(5)}`;
}

function readAccounts(): StoredAuthData[] {
  const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* повреждённые данные — попробуем миграцию ниже */
    }
  }

  const legacyRaw = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
  if (legacyRaw) {
    try {
      const legacy: StoredAuthData = JSON.parse(legacyRaw);
      const migrated = [legacy];
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(migrated));
      localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, legacy.email);
      localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
      return migrated;
    } catch {
      return [];
    }
  }

  return [];
}

function writeAccounts(accounts: StoredAuthData[]) {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [isLoading] = useState(false);
  const [accountsVersion, setAccountsVersion] = useState(0);

  const accounts: StoredAccountSummary[] = readAccounts().map((a) => ({ email: a.email }));
  void accountsVersion;
  const lastActiveEmail = localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);

  const currentAccountRecord = userProfile ? readAccounts().find((a) => a.email === userProfile.email) : null;
  const backupCodesGeneratedAt = currentAccountRecord?.backupCodesGeneratedAt || null;

  const register = useCallback(async (email: string, password: string) => {
    const existing = readAccounts();
    if (existing.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('ACCOUNT_EXISTS');
    }

    const passwordSalt = generateSalt();
    const kek = await deriveKey(password, passwordSalt);
    const dataKey = await generateDataKey();
    const wrappedDataKey = await wrapDataKey(dataKey, kek);

    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: crypto.randomUUID(),
      firstName: 'Психолог',
      lastName: '',
      name: 'Психолог',
      email,
      avatar: null,
      description: '',
      createdAt: now,
      updatedAt: now,
    };

    const encryptedProfile = await encryptData(JSON.stringify(profile), dataKey);
    const stored: StoredAuthData = {
      email,
      salt: uint8ArrayToBase64(passwordSalt),
      wrappedDataKey,
      encryptedProfile,
      backupCodes: [],
      backupCodesGeneratedAt: '',
    };

    writeAccounts([...existing, stored]);
    localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, email);
    setAccountsVersion((v) => v + 1);

    // TODO: когда появится серверный API — подключить реальный клиент вместо заглушки
    void accountDirectoryStub;

    setMasterKey(dataKey);
    setUserProfile(profile);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const existing = readAccounts();
    const stored = existing.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (!stored) return false;

    try {
      const salt = base64ToUint8Array(stored.salt);
      const kek = await deriveKey(password, salt);
      const dataKey = stored.wrappedDataKey ? await unwrapDataKey(stored.wrappedDataKey, kek) : kek;
      const decryptedProfileJson = await decryptData(stored.encryptedProfile, dataKey);
      const profile: UserProfile = JSON.parse(decryptedProfileJson);

      localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, stored.email);
      setMasterKey(dataKey);
      setUserProfile(profile);
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setMasterKey(null);
    setUserProfile(null);
    setIsAuthenticated(false);
  }, []);

  const removeAccount = useCallback((email: string) => {
    const existing = readAccounts();
    writeAccounts(existing.filter((a) => a.email.toLowerCase() !== email.toLowerCase()));
    if (localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY)?.toLowerCase() === email.toLowerCase()) {
      localStorage.removeItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    }
    setAccountsVersion((v) => v + 1);
  }, []);

  const persistProfile = useCallback(async (profile: UserProfile, key: CryptoKey) => {
    const encryptedProfile = await encryptData(JSON.stringify(profile), key);
    const existing = readAccounts();
    const idx = existing.findIndex((a) => a.email === profile.email);
    if (idx === -1) throw new Error('Аккаунт не найден в хранилище');
    existing[idx] = { ...existing[idx], encryptedProfile };
    writeAccounts(existing);
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Pick<UserProfile, 'name' | 'firstName' | 'lastName' | 'description' | 'avatar' >>) => {
      if (!masterKey || !userProfile) return;
      const updated: UserProfile = { ...userProfile, ...updates, updatedAt: new Date().toISOString() };
      await persistProfile(updated, masterKey);
      setUserProfile(updated);
    },
    [masterKey, userProfile, persistProfile]
  );

  const changeEmail = useCallback(
    async (newEmail: string, currentPassword: string): Promise<boolean> => {
      if (!userProfile) return false;
      const existing = readAccounts();
      const idx = existing.findIndex((a) => a.email === userProfile.email);
      if (idx === -1) return false;
      if (existing.some((a, i) => i !== idx && a.email.toLowerCase() === newEmail.toLowerCase())) {
        return false;
      }

      const stored = existing[idx];
      try {
        const salt = base64ToUint8Array(stored.salt);
        const kek = await deriveKey(currentPassword, salt);
        const dataKey = stored.wrappedDataKey ? await unwrapDataKey(stored.wrappedDataKey, kek) : kek;
        await decryptData(stored.encryptedProfile, dataKey);

        const updated: UserProfile = { ...userProfile, email: newEmail, updatedAt: new Date().toISOString() };
        const encryptedProfile = await encryptData(JSON.stringify(updated), dataKey);

        existing[idx] = { ...stored, email: newEmail, encryptedProfile };
        writeAccounts(existing);
        localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, newEmail);
        setAccountsVersion((v) => v + 1);

        setUserProfile(updated);
        return true;
      } catch {
        return false;
      }
    },
    [userProfile]
  );

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<boolean> => {
      if (!userProfile) return false;
      const existing = readAccounts();
      const idx = existing.findIndex((a) => a.email === userProfile.email);
      if (idx === -1) return false;

      const stored = existing[idx];
      try {
        const oldSalt = base64ToUint8Array(stored.salt);
        const oldKek = await deriveKey(oldPassword, oldSalt);

        let dataKey: CryptoKey;
        let needsMigration = false;
        if (stored.wrappedDataKey) {
          dataKey = await unwrapDataKey(stored.wrappedDataKey, oldKek);
        } else {
          await decryptData(stored.encryptedProfile, oldKek);
          dataKey = oldKek;
          needsMigration = true;
        }

        const newSalt = generateSalt();
        const newKek = await deriveKey(newPassword, newSalt);
        const now = new Date().toISOString();
        const updatedProfile: UserProfile = { ...userProfile, updatedAt: now };

        let finalDataKey = dataKey;
        let encryptedProfile: string;

        if (needsMigration) {
          finalDataKey = await generateDataKey();
          await reencryptAllRecords(dataKey, finalDataKey);
          encryptedProfile = await encryptData(JSON.stringify(updatedProfile), finalDataKey);
        } else {
          encryptedProfile = await encryptData(JSON.stringify(updatedProfile), finalDataKey);
        }

        const wrappedDataKey = await wrapDataKey(finalDataKey, newKek);

        existing[idx] = {
          ...stored,
          salt: uint8ArrayToBase64(newSalt),
          wrappedDataKey,
          encryptedProfile,
        };
        writeAccounts(existing);

        setMasterKey(finalDataKey);
        setUserProfile(updatedProfile);
        return true;
      } catch {
        return false;
      }
    },
    [userProfile]
  );

  const generateBackupCodes = useCallback(async (): Promise<string[] | null> => {
    if (!masterKey || !userProfile) return null;
    const existing = readAccounts();
    const idx = existing.findIndex((a) => a.email === userProfile.email);
    if (idx === -1) return null;
    const stored = existing[idx];

    let dataKey = masterKey;
    let updatedStored = { ...stored };

    if (!stored.wrappedDataKey) {
      const newDataKey = await generateDataKey();
      await reencryptAllRecords(masterKey, newDataKey);
      const updatedProfile: UserProfile = { ...userProfile, updatedAt: new Date().toISOString() };
      const encryptedProfile = await encryptData(JSON.stringify(updatedProfile), newDataKey);
      const wrappedDataKey = await wrapDataKey(newDataKey, masterKey);

      updatedStored = { ...stored, wrappedDataKey, encryptedProfile };
      dataKey = newDataKey;
      setMasterKey(newDataKey);
      setUserProfile(updatedProfile);
    }

    const plainCodes: string[] = [];
    const codeEntries: StoredBackupCode[] = [];
    for (let i = 0; i < 10; i++) {
      const code = generateBackupCodeString();
      plainCodes.push(code);
      const salt = generateSalt();
      const kek = await deriveKey(code, salt);
      const wrappedDataKey = await wrapDataKey(dataKey, kek);
      codeEntries.push({ salt: uint8ArrayToBase64(salt), wrappedDataKey });
    }

    const now = new Date().toISOString();
    existing[idx] = { ...updatedStored, backupCodes: codeEntries, backupCodesGeneratedAt: now };
    writeAccounts(existing);
    setAccountsVersion((v) => v + 1);

    return plainCodes;
  }, [masterKey, userProfile]);

  // Только проверяет код, ничего не меняет в хранилище и не логинит —
  // на LoginPage это отдельный шаг ПЕРЕД вводом нового пароля, чтобы
  // неверный код не пускал пользователя дальше по цепочке экранов
  const verifyBackupCode = useCallback(async (email: string, code: string): Promise<CryptoKey | null> => {
    const existing = readAccounts();
    const stored = existing.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (!stored) return null;
    const normalizedCode = code.trim().toUpperCase();

    for (const entry of stored.backupCodes ?? []) {
      try {
        const salt = base64ToUint8Array(entry.salt);
        const kek = await deriveKey(normalizedCode, salt);
        const dataKey = await unwrapDataKey(entry.wrappedDataKey, kek);
        await decryptData(stored.encryptedProfile, dataKey); // защита от случайных коллизий
        return dataKey;
      } catch {
        continue;
      }
    }
    return null;
  }, []);

  // Вызывается только после успешной verifyBackupCode. Устанавливает новый
  // пароль, аннулирует и перевыпускает все 10 кодов, но НЕ логинит сразу —
  // возвращает новые коды, чтобы вызывающий код успел их показать пользователю
  // перед обычным login(email, newPassword)
  const completeBackupRecovery = useCallback(async (email: string, dataKey: CryptoKey, newPassword: string): Promise<string[] | null> => {
    const existing = readAccounts();
    const idx = existing.findIndex((a) => a.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) return null;
    const stored = existing[idx];

    try {
      const newSalt = generateSalt();
      const newKek = await deriveKey(newPassword, newSalt);
      const newWrappedDataKey = await wrapDataKey(dataKey, newKek);

      const plainCodes: string[] = [];
      const freshEntries: StoredBackupCode[] = [];
      for (let i = 0; i < 10; i++) {
        const freshCode = generateBackupCodeString();
        plainCodes.push(freshCode);
        const freshSalt = generateSalt();
        const freshKek = await deriveKey(freshCode, freshSalt);
        const freshWrapped = await wrapDataKey(dataKey, freshKek);
        freshEntries.push({ salt: uint8ArrayToBase64(freshSalt), wrappedDataKey: freshWrapped });
      }

      const now = new Date().toISOString();
      existing[idx] = {
        ...stored,
        salt: uint8ArrayToBase64(newSalt),
        wrappedDataKey: newWrappedDataKey,
        backupCodes: freshEntries,
        backupCodesGeneratedAt: now,
      };
      writeAccounts(existing);
      setAccountsVersion((v) => v + 1);

      return plainCodes;
    } catch {
      return null;
    }
  }, []);

  const value: AuthContextValue = {
    isAuthenticated, userProfile, masterKey, isLoading, accounts, lastActiveEmail, backupCodesGeneratedAt,
    register, login, logout, removeAccount, updateProfile, changeEmail, changePassword,
    generateBackupCodes, verifyBackupCode, completeBackupRecovery,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}