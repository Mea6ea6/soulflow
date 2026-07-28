import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Upload, Download, Trash2, FilePlus, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuthHook';
import { usePersonalDocuments, deleteDocument } from '../hooks/useDB';
import type { Document } from '../types';
import { downloadOriginalFile, downloadAsTxt, MIME_TYPES } from '../utils/fileExport';
import TextEditor from '../components/TextEditor';
import ImportDocumentModal from '../components/ImportDocumentModal';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { userProfile, masterKey } = useAuth();
  const personalDocuments = usePersonalDocuments(masterKey);

  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleDownload = (doc: Document) => {
    if (doc.type === 'txt') {
      try {
        const json = JSON.parse(doc.content);
        downloadAsTxt(extractPlainText(json), doc.title);
      } catch {
        downloadAsTxt(doc.content, doc.title);
      }
    } else if (doc.originalFileBase64) {
      downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(t('documents.confirmDelete', { title: doc.title }))) return;
    await deleteDocument(doc.id);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">{t('profile.title')}</h1>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
          <User size={28} />
        </div>
        <div>
          <p className="font-medium text-gray-800 dark:text-gray-100">{userProfile?.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{userProfile?.email}</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('profile.documentsTitle')}</h2>

        {(!personalDocuments || personalDocuments.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-xl mb-3">
            <FileText size={28} className="mb-2" />
            <p className="text-sm">{t('profile.noDocuments')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 mb-3">
            {personalDocuments.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              >
                <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{doc.title}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.type === 'txt' && (
                    <button onClick={() => setEditingDoc(doc)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title={t('common.open')}>
                      <FilePlus size={16} />
                    </button>
                  )}
                  <button onClick={() => handleDownload(doc)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title={t('common.download')}>
                    <Download size={16} />
                  </button>
                  <button onClick={() => handleDelete(doc)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title={t('common.delete')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setIsImporting(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Upload size={14} />
            {t('profile.upload')}
          </button>
        </div>
      </div>

      {editingDoc && (
        <TextEditor document={editingDoc} clientId={null} isPersonal onClose={() => setEditingDoc(null)} />
      )}
      {isImporting && (
        <ImportDocumentModal clientId={null} isPersonal onClose={() => setIsImporting(false)} />
      )}
    </div>
  );
}

function extractPlainText(node: { text?: string; content?: unknown[] }): string {
  if (node.text) return node.text;
  if (node.content) {
    return (node.content as { text?: string; content?: unknown[] }[])
      .map((child) => extractPlainText(child))
      .join('\n');
  }
  return '';
}