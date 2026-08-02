import { CheckIcon } from '@phosphor-icons/react';
import type { ThemeId } from '../types';

const SWATCH_COLORS: Record<ThemeId, { bg: string; accent: string }> = {
  dawn: { bg: '#F5F6F8', accent: '#2E6FE2' },
  dusk: { bg: '#0B0E14', accent: '#5B93F5' },
  onyx: { bg: '#0A0A0B', accent: '#4C8DF5' },
};

interface ThemeSwatchProps {
  themeId: ThemeId;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function ThemeSwatch({ themeId, label, isSelected, onClick }: ThemeSwatchProps) {
  const colors = SWATCH_COLORS[themeId];

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group" title={label}>
      <div
        className={`relative w-16 h-16 rounded-xl border-2 flex items-end justify-end p-2 transition-all duration-200 ${
          isSelected ? 'border-primary' : 'border-border group-hover:border-text-tertiary'
        }`}
        style={{ backgroundColor: colors.bg }}
      >
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors.accent }} />
        {isSelected && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <CheckIcon size={12} weight="bold" className="text-white" />
          </div>
        )}
      </div>
      <span className={`text-xs font-medium ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
        {label}
      </span>
    </button>
  );
}