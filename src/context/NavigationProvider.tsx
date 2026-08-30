import { useState, useCallback, type ReactNode } from 'react';
import type { TabId } from '../types';
import { NavigationContext } from './NavigationContextDef';

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTabState] = useState<TabId>('home');
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [pendingCalendarDate, setPendingCalendarDate] = useState<string | null>(null);

  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
  }, []);

  const navigateToClient = useCallback((clientId: string) => {
    setPendingClientId(clientId);
    setActiveTabState('clients');
  }, []);

  const consumePendingClientId = useCallback(() => {
    setPendingClientId(null);
  }, []);

  const navigateToCalendarDate = useCallback((dateYMD: string) => {
    setPendingCalendarDate(dateYMD);
    setActiveTabState('calendar');
  }, []);

  const consumePendingCalendarDate = useCallback(() => {
    setPendingCalendarDate(null);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        activeTab, setActiveTab,
        pendingClientId, navigateToClient, consumePendingClientId,
        pendingCalendarDate, navigateToCalendarDate, consumePendingCalendarDate,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}