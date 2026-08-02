import { useState, useRef } from 'react';
import { UploadSimpleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { addDocument } from '../hooks/useDB';
import { fileToBase64, readTextFile, readPdfText, readDocxText, guessDocumentType } from '../utils/fileImport';
import ModalShell from './ModalShell';

interface ImportDocumentModalProps {
  clientId: string | null;
  isPersonal?: boolean;
  onClose: () => void;
}

export default function ImportDocumentModal({ clientId, isPersonal = false, onClose }: ImportDocumentModalProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    if (selected && !title) setTitle(selected.name.replace(/\.[^.]+$/, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) { setError(t('import.validation.fileRequired')); return; }
    if (!masterKey) { setError(t('common.sessionExpired')); return; }

    const type = guessDocumentType(file.name);
    if (!type) { setError(t('import.validation.unsupportedType')); return; }

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
            origin: 'imported',
          },
          masterKey
        );
      } else {
        const extractedText = type === 'pdf' ? await readPdfText(file) : await readDocxText(file);
        const originalFileBase64 = await fileToBase64(file);

        await addDocument(
          { title: finalTitle, type, content: extractedText, originalFileBase64, clientId: isPersonal ? null : clientId, isPersonal, origin: 'imported' },
          masterKey
        );
      }

      showToast('success', t('common.save'));
      onClose();
    } catch {
      setError(t('import.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center px-5 pt-6 pb-4 border-b border-border">
        <div className="w-12 h-12 rounded-full bg-secondary-tint text-secondary flex items-center justify-center mb-3">
          <UploadSimpleIcon size={22} />
        </div>
        <h2 className="text-base font-semibold text-text-primary">{t('import.title')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-text-secondary mb-1 block">{t('import.file')} *</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <UploadSimpleIcon size={16} />
            {file ? file.name : t('import.chooseFile')}
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx" onChange={handleFileChange} className="hidden" />
        </div>

        <div>
          <label className="text-sm font-medium text-text-secondary mb-1 block">{t('import.titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('import.titlePlaceholder')}
            className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && <div className="text-sm text-error bg-error/10 rounded-xl px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-lift flex-1 py-2 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-medium transition-colors">
            {isSubmitting ? t('common.importing') : t('common.import')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}