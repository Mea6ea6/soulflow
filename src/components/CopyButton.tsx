import { useState } from 'react';
import { CopyIcon, CheckIcon } from '@phosphor-icons/react';

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button onClick={handleCopy} className="p-1 rounded text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors">
      {copied ? <CheckIcon size={13} className="text-success" /> : <CopyIcon size={13} />}
    </button>
  );
}