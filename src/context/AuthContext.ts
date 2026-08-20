import { createContext } from 'react';
import type { UserProfile } from '../types';

export interface StoredAccountSummary {
  email: string;
}

export interface GenerateBackupCodesOptions {
  silent?: boolean;
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  masterKey: CryptoKey | null;
  isLoading: boolean;
  accounts: StoredAccountSummary[];
  lastActiveEmail: string | null;
  backupCodesGeneratedAt: string | null;
  pendingBackupCodesToShow: string[] | null;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithBackupCode: (email: string, code: string) => Promise<boolean>;
  logout: () => void;
  removeAccount: (email: string) => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'firstName' | 'lastName' | 'description' | 'avatar'>>) => Promise<void>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  // Смена пароля без старого пароля — доступна только когда masterKey уже есть
  // в сессии (пользователь уже вошёл, любым способом). См. ответ на вопрос 3
  resetPasswordWithSession: (newPassword: string) => Promise<boolean>;
  generateBackupCodes: (options?: GenerateBackupCodesOptions) => Promise<string[] | null>;
  getStoredBackupCodes: () => Promise<string[] | null>;
  dismissPendingBackupCodes: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);