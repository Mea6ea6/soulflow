import { useState } from 'react';
import { SparkleIcon, LockIcon, EnvelopeSimpleIcon, TrashIcon, PlusIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useAppSettings } from '../hooks/useDB';
import FloatingInput from '../components/FloatingInput';
import ConfirmDialog from './ConfirmDialog';

function initialsFor(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { register, login, accounts, lastActiveEmail, removeAccount } = useAuth();
  const appSettings = useAppSettings();
  const theme = appSettings?.theme ?? 'dawn';

  const preselected = accounts.find((a) => a.email === lastActiveEmail)?.email ?? accounts[0]?.email ?? null;

  const [mode, setMode] = useState<'password' | 'register'>(accounts.length === 0 ? 'register' : 'password');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(preselected);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const resetFormState = () => { setPassword(''); setConfirmPassword(''); setError(null); };

  const handleSelectAccount = (accountEmail: string) => {
    setSelectedEmail(accountEmail);
    setMode('password');
    resetFormState();
  };

  const handleStartRegister = () => { setMode('register'); setEmail(''); resetFormState(); };
  const handleBackToList = () => {
    setSelectedEmail(null);
    setMode('password');
    resetFormState();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!email.trim()) { setError(t('auth.enterEmail')); return; }
      if (password.length < 8) { setError(t('auth.passwordTooShort')); return; }
      if (password !== confirmPassword) { setError(t('auth.passwordsDoNotMatch')); return; }

      setIsSubmitting(true);
      try {
        await register(email.trim(), password);
      } catch (err) {
        setError(err instanceof Error && err.message === 'ACCOUNT_EXISTS' ? t('auth.accountExists') : t('auth.registerFailed'));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!selectedEmail) { setError(t('auth.enterEmail')); return; }
      if (!password) { setError(t('auth.enterPassword')); return; }

      setIsSubmitting(true);
      try {
        const success = await login(selectedEmail, password);
        if (!success) setError(t('auth.wrongPassword'));
      } catch {
        setError(t('auth.loginFailed'));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleRemoveConfirm = () => {
    if (removingEmail) {
      removeAccount(removingEmail);
      if (selectedEmail === removingEmail) setSelectedEmail(null);
    }
    setRemovingEmail(null);
  };

  const showAccountList = accounts.length > 0 && !selectedEmail && mode !== 'register';

  return (
    <div
      data-theme={theme}
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(circle at 30% 20%, var(--color-primary-tint) 0%, var(--color-bg) 55%), var(--color-bg)' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-10">
          <SparkleIcon size={32} weight="fill" className="text-primary mb-3" />
          <span className="text-3xl font-display font-semibold text-text-primary">{t('brand.soulFlow')}</span>
        </div>

        <div className="bg-surface rounded-3xl p-7" style={{ boxShadow: '0 1px 2px var(--color-shadow), 0 8px 24px var(--color-shadow-hover)' }}>
          {showAccountList ? (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-1">{t('auth.chooseAccount')}</h2>
              <p className="text-sm text-text-secondary mb-5">{t('auth.chooseAccountSubtitle')}</p>

              <div className="flex flex-col gap-2 mb-4">
                {accounts.map((a) => (
                  <div key={a.email} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:bg-surface-hover transition-colors">
                    <button onClick={() => handleSelectAccount(a.email)} className="flex-1 flex items-center gap-3 text-left">
                      <div className="w-9 h-9 rounded-full bg-primary-tint text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {initialsFor(a.email)}
                      </div>
                      <span className="text-sm text-text-primary truncate">{a.email}</span>
                    </button>
                    <button
                      onClick={() => setRemovingEmail(a.email)}
                      className="shrink-0 p-1.5 rounded-md text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error transition-opacity"
                      title={t('auth.removeAccountAction')}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleStartRegister}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
              >
                <PlusIcon size={14} />
                {t('auth.addAccount')}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-1">
                {mode === 'password' ? t('auth.loginTitle') : t('auth.registerTitle')}
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                {mode === 'password' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {mode === 'register' && (
                  <FloatingInput type="email" label={t('auth.email')} icon={<EnvelopeSimpleIcon size={16} />} value={email} onChange={(e) => setEmail(e.target.value)} />
                )}

                {mode === 'password' && selectedEmail && (
                  <div className="text-sm text-text-secondary">
                    {t('auth.loggedInAs')} <span className="font-medium text-text-primary">{selectedEmail}</span>
                  </div>
                )}

                <FloatingInput type="password" label={t('auth.masterPassword')} icon={<LockIcon size={16} />} value={password} onChange={(e) => setPassword(e.target.value)} />

                {mode === 'register' && (
                  <FloatingInput type="password" label={t('auth.confirmPassword')} icon={<LockIcon size={16} />} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                )}

                {error && <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2">{error}</div>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-lift w-full py-3 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors mt-1"
                >
                  {isSubmitting ? t('auth.loading') : mode === 'password' ? t('auth.login') : t('auth.register')}
                </button>
              </form>

              {mode === 'password' && accounts.length > 1 && (
                <button onClick={handleBackToList} className="mt-4 text-sm text-primary hover:underline w-full text-center">{t('auth.notMe')}</button>
              )}
              {mode === 'password' && accounts.length <= 1 && (
                <button onClick={handleStartRegister} className="mt-4 text-sm text-primary hover:underline w-full text-center">{t('auth.noAccountYet')}</button>
              )}
              {mode === 'register' && accounts.length > 0 && (
                <button onClick={handleBackToList} className="mt-4 text-sm text-text-tertiary hover:underline w-full text-center">{t('auth.haveAccount')}</button>
              )}
            </>
          )}
        </div>
      </div>

      {removingEmail && (
        <ConfirmDialog
          title={t('auth.removeAccountTitle')}
          message={t('auth.removeAccountMessage', { email: removingEmail })}
          confirmLabel={t('auth.removeAccountAction')}
          onConfirm={handleRemoveConfirm}
          onClose={() => setRemovingEmail(null)}
        />
      )}
    </div>
  );
}