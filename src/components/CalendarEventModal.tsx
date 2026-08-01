import { useState } from 'react';
import { TrashIcon, CalendarBlankIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { useClients, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../hooks/useDB';
import { formatDateRu } from '../utils/date';
import ModalShell from './ModalShell';
import TimeInput from './TimeInput';
import Checkbox from './Checkbox';
import Select from './Select';

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
      <div className="flex flex-col items-center text-center px-5 pt-6 pb-4 border-b border-border">
        <div className="w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
          <CalendarBlankIcon size={22} />
        </div>
        <h2 className="text-base font-semibold text-text-primary">
          {event ? t('calendar.editTitle') : t('calendar.newTitle')}
        </h2>
        <p className="text-xs text-text-tertiary mt-0.5">{formatDateRu(date)}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        <Checkbox checked={isPersonal} onChange={setIsPersonal} label={t('calendar.personalEvent')} />

        <div className="flex items-end gap-3">
          <TimeInput label={`${t('calendar.time')} *`} value={time} onChange={setTime} />

          {isPersonal ? (
            <div className="flex-1">
              <label className="text-sm font-medium text-text-secondary mb-1 block">{t('calendar.title')} *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t('calendar.titlePlaceholder')}
              />
            </div>
          ) : (
            <div className="flex-1">
              <Select
                label={`${t('calendar.client')} *`}
                value={clientId}
                onChange={setClientId}
                options={activeClients.map((c) => ({ value: c.id, label: c.name }))}
                placeholder={t('calendar.clientPlaceholder')}
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-text-secondary mb-1 block">{t('calendar.note')}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {error && <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-2">
          {event && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 rounded-full border border-error/30 text-error hover:bg-error/10 transition-colors"
              title={t('common.delete')}
            >
              <TrashIcon size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-lift flex-1 py-2 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            {isSubmitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}