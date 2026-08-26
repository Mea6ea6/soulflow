import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './useAuthHook';
import { useCalendarEvents, useClients } from './useDB';
import { useInAppNotification } from './useInAppNotificationHook';
import { toYMD } from '../utils/date';

const CHECK_INTERVAL_MS = 20_000;

function eventDateTime(dateYMD: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const [y, mo, d] = dateYMD.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m, 0);
}

function notifiedStorageKey(dateYMD: string) {
  return `soulflow_notified_events_${dateYMD}`;
}

function readNotified(dateYMD: string): Set<string> {
  try {
    const raw = localStorage.getItem(notifiedStorageKey(dateYMD));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markNotified(dateYMD: string, eventId: string) {
  const set = readNotified(dateYMD);
  set.add(eventId);
  try {
    localStorage.setItem(notifiedStorageKey(dateYMD), JSON.stringify([...set]));
  } catch {
    /* localStorage недоступен */
  }
}

// Вызывается при сохранении события — снимает отметку "уведомление уже
// показано" для этого id, чтобы редактирование времени/лида уже
// существующего события каждый раз честно проверялось заново
export function clearNotifiedFlag(dateYMD: string, eventId: string) {
  const set = readNotified(dateYMD);
  if (!set.has(eventId)) return;
  set.delete(eventId);
  try {
    localStorage.setItem(notifiedStorageKey(dateYMD), JSON.stringify([...set]));
  } catch {
    /* localStorage недоступен */
  }
}

export function useSessionNotifications() {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const events = useCalendarEvents(masterKey);
  const clients = useClients(masterKey);
  const { showNotification } = useInAppNotification();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const todayYMD = toYMD(new Date());
      const notified = readNotified(todayYMD);
      const hasSystemPermission = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';

      (events ?? []).forEach((ev) => {
        if (!ev.notifyEnabled || notified.has(ev.id)) return;
        const leadMs = (ev.notifyLeadMinutes ?? 15) * 60 * 1000;
        const msUntil = eventDateTime(ev.date, ev.time).getTime() - now;
        if (msUntil <= leadMs && msUntil > 0) {
          const clientName = ev.isPersonal
            ? ev.title
            : (clients ?? []).find((c) => c.id === ev.clientId)?.name ?? t('home.clientFallback');
          const title = t('notifications.sessionReminderTitle');
          const body = t('notifications.sessionReminderBody', { name: clientName, time: ev.time });

          // Показываем оба способа сразу: попап поверх сайта (виден только
          // если вкладка открыта и в фокусе) и системное уведомление ОС
          // (видно даже когда вкладка свёрнута/в фоне)
          showNotification({ id: ev.id, title, body });
          if (hasSystemPermission) {
            try {
              new Notification(title, { body, tag: `soulflow-event-${ev.id}` });
            } catch {
              /* браузер может отклонить показ, например в режиме "не беспокоить" */
            }
          }
          markNotified(todayYMD, ev.id);
        }
      });
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [events, clients, t, showNotification]);
}