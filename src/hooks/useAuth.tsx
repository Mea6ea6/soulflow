import { useState, useCallback, type ReactNode } from 'react';
import type { UserProfile } from '../types';
import { deriveKey, encryptData, decryptData, generateSalt, uint8ArrayToBase64, base64ToUint8Array } from './useEncryption';
import { AuthContext, type AuthContextValue, type StoredAccountSummary } from './AuthContext';
import { reencryptAllRecords } from '../utils/reencrypt';

interface StoredAuthData {
  email: string;
  salt: string;
  encryptedProfile: string;
}

const ACCOUNTS_STORAGE_KEY = 'soulflow_accounts';
const ACTIVE_ACCOUNT_STORAGE_KEY = 'soulflow_active_account';
const LEGACY_AUTH_STORAGE_KEY = 'soulflow_auth';

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

  // Миграция со старой однопользовательской схемы хранения
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
  // Инкрементируется после любой мутации списка аккаунтов, чтобы форсировать
  // перечитывание localStorage и ререндер компонентов, читающих `accounts`
  const [accountsVersion, setAccountsVersion] = useState(0);

  const accounts: StoredAccountSummary[] = readAccounts().map((a) => ({ email: a.email }));
  void accountsVersion;
  const lastActiveEmail = localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);

  const register = useCallback(async (email: string, password: string) => {
    const existing = readAccounts();
    if (existing.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('ACCOUNT_EXISTS');
    }

    const salt = generateSalt();
    const key = await deriveKey(password, salt);

    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: crypto.randomUUID(),
      name: 'Психолог',
      email,
      avatar: null,
      description: '',
      createdAt: now,
      updatedAt: now,
    };

    const encryptedProfile = await encryptData(JSON.stringify(profile), key);
    const stored: StoredAuthData = { email, salt: uint8ArrayToBase64(salt), encryptedProfile };

    writeAccounts([...existing, stored]);
    localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, email);
    setAccountsVersion((v) => v + 1);

    setMasterKey(key);
    setUserProfile(profile);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const existing = readAccounts();
    const stored = existing.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (!stored) return false;

    try {
      const salt = base64ToUint8Array(stored.salt);
      const key = await deriveKey(password, salt);
      const decryptedProfileJson = await decryptData(stored.encryptedProfile, key);
      const profile: UserProfile = JSON.parse(decryptedProfileJson);

      localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, stored.email);
      setMasterKey(key);
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
    async (updates: Partial<Pick<UserProfile, 'name' | 'description' | 'avatar'>>) => {
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
        return false; // email уже занят другим локальным аккаунтом
      }

      const stored = existing[idx];
      try {
        const salt = base64ToUint8Array(stored.salt);
        const key = await deriveKey(currentPassword, salt);
        await decryptData(stored.encryptedProfile, key);

        const updated: UserProfile = { ...userProfile, email: newEmail, updatedAt: new Date().toISOString() };
        const encryptedProfile = await encryptData(JSON.stringify(updated), key);

        existing[idx] = { email: newEmail, salt: stored.salt, encryptedProfile };
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
        const oldKey = await deriveKey(oldPassword, oldSalt);
        await decryptData(stored.encryptedProfile, oldKey);

        const newSalt = generateSalt();
        const newKey = await deriveKey(newPassword, newSalt);

        const updatedProfile: UserProfile = { ...userProfile, updatedAt: new Date().toISOString() };
        const encryptedProfile = await encryptData(JSON.stringify(updatedProfile), newKey);

        await reencryptAllRecords(oldKey, newKey);

        existing[idx] = { email: stored.email, salt: uint8ArrayToBase64(newSalt), encryptedProfile };
        writeAccounts(existing);

        setMasterKey(newKey);
        setUserProfile(updatedProfile);
        return true;
      } catch {
        return false;
      }
    },
    [userProfile]
  );

  const value: AuthContextValue = {
    isAuthenticated, userProfile, masterKey, isLoading, accounts, lastActiveEmail,
    register, login, logout, removeAccount, updateProfile, changeEmail, changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}