import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { SlashGroup, SlashItem } from '../extensions/slashCommandItems';

interface BlockMenuListProps {
  groups: SlashGroup[];
  onSelect: (item: SlashItem) => void;
  onClose?: () => void;
}

const BlockMenuList = forwardRef<unknown, BlockMenuListProps>(({ groups, onSelect, onClose }, ref) => {
  const { t } = useTranslation();
  const flatItems = groups.flatMap((g) => g.items);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSelectedIndex(0), [groups]);

  useEffect(() => {
    if (!onClose) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [onClose]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') { setSelectedIndex((prev) => (prev + flatItems.length - 1) % flatItems.length); return true; }
      if (event.key === 'ArrowDown') { setSelectedIndex((prev) => (prev + 1) % flatItems.length); return true; }
      if (event.key === 'Enter') { onSelect(flatItems[selectedIndex]); return true; }
      return false;
    },
  }));

  if (flatItems.length === 0) return null;
  let runningIndex = -1;

  return (
    <div ref={containerRef} className="w-56 max-h-80 overflow-y-auto bg-surface border border-border rounded-xl shadow-card-hover p-1">
      {groups.map((group) => (
        <div key={group.labelKey} className="mb-1 last:mb-0">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{t(group.labelKey)}</p>
          {group.items.map((item) => {
            runningIndex += 1;
            const index = runningIndex;
            const Icon = item.icon;
            return (
              <button
                key={item.titleKey}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(item)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  index === selectedIndex ? 'bg-primary-tint text-primary' : 'text-text-primary hover:bg-surface-hover'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {t(item.titleKey)}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});

export default BlockMenuList;