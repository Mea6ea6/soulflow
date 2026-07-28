import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  X, Bold, Italic, UnderlineIcon, List, ListOrdered,
  Heading1, Heading2, Heading3, Download, Save,
} from 'lucide-react';
import type { Document } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { addDocument, updateDocument } from '../hooks/useDB';
import { downloadAsTxt, downloadAsPdf, downloadAsDocx } from '../utils/fileExport';

interface TextEditorProps {
  document: Document | null; // null — новый документ
  clientId: string | null;   // клиент, к которому привязывается новый документ
  isPersonal?: boolean;      // личный документ (для профиля)
  onClose: () => void;
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

export default function TextEditor({ document, clientId, isPersonal = false, onClose }: TextEditorProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();

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
          const json = JSON.parse(document.content);
          editor.commands.setContent(json);
        } catch {
          // если контент не JSON (например, старый формат) — вставляем как обычный текст
          editor.commands.setContent(`<p>${document.content}</p>`);
        }
      } else {
        // pdf/docx — показываем извлечённый текст только для чтения
        editor.commands.setContent(`<p>${document.content.replace(/\n/g, '</p><p>')}</p>`);
      }
    }
  }, [editor, document]);

  const handleSave = useCallback(async () => {
    if (!editor || !masterKey) return;
    if (isReadonly) return; // pdf/docx не редактируются

    setError(null);
    const plainText = editor.getText();
    const finalTitle = title.trim() || plainText.slice(0, 50) || 'Без названия';
    const contentJson = JSON.stringify(editor.getJSON());

    setIsSaving(true);
    try {
      if (document) {
        await updateDocument(document.id, { title: finalTitle, content: contentJson }, masterKey);
      } else {
        await addDocument(
          {
            title: finalTitle,
            type: 'txt',
            content: contentJson,
            clientId: isPersonal ? null : clientId,
            isPersonal,
          },
          masterKey
        );
      }
      onClose();
    } catch {
      setError(t('textEditor.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [editor, masterKey, isReadonly, title, document, clientId, isPersonal, onClose, t]);

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isReadonly}
            placeholder={t('textEditor.titlePlaceholder')}
            className="flex-1 text-base font-semibold text-gray-800 dark:text-gray-100 bg-transparent focus:outline-none disabled:opacity-70"
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {isReadonly && (
          <div className="px-5 py-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400">
            {t('textEditor.readOnlyNotice', { type: document?.type.toUpperCase() ?? '' })}
          </div>
        )}

        {/* Панель инструментов */}
        {!isReadonly && (
          <div className="flex items-center gap-1 px-5 py-2 border-b border-gray-200 dark:border-gray-800">
            <ToolbarButton title={t('textEditor.toolbar.bold')} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton title={t('textEditor.toolbar.italic')} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton title={t('textEditor.toolbar.underline')} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon size={16} />
            </ToolbarButton>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
            <ToolbarButton title={t('textEditor.toolbar.heading1')} active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 size={16} />
            </ToolbarButton>
            <ToolbarButton title={t('textEditor.toolbar.heading2')} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 size={16} />
            </ToolbarButton>
            <ToolbarButton title={t('textEditor.toolbar.heading3')} active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 size={16} />
            </ToolbarButton>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
            <ToolbarButton title={t('textEditor.toolbar.bulletList')} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton title={t('textEditor.toolbar.orderedList')} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered size={16} />
            </ToolbarButton>
          </div>
        )}

        {/* Контент */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <EditorContent
            editor={editor}
            className="prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px]"
          />
        </div>

        {error && (
          <div className="mx-5 mb-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Футер */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download size={16} />
              {t('textEditor.export')}
            </button>
            {isExportMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <button onClick={() => handleExport('txt')} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {t('textEditor.exportTxt')}
                </button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {t('textEditor.exportPdf')}
                </button>
                <button onClick={() => handleExport('docx')} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {t('textEditor.exportDocx')}
                </button>
              </div>
            )}
          </div>

          {!isReadonly && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              <Save size={16} />
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}