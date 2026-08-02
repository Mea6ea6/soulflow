import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  TextBolderIcon, TextItalicIcon, TextUnderlineIcon, ListBulletsIcon, ListNumbersIcon,
  TextHOneIcon, TextHTwoIcon, TextHThreeIcon, DownloadSimpleIcon, FloppyDiskIcon, XIcon,
  MagnifyingGlassIcon, PlusIcon, FileTextIcon, SunIcon, MoonIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { Document } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { useDocuments, useClients, addDocument, updateDocument } from '../hooks/useDB';
import { downloadAsTxt, downloadAsPdf, downloadAsDocx, downloadOriginalFile, MIME_TYPES } from '../utils/fileExport';
import type { DocumentEditorTarget } from '../context/DocumentEditorContextDef';
import ConfirmDialog from './ConfirmDialog';
import DocumentTargetModal, { type DocumentTarget } from './DocumentTargetModal';

interface DocumentEditorPageProps {
  initialTarget: DocumentEditorTarget;
  onClose: () => void;
}

type SortOrder = 'newest' | 'oldest' | 'title';
type EditorTheme = 'light' | 'dark';

const EDITOR_THEME_STORAGE_KEY = 'soulflow_editor_theme';

function ToolbarButton({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active ? 'bg-[var(--editor-active)] text-[var(--editor-primary)]' : 'text-[var(--editor-text-secondary)] hover:bg-[var(--editor-hover)]'
      }`}
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
  editorTheme: EditorTheme;
  onToggleTheme: () => void;
  onRequestClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSavedNewDocument: (doc: Document) => void;
}

function DocumentEditorPanel({ target, editorTheme, onToggleTheme, onRequestClose, onDirtyChange, onSavedNewDocument }: DocumentEditorPanelProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const { showToast } = useToast();

  const isReadonly = !!target.document && target.document.type !== 'txt';
  const [title, setTitle] = useState(target.document?.title ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitializingRef = useRef(true);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: initialContentFor(target.document),
    editable: !isReadonly,
  });

  useEffect(() => {
    queueMicrotask(() => { isInitializingRef.current = false; });
  }, []);

  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => { if (!isInitializingRef.current) onDirtyChange(true); };
    editor.on('update', handleUpdate);
    return () => { editor.off('update', handleUpdate); };
  }, [editor, onDirtyChange]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isInitializingRef.current) onDirtyChange(true);
  };

  const handleSave = useCallback(async () => {
    if (!editor || !masterKey || isReadonly) return;

    setError(null);
    const plainText = editor.getText();
    const finalTitle = title.trim() || plainText.slice(0, 50) || t('textEditor.titlePlaceholder');
    const contentJson = JSON.stringify(editor.getJSON());

    setIsSaving(true);
    try {
      if (target.document) {
        await updateDocument(target.document.id, { title: finalTitle, content: contentJson }, masterKey);
        onSavedNewDocument({ ...target.document, title: finalTitle, content: contentJson, updatedAt: new Date().toISOString() });
      } else {
        const now = new Date().toISOString();
        const newId = await addDocument(
          { title: finalTitle, type: 'txt', content: contentJson, clientId: target.isPersonal ? null : target.clientId, isPersonal: target.isPersonal },
          masterKey
        );
        onSavedNewDocument({
          id: newId, title: finalTitle, type: 'txt', content: contentJson,
          clientId: target.isPersonal ? null : target.clientId, isPersonal: target.isPersonal,
          createdAt: now, updatedAt: now,
        });
      }
      showToast('success', t('common.save'));
      onDirtyChange(false);
    } catch {
      setError(t('textEditor.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [editor, masterKey, isReadonly, title, target, t, showToast, onDirtyChange, onSavedNewDocument]);

  const handleExport = (format: 'txt' | 'pdf' | 'docx') => {
    if (!editor) return;
    const text = editor.getText();
    const filename = (title.trim() || 'document').replace(/[^\w\dа-яё-]+/gi, '_');
    if (format === 'txt') downloadAsTxt(text, filename);
    if (format === 'pdf') downloadAsPdf(text, filename);
    if (format === 'docx') downloadAsDocx(text, filename);
    setIsExportMenuOpen(false);
  };

  const handleDownloadOriginal = () => {
    const doc = target.document;
    if (!doc || doc.type === 'txt' || !doc.originalFileBase64) return;
    downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
  };

  if (!editor) return null;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--editor-border)] gap-3 shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={isReadonly}
          placeholder={t('textEditor.titlePlaceholder')}
          className="flex-1 text-lg font-semibold bg-transparent focus:outline-none disabled:opacity-70 placeholder:text-[var(--editor-text-secondary)]"
        />
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-md hover:bg-[var(--editor-hover)] text-[var(--editor-text-secondary)]"
            title={editorTheme === 'light' ? t('documentEditor.darkTheme') : t('documentEditor.lightTheme')}
          >
            {editorTheme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
          </button>
          <button onClick={onRequestClose} className="p-2 rounded-md hover:bg-[var(--editor-hover)] text-[var(--editor-text-secondary)]" title={t('common.close')}>
            <XIcon size={18} />
          </button>
        </div>
      </div>

      {isReadonly && (
        <div className="px-6 py-2 text-xs text-warning bg-warning/10 shrink-0">
          {t('textEditor.readOnlyNotice', { type: target.document?.type.toUpperCase() })}
        </div>
      )}

      {!isReadonly && (
        <div className="flex items-center gap-1 px-6 py-2 border-b border-[var(--editor-border)] shrink-0">
          <ToolbarButton title={t('textEditor.toolbar.bold')} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <TextBolderIcon size={16} />
          </ToolbarButton>
          <ToolbarButton title={t('textEditor.toolbar.italic')} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <TextItalicIcon size={16} />
          </ToolbarButton>
          <ToolbarButton title={t('textEditor.toolbar.underline')} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <TextUnderlineIcon size={16} />
          </ToolbarButton>
          <div className="w-px h-5 bg-[var(--editor-border)] mx-1" />
          <ToolbarButton title={t('textEditor.toolbar.heading1')} active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <TextHOneIcon size={16} />
          </ToolbarButton>
          <ToolbarButton title={t('textEditor.toolbar.heading2')} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <TextHTwoIcon size={16} />
          </ToolbarButton>
          <ToolbarButton title={t('textEditor.toolbar.heading3')} active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <TextHThreeIcon size={16} />
          </ToolbarButton>
          <div className="w-px h-5 bg-[var(--editor-border)] mx-1" />
          <ToolbarButton title={t('textEditor.toolbar.bulletList')} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <ListBulletsIcon size={16} />
          </ToolbarButton>
          <ToolbarButton title={t('textEditor.toolbar.orderedList')} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListNumbersIcon size={16} />
          </ToolbarButton>
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto px-6 py-6 cursor-text [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full max-w-3xl w-full mx-auto"
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor} className="prose prose-sm max-w-none h-full" />
      </div>

      {error && (
        <div className="mx-6 mb-2 text-sm text-error bg-error/10 rounded-xl px-3 py-2 shrink-0">{error}</div>
      )}

      <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--editor-border)] shrink-0">
        <div className="relative">
          <button
            type="button"
            onClick={() => (isReadonly ? handleDownloadOriginal() : setIsExportMenuOpen((v) => !v))}
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-[var(--editor-border)] text-sm font-medium text-[var(--editor-text-secondary)] hover:bg-[var(--editor-hover)] transition-colors"
          >
            <DownloadSimpleIcon size={16} />
            {t('textEditor.export')}
          </button>
          {!isReadonly && isExportMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-44 bg-[var(--editor-surface)] border border-[var(--editor-border)] rounded-xl shadow-card-hover overflow-hidden p-1">
              <button onClick={() => handleExport('txt')} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--editor-hover)]">
                {t('textEditor.exportTxt')}
              </button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--editor-hover)]">
                {t('textEditor.exportPdf')}
              </button>
              <button onClick={() => handleExport('docx')} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--editor-hover)]">
                {t('textEditor.exportDocx')}
              </button>
            </div>
          )}
        </div>

        {!isReadonly && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium transition-colors disabled:opacity-60"
            style={{ backgroundColor: 'var(--editor-primary)' }}
          >
            <FloppyDiskIcon size={16} />
            {isSaving ? t('common.saving') : t('common.save')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DocumentEditorPage({ initialTarget, onClose }: DocumentEditorPageProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const allDocuments = useDocuments(masterKey);
  const clients = useClients(masterKey);

  const [activeTarget, setActiveTarget] = useState<DocumentEditorTarget>(initialTarget);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [editorTheme, setEditorTheme] = useState<EditorTheme>(
    () => (localStorage.getItem(EDITOR_THEME_STORAGE_KEY) as EditorTheme | null) ?? 'light'
  );
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const isDirtyRef = useRef(false);

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

  const guardedAction = (action: () => void) => {
    if (isDirtyRef.current) {
      setPendingAction(() => action);
    } else {
      action();
    }
  };

  const confirmPendingAction = () => {
    const action = pendingAction;
    setPendingAction(null);
    isDirtyRef.current = false;
    action?.();
  };

  const handleSelectDoc = (doc: Document) => {
    if (activeTarget.document?.id === doc.id) return;
    guardedAction(() => setActiveTarget({ document: doc, clientId: doc.clientId, isPersonal: doc.isPersonal }));
  };

  const handleNewDocConfirm = (target: DocumentTarget) => {
    setIsCreatingNew(false);
    guardedAction(() => setActiveTarget({ document: null, clientId: target.clientId, isPersonal: target.isPersonal }));
  };

  const handleToggleTheme = () => {
    setEditorTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(EDITOR_THEME_STORAGE_KEY, next);
      return next;
    });
  };

  const requestClose = () => guardedAction(onClose);

  const editorKey = activeTarget.document?.id ?? `new-${activeTarget.isPersonal ? 'personal' : activeTarget.clientId ?? 'none'}`;

  return (
    <div
      data-editor-theme={editorTheme}
      className="fixed inset-0 z-[60] flex bg-[var(--editor-bg)] text-[var(--editor-text-primary)]"
    >
      <div className="w-72 shrink-0 border-r border-[var(--editor-border)] bg-[var(--editor-sidebar-bg)] flex flex-col">
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('documentEditor.title')}</h2>
          <button
            onClick={() => setIsCreatingNew(true)}
            className="p-1.5 rounded-md hover:bg-[var(--editor-hover)]"
            title={t('documentEditor.newDocument')}
          >
            <PlusIcon size={16} />
          </button>
        </div>

        <div className="px-4 pb-3 flex flex-col gap-2">
          <div className="relative">
            <MagnifyingGlassIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--editor-text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('documentEditor.searchPlaceholder')}
              className="w-full pl-8 pr-2 py-1.5 rounded-md border border-[var(--editor-border)] bg-[var(--editor-bg)] text-xs text-[var(--editor-text-primary)] focus:outline-none"
            />
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="w-full px-2 py-1.5 rounded-md border border-[var(--editor-border)] bg-[var(--editor-bg)] text-xs text-[var(--editor-text-primary)] focus:outline-none"
          >
            <option value="newest">{t('documentEditor.sortNewest')}</option>
            <option value="oldest">{t('documentEditor.sortOldest')}</option>
            <option value="title">{t('documentEditor.sortTitle')}</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {sidebarDocs.length === 0 && (
            <p className="text-xs text-[var(--editor-text-secondary)] text-center py-8">{t('documentEditor.empty')}</p>
          )}
          {sidebarDocs.map((doc) => {
            const isActive = activeTarget.document?.id === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => handleSelectDoc(doc)}
                className={`w-full text-left px-3 py-2 rounded-md mb-0.5 transition-colors ${
                  isActive ? 'bg-[var(--editor-active)]' : 'hover:bg-[var(--editor-hover)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileTextIcon size={13} className="shrink-0 text-[var(--editor-text-secondary)]" />
                  <p className="text-xs font-medium truncate">{doc.title}</p>
                </div>
                <p className="text-[10px] text-[var(--editor-text-secondary)] pl-5 truncate">
                  {doc.isPersonal ? t('documentEditor.personalLabel') : clientNameById.get(doc.clientId ?? '') ?? t('common.dash')}
                  {' · '}
                  {new Date(doc.updatedAt).toLocaleDateString('ru-RU')}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <DocumentEditorPanel
        key={editorKey}
        target={activeTarget}
        editorTheme={editorTheme}
        onToggleTheme={handleToggleTheme}
        onRequestClose={requestClose}
        onDirtyChange={(dirty) => { isDirtyRef.current = dirty; }}
        onSavedNewDocument={(doc) => setActiveTarget((prev) => ({ ...prev, document: doc }))}
      />

      {isCreatingNew && (
        <DocumentTargetModal
          title={t('documents.newTitle')}
          icon="create"
          onClose={() => setIsCreatingNew(false)}
          onConfirm={handleNewDocConfirm}
        />
      )}

      {pendingAction && (
        <ConfirmDialog
          title={t('textEditor.discardConfirmTitle')}
          message={t('textEditor.discardConfirmMessage')}
          confirmLabel={t('textEditor.discardConfirm')}
          onConfirm={confirmPendingAction}
          onClose={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}