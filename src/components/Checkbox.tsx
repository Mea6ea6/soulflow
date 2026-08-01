import { CheckIcon } from '@phosphor-icons/react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export default function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none w-fit">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
          checked ? 'bg-primary border-primary' : 'border-border bg-bg hover:border-text-tertiary'
        }`}
      >
        {checked && <CheckIcon size={12} weight="bold" className="text-white" />}
      </button>
      {label}
    </label>
  );
}