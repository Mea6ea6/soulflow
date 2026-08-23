import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuthHook';
import { ThemeContext } from './ThemeContextDef';
import type { ThemeId } from '../types';

const DEFAULT_THEME: ThemeId = 'dawn';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { userProfile, updateProfile } = useAuth();
  const theme = userProfile?.theme ?? DEFAULT_THEME;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeId) => {
    updateProfile({ theme: newTheme });
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}