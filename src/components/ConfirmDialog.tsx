import { useTranslation } from 'react-i18next';
import ModalShell from './ModalShell';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <div className="p-5">
        <h2 className="text-base font-semibold text-text-primary mb-1">{title}</h2>
        <p className="text-sm text-text-secondary mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 rounded-full bg-error text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {confirmLabel ?? t('common.delete')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}