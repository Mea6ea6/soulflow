import { useRef, useState, useEffect } from 'react';

const CODE_LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export default function OtpInput({ value, onChange, autoFocus }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => {
    const arr = value.split('').slice(0, CODE_LENGTH);
    while (arr.length < CODE_LENGTH) arr.push('');
    return arr;
  });
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (next: string[]) => {
    setDigits(next);
    onChange(next.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = '';
        commit(next);
      } else if (index > 0) {
        next[index - 1] = '';
        commit(next);
        refs.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft' && index > 0) { refs.current[index - 1]?.focus(); return; }
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) { refs.current[index + 1]?.focus(); return; }
    if (!/^[0-9]$/.test(e.key)) return;

    e.preventDefault();
    const next = [...digits];
    next[index] = e.key;
    commit(next);
    if (index < CODE_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split('');
    while (next.length < CODE_LENGTH) next.push('');
    commit(next);
    refs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          value={digit}
          onChange={() => {}}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          maxLength={1}
          className="w-11 h-13 shrink-0 text-center text-lg font-semibold rounded-xl border border-border bg-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      ))}
    </div>
  );
}