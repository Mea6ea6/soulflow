import { useState } from 'react';
import { SparkleIcon, LockIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import FloatingInput from '../components/FloatingInput';

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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
      data-theme="dawn"
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-10">
          <SparkleIcon size={32} weight="fill" className="text-primary mb-3" />
          <span className="text-3xl font-display font-semibold text-text-primary">
            {t('brand.soulFlow')}
          </span>
        </div>

        <div
          className="bg-surface rounded-3xl p-7"
          style={{ boxShadow: '0 1px 2px var(--color-shadow), 0 8px 24px var(--color-shadow-hover)' }}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {showEmailField && (
              <FloatingInput
                type="email"
                label={t('auth.email')}
                icon={<EnvelopeSimpleIcon size={16} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            {mode === 'login' && storedEmail && (
              <div className="text-sm text-text-secondary">
                {t('auth.loggedInAs')} <span className="font-medium text-text-primary">{storedEmail}</span>
              </div>
            )}

            <FloatingInput
              type="password"
              label={t('auth.masterPassword')}
              icon={<LockIcon size={16} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {mode === 'register' && (
              <FloatingInput
                type="password"
                label={t('auth.confirmPassword')}
                icon={<LockIcon size={16} />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}

            {error && (
              <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-lift w-full py-3 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors mt-1"
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
              className="mt-5 text-sm text-primary hover:underline w-full text-center"
            >
              {mode === 'login' ? t('auth.noAccountYet') : t('auth.haveAccount')}
            </button>
          )}

          {storedEmail && (
            <button
              type="button"
              onClick={handleForgetAccount}
              className="mt-4 text-sm text-text-tertiary hover:underline w-full text-center"
            >
              {t('auth.notMe')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}