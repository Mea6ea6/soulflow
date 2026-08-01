import { useRef, useState } from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react';

interface DateInputProps {
  value: string; // 'YYYY-MM-DD' или ''
  onChange: (value: string) => void;
  label?: string;
}

export default function DateInput({ value, onChange, label }: DateInputProps) {
  const [y, m, d] = value ? value.split('-') : ['', '', ''];
  const [dayStr, setDayStr] = useState(d ?? '');
  const [monthStr, setMonthStr] = useState(m ?? '');
  const [yearStr, setYearStr] = useState(y ?? '');
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const commit = (dd: string, mm: string, yyyy: string) => {
    onChange(dd.length === 2 && mm.length === 2 && yyyy.length === 4 ? `${yyyy}-${mm}-${dd}` : '');
  };

  const handleDayKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') return;
    e.preventDefault();

    if (e.key === 'Backspace') {
      const next = dayStr.slice(0, -1);
      setDayStr(next);
      commit(next, monthStr, yearStr);
      return;
    }
    if (!/^[0-9]$/.test(e.key)) return;

    const appended = (dayStr + e.key).slice(-2);
    const isFull = appended.length === 2;
    const next = isFull ? String(Math.max(1, Math.min(31, parseInt(appended, 10)))).padStart(2, '0') : appended;

    setDayStr(next);
    commit(next, monthStr, yearStr);
    if (isFull) monthRef.current?.focus();
  };

  const handleMonthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') return;
    e.preventDefault();

    if (e.key === 'Backspace') {
      if (monthStr === '') { dayRef.current?.focus(); return; }
      const next = monthStr.slice(0, -1);
      setMonthStr(next);
      commit(dayStr, next, yearStr);
      return;
    }
    if (!/^[0-9]$/.test(e.key)) return;

    const appended = (monthStr + e.key).slice(-2);
    const isFull = appended.length === 2;
    const next = isFull ? String(Math.max(1, Math.min(12, parseInt(appended, 10)))).padStart(2, '0') : appended;

    setMonthStr(next);
    commit(dayStr, next, yearStr);
    if (isFull) yearRef.current?.focus();
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') return;
    e.preventDefault();

    if (e.key === 'Backspace') {
      if (yearStr === '') { monthRef.current?.focus(); return; }
      const next = yearStr.slice(0, -1);
      setYearStr(next);
      commit(dayStr, monthStr, next);
      return;
    }
    if (!/^[0-9]$/.test(e.key)) return;

    const appended = (yearStr + e.key).slice(-4);
    setYearStr(appended);
    commit(dayStr, monthStr, appended);
  };

  return (
    <div>
      {label && <label className="text-sm font-medium text-text-secondary mb-1 block">{label}</label>}
      <div className="flex items-center gap-1 w-fit px-3 py-2 rounded-xl border border-border bg-bg focus-within:ring-2 focus-within:ring-primary">
        <CalendarBlankIcon size={15} className="text-text-tertiary mr-1" />
        <input
          ref={dayRef}
          type="text"
          inputMode="numeric"
          value={dayStr}
          onKeyDown={handleDayKeyDown}
          onChange={() => {}}
          placeholder="ДД"
          maxLength={2}
          className="w-6 text-center text-sm text-text-primary bg-transparent focus:outline-none"
        />
        <span className="text-text-tertiary">.</span>
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          value={monthStr}
          onKeyDown={handleMonthKeyDown}
          onChange={() => {}}
          placeholder="ММ"
          maxLength={2}
          className="w-6 text-center text-sm text-text-primary bg-transparent focus:outline-none"
        />
        <span className="text-text-tertiary">.</span>
        <input
          ref={yearRef}
          type="text"
          inputMode="numeric"
          value={yearStr}
          onKeyDown={handleYearKeyDown}
          onChange={() => {}}
          placeholder="ГГГГ"
          maxLength={4}
          className="w-10 text-center text-sm text-text-primary bg-transparent focus:outline-none"
        />
      </div>
    </div>
  );
}