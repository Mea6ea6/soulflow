import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuthHook';
import BackupCodesDisplay from '../auth/BackupCodesDisplay';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const LOW_COUNT_THRESHOLD = 2;

export default function BackupCodesSection() {
  const { t } = useTranslation();
  const { userProfile, backupCodesGeneratedAt, getStoredBackupCodes, generateBackupCodes } = useAuth();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const stored = await getStoredBackupCodes();
        const isExpired = backupCodesGeneratedAt
          ? Date.now() - new Date(backupCodesGeneratedAt).getTime() > NINETY_DAYS_MS
          : false;

        let result = stored;
        if (!stored) {
          // Легаси-аккаунт без набора — создаём тихо, без блокирующего попапа
          result = await generateBackupCodes({ silent: true });
        } else if (isExpired) {
          // Набору больше 90 дней — перевыпускаем с показом попапа,
          // чтобы пользователь не забыл сохранить новые коды
          result = await generateBackupCodes();
        }

        if (!cancelled) setCodes(result ?? []);
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
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
      ) : hasError ? (
        <p className="text-sm text-error">{t('settings.backupCodesLoadFailed')}</p>
      ) : codes && codes.length > 0 ? (
        <>
          <BackupCodesDisplay codes={codes} email={userProfile?.email} />
          {codes.length <= LOW_COUNT_THRESHOLD && (
            <p className="text-xs text-warning mt-3">{t('settings.backupCodesLowCount', { count: codes.length })}</p>
          )}
        </>
      ) : (
        <p className="text-sm text-warning">{t('settings.backupCodesExhausted')}</p>
      )}
    </div>
  );
}