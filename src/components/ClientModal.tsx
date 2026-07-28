import { useState } from 'react';
import { XIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { Client, ClientStatus } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { addClient, updateClient } from '../hooks/useDB';

interface ClientModalProps {
  client: Client | null;
  onClose: () => void;
}

export default function ClientModal({ client, onClose }: ClientModalProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(client?.name ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [workPlace, setWorkPlace] = useState(client?.workPlace ?? '');
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? 'active');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t('client.validation.nameRequired'));
      return;
    }
    if (!masterKey) {
      setError(t('common.sessionExpired'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (client) {
        await updateClient(client.id, { name: name.trim(), phone, email, workPlace, status }, masterKey);
      } else {
        await addClient(
          { name: name.trim(), phone, email, workPlace, status, sessions: [], notes: '' },
          masterKey
        );
      }
      showToast('success', t('common.save'));
      onClose();
    } catch {
      setError(t('client.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-surface rounded-lg border border-border shadow-card-hover">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">
            {client ? t('client.editTitle') : t('client.addTitle')}
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              {t('client.fullName')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('client.fullNamePlaceholder')}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              {t('client.phone')}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('client.phonePlaceholder')}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              {t('client.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('client.emailPlaceholder')}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              {t('client.workPlace')}
            </label>
            <input
              type="text"
              value={workPlace}
              onChange={(e) => setWorkPlace(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              {t('client.status.label')}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="active">{t('clients.status.active')}</option>
              <option value="archived">{t('clients.status.archived')}</option>
            </select>
          </div>

          {error && (
            <div className="text-sm text-error bg-error/10 rounded-md px-3 py-2">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
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
              className="flex-1 py-2 rounded-md bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {isSubmitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}