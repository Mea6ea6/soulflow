import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Trash2 } from 'lucide-react';
import type { CalendarEvent } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { useClients, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../hooks/useDB';
import { formatDateRu } from '../utils/date';

interface CalendarEventModalProps {
  date: string; // YYYY-MM-DD
  event: CalendarEvent | null; // null — создание, иначе — редактирование
  onClose: () => void;
}

export default function CalendarEventModal({ date, event, onClose }: CalendarEventModalProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const clients = useClients(masterKey);
  const activeClients = (clients ?? []).filter((c) => c.status === 'active');

  const [time, setTime] = useState(event?.time ?? '');
  const [isPersonal, setIsPersonal] = useState(event?.isPersonal ?? false);
  const [clientId, setClientId] = useState<string>(event?.clientId ?? '');
  const [title, setTitle] = useState(event?.title ?? '');
  const [note, setNote] = useState(event?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!time) {
      setError(t('calendar.validation.timeRequired'));
      return;
    }
    if (isPersonal && !title.trim()) {
      setError(t('calendar.validation.titleRequired'));
      return;
    }
    if (!isPersonal && !clientId) {
      setError(t('calendar.validation.clientRequired'));
      return;
    }
    if (!masterKey) {
      setError(t('common.sessionExpired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date,
        time,
        clientId: isPersonal ? null : clientId,
        title: isPersonal ? title.trim() : '',
        note,
        isPersonal,
      };

      if (event) {
        await updateCalendarEvent(event.id, payload, masterKey);
      } else {
        await addCalendarEvent(payload, masterKey);
      }
      onClose();
    } catch {
      setError(t('calendar.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!confirm(t('common.confirmDeleteEvent'))) return;
    await deleteCalendarEvent(event.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              {event ? t('calendar.editTitle') : t('calendar.newTitle')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDateRu(date)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              {t('calendar.time')} *
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={isPersonal}
              onChange={(e) => setIsPersonal(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-700"
            />
            {t('calendar.personalEvent')}
          </label>

          {isPersonal ? (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                {t('calendar.title')} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('calendar.titlePlaceholder')}
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                {t('calendar.client')} *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t('calendar.clientPlaceholder')}</option>
                {activeClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              {t('calendar.note')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {event && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                title={t('common.delete')}
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {isSubmitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}