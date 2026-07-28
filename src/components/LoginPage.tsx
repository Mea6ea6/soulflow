import { useState } from 'react';
import { Sparkles, Lock, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuthHook';
import { useTranslation } from 'react-i18next';

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

  // Показываем поле email, если это регистрация ИЛИ если сохранённого
  // email вообще нет (например, после "Это не я" в режиме "Войти")
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
        // login() всегда сверяется с email/солью, сохранёнными в localStorage —
        // если сохранённого аккаунта нет вообще, вход не пройдёт ни при каком
        // введённом email, это ожидаемо: значит нужно сначала зарегистрироваться.
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles className="text-indigo-600 dark:text-indigo-400" size={28} />
          <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">SoulFlow</span>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {showEmailField && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={t('auth.emailPlaceholder')}
                  />
                </div>
              </div>
            )}

            {mode === 'login' && storedEmail && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('auth.loggedInAs')} <span className="font-medium text-gray-700 dark:text-gray-200">{storedEmail}</span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                {t('auth.masterPassword')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  {t('auth.confirmPassword')}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
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
              className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline w-full text-center"
            >
              {mode === 'login' ? t('auth.noAccountYet') : t('auth.haveAccount')}
            </button>
          )}

          {storedEmail && (
            <button
              type="button"
              onClick={handleForgetAccount}
              className="mt-3 text-sm text-gray-500 dark:text-gray-400 hover:underline w-full text-center"
            >
              {t('auth.notMe')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}