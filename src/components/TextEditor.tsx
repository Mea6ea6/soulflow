import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  XIcon, TextBolderIcon, TextItalicIcon, TextUnderlineIcon, ListBulletsIcon, ListNumbersIcon,
  TextHOneIcon, TextHTwoIcon, TextHThreeIcon, DownloadSimpleIcon, FloppyDiskIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { Document } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { addDocument, updateDocument } from '../hooks/useDB';
import { downloadAsTxt, downloadAsPdf, downloadAsDocx } from '../utils/fileExport';

interface TextEditorProps {
  document: Document | null;
  clientId: string | null;
  isPersonal?: boolean;
  onClose: () => void;
}

function ToolbarButton({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active ? 'bg-primary-tint text-primary' : 'text-text-secondary hover:bg-surface-hover'
      }`}
    >
      {children}
    </button>
  );
}

export default function TextEditor({ document, clientId, isPersonal = false, onClose }: TextEditorProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const { showToast } = useToast();

  const isReadonly = !!document && document.type !== 'txt';
  const [title, setTitle] = useState(document?.title ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '',
    editable: !isReadonly,
  });

  useEffect(() => {
    if (!editor) return;
    if (document) {
      if (document.type === 'txt') {
        try {
          editor.commands.setContent(JSON.parse(document.content));
        } catch {
          editor.commands.setContent(`<p>${document.content}</p>`);
        }
      } else {
        editor.commands.setContent(`<p>${document.content.replace(/\n/g, '</p><p>')}</p>`);
      }
    }
  }, [editor, document]);

  const handleSave = useCallback(async () => {
    if (!editor || !masterKey || isReadonly) return;

    setError(null);
    const plainText = editor.getText();
    const finalTitle = title.trim() || plainText.slice(0, 50) || t('textEditor.titlePlaceholder');
    const contentJson = JSON.stringify(editor.getJSON());

    setIsSaving(true);
    try {
      if (document) {
        await updateDocument(document.id, { title: finalTitle, content: contentJson }, masterKey);
      } else {
        await addDocument(
          { title: finalTitle, type: 'txt', content: contentJson, clientId: isPersonal ? null : clientId, isPersonal },
          masterKey
        );
      }
      showToast('success', t('common.save'));
      onClose();
    } catch {
      setError(t('textEditor.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [editor, masterKey, isReadonly, title, document, clientId, isPersonal, onClose, t, showToast]);

  const handleExport = (format: 'txt' | 'pdf' | 'docx') => {
    if (!editor) return;
    const text = editor.getText();
    const filename = (title.trim() || 'document').replace(/[^\w\dа-яё-]+/gi, '_');

    if (format === 'txt') downloadAsTxt(text, filename);
    if (format === 'pdf') downloadAsPdf(text, filename);
    if (format === 'docx') downloadAsDocx(text, filename);

    setIsExportMenuOpen(false);
  };

  if (!editor) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-surface rounded-lg border border-border shadow-card-hover">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isReadonly}
            placeholder={t('textEditor.titlePlaceholder')}
            className="flex-1 text-base font-semibold text-text-primary bg-transparent focus:outline-none disabled:opacity-70"
          />
          <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary shrink-0">
            <XIcon size={18} />
          </button>
        </div>

        {isReadonly && (
          <div className="px-5 py-2 text-xs text-warning bg-warning/10">
            {t('textEditor.readOnlyNotice', { type: document?.type.toUpperCase() })}
          </div>
        )}

        {!isReadonly && (
          <div className="flex items-center gap-1 px-5 py-2 border-b border-border">
            <ToolbarButton title={t('textEditor.toolbar.bold')} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
              <TextBolderIcon size={16} />
            </ToolbarButton>
            <ToolbarButton title={t('textEditor.toolbar.italic')} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <TextItalicIcon size={16} />
            </ToolbarButton>
            <ToolbarButton title={t('textEditor.toolbar.underline')} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <TextUnderlineIcon size={16} />
            </ToolbarButton>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolbarButton title={t('textEditor.toolbar.heading1')} active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <TextHOneIcon size={16} />
            </ToolbarButton>
            <ToolbarButton title={t('textEditor.toolbar.heading2')} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <TextHTwoIcon size={16} />
            </ToolbarButton>
            <ToolbarButton title={t('textEditor.toolbar.heading3')} active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <TextHThreeIcon size={16} />
            </ToolbarButton>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolbarButton title={t('textEditor.toolbar.bulletList')} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <ListBulletsIcon size={16} />
            </ToolbarButton>
            <ToolbarButton title={t('textEditor.toolbar.orderedList')} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListNumbersIcon size={16} />
            </ToolbarButton>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none min-h-[200px]" />
        </div>

        {error && (
          <div className="mx-5 mb-2 text-sm text-error bg-error/10 rounded-md px-3 py-2">{error}</div>
        )}

        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
            >
              <DownloadSimpleIcon size={16} />
              {t('textEditor.export')}
            </button>
            {isExportMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-44 bg-surface border border-border rounded-md shadow-card-hover overflow-hidden">
                <button onClick={() => handleExport('txt')} className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-hover">
                  {t('textEditor.exportTxt')}
                </button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-hover">
                  {t('textEditor.exportPdf')}
                </button>
                <button onClick={() => handleExport('docx')} className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-hover">
                  {t('textEditor.exportDocx')}
                </button>
              </div>
            )}
          </div>

          {!isReadonly && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              <FloppyDiskIcon size={16} />
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}