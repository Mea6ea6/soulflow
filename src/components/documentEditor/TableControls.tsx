import { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { useTranslation } from 'react-i18next';
import { RowsIcon, ColumnsIcon, TableIcon, TrashIcon } from '@phosphor-icons/react';
import CountStepper from './CountStepper';

interface TableControlsProps {
  editor: Editor;
}

export default function TableControls({ editor }: TableControlsProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [rowCount, setRowCount] = useState(1);
  const [colCount, setColCount] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const addRows = () => {
    for (let i = 0; i < rowCount; i++) editor.chain().focus().addRowAfter().run();
    setRowCount(1);
    setIsOpen(false);
  };
  const addCols = () => {
    for (let i = 0; i < colCount; i++) editor.chain().focus().addColumnAfter().run();
    setColCount(1);
    setIsOpen(false);
  };
  const deleteRow = () => { editor.chain().focus().deleteRow().run(); setIsOpen(false); };
  const deleteColumn = () => { editor.chain().focus().deleteColumn().run(); setIsOpen(false); };
  const deleteTable = () => { editor.chain().focus().deleteTable().run(); setIsOpen(false); };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen((v) => !v)}
        className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
          isOpen ? 'bg-primary-tint text-primary' : 'bg-surface border border-border text-text-secondary hover:bg-surface-hover'
        }`}
        title={t('textEditor.tableControls')}
      >
        <TableIcon size={14} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-surface border border-border rounded-xl shadow-card-hover p-1 z-30 flex flex-col">
          <div className="flex items-center gap-1.5 px-1 py-1">
            <CountStepper value={rowCount} onChange={setRowCount} />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={addRows}
              className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left text-text-primary hover:bg-surface-hover transition-colors"
            >
              <RowsIcon size={14} className="shrink-0 text-text-tertiary" />
              {t('textEditor.addRows')}
            </button>
          </div>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={deleteRow}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left text-error hover:bg-error/10 transition-colors"
          >
            <TrashIcon size={14} className="shrink-0" />
            {t('textEditor.deleteRow')}
          </button>

          <div className="h-px bg-border my-1" />

          <div className="flex items-center gap-1.5 px-1 py-1">
            <CountStepper value={colCount} onChange={setColCount} />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={addCols}
              className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left text-text-primary hover:bg-surface-hover transition-colors"
            >
              <ColumnsIcon size={14} className="shrink-0 text-text-tertiary" />
              {t('textEditor.addColumns')}
            </button>
          </div>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={deleteColumn}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left text-error hover:bg-error/10 transition-colors"
          >
            <TrashIcon size={14} className="shrink-0" />
            {t('textEditor.deleteColumn')}
          </button>

          <div className="h-px bg-border my-1" />

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={deleteTable}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left font-medium text-error hover:bg-error/10 transition-colors"
          >
            <TrashIcon size={14} className="shrink-0" />
            {t('textEditor.deleteTable')}
          </button>
        </div>
      )}
    </div>
  );
}