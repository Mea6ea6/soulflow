import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  label?: string;
}

export default function Select({ value, onChange, options, placeholder, label }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setIsOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      {label && <label className="text-sm font-medium text-text-secondary mb-1 block">{label}</label>}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-bg text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className={selected ? 'text-text-primary' : 'text-text-tertiary'}>
          {selected ? selected.label : placeholder}
        </span>
        <CaretDownIcon size={14} className={`text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && rect && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 300 }}
          className="max-h-56 overflow-y-auto bg-surface border border-border rounded-xl shadow-card-hover p-1"
        >
          {options.length === 0 && <p className="px-3 py-2 text-sm text-text-tertiary">—</p>}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:bg-surface-hover transition-colors ${
                opt.value === value ? 'text-primary font-medium' : 'text-text-primary'
              }`}
            >
              {opt.label}
              {opt.value === value && <CheckIcon size={14} weight="bold" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}