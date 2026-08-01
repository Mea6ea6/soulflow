interface RadioProps {
  checked: boolean;
  onChange: () => void;
  label: string;
}

export default function Radio({ checked, onChange, label }: RadioProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none w-fit">
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={onChange}
        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
          checked ? 'border-primary' : 'border-border hover:border-text-tertiary'
        }`}
      >
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </button>
      {label}
    </label>
  );
}