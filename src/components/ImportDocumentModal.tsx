import { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { useAuth } from '../hooks/useAuthHook';
import { addDocument } from '../hooks/useDB';
import { fileToBase64, readTextFile, readPdfText, readDocxText, guessDocumentType } from '../utils/fileImport';

interface ImportDocumentModalProps {
  clientId: string | null;
  isPersonal?: boolean;
  onClose: () => void;
}

export default function ImportDocumentModal({ clientId, isPersonal = false, onClose }: ImportDocumentModalProps) {
  const { masterKey } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    if (selected && !title) {
      setTitle(selected.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Выберите файл');
      return;
    }
    if (!masterKey) {
      setError('Нет доступа — войдите заново');
      return;
    }

    const type = guessDocumentType(file.name);
    if (!type) {
      setError('Поддерживаются только файлы TXT, PDF и DOCX');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalTitle = title.trim() || file.name;

      if (type === 'txt') {
        const text = await readTextFile(file);
        await addDocument(
          {
            title: finalTitle,
            type: 'txt',
            content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] }),
            clientId: isPersonal ? null : clientId,
            isPersonal,
          },
          masterKey
        );
      } else {
        const extractedText = type === 'pdf' ? await readPdfText(file) : await readDocxText(file);
        const originalFileBase64 = await fileToBase64(file);

        await addDocument(
          {
            title: finalTitle,
            type,
            content: extractedText,
            originalFileBase64,
            clientId: isPersonal ? null : clientId,
            isPersonal,
          },
          masterKey
        );
      }

      onClose();
    } catch {
      setError('Не удалось импортировать файл');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Импортировать документ</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Файл *</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Upload size={16} />
              {file ? file.name : 'Выбрать файл (TXT, PDF, DOCX)'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название документа"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {isSubmitting ? 'Импорт...' : 'Импортировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}