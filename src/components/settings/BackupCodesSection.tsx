import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyIcon } from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuthHook';
import BackupCodesDisplay from '../auth/BackupCodesDisplay';
import ConfirmDialog from '../ConfirmDialog';

export default function BackupCodesSection() {
  const { t } = useTranslation();
  const { userProfile, backupCodesGeneratedAt, generateBackupCodes } = useAuth();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [isConfirmingRegenerate, setIsConfirmingRegenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsConfirmingRegenerate(false);
    setIsGenerating(true);
    const result = await generateBackupCodes();
    setCodes(result);
    setIsGenerating(false);
  };

  const handleGenerateClick = () => {
    if (backupCodesGeneratedAt) setIsConfirmingRegenerate(true);
    else handleGenerate();
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-text-primary mb-1">{t('settings.backupCodesTitle')}</h2>
      <p className="text-xs text-text-tertiary mb-4">{t('settings.backupCodesHint')}</p>

      {codes ? (
        <>
          <BackupCodesDisplay codes={codes} email={userProfile?.email} />
          <p className="text-xs text-warning mt-3">{t('settings.backupCodesShownOnce')}</p>
        </>
      ) : (
        <>
          {backupCodesGeneratedAt ? (
            <p className="text-sm text-text-secondary mb-3">
              {t('settings.backupCodesGeneratedAt', { date: new Date(backupCodesGeneratedAt).toLocaleDateString('ru-RU') })}
            </p>
          ) : (
            <p className="text-sm text-text-tertiary mb-3">{t('settings.backupCodesNone')}</p>
          )}
          <button
            onClick={handleGenerateClick}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-50 transition-colors w-fit"
          >
            <KeyIcon size={16} />
            {backupCodesGeneratedAt ? t('settings.backupCodesRegenerate') : t('settings.backupCodesGenerate')}
          </button>
        </>
      )}

      {isConfirmingRegenerate && (
        <ConfirmDialog
          title={t('settings.backupCodesRegenerateConfirmTitle')}
          message={t('settings.backupCodesRegenerateConfirmMessage')}
          confirmLabel={t('settings.backupCodesRegenerate')}
          onConfirm={handleGenerate}
          onClose={() => setIsConfirmingRegenerate(false)}
        />
      )}
    </div>
  );
}