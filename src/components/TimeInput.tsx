import { useRef, useState } from 'react';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function TimeInput({ value, onChange, label }: TimeInputProps) {
  const [hourStr, setHourStr] = useState(() => (value ? value.split(':')[0] ?? '' : ''));
  const [minuteStr, setMinuteStr] = useState(() => (value ? value.split(':')[1] ?? '' : ''));
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  const commit = (h: string, m: string) => {
    onChange(h.length === 2 && m.length === 2 ? `${h}:${m}` : '');
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') return;
    e.preventDefault();

    if (e.key === 'Backspace') {
      const next = hourStr.slice(0, -1);
      setHourStr(next);
      commit(next, minuteStr);
      return;
    }
    if (!/^[0-9]$/.test(e.key)) return;

    const appended = (hourStr + e.key).slice(-2);
    const asNumber = Math.min(23, parseInt(appended, 10));
    const isFull = appended.length === 2;
    const next = isFull ? String(asNumber).padStart(2, '0') : appended;

    setHourStr(next);
    commit(next, minuteStr);
    if (isFull) minuteRef.current?.focus();
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') return;
    e.preventDefault();

    if (e.key === 'Backspace') {
      if (minuteStr === '') {
        hourRef.current?.focus();
        return;
      }
      const next = minuteStr.slice(0, -1);
      setMinuteStr(next);
      commit(hourStr, next);
      return;
    }
    if (!/^[0-9]$/.test(e.key)) return;

    const appended = (minuteStr + e.key).slice(-2);
    const asNumber = Math.min(59, parseInt(appended, 10));
    const isFull = appended.length === 2;
    const next = isFull ? String(asNumber).padStart(2, '0') : appended;

    setMinuteStr(next);
    commit(hourStr, next);
  };

  return (
    <div>
      {label && <label className="text-sm font-medium text-text-secondary mb-1 block">{label}</label>}
      <div className="flex items-center gap-1 w-fit px-3 py-2 rounded-xl border border-border bg-bg focus-within:ring-2 focus-within:ring-primary">
        <input
          ref={hourRef}
          type="text"
          inputMode="numeric"
          value={hourStr}
          onKeyDown={handleHourKeyDown}
          onChange={() => {}}
          placeholder="--"
          maxLength={2}
          className="w-6 text-center text-sm text-text-primary bg-transparent focus:outline-none"
        />
        <span className="text-text-tertiary">:</span>
        <input
          ref={minuteRef}
          type="text"
          inputMode="numeric"
          value={minuteStr}
          onKeyDown={handleMinuteKeyDown}
          onChange={() => {}}
          placeholder="--"
          maxLength={2}
          className="w-6 text-center text-sm text-text-primary bg-transparent focus:outline-none"
        />
      </div>
    </div>
  );
}