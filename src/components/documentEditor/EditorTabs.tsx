import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileTextIcon, CircleIcon, XIcon, PlusIcon, SunIcon, MoonIcon } from '@phosphor-icons/react';
import type { EditorTab } from '../../context/DocumentEditorContextDef';
import type { ContentTheme } from '../../utils/editorTheme';

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string;
  dirtyTabs: Record<string, boolean>;
  contentTheme: ContentTheme;
  onSelectTab: (id: string) => void;
  onRequestCloseTab: (id: string) => void;
  onReorderTabs: (fromId: string, toId: string) => void;
  onNewDocument: () => void;
  onToggleContentTheme: () => void;
  onRequestCloseAll: () => void;
}

export default function EditorTabs({
  tabs, activeTabId, dirtyTabs, contentTheme,
  onSelectTab, onRequestCloseTab, onReorderTabs,
  onNewDocument, onToggleContentTheme, onRequestCloseAll,
}: EditorTabsProps) {
  const { t } = useTranslation();
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (draggedTabId && draggedTabId !== targetId) onReorderTabs(draggedTabId, targetId);
    setDraggedTabId(null);
    setDropTargetId(null);
  };

  return (
    <div className="flex items-center border-b border-border bg-surface shrink-0 pr-2">
      <div className="flex-1 flex items-center overflow-x-auto">
        {tabs.map((tab) => {
          const label = tab.target.document?.title || t('textEditor.titlePlaceholder');
          const isActive = tab.id === activeTabId;
          const isDirty = dirtyTabs[tab.id];
          return (
            <div key={tab.id} className="relative shrink-0">
              {dropTargetId === tab.id && draggedTabId !== tab.id && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary z-10" />
              )}
              <div
                draggable
                onDragStart={() => setDraggedTabId(tab.id)}
                onDragOver={(e) => { e.preventDefault(); setDropTargetId(tab.id); }}
                onDragLeave={() => setDropTargetId((prev) => (prev === tab.id ? null : prev))}
                onDrop={() => handleDrop(tab.id)}
                onDragEnd={() => { setDraggedTabId(null); setDropTargetId(null); }}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex items-center gap-2 px-4 py-2.5 border-r border-border cursor-pointer max-w-50 ${
                  isActive ? 'bg-bg' : 'hover:bg-surface-hover'
                } ${draggedTabId === tab.id ? 'opacity-40' : ''}`}
              >
                {isDirty ? (
                  <CircleIcon size={7} weight="fill" className="shrink-0 text-primary" />
                ) : (
                  <FileTextIcon size={13} className="shrink-0 text-text-tertiary" />
                )}
                <span className="text-xs truncate">{label}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRequestCloseTab(tab.id); }}
                  className="shrink-0 p-0.5 rounded text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-border hover:text-text-primary transition-opacity"
                >
                  <XIcon size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onNewDocument}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-tint text-primary text-xs font-medium hover:bg-primary hover:text-white transition-colors mr-1"
        title={t('documentEditor.newDocument')}
      >
        <PlusIcon size={14} weight="bold" />
        {t('documentEditor.newDocumentShort')}
      </button>

      <button onClick={onToggleContentTheme} className="p-2 rounded-md hover:bg-surface-hover text-text-secondary shrink-0" title={contentTheme === 'light' ? t('documentEditor.darkTheme') : t('documentEditor.lightTheme')}>
        {contentTheme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
      </button>
      <button onClick={onRequestCloseAll} className="p-2 rounded-md hover:bg-surface-hover text-text-secondary shrink-0" title={t('common.close')}>
        <XIcon size={18} />
      </button>
    </div>
  );
}