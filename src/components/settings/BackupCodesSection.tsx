import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuthHook';
import BackupCodesDisplay from '../auth/BackupCodesDisplay';

export default function BackupCodesSection() {
  const { t } = useTranslation();
  const { userProfile, backupCodesGeneratedAt, getStoredBackupCodes, generateBackupCodes } = useAuth();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const stored = await getStoredBackupCodes();
      if (stored) {
        if (!cancelled) setCodes(stored);
      } else {
        // Аккаунт без сохранённого набора (легаси, до появления фичи) —
        // тихо создаём набор без блокирующего попапа; попап показывается
        // только сразу после регистрации и по явному "Обновить коды"
        const generated = await generateBackupCodes({ silent: true });
        if (!cancelled) setCodes(generated);
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.email]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const fresh = await generateBackupCodes();
    if (fresh) setCodes(fresh);
    setIsRefreshing(false);
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-text-primary mb-1">{t('settings.backupCodesTitle')}</h2>
      <p className="text-xs text-text-tertiary mb-4">{t('settings.backupCodesHint')}</p>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">{t('common.loading')}</p>
      ) : codes ? (
        <>
          <BackupCodesDisplay codes={codes} email={userProfile?.email} />
          <div className="flex items-center justify-between mt-3">
            {backupCodesGeneratedAt && (
              <p className="text-xs text-text-tertiary">
                {t('settings.backupCodesGeneratedAt', { date: new Date(backupCodesGeneratedAt).toLocaleDateString('ru-RU') })}
              </p>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-xs text-primary hover:underline disabled:opacity-50 shrink-0"
            >
              {isRefreshing ? t('common.saving') : t('settings.backupCodesRegenerate')}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-error">{t('settings.backupCodesLoadFailed')}</p>
      )}
    </div>
  );
}