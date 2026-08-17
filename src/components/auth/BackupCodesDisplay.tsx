import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

interface BackupCodesDisplayProps {
  codes: string[];
  email?: string;
}

export default function BackupCodesDisplay({ codes, email }: BackupCodesDisplayProps) {
  const { t } = useTranslation();

  const handleDownload = () => {
    const header = email ? `SoulFlow backup codes — ${email}\n${new Date().toLocaleString()}\n\n` : '';
    const blob = new Blob([header + codes.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soulflow-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {codes.map((code, i) => (
          <div key={i} className="px-3 py-2 rounded-lg border border-border bg-bg text-center text-sm font-mono tracking-wide text-text-primary">
            {code}
          </div>
        ))}
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center justify-center gap-2 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
      >
        <DownloadSimpleIcon size={16} />
        {t('settings.backupCodesDownload')}
      </button>
    </div>
  );
}