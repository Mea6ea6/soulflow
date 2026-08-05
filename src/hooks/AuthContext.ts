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
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  removeAccount: (email: string) => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'description' | 'avatar' | 'statusText' | 'presence'>>) => Promise<void>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);