import { createContext } from 'react';
import type { TabId } from '../types';

export interface NavigationContextValue {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  pendingClientId: string | null;
  navigateToClient: (clientId: string) => void;
  consumePendingClientId: () => void;
  pendingCalendarDate: string | null;
  navigateToCalendarDate: (dateYMD: string) => void;
  consumePendingCalendarDate: () => void;
}

export const NavigationContext = createContext<NavigationContextValue | null>(null);