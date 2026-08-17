import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnvelopeSimpleIcon, LockIcon, CheckCircleIcon } from '@phosphor-icons/react';
import ModalShell from '../ModalShell';
import FloatingInput from '../FloatingInput';
import OtpInput from './OtpInput';

// TODO(реальная реализация): в системе с клиентским шифрованием (AES-GCM ключ
// выводится из мастер-пароля через PBKDF2) настоящий сброс пароля БЕЗ потери
// доступа к уже зашифрованным данным невозможен — сервер физически не может
// знать пароль пользователя. Прежде чем подключать реальную отправку писем,
// нужно заранее решить архитектурный вопрос восстановления: либо
// (а) пользователь при регистрации получает отдельную recovery-фразу,
// которой можно расшифровать данные в обход пароля, либо
// (б) "сброс" означает создание нового пустого аккаунта с тем же email,
// а старые данные становятся недоступны безвозвратно.
// Сейчас это только визуальная цепочка попапов — ничего не шифруется
// и не сбрасывается по-настоящему.
const STUB_VALID_CODE = '000000';

type Step = 'email' | 'code' | 'newPassword' | 'done';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

export default function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError(t('auth.enterEmail')); return; }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsSubmitting(false);
    setStep('code');
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length < 6) { setError(t('auth.otpIncomplete')); return; }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsSubmitting(false);

    if (code !== STUB_VALID_CODE) {
      setError(t('auth.otpInvalid'));
      return;
    }
    setStep('newPassword');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError(t('auth.passwordTooShort')); return; }
    if (newPassword !== confirmPassword) { setError(t('auth.passwordsDoNotMatch')); return; }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsSubmitting(false);
    setStep('done');
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      {step === 'email' && (
        <>
          <div className="flex flex-col items-center text-center px-5 pt-6 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
              <EnvelopeSimpleIcon size={22} />
            </div>
            <h2 className="text-base font-semibold text-text-primary">{t('auth.forgotPasswordTitle')}</h2>
            <p className="text-xs text-text-tertiary mt-1">{t('auth.forgotPasswordSubtitle')}</p>
          </div>
          <form onSubmit={handleEmailSubmit} className="p-5 flex flex-col gap-4">
            <FloatingInput type="email" label={t('auth.email')} icon={<EnvelopeSimpleIcon size={16} />} value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2">{error}</div>}
            <button type="submit" disabled={isSubmitting} className="btn-lift w-full py-3 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors">
              {isSubmitting ? t('auth.loading') : t('auth.forgotPasswordSendCode')}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-text-tertiary hover:underline w-full text-center">{t('common.cancel')}</button>
          </form>
        </>
      )}

      {step === 'code' && (
        <>
          <div className="flex flex-col items-center text-center px-5 pt-6 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
              <EnvelopeSimpleIcon size={22} />
            </div>
            <h2 className="text-base font-semibold text-text-primary">{t('auth.otpTitle')}</h2>
            <p className="text-xs text-text-tertiary mt-1">{t('auth.otpSentTo', { email })}</p>
          </div>
          <form onSubmit={handleCodeSubmit} className="p-5 flex flex-col gap-4">
            <OtpInput value={code} onChange={setCode} autoFocus />
            {error && <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2 text-center">{error}</div>}
            <button type="submit" disabled={isSubmitting} className="btn-lift w-full py-3 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors">
              {isSubmitting ? t('auth.loading') : t('auth.otpConfirm')}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-text-tertiary hover:underline w-full text-center">{t('common.cancel')}</button>
          </form>
        </>
      )}

      {step === 'newPassword' && (
        <>
          <div className="flex flex-col items-center text-center px-5 pt-6 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
              <LockIcon size={22} />
            </div>
            <h2 className="text-base font-semibold text-text-primary">{t('auth.newPasswordTitle')}</h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="p-5 flex flex-col gap-4">
            <FloatingInput type="password" label={t('auth.newPasswordLabel')} icon={<LockIcon size={16} />} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <FloatingInput type="password" label={t('auth.confirmPassword')} icon={<LockIcon size={16} />} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            {error && <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2">{error}</div>}
            <button type="submit" disabled={isSubmitting} className="btn-lift w-full py-3 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors">
              {isSubmitting ? t('auth.loading') : t('common.save')}
            </button>
          </form>
        </>
      )}

      {step === 'done' && (
        <div className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center">
            <CheckCircleIcon size={22} weight="fill" />
          </div>
          <h2 className="text-base font-semibold text-text-primary">{t('auth.forgotPasswordDoneTitle')}</h2>
          <p className="text-sm text-text-secondary">{t('auth.forgotPasswordDoneMessage')}</p>
          <button onClick={onClose} className="btn-lift w-full py-3 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors mt-2">
            {t('common.close')}
          </button>
        </div>
      )}
    </ModalShell>
  );
}