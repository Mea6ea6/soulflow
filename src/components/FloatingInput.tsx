import { useState, type InputHTMLAttributes, type ReactNode } from 'react';

interface FloatingInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  label: string;
  icon?: ReactNode;
}

export default function FloatingInput({ label, icon, id, className, value, onFocus, onBlur, ...props }: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const isFloated = isFocused || hasValue;
  const inputId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none z-10">
          {icon}
        </span>
      )}
      <input
        id={inputId}
        value={value}
        onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
        placeholder=""
        className={`peer w-full ${icon ? 'pl-9' : 'pl-3'} pr-3 pt-4 pb-1.5 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-shadow ${className ?? ''}`}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={`absolute ${icon ? 'left-9' : 'left-3'} text-text-tertiary pointer-events-none transition-all duration-200 ease-out ${
          isFloated ? 'top-1.5 text-[10px] font-medium' : 'top-1/2 -translate-y-1/2 text-sm'
        }`}
      >
        {label}
      </label>
    </div>
  );
}