import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuthHook';
import BackupCodesDisplay from '../auth/BackupCodesDisplay';

export default function BackupCodesSection() {
  const { t } = useTranslation();
  const { userProfile, getStoredBackupCodes, generateBackupCodes } = useAuth();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const stored = await getStoredBackupCodes();
      if (stored) {
        if (!cancelled) setCodes(stored);
      } else {
        // Легаси-аккаунт без сохранённого набора — создаём один раз тихо,
        // без блокирующего попапа (тот показывается только после явной
        // регистрации, когда пользователь явно на это настроен)
        const generated = await generateBackupCodes({ silent: true });
        if (!cancelled) setCodes(generated ?? []);
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.email]);

  return (
    <div>
      <h2 className="text-sm font-semibold text-text-primary mb-1">{t('settings.backupCodesTitle')}</h2>
      <p className="text-xs text-text-tertiary mb-4">{t('settings.backupCodesHint')}</p>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">{t('common.loading')}</p>
      ) : codes && codes.length > 0 ? (
        <BackupCodesDisplay codes={codes} email={userProfile?.email} />
      ) : (
        <p className="text-sm text-warning">{t('settings.backupCodesExhausted')}</p>
      )}
    </div>
  );
}