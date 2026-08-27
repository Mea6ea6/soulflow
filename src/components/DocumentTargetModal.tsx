import { FilePlusIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useClients } from '../hooks/useDB';
import { SESSION_TEMPLATE_OPTIONS, type SessionTemplateId } from '../utils/sessionTemplates';
import ModalShell from './ModalShell';
import Radio from './Radio';
import Select from './Select';

export interface DocumentTarget {
  clientId: string | null;
  isPersonal: boolean;
  templateId?: SessionTemplateId;
}

interface DocumentTargetModalProps {
  title: string;
  icon: 'create' | 'import';
  onConfirm: (target: DocumentTarget) => void;
  onClose: () => void;
}

export default function DocumentTargetModal({ title, icon, onConfirm, onClose }: DocumentTargetModalProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const clients = useClients(masterKey);
  const activeClients = (clients ?? []).filter((c) => c.status === 'active');

  const [mode, setMode] = useState<'personal' | 'client'>('personal');
  const [clientId, setClientId] = useState('');
  const [templateId, setTemplateId] = useState<SessionTemplateId>('blank');

  const handleConfirm = () => {
    if (mode === 'personal') {
      onConfirm({ clientId: null, isPersonal: true, templateId: icon === 'create' ? templateId : undefined });
    } else {
      if (!clientId) return;
      onConfirm({ clientId, isPersonal: false, templateId: icon === 'create' ? templateId : undefined });
    }
  };

  const Icon = icon === 'create' ? FilePlusIcon : UploadSimpleIcon;
  const iconColorClass = icon === 'create' ? 'bg-primary-tint text-primary' : 'bg-secondary-tint text-secondary';

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center px-5 pt-6 pb-4 border-b border-border">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${iconColorClass}`}>
          <Icon size={22} />
        </div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
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

        {icon === 'create' && (
          <div className="flex flex-col gap-2 pt-1 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary mt-3">
              {t('documentTarget.templateSectionTitle')}
            </p>
            <div className="flex flex-col gap-2">
              {SESSION_TEMPLATE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTemplateId(option.id)}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                    templateId === option.id ? 'border-primary bg-primary-tint' : 'border-border hover:bg-surface-hover'
                  }`}
                >
                  <p className={`text-sm font-medium ${templateId === option.id ? 'text-primary' : 'text-text-primary'}`}>
                    {t(option.labelKey)}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">{t(option.descriptionKey)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={mode === 'client' && !clientId}
          className="btn-lift w-full py-2 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {t('common.continue')}
        </button>
      </div>
    </ModalShell>
  );
}