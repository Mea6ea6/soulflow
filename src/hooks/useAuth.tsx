import { useState, useCallback, type ReactNode } from 'react';
import type { UserProfile } from '../types';
import { deriveKey, encryptData, decryptData, generateSalt, uint8ArrayToBase64, base64ToUint8Array } from './useEncryption';
import { AuthContext, type AuthContextValue } from './AuthContext';

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

  const value: AuthContextValue = {
    isAuthenticated,
    userProfile,
    masterKey,
    isLoading,
    register,
    login,
    logout,
    getStoredEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}