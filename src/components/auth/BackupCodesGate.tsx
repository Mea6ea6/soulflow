import { useTranslation } from 'react-i18next';
import { WarningIcon } from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuthHook';
import BackupCodesDisplay from './BackupCodesDisplay';

export default function BackupCodesGate() {
  const { t } = useTranslation();
  const { userProfile, pendingBackupCodesToShow, dismissPendingBackupCodes } = useAuth();

  if (!pendingBackupCodesToShow) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-bg/95 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-surface rounded-3xl p-7" style={{ boxShadow: '0 1px 2px var(--color-shadow), 0 8px 24px var(--color-shadow-hover)' }}>
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-warning/15 text-warning flex items-center justify-center mb-3">
            <WarningIcon size={22} weight="fill" />
          </div>
          <h2 className="text-base font-semibold text-text-primary">{t('auth.backupCodesGateTitle')}</h2>
          <p className="text-sm text-text-secondary mt-2">{t('auth.backupCodesGateMessage')}</p>
        </div>

        <BackupCodesDisplay codes={pendingBackupCodesToShow} email={userProfile?.email} />

        <button
          onClick={dismissPendingBackupCodes}
          className="btn-lift w-full py-3 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors mt-5"
        >
          {t('auth.backupCodesGateConfirm')}
        </button>
      </div>
    </div>
  );
}