import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react';
import ModalShell from '../ModalShell';
import OtpInput from './OtpInput';

// Пока не подключена реальная отправка писем — валидным считается только код 000000
const STUB_VALID_CODE = '000000';

interface OtpModalProps {
  email: string;
  title: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function OtpModal({ email, title, onConfirm, onClose }: OtpModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) { setError(t('auth.otpIncomplete')); return; }

    setIsSubmitting(true);
    setError(null);
    // Искусственная задержка для правдоподобности — реальная проверка кода
    // на сервере появится вместе с реальной отправкой писем
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (code === STUB_VALID_CODE) {
      onConfirm();
    } else {
      setError(t('auth.otpInvalid'));
    }
    setIsSubmitting(false);
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center px-5 pt-6 pb-4 border-b border-border">
        <div className="w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
          <EnvelopeSimpleIcon size={22} />
        </div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <p className="text-xs text-text-tertiary mt-1">{t('auth.otpSentTo', { email })}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        <OtpInput value={code} onChange={setCode} autoFocus />

        {error && <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2 text-center">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-lift w-full py-3 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {isSubmitting ? t('auth.loading') : t('auth.otpConfirm')}
        </button>

        <button type="button" onClick={onClose} className="text-sm text-text-tertiary hover:underline w-full text-center">
          {t('common.cancel')}
        </button>
      </form>
    </ModalShell>
  );
}