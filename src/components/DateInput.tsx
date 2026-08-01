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

  const makeDigitHandler = (
    current: string,
    setCurrent: (v: string) => void,
    maxLen: number,
    maxValue: number | null,
    onFull: () => void,
    onBackAtEmpty: () => void,
    other: { day: string; month: string; year: string },
  ) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') return;
    e.preventDefault();

    if (e.key === 'Backspace') {
      if (current === '') {
        onBackAtEmpty();
        return;
      }
      const next = current.slice(0, -1);
      setCurrent(next);
      commit(
        setCurrent === setDayStr ? next : other.day,
        setCurrent === setMonthStr ? next : other.month,
        setCurrent === setYearStr ? next : other.year
      );
      return;
    }
    if (!/^[0-9]$/.test(e.key)) return;

    const appended = (current + e.key).slice(-maxLen);
    const isFull = appended.length === maxLen;
    const clamped = maxValue && isFull ? String(Math.max(1, Math.min(maxValue, parseInt(appended, 10)))).padStart(maxLen, '0') : appended;

    setCurrent(clamped);
    commit(
      setCurrent === setDayStr ? clamped : other.day,
      setCurrent === setMonthStr ? clamped : other.month,
      setCurrent === setYearStr ? clamped : other.year
    );
    if (isFull) onFull();
  };

  const handleDayKeyDown = makeDigitHandler(
    dayStr, setDayStr, 2, 31,
    () => monthRef.current?.focus(),
    () => {},
    { day: dayStr, month: monthStr, year: yearStr }
  );
  const handleMonthKeyDown = makeDigitHandler(
    monthStr, setMonthStr, 2, 12,
    () => yearRef.current?.focus(),
    () => dayRef.current?.focus(),
    { day: dayStr, month: monthStr, year: yearStr }
  );
  const handleYearKeyDown = makeDigitHandler(
    yearStr, setYearStr, 4, null,
    () => {},
    () => monthRef.current?.focus(),
    { day: dayStr, month: monthStr, year: yearStr }
  );

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