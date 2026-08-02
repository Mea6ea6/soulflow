import { useState } from 'react';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useClients } from '../hooks/useDB';
import ModalShell from './ModalShell';
import Radio from './Radio';
import Select from './Select';

export interface DocumentTypeChange {
  clientId: string | null;
  isPersonal: boolean;
}

interface DocumentTypeModalProps {
  initialIsPersonal: boolean;
  initialClientId: string | null;
  onConfirm: (change: DocumentTypeChange) => void;
  onClose: () => void;
}

export default function DocumentTypeModal({ initialIsPersonal, initialClientId, onConfirm, onClose }: DocumentTypeModalProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const clients = useClients(masterKey);
  const activeClients = (clients ?? []).filter((c) => c.status === 'active');

  const [mode, setMode] = useState<'personal' | 'client'>(initialIsPersonal ? 'personal' : 'client');
  const [clientId, setClientId] = useState(initialClientId ?? '');

  const handleConfirm = () => {
    if (mode === 'personal') {
      onConfirm({ clientId: null, isPersonal: true });
    } else {
      if (!clientId) return;
      onConfirm({ clientId, isPersonal: false });
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center px-5 pt-6 pb-4 border-b border-border">
        <div className="w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
          <ArrowsLeftRightIcon size={22} />
        </div>
        <h2 className="text-base font-semibold text-text-primary">{t('documentType.title')}</h2>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Radio checked={mode === 'personal'} onChange={() => setMode('personal')} label={t('documentTarget.personal')} />
          <Radio checked={mode === 'client'} onChange={() => setMode('client')} label={t('documentTarget.client')} />
        </div>

        {mode === 'client' && (
          <Select
            value={clientId}
            onChange={setClientId}
            options={activeClients.map((c) => ({ value: c.id, label: c.name }))}
            placeholder={t('documentTarget.selectClient')}
          />
        )}

        <button
          onClick={handleConfirm}
          disabled={mode === 'client' && !clientId}
          className="btn-lift w-full py-2 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {t('common.save')}
        </button>
      </div>
    </ModalShell>
  );
}