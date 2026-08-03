import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SlashItem } from '../extensions/slashCommandItems';

interface SlashMenuListProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

const SlashMenuList = forwardRef<unknown, SlashMenuListProps>((props, ref) => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) return null;

  return (
    <div className="w-56 max-h-72 overflow-y-auto bg-surface border border-border rounded-xl shadow-card-hover p-1">
      {props.items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.titleKey}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectItem(index)}
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
  );
});

export default SlashMenuList;