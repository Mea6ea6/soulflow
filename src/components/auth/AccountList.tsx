import { TrashIcon, PlusIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { StoredAccountSummary } from '../../context/AuthContext';

function initialsFor(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

interface AccountListProps {
  accounts: StoredAccountSummary[];
  onSelectAccount: (email: string) => void;
  onRemoveAccount: (email: string) => void;
  onAddAccount: () => void;
}

export default function AccountList({ accounts, onSelectAccount, onRemoveAccount, onAddAccount }: AccountListProps) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="text-lg font-semibold text-text-primary mb-1">{t('auth.chooseAccount')}</h2>
      <p className="text-sm text-text-secondary mb-5">{t('auth.chooseAccountSubtitle')}</p>

      <div className="flex flex-col gap-2 mb-4">
        {accounts.map((a) => (
          <div key={a.email} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:bg-surface-hover transition-colors">
            <button onClick={() => onSelectAccount(a.email)} className="flex-1 flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-full bg-primary-tint text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {initialsFor(a.email)}
              </div>
              <span className="text-sm text-text-primary truncate">{a.email}</span>
            </button>
            <button
              onClick={() => onRemoveAccount(a.email)}
              className="shrink-0 p-1.5 rounded-md text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error transition-opacity"
              title={t('auth.removeAccountAction')}
            >
              <TrashIcon size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onAddAccount}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
      >
        <PlusIcon size={14} />
        {t('auth.addAccount')}
      </button>
    </>
  );
}