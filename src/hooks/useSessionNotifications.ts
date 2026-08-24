import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './useAuthHook';
import { useCalendarEvents, useClients } from './useDB';
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
    /* localStorage недоступен — переживём без сохранения между перезагрузками */
  }
}

// Подключается один раз на уровне App — проверяет события с включённым
// notifyEnabled и показывает Notification за REMINDER_LEAD_MS до начала.
// Работает независимо от того, какой раздел сайта сейчас открыт, но только
// пока вкладка не закрыта. events/clients — обычные зависимости эффекта,
// без рефов: при изменении данных интервал просто пересоздаётся заново
export function useSessionNotifications() {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const events = useCalendarEvents(masterKey);
  const clients = useClients(masterKey);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const interval = setInterval(() => {
      if (Notification.permission !== 'granted') return;

      const now = Date.now();
      const todayYMD = toYMD(new Date());
      const notified = readNotified(todayYMD);

      (events ?? []).forEach((ev) => {
        if (!ev.notifyEnabled || notified.has(ev.id)) return;
                const leadMs = (ev.notifyLeadMinutes ?? 15) * 60 * 1000;
        const msUntil = eventDateTime(ev.date, ev.time).getTime() - now;
        if (msUntil <= leadMs && msUntil > 0) {
          const clientName = ev.isPersonal
            ? ev.title
            : (clients ?? []).find((c) => c.id === ev.clientId)?.name ?? t('home.clientFallback');
          try {
            new Notification(t('notifications.sessionReminderTitle'), {
              body: t('notifications.sessionReminderBody', { name: clientName, time: ev.time }),
              tag: `soulflow-event-${ev.id}`,
            });
          } catch {
            /* браузер может отклонить показ (например, режим "не беспокоить") */
          }
          markNotified(todayYMD, ev.id);
        }
      });
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [events, clients, t]);
}