import { MinusIcon, PlusIcon } from '@phosphor-icons/react';

interface CountStepperProps {
  value: number;
  onChange: (v: number) => void;
}

export default function CountStepper({ value, onChange }: CountStepperProps) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-bg overflow-hidden shrink-0">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-6 h-7 flex items-center justify-center text-text-secondary hover:bg-surface-hover transition-colors"
      >
        <MinusIcon size={11} />
      </button>
      <span className="w-6 text-center text-xs font-medium text-text-primary tabular-nums select-none">
        {value}
      </span>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onChange(value + 1)}
        className="w-6 h-7 flex items-center justify-center text-text-secondary hover:bg-surface-hover transition-colors"
      >
        <PlusIcon size={11} />
      </button>
    </div>
  );
}