import { createContext } from 'react';
import type { UserProfile } from '../types';

export interface StoredAccountSummary {
  email: string;
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  masterKey: CryptoKey | null;
  isLoading: boolean;
  accounts: StoredAccountSummary[];
  lastActiveEmail: string | null;
  backupCodesGeneratedAt: string | null;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  removeAccount: (email: string) => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'firstName' | 'lastName' | 'description' | 'avatar' >>) => Promise<void>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  generateBackupCodes: () => Promise<string[] | null>;
  verifyBackupCode: (email: string, code: string) => Promise<CryptoKey | null>;
  completeBackupRecovery: (email: string, dataKey: CryptoKey, newPassword: string) => Promise<string[] | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);