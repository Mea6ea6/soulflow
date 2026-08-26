import { createContext } from 'react';

export interface InAppNotificationPayload {
  id: string;
  title: string;
  body: string;
}

export interface InAppNotificationContextValue {
  showNotification: (payload: InAppNotificationPayload) => void;
}

export const InAppNotificationContext = createContext<InAppNotificationContextValue | null>(null);