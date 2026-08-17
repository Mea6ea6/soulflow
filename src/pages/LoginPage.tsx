import { useState } from 'react';
import { SparkleIcon, LockIcon, EnvelopeSimpleIcon, KeyIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { useAppSettings } from '../hooks/useDB';
import FloatingInput from '../components/FloatingInput';
import ConfirmDialog from '../components/ConfirmDialog';
import AccountList from '../components/auth/AccountList';
import OtpInput from '../components/auth/OtpInput';

const STUB_VALID_OTP = '000000';

type Mode = 'password' | 'register' | 'otp' | 'recoverCode' | 'recoverPassword';

interface PendingCredentials {
  mode: 'login' | 'register';
  email: string;
  password: string;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { register, login, accounts, lastActiveEmail, removeAccount, recoverWithBackupCode } = useAuth();
  const { showToast } = useToast();
  const appSettings = useAppSettings();
  const theme = appSettings?.theme ?? 'dawn';

  const preselected = accounts.find((a) => a.email === lastActiveEmail)?.email ?? accounts[0]?.email ?? null;

  const [mode, setMode] = useState<Mode>(accounts.length === 0 ? 'register' : 'password');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(preselected);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [pendingCredentials, setPendingCredentials] = useState<PendingCredentials | null>(null);

  const resetFormState = () => { setPassword(''); setConfirmPassword(''); setError(null); };

  const handleSelectAccount = (accountEmail: string) => {
    setSelectedEmail(accountEmail);
    setMode('password');
    resetFormState();
  };

  const handleStartRegister = () => { setMode('register'); setEmail(''); resetFormState(); };
  const handleBackToList = () => { setSelectedEmail(null); setMode('password'); resetFormState(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!email.trim()) { setError(t('auth.enterEmail')); return; }
      if (password.length < 8) { setError(t('auth.passwordTooShort')); return; }
      if (password !== confirmPassword) { setError(t('auth.passwordsDoNotMatch')); return; }
      setPendingCredentials({ mode: 'register', email: email.trim(), password });
      setOtpCode('');
      setMode('otp');
    } else {
      if (!selectedEmail) { setError(t('auth.enterEmail')); return; }
      if (!password) { setError(t('auth.enterPassword')); return; }
      setPendingCredentials({ mode: 'login', email: selectedEmail, password });
      setOtpCode('');
      setMode('otp');
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otpCode.length < 6) { setError(t('auth.otpIncomplete')); return; }
    if (otpCode !== STUB_VALID_OTP) { setError(t('auth.otpInvalid')); return; }
    if (!pendingCredentials) return;

    setIsSubmitting(true);
    try {
      if (pendingCredentials.mode === 'register') {
        try {
          await register(pendingCredentials.email, pendingCredentials.password);
        } catch (err) {
          setError(err instanceof Error && err.message === 'ACCOUNT_EXISTS' ? t('auth.accountExists') : t('auth.registerFailed'));
          setMode(pendingCredentials.mode === 'register' ? 'register' : 'password');
        }
      } else {
        const success = await login(pendingCredentials.email, pendingCredentials.password);
        if (!success) {
          setError(t('auth.wrongPassword'));
          setMode('password');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRecovery = () => {
    setBackupCode('');
    setRecoveryNewPassword('');
    setRecoveryConfirmPassword('');
    setError(null);
    setMode('recoverCode');
  };

  const handleRecoverCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!backupCode.trim()) { setError(t('auth.backupCodeRequired')); return; }
    setMode('recoverPassword');
  };

  const handleRecoveryPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (recoveryNewPassword.length < 8) { setError(t('auth.passwordTooShort')); return; }
    if (recoveryNewPassword !== recoveryConfirmPassword) { setError(t('auth.passwordsDoNotMatch')); return; }
    if (!selectedEmail) return;

    setIsSubmitting(true);
    const success = await recoverWithBackupCode(selectedEmail, backupCode, recoveryNewPassword);
    setIsSubmitting(false);

    if (success) {
      showToast('success', t('auth.recoverySuccessToast'));
    } else {
      setError(t('auth.backupCodeInvalid'));
      setMode('recoverCode');
    }
  };

  const handleRemoveConfirm = () => {
    if (removingEmail) {
      removeAccount(removingEmail);
      if (selectedEmail === removingEmail) setSelectedEmail(null);
    }
    setRemovingEmail(null);
  };

  const showAccountList = accounts.length > 0 && !selectedEmail && mode === 'password';

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
          {showAccountList && (
            <AccountList
              accounts={accounts}
              onSelectAccount={handleSelectAccount}
              onRemoveAccount={(email) => setRemovingEmail(email)}
              onAddAccount={handleStartRegister}
            />
          )}

          {(mode === 'password' || mode === 'register') && !showAccountList && (
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

                {mode === 'password' && selectedEmail && (
                  <button type="button" onClick={handleStartRecovery} className="text-xs text-text-tertiary hover:text-primary hover:underline self-end -mt-2">
                    {t('auth.forgotPasswordLink')}
                  </button>
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

          {mode === 'otp' && pendingCredentials && (
            <>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
                  <EnvelopeSimpleIcon size={22} />
                </div>
                <h2 className="text-base font-semibold text-text-primary">
                  {pendingCredentials.mode === 'register' ? t('auth.otpTitleRegister') : t('auth.otpTitleLogin')}
                </h2>
                <p className="text-xs text-text-tertiary mt-1">{t('auth.otpSentTo', { email: pendingCredentials.email })}</p>
              </div>
              <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
                <OtpInput value={otpCode} onChange={setOtpCode} autoFocus />
                {error && <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2 text-center">{error}</div>}
                <button type="submit" disabled={isSubmitting} className="btn-lift w-full py-3 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors">
                  {isSubmitting ? t('auth.loading') : t('auth.otpConfirm')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode(pendingCredentials.mode === 'register' ? 'register' : 'password')}
                  className="text-sm text-text-tertiary hover:underline w-full text-center"
                >
                  {t('common.cancel')}
                </button>
              </form>
            </>
          )}

          {mode === 'recoverCode' && (
            <>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
                  <KeyIcon size={22} />
                </div>
                <h2 className="text-base font-semibold text-text-primary">{t('auth.recoveryCodeTitle')}</h2>
                <p className="text-xs text-text-tertiary mt-1">{t('auth.recoveryCodeSubtitle')}</p>
              </div>
              <form onSubmit={handleRecoverCodeSubmit} className="flex flex-col gap-4">
                <FloatingInput
                  type="text"
                  label={t('auth.backupCodeLabel')}
                  icon={<KeyIcon size={16} />}
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                />
                {error && <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2">{error}</div>}
                <button type="submit" className="btn-lift w-full py-3 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors">
                  {t('common.continue')}
                </button>
                <button type="button" onClick={() => setMode('password')} className="text-sm text-text-tertiary hover:underline w-full text-center">
                  {t('common.cancel')}
                </button>
              </form>
            </>
          )}

          {mode === 'recoverPassword' && (
            <>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
                  <LockIcon size={22} />
                </div>
                <h2 className="text-base font-semibold text-text-primary">{t('auth.newPasswordTitle')}</h2>
              </div>
              <form onSubmit={handleRecoveryPasswordSubmit} className="flex flex-col gap-4">
                <FloatingInput type="password" label={t('auth.newPasswordLabel')} icon={<LockIcon size={16} />} value={recoveryNewPassword} onChange={(e) => setRecoveryNewPassword(e.target.value)} />
                <FloatingInput type="password" label={t('auth.confirmPassword')} icon={<LockIcon size={16} />} value={recoveryConfirmPassword} onChange={(e) => setRecoveryConfirmPassword(e.target.value)} />
                {error && <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2">{error}</div>}
                <button type="submit" disabled={isSubmitting} className="btn-lift w-full py-3 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors">
                  {isSubmitting ? t('auth.loading') : t('common.save')}
                </button>
                <button type="button" onClick={() => setMode('recoverCode')} className="text-sm text-text-tertiary hover:underline w-full text-center">
                  {t('common.cancel')}
                </button>
              </form>
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