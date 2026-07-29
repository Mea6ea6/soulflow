import { useState } from 'react';
import { TrashIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { useClients, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../hooks/useDB';
import { formatDateRu } from '../utils/date';
import ModalShell from './ModalShell';

interface CalendarEventModalProps {
  date: string;
  event: CalendarEvent | null;
  onClose: () => void;
}

export default function CalendarEventModal({ date, event, onClose }: CalendarEventModalProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const { showToast } = useToast();
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

    if (!time) { setError(t('calendar.validation.timeRequired')); return; }
    if (isPersonal && !title.trim()) { setError(t('calendar.validation.titleRequired')); return; }
    if (!isPersonal && !clientId) { setError(t('calendar.validation.clientRequired')); return; }
    if (!masterKey) { setError(t('common.sessionExpired')); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        date, time,
        clientId: isPersonal ? null : clientId,
        title: isPersonal ? title.trim() : '',
        note, isPersonal,
      };

      if (event) {
        await updateCalendarEvent(event.id, payload, masterKey);
      } else {
        await addCalendarEvent(payload, masterKey);
      }
      showToast('success', t('common.save'));
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
    showToast('success', t('common.delete'));
    onClose();
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            {event ? t('calendar.editTitle') : t('calendar.newTitle')}
          </h2>
          <p className="text-xs text-text-tertiary mt-0.5">{formatDateRu(date)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-text-secondary mb-1 block">{t('calendar.time')} *</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={isPersonal} onChange={(e) => setIsPersonal(e.target.checked)} className="rounded border-border" />
          {t('calendar.personalEvent')}
        </label>

        {isPersonal ? (
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">{t('calendar.title')} *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('calendar.titlePlaceholder')}
            />
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">{t('calendar.client')} *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('calendar.clientPlaceholder')}</option>
              {activeClients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-text-secondary mb-1 block">{t('calendar.note')}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {error && <div className="text-sm text-error bg-error/10 rounded-md px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-2">
          {event && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 rounded-md border border-error/30 text-error hover:bg-error/10 transition-colors"
              title={t('common.delete')}
            >
              <TrashIcon size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-md border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-lift flex-1 py-2 rounded-md bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            {isSubmitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}