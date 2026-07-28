import { createContext } from 'react';
import type { UserProfile } from '../types';

export interface AuthContextValue {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  masterKey: CryptoKey | null;
  isLoading: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  getStoredEmail: () => string | null;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'description' | 'avatar'>>) => Promise<void>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);