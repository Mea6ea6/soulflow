import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  TextBolderIcon, TextItalicIcon, TextUnderlineIcon, ListBulletsIcon, ListNumbersIcon,
  TextHOneIcon, TextHTwoIcon, TextHThreeIcon, DownloadSimpleIcon, XIcon,
  MagnifyingGlassIcon, PlusIcon, FileTextIcon, SunIcon, MoonIcon, DotsThreeIcon,
  TrashIcon, ArrowsLeftRightIcon, CircleIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { Document } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { useDocuments, useClients, addDocument, updateDocument, deleteDocument } from '../hooks/useDB';
import { downloadAsTxt, downloadAsPdf, downloadAsDocx, downloadOriginalFile, MIME_TYPES } from '../utils/fileExport';
import type { DocumentEditorTarget, EditorTab } from '../context/DocumentEditorContextDef';
import ConfirmDialog from './ConfirmDialog';
import DocumentTargetModal, { type DocumentTarget } from './DocumentTargetModal';
import DocumentTypeModal, { type DocumentTypeChange } from './DocumentTypeModal';

interface DocumentEditorPageProps {
  tabs: EditorTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onOpenTab: (target: DocumentEditorTarget) => void;
  onUpdateTabTarget: (id: string, target: DocumentEditorTarget) => void;
  onCloseAll: () => void;
}

type SortOrder = 'newest' | 'oldest' | 'title';
type ContentTheme = 'light' | 'dark';

const CONTENT_THEME_STORAGE_KEY = 'soulflow_editor_content_theme';
const AUTOSAVE_DELAY_MS = 1200;

const CONTENT_THEME_VARS: Record<ContentTheme, { bg: string; text: string; secondary: string; hover: string }> = {
  light: { bg: '#ffffff', text: '#191919', secondary: '#8b8b89', hover: '#f1f1ef' },
  dark: { bg: '#1f1f1f', text: '#e9e9e7', secondary: '#9b9b9b', hover: '#2a2a2c' },
};

function ToolbarButton({ onClick, active, children, title, theme }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string; theme: ContentTheme }) {
  const colors = CONTENT_THEME_VARS[theme];
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      style={{ color: active ? undefined : colors.secondary }}
      className={`p-1.5 rounded-md transition-colors ${active ? 'text-primary bg-primary-tint' : 'hover:bg-(--tb-hover)'}`}
    >
      {children}
    </button>
  );
}

function initialContentFor(doc: Document | null): string | object {
  if (!doc) return '';
  if (doc.type === 'txt') {
    try {
      return JSON.parse(doc.content);
    } catch {
      return `<p>${doc.content}</p>`;
    }
  }
  return `<p>${doc.content.replace(/\n/g, '</p><p>')}</p>`;
}

interface DocumentEditorPanelProps {
  target: DocumentEditorTarget;
  isActive: boolean;
  contentTheme: ContentTheme;
  onDirtyChange: (dirty: boolean) => void;
  onSavedDocument: (doc: Document) => void;
  onDeleted: () => void;
}

function DocumentEditorPanel({ target, isActive, contentTheme, onDirtyChange, onSavedDocument, onDeleted }: DocumentEditorPanelProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const { showToast } = useToast();

  const isReadonly = !!target.document && target.document.type !== 'txt';
  const [title, setTitle] = useState(target.document?.title ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExportSubOpen, setIsExportSubOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isChangingType, setIsChangingType] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitializingRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTargetRef = useRef(target);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: initialContentFor(target.document),
    editable: !isReadonly,
  });

  useEffect(() => {
    queueMicrotask(() => { isInitializingRef.current = false; });
  }, []);

  useEffect(() => {
    currentTargetRef.current = target;
  }, [target]);

  const doSave = useCallback(async () => {
    if (!editor || !masterKey || isReadonly) return;
    const target = currentTargetRef.current;
    const plainText = editor.getText();
    const contentJson = JSON.stringify(editor.getJSON());

    setIsSaving(true);
    try {
      if (target.document) {
        const finalTitle = title.trim() || plainText.slice(0, 50) || 'Untitled';
        await updateDocument(target.document.id, { title: finalTitle, content: contentJson }, masterKey);
        onSavedDocument({ ...target.document, title: finalTitle, content: contentJson, updatedAt: new Date().toISOString() });
      } else {
        const finalTitle = title.trim() || plainText.slice(0, 50) || 'Untitled';
        const now = new Date().toISOString();
        const newId = await addDocument(
          { title: finalTitle, type: 'txt', content: contentJson, clientId: target.isPersonal ? null : target.clientId, isPersonal: target.isPersonal, origin: 'created' },
          masterKey
        );
        onSavedDocument({
          id: newId, title: finalTitle, type: 'txt', content: contentJson,
          clientId: target.isPersonal ? null : target.clientId, isPersonal: target.isPersonal,
          origin: 'created', createdAt: now, updatedAt: now,
        });
      }
      onDirtyChange(false);
    } catch {
      setError(t('textEditor.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [editor, masterKey, isReadonly, title, onDirtyChange, onSavedDocument]);

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
    if (!isInitializingRef.current) {
      onDirtyChange(true);
      scheduleAutosave();
    }
  };

  const handleExport = (format: 'txt' | 'pdf' | 'docx') => {
    if (!editor) return;
    const text = editor.getText();
    const filename = (title.trim() || 'document').replace(/[^\w\dа-яё-]+/gi, '_');
    if (format === 'txt') downloadAsTxt(text, filename);
    if (format === 'pdf') downloadAsPdf(text, filename);
    if (format === 'docx') downloadAsDocx(text, filename);
    setIsMenuOpen(false);
    setIsExportSubOpen(false);
  };

  const handleDownloadOriginal = () => {
    const doc = target.document;
    if (!doc || doc.type === 'txt' || !doc.originalFileBase64) return;
    downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
  };

  const handleDeleteConfirm = async () => {
    if (target.document) {
      await deleteDocument(target.document.id);
      showToast('success', t('common.delete'));
    }
    setIsConfirmingDelete(false);
    onDeleted();
  };

  const handleTypeChange = async (change: DocumentTypeChange) => {
    setIsChangingType(false);
    if (target.document && masterKey) {
      await updateDocument(target.document.id, change, masterKey);
      onSavedDocument({ ...target.document, ...change });
      showToast('success', t('common.save'));
    }
  };

  if (!editor) return null;
  const colors = CONTENT_THEME_VARS[contentTheme];

  return (
    <div className="flex-1 flex-col min-h-0" style={{ display: isActive ? 'flex' : 'none' }}>
      {isReadonly && (
        <div className="px-6 py-2 text-xs text-warning bg-warning/10 shrink-0">
          {t('textEditor.readOnlyNotice', { type: target.document?.type.toUpperCase() })}
        </div>
      )}

      {!isReadonly && (
        <div
          className="flex items-center justify-between gap-1 px-6 py-2 border-b shrink-0"
          style={{ borderColor: colors.hover, backgroundColor: colors.bg, ['--tb-hover' as string]: colors.hover }}
        >
          <div className="flex items-center gap-1">
            <ToolbarButton theme={contentTheme} title={t('textEditor.toolbar.bold')} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
              <TextBolderIcon size={16} />
            </ToolbarButton>
            <ToolbarButton theme={contentTheme} title={t('textEditor.toolbar.italic')} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <TextItalicIcon size={16} />
            </ToolbarButton>
            <ToolbarButton theme={contentTheme} title={t('textEditor.toolbar.underline')} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <TextUnderlineIcon size={16} />
            </ToolbarButton>
            <div className="w-px h-5 mx-1" style={{ backgroundColor: colors.hover }} />
            <ToolbarButton theme={contentTheme} title={t('textEditor.toolbar.heading1')} active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <TextHOneIcon size={16} />
            </ToolbarButton>
            <ToolbarButton theme={contentTheme} title={t('textEditor.toolbar.heading2')} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <TextHTwoIcon size={16} />
            </ToolbarButton>
            <ToolbarButton theme={contentTheme} title={t('textEditor.toolbar.heading3')} active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <TextHThreeIcon size={16} />
            </ToolbarButton>
            <div className="w-px h-5 mx-1" style={{ backgroundColor: colors.hover }} />
            <ToolbarButton theme={contentTheme} title={t('textEditor.toolbar.bulletList')} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <ListBulletsIcon size={16} />
            </ToolbarButton>
            <ToolbarButton theme={contentTheme} title={t('textEditor.toolbar.orderedList')} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListNumbersIcon size={16} />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-2">
            {isSaving && <span className="text-[11px]" style={{ color: colors.secondary }}>{t('documentEditor.saving')}</span>}
            <div className="relative">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsMenuOpen((v) => !v)}
                className="p-1.5 rounded-md hover:bg-(--tb-hover)"
                style={{ color: colors.secondary }}
              >
                <DotsThreeIcon size={18} weight="bold" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-xl shadow-card-hover overflow-hidden p-1 z-20">
                  <div className="relative">
                    <button
                      onClick={() => setIsExportSubOpen((v) => !v)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-surface-hover"
                    >
                      <span className="flex items-center gap-2"><DownloadSimpleIcon size={14} />{t('textEditor.export')}</span>
                    </button>
                    {isExportSubOpen && (
                      <div className="pl-3 flex flex-col">
                        <button onClick={() => handleExport('txt')} className="text-left px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-hover">{t('textEditor.exportTxt')}</button>
                        <button onClick={() => handleExport('pdf')} className="text-left px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-hover">{t('textEditor.exportPdf')}</button>
                        <button onClick={() => handleExport('docx')} className="text-left px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-hover">{t('textEditor.exportDocx')}</button>
                      </div>
                    )}
                  </div>
                  {target.document && (
                    <button
                      onClick={() => { setIsMenuOpen(false); setIsChangingType(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-surface-hover"
                    >
                      <ArrowsLeftRightIcon size={14} />
                      {t('documentType.changeAction')}
                    </button>
                  )}
                  {target.document && (
                    <button
                      onClick={() => { setIsMenuOpen(false); setIsConfirmingDelete(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-error hover:bg-error/10"
                    >
                      <TrashIcon size={14} />
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto cursor-text"
        style={{ backgroundColor: colors.bg, color: colors.text }}
        onClick={() => editor.chain().focus().run()}
      >
        <div className="max-w-3xl mx-auto px-10 py-10">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={isReadonly}
            placeholder={t('textEditor.titlePlaceholder')}
            className="w-full text-3xl font-display font-semibold bg-transparent focus:outline-none disabled:opacity-70 mb-4"
            style={{ color: colors.text }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[50vh]" onClick={(e) => e.stopPropagation()}>
            <EditorContent editor={editor} className="prose prose-sm max-w-none" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-2 text-sm text-error bg-error/10 rounded-xl px-3 py-2 shrink-0">{error}</div>
      )}

      {isReadonly && (
        <div className="flex items-center justify-end px-6 py-3 border-t border-border shrink-0">
          <button
            onClick={handleDownloadOriginal}
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <DownloadSimpleIcon size={16} />
            {t('common.download')}
          </button>
        </div>
      )}

      {isConfirmingDelete && (
        <ConfirmDialog
          title={t('documents.confirmDelete', { title: target.document?.title ?? '' })}
          message=""
          onConfirm={handleDeleteConfirm}
          onClose={() => setIsConfirmingDelete(false)}
        />
      )}

      {isChangingType && target.document && (
        <DocumentTypeModal
          initialIsPersonal={target.isPersonal}
          initialClientId={target.clientId}
          onConfirm={handleTypeChange}
          onClose={() => setIsChangingType(false)}
        />
      )}
    </div>
  );
}

export default function DocumentEditorPage({ tabs, activeTabId, onSelectTab, onCloseTab, onOpenTab, onUpdateTabTarget, onCloseAll }: DocumentEditorPageProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const allDocuments = useDocuments(masterKey);
  const clients = useClients(masterKey);

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [contentTheme, setContentTheme] = useState<ContentTheme>(
    () => (localStorage.getItem(CONTENT_THEME_STORAGE_KEY) as ContentTheme | null) ?? 'light'
  );
  const [dirtyTabs, setDirtyTabs] = useState<Record<string, boolean>>({});
  const [tabPendingClose, setTabPendingClose] = useState<string | null>(null);
  const [isClosingAll, setIsClosingAll] = useState(false);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const sidebarDocs = useMemo(() => {
    let list = allDocuments ?? [];
    const query = search.trim().toLowerCase();
    if (query) list = list.filter((d) => d.title.toLowerCase().includes(query));
    return [...list].sort((a, b) => {
      if (sortOrder === 'title') return a.title.localeCompare(b.title);
      return sortOrder === 'newest' ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt);
    });
  }, [allDocuments, search, sortOrder]);

  const handleToggleContentTheme = () => {
    setContentTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(CONTENT_THEME_STORAGE_KEY, next);
      return next;
    });
  };

  const requestCloseTab = (id: string) => {
    if (dirtyTabs[id]) {
      setTabPendingClose(id);
    } else {
      onCloseTab(id);
    }
  };

  const confirmCloseTab = () => {
    if (tabPendingClose) {
      setDirtyTabs((prev) => { const next = { ...prev }; delete next[tabPendingClose]; return next; });
      onCloseTab(tabPendingClose);
    }
    setTabPendingClose(null);
  };

  const requestCloseAll = () => {
    if (Object.values(dirtyTabs).some(Boolean)) {
      setIsClosingAll(true);
    } else {
      onCloseAll();
    }
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

  return (
    <div className="fixed inset-0 z-60 flex bg-bg text-text-primary">
      <div className="w-72 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="p-4">
          <h2 className="text-sm font-semibold">{t('documentEditor.title')}</h2>
        </div>

        <div className="px-4 pb-3 flex flex-col gap-2">
          <div className="relative">
            <MagnifyingGlassIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('documentEditor.searchPlaceholder')}
              className="w-full pl-8 pr-2 py-1.5 rounded-xl border border-border bg-bg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="w-full px-2 py-1.5 rounded-xl border border-border bg-bg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="newest">{t('documentEditor.sortNewest')}</option>
            <option value="oldest">{t('documentEditor.sortOldest')}</option>
            <option value="title">{t('documentEditor.sortTitle')}</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {sidebarDocs.length === 0 && (
            <p className="text-xs text-text-tertiary text-center py-8">{t('documentEditor.empty')}</p>
          )}
          {sidebarDocs.map((doc) => {
            const openTab = tabs.find((tab) => tab.target.document?.id === doc.id);
            const isActive = openTab?.id === activeTabId;
            return (
              <button
                key={doc.id}
                onClick={() => onOpenTab({ document: doc, clientId: doc.clientId, isPersonal: doc.isPersonal })}
                className={`w-full text-left px-3 py-2 rounded-md mb-0.5 transition-colors ${
                  isActive ? 'bg-primary-tint' : 'hover:bg-surface-hover'
                }`}
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
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center border-b border-border bg-surface shrink-0 pr-2">
          <button
            onClick={() => setIsCreatingNew(true)}
            className="shrink-0 p-2.5 border-r border-border text-text-secondary hover:bg-surface-hover"
            title={t('documentEditor.newDocument')}
          >
            <PlusIcon size={16} />
          </button>

          <div className="flex-1 flex items-center overflow-x-auto">
            {tabs.map((tab) => {
              const label = tab.target.document?.title || t('textEditor.titlePlaceholder');
              const isActive = tab.id === activeTabId;
              const isDirty = dirtyTabs[tab.id];
              return (
                <div
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`group flex items-center gap-2 px-4 py-2.5 border-r border-border cursor-pointer max-w-50 shrink-0 ${
                    isActive ? 'bg-bg' : 'hover:bg-surface-hover'
                  }`}
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
              );
            })}
          </div>

          <button
            onClick={handleToggleContentTheme}
            className="p-2 rounded-md hover:bg-surface-hover text-text-secondary shrink-0"
            title={contentTheme === 'light' ? t('documentEditor.darkTheme') : t('documentEditor.lightTheme')}
          >
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
            onDeleted={() => { setDirtyTabs((prev) => { const n = { ...prev }; delete n[tab.id]; return n; }); onCloseTab(tab.id); }}
          />
        ))}
      </div>

      {isCreatingNew && (
        <DocumentTargetModal
          title={t('documents.newTitle')}
          icon="create"
          onClose={() => setIsCreatingNew(false)}
          onConfirm={handleNewDocConfirm}
        />
      )}

      {tabPendingClose && (
        <ConfirmDialog
          title={t('textEditor.discardConfirmTitle')}
          message={t('textEditor.discardConfirmMessage')}
          confirmLabel={t('textEditor.discardConfirm')}
          onConfirm={confirmCloseTab}
          onClose={() => setTabPendingClose(null)}
        />
      )}

      {isClosingAll && (
        <ConfirmDialog
          title={t('textEditor.discardConfirmTitle')}
          message={t('textEditor.discardConfirmMessage')}
          confirmLabel={t('textEditor.discardConfirm')}
          onConfirm={confirmCloseAll}
          onClose={() => setIsClosingAll(false)}
        />
      )}
    </div>
  );
}