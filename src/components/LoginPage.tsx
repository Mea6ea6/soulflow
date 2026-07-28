import { useState } from 'react';
import { SparkleIcon, LockIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';

export default function LoginPage() {
  const { t } = useTranslation();
  const { register, login, getStoredEmail } = useAuth();

  const storedEmail = getStoredEmail();
  const [mode, setMode] = useState<'login' | 'register'>(storedEmail ? 'login' : 'register');

  const [email, setEmail] = useState(storedEmail ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showEmailField = mode === 'register' || !storedEmail;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!email.trim()) {
        setError(t('auth.enterEmail'));
        return;
      }
      if (password.length < 8) {
        setError(t('auth.passwordTooShort'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('auth.passwordsDoNotMatch'));
        return;
      }

      setIsSubmitting(true);
      try {
        await register(email.trim(), password);
      } catch {
        setError(t('auth.registerFailed'));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!storedEmail && !email.trim()) {
        setError(t('auth.enterEmail'));
        return;
      }
      if (!password) {
        setError(t('auth.enterPassword'));
        return;
      }

      setIsSubmitting(true);
      try {
        const success = await login(password);
        if (!success) {
          setError(storedEmail ? t('auth.wrongPassword') : t('auth.noAccountFound'));
        }
      } catch {
        setError(t('auth.loginFailed'));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleForgetAccount = () => {
    if (confirm(t('auth.forgetAccountConfirm'))) {
      localStorage.removeItem('soulflow_auth');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4" data-theme="dawn">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <SparkleIcon size={28} weight="fill" className="text-primary" />
          <span className="text-2xl font-display font-semibold text-text-primary">
            {t('brand.soulFlow')}
          </span>
        </div>

        <div className="bg-surface rounded-lg border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h2>
          <p className="text-sm text-text-secondary mb-5">
            {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {showEmailField && (
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <EnvelopeSimpleIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={t('auth.emailPlaceholder')}
                  />
                </div>
              </div>
            )}

            {mode === 'login' && storedEmail && (
              <div className="text-sm text-text-secondary">
                {t('auth.loggedInAs')} <span className="font-medium text-text-primary">{storedEmail}</span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-text-secondary mb-1 block">
                {t('auth.masterPassword')}
              </label>
              <div className="relative">
                <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">
                  {t('auth.confirmPassword')}
                </label>
                <div className="relative">
                  <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-error bg-error/10 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-md bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {isSubmitting ? t('auth.loading') : mode === 'login' ? t('auth.login') : t('auth.register')}
            </button>
          </form>

          {!storedEmail && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="mt-4 text-sm text-primary hover:underline w-full text-center"
            >
              {mode === 'login' ? t('auth.noAccountYet') : t('auth.haveAccount')}
            </button>
          )}

          {storedEmail && (
            <button
              type="button"
              onClick={handleForgetAccount}
              className="mt-3 text-sm text-text-tertiary hover:underline w-full text-center"
            >
              {t('auth.notMe')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}