import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LockIcon } from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import ModalShell from './ModalShell';
import FloatingInput from './FloatingInput';

type Mode = 'normal' | 'noOldPassword';

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const { changePassword } = auth;
  const resetPasswordWithSession = async (password: string) => {
    const fn = (auth as { resetPasswordWithSession?: (newPassword: string) => Promise<boolean> }).resetPasswordWithSession;
    return fn ? fn(password) : false;
  };
  const { showToast } = useToast();

  const [mode, setMode] = useState<Mode>('normal');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) { setError(t('auth.passwordTooShort')); return; }
    if (newPassword !== confirmPassword) { setError(t('auth.passwordsDoNotMatch')); return; }

    setIsSubmitting(true);
    try {
      const success = mode === 'normal'
        ? await changePassword(oldPassword, newPassword)
        : await resetPasswordWithSession(newPassword);

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
      <div className="flex flex-col items-center text-center px-5 pt-6 pb-4 border-b border-border">
        <div className="w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
          <LockIcon size={22} />
        </div>
        <h2 className="text-base font-semibold text-text-primary">{t('settings.changePassword')}</h2>
        {mode === 'noOldPassword' && (
          <p className="text-xs text-text-tertiary mt-1">{t('auth.resetPasswordSessionSubtitle')}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        {mode === 'normal' && (
          <FloatingInput type="password" label={t('settings.changePasswordCurrentPlaceholder')} icon={<LockIcon size={16} />} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        )}
        <FloatingInput type="password" label={t('settings.changePasswordNewPlaceholder')} icon={<LockIcon size={16} />} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <FloatingInput type="password" label={t('settings.changePasswordConfirmPlaceholder')} icon={<LockIcon size={16} />} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

        {mode === 'normal' && (
          <button type="button" onClick={() => { setMode('noOldPassword'); setError(null); }} className="text-xs text-text-tertiary hover:text-primary hover:underline self-end -mt-2">
            {t('auth.forgotCurrentPasswordLink')}
          </button>
        )}

        {error && <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-lift flex-1 py-2 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors">
            {isSubmitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}