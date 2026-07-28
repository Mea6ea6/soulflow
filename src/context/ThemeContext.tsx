import { useEffect, type ReactNode } from 'react';
import { useAppSettings, updateAppSettings } from '../hooks/useDB';
import { ThemeContext } from './ThemeContextDef';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const appSettings = useAppSettings();
  const theme = appSettings?.theme ?? 'dawn';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: typeof theme) => {
    updateAppSettings({ theme: newTheme });
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}