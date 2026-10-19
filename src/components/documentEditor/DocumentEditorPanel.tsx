import { useState, useEffect, useMemo, useRef } from 'react';
import { Extension } from '@tiptap/core';
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
import { useTranslation } from 'react-i18next';
import {
  DownloadSimpleIcon, PlusIcon, DotsThreeIcon, TrashIcon, ArrowsLeftRightIcon,
  TextBolderIcon, TextItalicIcon, TextUnderlineIcon,
} from '@phosphor-icons/react';
import type { Document } from '../../types';
import { useAuth } from '../../hooks/useAuthHook';
import { useToast } from '../../hooks/useToastHook';
import { deleteDocument, updateDocument } from '../../hooks/useDB';
import { useDocumentAutosave } from '../../hooks/useDocumentAutosave';
import { downloadAsTxt, downloadAsPdf, downloadAsDocx, downloadOriginalFile, MIME_TYPES } from '../../utils/fileExport';
import { initialContentFor } from '../../utils/documentEditorHelpers';
import type { DocumentEditorTarget } from '../../context/DocumentEditorContextDef';
import { SlashCommand } from '../../extensions/slashCommand';
import { getSlashCommandGroups } from '../../extensions/slashCommandItems';
import ConfirmDialog from '../ConfirmDialog';
import DocumentTypeModal, { type DocumentTypeChange } from '../DocumentTypeModal';
import BlockMenuList from '../BlockMenuList';
import TableControls from './TableControls';
import { buildTemplateContent } from '../../utils/sessionTemplates';

export type ContentTheme = 'light' | 'dark';

const CONTENT_THEME_VARS: Record<ContentTheme, { bg: string; text: string; secondary: string; hover: string }> = {
  light: { bg: '#ffffff', text: '#191919', secondary: '#8b8b89', hover: '#f1f1ef' },
  dark: { bg: '#0A0A0B', text: '#F0F0F0', secondary: '#9A9A9E', hover: '#1D1D20' },
};

const EDITOR_FONT_CSS = '"InterVariable", sans-serif';

interface DocumentEditorPanelProps {
  target: DocumentEditorTarget;
  isActive: boolean;
  contentTheme: ContentTheme;
  onDirtyChange: (dirty: boolean) => void;
  onSavedDocument: (doc: Document) => void;
  onDeleted: () => void;
}

export default function DocumentEditorPanel({ target, isActive, contentTheme, onDirtyChange, onSavedDocument, onDeleted }: DocumentEditorPanelProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const { showToast } = useToast();

  const isReadonly = !!target.document && target.document.type !== 'txt';
  const [title, setTitle] = useState(target.document?.title ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isChangingType, setIsChangingType] = useState(false);
  const isInitializingRef = useRef(true);
  const menuRef = useRef<HTMLDivElement>(null);
  // Локальный "прокси" для сохранения по Cmd/Ctrl+S — разрывает циклическую
  // зависимость: shortcutsExtension нужен saveNow, а saveNow появляется только
  // после useDocumentAutosave, которому нужен editor, а editor собирается из
  // списка расширений, включающего shortcutsExtension. Реф не требует
  // попадания в зависимости useMemo, поэтому цикл не возникает
  const saveTriggerRef = useRef<() => void>(() => {});

  const shortcutsExtension = useMemo(
    () => Extension.create({
      name: 'soulflowShortcuts',
      addKeyboardShortcuts() {
        return {
          Tab: () => { this.editor.commands.insertContent('\u00A0\u00A0\u00A0\u00A0'); return true; },
          'Mod-s': () => { saveTriggerRef.current(); return true; },
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
    content: target.document
      ? initialContentFor(target.document)
      : buildTemplateContent(target.templateId, t) ?? initialContentFor(target.document),
    editable: !isReadonly,
  });

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

  useEffect(() => {
    if (!isMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setIsMenuOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isMenuOpen]);

  const { scheduleAutosave, saveNow } = useDocumentAutosave({
    editor, masterKey, isReadonly, target, title,
    onDirtyChange, onSavedDocument,
    onError: () => setError(t('textEditor.saveFailed')),
  });

  useEffect(() => { saveTriggerRef.current = saveNow; }, [saveNow]);

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

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isInitializingRef.current) { onDirtyChange(true); scheduleAutosave(); }
  };

  const handleExport = (format: 'txt' | 'pdf' | 'docx') => {
    if (!editor) return;
    const filename = (title.trim() || 'document').replace(/[^\w\dа-яё-]+/gi, '_');
    if (format === 'txt') downloadAsTxt(editor.getText(), filename);
    if (format === 'pdf') downloadAsPdf(editor.getJSON(), filename);
    if (format === 'docx') downloadAsDocx(editor.getJSON(), filename);
    setIsMenuOpen(false);
  };

  const handleDownloadOriginal = () => {
    const doc = target.document;
    if (!doc || doc.type === 'txt' || !doc.originalFileBase64) return;
    downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
    setIsMenuOpen(false);
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
  const groups = getSlashCommandGroups();

  return (
    <div className="flex-1 flex-col min-h-0" style={{ display: isActive ? 'flex' : 'none' }}>
      {isReadonly && (
        <div className="px-6 py-2 text-xs text-warning bg-warning/10 shrink-0">
          {t('textEditor.readOnlyNotice', { type: target.document?.type.toUpperCase() })}
        </div>
      )}

      <div className="flex items-center gap-3 px-6 py-2 border-b border-border shrink-0 bg-surface">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={isReadonly}
          placeholder={t('textEditor.titlePlaceholder')}
          className="flex-1 min-w-0 bg-transparent text-sm font-medium text-text-primary focus:outline-none disabled:opacity-70 placeholder:text-text-tertiary placeholder:font-normal"
        />
        <div className="relative" ref={menuRef}>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsMenuOpen((v) => !v)}
            className="p-1.5 rounded-md text-text-secondary hover:bg-surface-hover"
          >
            <DotsThreeIcon size={18} weight="bold" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-xl shadow-card-hover p-1 z-30">
              {isReadonly ? (
                <button onClick={handleDownloadOriginal} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-surface-hover">
                  <DownloadSimpleIcon size={14} />
                  {t('common.download')}
                </button>
              ) : (
                <>
                  <button onClick={() => handleExport('txt')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-surface-hover">
                    <DownloadSimpleIcon size={14} />
                    {t('textEditor.exportTxt')}
                  </button>
                  <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-surface-hover">
                    <DownloadSimpleIcon size={14} />
                    {t('textEditor.exportPdf')}
                  </button>
                  <button onClick={() => handleExport('docx')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-surface-hover">
                    <DownloadSimpleIcon size={14} />
                    {t('textEditor.exportDocx')}
                  </button>
                </>
              )}
              {target.document && (
                <>
                  <div className="h-px bg-border my-1" />
                  <button onClick={() => { setIsChangingType(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-surface-hover">
                    <ArrowsLeftRightIcon size={14} />
                    {t('documentType.changeAction')}
                  </button>
                  <button onClick={() => { setIsConfirmingDelete(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-error hover:bg-error/10">
                    <TrashIcon size={14} />
                    {t('common.delete')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto cursor-text relative"
        style={{ backgroundColor: colors.bg, color: colors.text, fontFamily: EDITOR_FONT_CSS }}
        onClick={() => editor.chain().focus().run()}
      >
        <div className="max-w-3xl mx-auto px-10 py-10">
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
                  options={{ placement: 'top-start', offset: 6 }}
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