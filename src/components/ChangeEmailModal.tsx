import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import ModalShell from './ModalShell';

export default function ChangeEmailModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { changeEmail, userProfile } = useAuth();
  const { showToast } = useToast();

  const [newEmail, setNewEmail] = useState(userProfile?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newEmail.trim()) {
      setError(t('auth.enterEmail'));
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await changeEmail(newEmail.trim(), password);
      if (success) {
        showToast('success', t('common.save'));
        onClose();
      } else {
        setError(t('errors.invalidPassword'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-text-primary">{t('settings.changeEmail')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder={t('settings.changeEmailNewEmailPlaceholder')}
          className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('settings.changeEmailPasswordPlaceholder')}
          className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {error && <div className="text-sm text-error bg-error/10 rounded-md px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-md border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-lift flex-1 py-2 rounded-md bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors">
            {isSubmitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}