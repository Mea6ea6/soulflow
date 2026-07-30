import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useClients } from '../hooks/useDB';
import ModalShell from './ModalShell';

export interface DocumentTarget {
  clientId: string | null;
  isPersonal: boolean;
}

interface DocumentTargetModalProps {
  title: string;
  onConfirm: (target: DocumentTarget) => void;
  onClose: () => void;
}

export default function DocumentTargetModal({ title, onConfirm, onClose }: DocumentTargetModalProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const clients = useClients(masterKey);
  const activeClients = (clients ?? []).filter((c) => c.status === 'active');

  const [mode, setMode] = useState<'personal' | 'client'>('personal');
  const [clientId, setClientId] = useState('');

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
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="radio" checked={mode === 'personal'} onChange={() => setMode('personal')} />
            {t('documentTarget.personal')}
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="radio" checked={mode === 'client'} onChange={() => setMode('client')} />
            {t('documentTarget.client')}
          </label>
        </div>

        {mode === 'client' && (
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t('documentTarget.selectClient')}</option>
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        <button
          onClick={handleConfirm}
          disabled={mode === 'client' && !clientId}
          className="btn-lift w-full py-2 rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {t('common.continue')}
        </button>
      </div>
    </ModalShell>
  );
}