import { useState, useCallback, type ReactNode } from 'react';
import type { UserProfile } from '../types';
import { deriveKey, encryptData, decryptData, generateSalt, uint8ArrayToBase64, base64ToUint8Array } from './useEncryption';
import { AuthContext, type AuthContextValue } from './AuthContext';
import { reencryptAllRecords } from '../utils/reencrypt';

interface StoredAuthData {
  email: string;
  salt: string;
  encryptedProfile: string;
}

const AUTH_STORAGE_KEY = 'soulflow_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [isLoading] = useState(false);

  const getStoredEmail = useCallback((): string | null => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed: StoredAuthData = JSON.parse(raw);
      return parsed.email;
    } catch {
      return null;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const salt = generateSalt();
    const key = await deriveKey(password, salt);

    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: crypto.randomUUID(),
      name: 'Психолог',
      email,
      avatar: null,
      description: '',
      statusText: null,
      presence: 'available',
      createdAt: now,
      updatedAt: now,
    };

    const encryptedProfile = await encryptData(JSON.stringify(profile), key);

    const stored: StoredAuthData = {
      email,
      salt: uint8ArrayToBase64(salt),
      encryptedProfile,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));

    setMasterKey(key);
    setUserProfile(profile);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;

    let stored: StoredAuthData;
    try {
      stored = JSON.parse(raw);
    } catch {
      return false;
    }

    try {
      const salt = base64ToUint8Array(stored.salt);
      const key = await deriveKey(password, salt);
      const decryptedProfileJson = await decryptData(stored.encryptedProfile, key);
      const profile: UserProfile = JSON.parse(decryptedProfileJson);

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

  const persistProfile = useCallback(async (profile: UserProfile, key: CryptoKey) => {
    const encryptedProfile = await encryptData(JSON.stringify(profile), key);
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) throw new Error('Нет данных авторизации');
    const stored: StoredAuthData = JSON.parse(raw);
    stored.encryptedProfile = encryptedProfile;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Pick<UserProfile, 'name' | 'description' | 'avatar' | 'statusText' | 'presence'>>) => {
      if (!masterKey || !userProfile) return;
      const updated: UserProfile = { ...userProfile, ...updates, updatedAt: new Date().toISOString() };
      await persistProfile(updated, masterKey);
      setUserProfile(updated);
    },
    [masterKey, userProfile, persistProfile]
  );

  const changeEmail = useCallback(
    async (newEmail: string, currentPassword: string): Promise<boolean> => {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw || !userProfile) return false;

      const stored: StoredAuthData = JSON.parse(raw);
      try {
        // проверяем текущий пароль заново — на случай если ключ в памяти устарел
        const salt = base64ToUint8Array(stored.salt);
        const key = await deriveKey(currentPassword, salt);
        await decryptData(stored.encryptedProfile, key); // бросит исключение, если пароль неверный

        const updated: UserProfile = { ...userProfile, email: newEmail, updatedAt: new Date().toISOString() };
        const encryptedProfile = await encryptData(JSON.stringify(updated), key);

        const newStored: StoredAuthData = { email: newEmail, salt: stored.salt, encryptedProfile };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newStored));

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
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw || !userProfile) return false;

      const stored: StoredAuthData = JSON.parse(raw);
      try {
        const oldSalt = base64ToUint8Array(stored.salt);
        const oldKey = await deriveKey(oldPassword, oldSalt);
        await decryptData(stored.encryptedProfile, oldKey); // проверка старого пароля

        // Генерируем новую соль и новый ключ
        const newSalt = generateSalt();
        const newKey = await deriveKey(newPassword, newSalt);

        // Перешифровываем профиль
        const updatedProfile: UserProfile = { ...userProfile, updatedAt: new Date().toISOString() };
        const encryptedProfile = await encryptData(JSON.stringify(updatedProfile), newKey);

        // Перешифровываем ВСЕ записи в IndexedDB старым ключом → новым
        await reencryptAllRecords(oldKey, newKey);

        const newStored: StoredAuthData = {
          email: stored.email,
          salt: uint8ArrayToBase64(newSalt),
          encryptedProfile,
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newStored));

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
    isAuthenticated,
    userProfile,
    masterKey,
    isLoading,
    register,
    login,
    logout,
    getStoredEmail,
    updateProfile,
    changeEmail,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}