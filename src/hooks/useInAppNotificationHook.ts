import { useContext } from 'react';
import { InAppNotificationContext, type InAppNotificationContextValue } from '../context/InAppNotificationContextDef';

export function useInAppNotification(): InAppNotificationContextValue {
  const ctx = useContext(InAppNotificationContext);
  if (!ctx) throw new Error('useInAppNotification должен использоваться внутри InAppNotificationProvider');
  return ctx;
}