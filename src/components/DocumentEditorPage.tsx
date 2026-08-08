import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Extension, type Editor } from '@tiptap/core';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { motion } from 'motion/react';
import {
  DownloadSimpleIcon, XIcon, MagnifyingGlassIcon, PlusIcon, FileTextIcon,
  SunIcon, MoonIcon, DotsThreeIcon, TrashIcon, ArrowsLeftRightIcon, CircleIcon,
  CaretLineLeftIcon, CaretLineRightIcon, TextBolderIcon, TextItalicIcon, TextUnderlineIcon,
  RowsIcon, ColumnsIcon, TableIcon, MinusIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { Document } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { useDocuments, useClients, addDocument, updateDocument, deleteDocument } from '../hooks/useDB';
import { downloadAsTxt, downloadAsPdf, downloadAsDocx, downloadOriginalFile, MIME_TYPES } from '../utils/fileExport';
import type { DocumentEditorTarget, EditorTab } from '../context/DocumentEditorContextDef';
import { SlashCommand } from '../extensions/slashCommand';
import { getSlashCommandGroups } from '../extensions/slashCommandItems';
import ConfirmDialog from './ConfirmDialog';
import DocumentTargetModal, { type DocumentTarget } from './DocumentTargetModal';
import DocumentTypeModal, { type DocumentTypeChange } from './DocumentTypeModal';
import Select from './Select';
import BlockMenuList from './BlockMenuList';

interface DocumentEditorPageProps {
  tabs: EditorTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onOpenTab: (target: DocumentEditorTarget) => void;
  onUpdateTabTarget: (id: string, target: DocumentEditorTarget) => void;
  onReorderTabs: (fromId: string, toId: string) => void;
  onCloseAll: () => void;
}

type SortOrder = 'newest' | 'oldest' | 'title';
type ContentTheme = 'light' | 'dark';

const CONTENT_THEME_STORAGE_KEY = 'soulflow_editor_content_theme';
const SIDEBAR_COLLAPSED_KEY = 'soulflow_editor_sidebar_collapsed';
const AUTOSAVE_DELAY_MS = 1200;

const CONTENT_THEME_VARS: Record<ContentTheme, { bg: string; text: string; secondary: string; hover: string }> = {
  light: { bg: '#ffffff', text: '#191919', secondary: '#8b8b89', hover: '#f1f1ef' },
  dark: { bg: '#1f1f1f', text: '#e9e9e7', secondary: '#9b9b9b', hover: '#2a2a2c' },
};

const EDITOR_FONT_CSS = '"InterVariable", sans-serif';

function initialContentFor(doc: Document | null): string | object {
  if (!doc) return '';
  if (doc.type === 'txt') {
    try { return JSON.parse(doc.content); } catch { return `<p>${doc.content}</p>`; }
  }
  return `<p>${doc.content.replace(/\n/g, '</p><p>')}</p>`;
}

interface TableControlsProps {
  editor: Editor;
}

// Компактный степпер количества строк/колонок — заменяет нативный <input type="number">
function CountStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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

function TableControls({ editor }: TableControlsProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [rowCount, setRowCount] = useState(1);
  const [colCount, setColCount] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику вне меню (как у остальных выпадающих меню в приложении)
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

interface DocumentEditorPanelProps {
  target: DocumentEditorTarget;
  isActive: boolean;
  contentTheme: ContentTheme;
  onDirtyChange: (dirty: boolean) => void;
  onSavedDocument: (doc: Document) => void;
}

function DocumentEditorPanel({ target, isActive, contentTheme, onDirtyChange, onSavedDocument }: DocumentEditorPanelProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();

  const isReadonly = !!target.document && target.document.type !== 'txt';
  const [title, setTitle] = useState(target.document?.title ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);
  const isInitializingRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTargetRef = useRef(target);
  const saveRef = useRef<() => void>(() => {});

  useEffect(() => { currentTargetRef.current = target; }, [target]);

  const shortcutsExtension = useMemo(
    () => Extension.create({
      name: 'soulflowShortcuts',
      addKeyboardShortcuts() {
        return {
          Tab: () => { this.editor.commands.insertContent('\u00A0\u00A0\u00A0\u00A0'); return true; },
          'Mod-s': () => { saveRef.current(); return true; },
        };
      },
    }),
    []
  );

  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TaskList, TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      SlashCommand, shortcutsExtension,
    ],
    content: initialContentFor(target.document),
    editable: !isReadonly,
  });

  // Активные состояния форматирования (bold/italic/underline) для панели выделения текста.
  // useEditorState подписывается на транзакции редактора и переcчитывает селектор при каждом
  // изменении selection/marks — без этого className в BubbleMenu считался бы один раз при
  // рендере DocumentEditorPanel и не обновлялся бы при простом изменении выделения.
  const bubbleMenuState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) return { isBold: false, isItalic: false, isUnderline: false };
      return {
        isBold: ctx.editor.isActive('bold'),
        isItalic: ctx.editor.isActive('italic'),
        isUnderline: ctx.editor.isActive('underline'),
      };
    },
  });

  useEffect(() => { queueMicrotask(() => { isInitializingRef.current = false; }); }, []);

  const doSave = useCallback(async () => {
    if (!editor || !masterKey || isReadonly) return;
    const tgt = currentTargetRef.current;
    const plainText = editor.getText();
    const contentJson = JSON.stringify(editor.getJSON());
    try {
      if (tgt.document) {
        const finalTitle = title.trim() || plainText.slice(0, 50) || 'Untitled';
        await updateDocument(tgt.document.id, { title: finalTitle, content: contentJson }, masterKey);
        onSavedDocument({ ...tgt.document, title: finalTitle, content: contentJson, updatedAt: new Date().toISOString() });
      } else {
        const finalTitle = title.trim() || plainText.slice(0, 50) || 'Untitled';
        const now = new Date().toISOString();
        const newId = await addDocument(
          { title: finalTitle, type: 'txt', content: contentJson, clientId: tgt.isPersonal ? null : tgt.clientId, isPersonal: tgt.isPersonal, origin: 'created' },
          masterKey
        );
        onSavedDocument({ id: newId, title: finalTitle, type: 'txt', content: contentJson, clientId: tgt.isPersonal ? null : tgt.clientId, isPersonal: tgt.isPersonal, origin: 'created', createdAt: now, updatedAt: now });
      }
      onDirtyChange(false);
    } catch {
      setError(t('textEditor.saveFailed'));
    }
  }, [editor, masterKey, isReadonly, title, onDirtyChange, onSavedDocument, t]);

  useEffect(() => { saveRef.current = doSave; }, [doSave]);

  const scheduleAutosave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { doSave(); }, AUTOSAVE_DELAY_MS);
  }, [doSave]);

  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      if (isInitializingRef.current) return;
      onDirtyChange(true);
      scheduleAutosave();
    };
    editor.on('update', handleUpdate);
    return () => { editor.off('update', handleUpdate); };
  }, [editor, onDirtyChange, scheduleAutosave]);

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isInitializingRef.current) { onDirtyChange(true); scheduleAutosave(); }
  };

  if (!editor) return null;
  const colors = CONTENT_THEME_VARS[contentTheme];
  const groups = getSlashCommandGroups();

  return (
    <div className="flex-1 flex-col min-h-0" style={{ display: isActive ? 'flex' : 'none' }}>
      {isReadonly && (
        <div className="px-6 py-2 text-xs text-warning bg-warning/10 shrink-0">
          {t('textEditor.readOnlyNotice', { type: target.document?.type.toUpperCase() })}
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto cursor-text relative"
        style={{ backgroundColor: colors.bg, color: colors.text, fontFamily: EDITOR_FONT_CSS }}
        onClick={() => editor.chain().focus().run()}
      >
        <div className="max-w-3xl mx-auto px-10 py-10">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={isReadonly}
            placeholder={t('textEditor.titlePlaceholder')}
            className="w-full text-3xl font-display font-semibold bg-transparent focus:outline-none disabled:opacity-70 mb-6"
            style={{ color: colors.text }}
            onClick={(e) => e.stopPropagation()}
          />

          <div className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[50vh]" onClick={(e) => e.stopPropagation()}>
            {!isReadonly && (
              <>
                <FloatingMenu editor={editor} options={{ placement: 'left-start', offset: 4 }}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setIsBlockMenuOpen((v) => !v)}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-(--fm-hover)"
                    style={{ color: colors.secondary, ['--fm-hover' as string]: colors.hover }}
                  >
                    <PlusIcon size={16} />
                  </button>
                  {isBlockMenuOpen && (
                    <div className="absolute left-8 top-0 z-50">
                      <BlockMenuList
                        groups={groups}
                        onSelect={(item) => {
                          const { from } = editor.state.selection;
                          item.command({ editor, range: { from, to: from } });
                          setIsBlockMenuOpen(false);
                        }}
                        onClose={() => setIsBlockMenuOpen(false)}
                      />
                    </div>
                  )}
                </FloatingMenu>

                {/* Панель форматирования при выделении текста — стиль под проект */}
                <BubbleMenu
                  editor={editor}
                  pluginKey="textBubbleMenu"
                  updateDelay={100}
                  shouldShow={({ editor: ed, state }) => {
                    const { from, to } = state.selection;
                    return from !== to && !ed.isActive('table');
                  }}
                >
                  <div className="flex items-center gap-1 p-1 rounded-full bg-surface border border-border shadow-card-hover">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${bubbleMenuState.isBold ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-hover'}`}
                    >
                      <TextBolderIcon size={14} />
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${bubbleMenuState.isItalic ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-hover'}`}
                    >
                      <TextItalicIcon size={14} />
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${bubbleMenuState.isUnderline ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-hover'}`}
                    >
                      <TextUnderlineIcon size={14} />
                    </button>
                  </div>
                </BubbleMenu>

                <BubbleMenu
                  editor={editor}
                  pluginKey="tableBubbleMenu"
                  updateDelay={100}
                  options={{
                    placement: 'top-start',
                    offset: 6,
                  }}
                  getReferencedVirtualElement={() => {
                    const { selection } = editor.state;
                    const domResult = editor.view.domAtPos(selection.from);
                    const el = (domResult.node.nodeType === 3 ? domResult.node.parentElement : domResult.node) as HTMLElement | null;
                    const tableEl = el?.closest('table');
                    if (!tableEl) return null;
                    return {
                      getBoundingClientRect: () => tableEl.getBoundingClientRect(),
                      contextElement: tableEl,
                    };
                  }}
                  shouldShow={({ editor: ed }) => ed.isActive('table')}
                >
                  <TableControls editor={editor} />
                </BubbleMenu>
              </>
            )}
            <EditorContent editor={editor} className="prose prose-sm max-w-none" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-2 text-sm text-error bg-error/10 rounded-xl px-3 py-2 shrink-0">{error}</div>
      )}
    </div>
  );
}

export default function DocumentEditorPage({ tabs, activeTabId, onSelectTab, onCloseTab, onOpenTab, onUpdateTabTarget, onReorderTabs, onCloseAll }: DocumentEditorPageProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const allDocuments = useDocuments(masterKey);
  const clients = useClients(masterKey);

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [contentTheme, setContentTheme] = useState<ContentTheme>(() => (localStorage.getItem(CONTENT_THEME_STORAGE_KEY) as ContentTheme | null) ?? 'light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
  const [dirtyTabs, setDirtyTabs] = useState<Record<string, boolean>>({});
  const [tabPendingClose, setTabPendingClose] = useState<string | null>(null);
  const [isClosingAll, setIsClosingAll] = useState(false);
  const [sidebarActionDoc, setSidebarActionDoc] = useState<Document | null>(null);
  const [sidebarDeleteDoc, setSidebarDeleteDoc] = useState<Document | null>(null);
  const [sidebarTypeChangeDoc, setSidebarTypeChangeDoc] = useState<Document | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const sidebarDocs = useMemo(() => {
    let list = allDocuments ?? [];
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((d) => {
        const clientName = d.clientId ? (clientNameById.get(d.clientId) ?? '') : '';
        return d.title.toLowerCase().includes(query) || clientName.toLowerCase().includes(query);
      });
    }
    return [...list].sort((a, b) => {
      if (sortOrder === 'title') return a.title.localeCompare(b.title);
      return sortOrder === 'newest' ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt);
    });
  }, [allDocuments, search, sortOrder, clientNameById]);

  useEffect(() => {
    if (!sidebarActionDoc) return;
    const handler = (e: MouseEvent) => {
      if (!actionMenuRef.current?.contains(e.target as Node)) setSidebarActionDoc(null);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [sidebarActionDoc]);

  const handleToggleContentTheme = () => {
    setContentTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(CONTENT_THEME_STORAGE_KEY, next);
      return next;
    });
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  const requestCloseTab = (id: string) => {
    if (dirtyTabs[id]) setTabPendingClose(id);
    else onCloseTab(id);
  };

  const confirmCloseTab = () => {
    if (tabPendingClose) {
      setDirtyTabs((prev) => { const next = { ...prev }; delete next[tabPendingClose]; return next; });
      onCloseTab(tabPendingClose);
    }
    setTabPendingClose(null);
  };

  const requestCloseAll = () => {
    if (Object.values(dirtyTabs).some(Boolean)) setIsClosingAll(true);
    else onCloseAll();
  };

  const confirmCloseAll = () => {
    setIsClosingAll(false);
    setDirtyTabs({});
    onCloseAll();
  };

  const handleNewDocConfirm = (target: DocumentTarget) => {
    setIsCreatingNew(false);
    onOpenTab({ document: null, clientId: target.clientId, isPersonal: target.isPersonal });
  };

  const handleSidebarDelete = async () => {
    if (sidebarDeleteDoc) {
      await deleteDocument(sidebarDeleteDoc.id);
      const openTab = tabs.find((tab) => tab.target.document?.id === sidebarDeleteDoc.id);
      if (openTab) onCloseTab(openTab.id);
    }
    setSidebarDeleteDoc(null);
  };

  const handleSidebarTypeChange = async (change: DocumentTypeChange) => {
    if (sidebarTypeChangeDoc && masterKey) {
      await updateDocument(sidebarTypeChangeDoc.id, change, masterKey);
      const openTab = tabs.find((tab) => tab.target.document?.id === sidebarTypeChangeDoc.id);
      if (openTab) onUpdateTabTarget(openTab.id, { ...openTab.target, ...change });
    }
    setSidebarTypeChangeDoc(null);
  };

  const handleSidebarExport = (doc: Document, format: 'txt' | 'pdf' | 'docx') => {
    if (doc.type === 'txt') {
      let json: object | null = null;
      let text = doc.content;
      try {
        json = JSON.parse(doc.content);
        text = extractPlainText(json as { text?: string; content?: unknown[] });
      } catch { /* уже plain text — оставляем как есть */ }
      if (format === 'txt') downloadAsTxt(text, doc.title);
      if (format === 'pdf') {
        if (json) downloadAsPdf(json, doc.title);
        else downloadAsPdf({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }, doc.title);
      }
      if (format === 'docx') {
        if (json) downloadAsDocx(json, doc.title);
        else downloadAsDocx({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }, doc.title);
      }
    } else if (doc.originalFileBase64) {
      downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
    }
    setSidebarActionDoc(null);
  };

  const handleTabDrop = (targetId: string) => {
    if (draggedTabId && draggedTabId !== targetId) onReorderTabs(draggedTabId, targetId);
    setDraggedTabId(null);
    setDropTargetId(null);
  };

  return (
    <div className="fixed inset-0 z-60 flex bg-bg text-text-primary">
      <motion.div
        animate={{ width: isSidebarCollapsed ? 40 : 288 }}
        transition={{ type: 'spring', mass: 1, stiffness: 200, damping: 24 }}
        className="shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden"
      >
        {isSidebarCollapsed ? (
          <button onClick={handleToggleSidebar} className="p-2 m-2 rounded-md bg-surface-hover text-text-secondary hover:text-text-primary self-center" title={t('documentEditor.expandSidebar')}>
            <CaretLineRightIcon size={16} />
          </button>
        ) : (
          <div className="w-72 flex flex-col h-full">
            <div className="p-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t('documentEditor.title')}</h2>
              <button onClick={handleToggleSidebar} className="p-1.5 rounded-md bg-surface-hover text-text-secondary hover:text-text-primary" title={t('documentEditor.collapseSidebar')}>
                <CaretLineLeftIcon size={16} />
              </button>
            </div>

            <div className="px-4 pb-3 flex flex-col gap-2">
              <div className="relative">
                <MagnifyingGlassIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('documentEditor.searchPlaceholder')}
                  className="w-full pl-8 pr-2 py-2 rounded-xl border border-border bg-bg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Select
                value={sortOrder}
                onChange={(v) => setSortOrder(v as SortOrder)}
                options={[
                  { value: 'newest', label: t('documentEditor.sortNewest') },
                  { value: 'oldest', label: t('documentEditor.sortOldest') },
                  { value: 'title', label: t('documentEditor.sortTitle') },
                ]}
                placeholder={t('documentEditor.sortNewest')}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {sidebarDocs.length === 0 && (
                <p className="text-xs text-text-tertiary text-center py-8">{t('documentEditor.empty')}</p>
              )}
              {sidebarDocs.map((doc) => {
                const openTab = tabs.find((tab) => tab.target.document?.id === doc.id);
                const isActive = openTab?.id === activeTabId;
                const isMenuOpen = sidebarActionDoc?.id === doc.id;
                return (
                  <div key={doc.id} className={`group relative w-full rounded-md mb-0.5 transition-colors ${isActive ? 'bg-primary-tint' : 'hover:bg-surface-hover'}`}>
                    <button
                      onClick={() => onOpenTab({ document: doc, clientId: doc.clientId, isPersonal: doc.isPersonal })}
                      className="w-full text-left px-3 py-2 pr-8"
                    >
                      <div className="flex items-center gap-2">
                        <FileTextIcon size={13} className="shrink-0 text-text-tertiary" />
                        <p className="text-xs font-medium truncate">{doc.title}</p>
                      </div>
                      <p className="text-[10px] text-text-tertiary pl-5 truncate">
                        {doc.isPersonal ? t('documentEditor.personalLabel') : clientNameById.get(doc.clientId ?? '') ?? t('common.dash')}
                        {' · '}
                        {new Date(doc.updatedAt).toLocaleDateString('ru-RU')}
                      </p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSidebarActionDoc(isMenuOpen ? null : doc); }}
                      className="absolute right-1 top-2 p-1 rounded text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-border hover:text-text-primary transition-opacity"
                    >
                      <DotsThreeIcon size={14} weight="bold" />
                    </button>
                    {isMenuOpen && (
                      <div ref={actionMenuRef} className="absolute right-1 top-8 w-44 bg-surface border border-border rounded-xl shadow-card-hover p-1 z-30">
                        <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{t('documentEditor.menuDownload')}</p>
                        {doc.type === 'txt' ? (
                          <>
                            <button onClick={() => handleSidebarExport(doc, 'txt')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">TXT</button>
                            <button onClick={() => handleSidebarExport(doc, 'pdf')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">PDF</button>
                            <button onClick={() => handleSidebarExport(doc, 'docx')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">DOCX</button>
                          </>
                        ) : (
                          <button onClick={() => handleSidebarExport(doc, 'txt')} className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">
                            <DownloadSimpleIcon size={12} />{t('common.download')}
                          </button>
                        )}
                        <div className="h-px bg-border my-1" />
                        <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{t('documentEditor.menuOther')}</p>
                        <button onClick={() => { setSidebarTypeChangeDoc(doc); setSidebarActionDoc(null); }} className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">
                          <ArrowsLeftRightIcon size={12} />{t('documentType.changeAction')}
                        </button>
                        <button onClick={() => { setSidebarDeleteDoc(doc); setSidebarActionDoc(null); }} className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-lg text-xs text-error hover:bg-error/10">
                          <TrashIcon size={12} />{t('common.delete')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      <div className="flex-1 flex flex-col min-w-0">
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
                    onDrop={() => handleTabDrop(tab.id)}
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
                      onClick={(e) => { e.stopPropagation(); requestCloseTab(tab.id); }}
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
            onClick={() => setIsCreatingNew(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-tint text-primary text-xs font-medium hover:bg-primary hover:text-white transition-colors mr-1"
            title={t('documentEditor.newDocument')}
          >
            <PlusIcon size={14} weight="bold" />
            {t('documentEditor.newDocumentShort')}
          </button>

          <button onClick={handleToggleContentTheme} className="p-2 rounded-md hover:bg-surface-hover text-text-secondary shrink-0" title={contentTheme === 'light' ? t('documentEditor.darkTheme') : t('documentEditor.lightTheme')}>
            {contentTheme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
          </button>
          <button onClick={requestCloseAll} className="p-2 rounded-md hover:bg-surface-hover text-text-secondary shrink-0" title={t('common.close')}>
            <XIcon size={18} />
          </button>
        </div>

        {tabs.map((tab) => (
          <DocumentEditorPanel
            key={tab.id}
            target={tab.target}
            isActive={tab.id === activeTabId}
            contentTheme={contentTheme}
            onDirtyChange={(dirty) => setDirtyTabs((prev) => ({ ...prev, [tab.id]: dirty }))}
            onSavedDocument={(doc) => onUpdateTabTarget(tab.id, { ...tab.target, document: doc, clientId: doc.clientId, isPersonal: doc.isPersonal })}
          />
        ))}
      </div>

      {isCreatingNew && (
        <DocumentTargetModal title={t('documents.newTitle')} icon="create" onClose={() => setIsCreatingNew(false)} onConfirm={handleNewDocConfirm} />
      )}
      {tabPendingClose && (
        <ConfirmDialog title={t('textEditor.discardConfirmTitle')} message={t('textEditor.discardConfirmMessage')} confirmLabel={t('textEditor.discardConfirm')} onConfirm={confirmCloseTab} onClose={() => setTabPendingClose(null)} />
      )}
      {isClosingAll && (
        <ConfirmDialog title={t('textEditor.discardConfirmTitle')} message={t('textEditor.discardConfirmMessage')} confirmLabel={t('textEditor.discardConfirm')} onConfirm={confirmCloseAll} onClose={() => setIsClosingAll(false)} />
      )}
      {sidebarDeleteDoc && (
        <ConfirmDialog title={t('documents.confirmDelete', { title: sidebarDeleteDoc.title })} message="" onConfirm={handleSidebarDelete} onClose={() => setSidebarDeleteDoc(null)} />
      )}
      {sidebarTypeChangeDoc && (
        <DocumentTypeModal initialIsPersonal={sidebarTypeChangeDoc.isPersonal} initialClientId={sidebarTypeChangeDoc.clientId} onConfirm={handleSidebarTypeChange} onClose={() => setSidebarTypeChangeDoc(null)} />
      )}
    </div>
  );
}

function extractPlainText(node: { text?: string; content?: unknown[] }): string {
  if (node.text) return node.text;
  if (node.content) return (node.content as { text?: string; content?: unknown[] }[]).map((c) => extractPlainText(c)).join('\n');
  return '';
}