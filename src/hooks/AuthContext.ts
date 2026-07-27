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
}

export const AuthContext = createContext<AuthContextValue | null>(null);