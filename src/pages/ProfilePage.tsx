import { useState, useRef } from 'react';
import { FileTextIcon, UploadSimpleIcon, DownloadSimpleIcon, TrashIcon, FilePlusIcon, CameraIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { useDocumentEditor } from '../hooks/useDocumentEditorHook';
import { usePersonalDocuments, deleteDocument } from '../hooks/useDB';
import type { Document } from '../types';
import { downloadOriginalFile, MIME_TYPES } from '../utils/fileExport';
import { fileToBase64 } from '../utils/fileImport';
import Avatar from '../components/Avatar';
import ImportDocumentModal from '../components/ImportDocumentModal';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { userProfile, masterKey, updateProfile } = useAuth();
  const { showToast } = useToast();
  const { openDocument } = useDocumentEditor();
  const personalDocuments = usePersonalDocuments(masterKey);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isImporting, setIsImporting] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    await updateProfile({ avatar: base64 });
    showToast('success', t('common.save'));
    e.target.value = '';
  };

  const handleDownload = (doc: Document) => {
    if (doc.type === 'txt') {
      openDocument({ document: doc, clientId: null, isPersonal: true });
    } else if (doc.originalFileBase64) {
      downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(t('client.confirmDeleteDocument', { title: doc.title }))) return;
    await deleteDocument(doc.id);
    showToast('success', t('common.delete'));
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-text-primary mb-6">{t('profile.title')}</h1>

      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <Avatar name={userProfile?.name ?? '?'} photoBase64={userProfile?.avatar} size={64} />
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-card hover:bg-primary-hover transition-colors"
            title={t('common.edit')}
          >
            <CameraIcon size={12} />
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>
        <div>
          <p className="font-medium text-text-primary">{userProfile?.name}</p>
          <p className="text-sm text-text-secondary">{userProfile?.email}</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">{t('profile.documentsTitle')}</h2>

        {(!personalDocuments || personalDocuments.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-10 text-text-tertiary bg-surface-hover rounded-lg mb-3">
            <FileTextIcon size={28} className="mb-2 opacity-60" />
            <p className="text-sm">{t('profile.noDocuments')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 mb-3">
            {personalDocuments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface">
                <span className="text-sm text-text-primary truncate">{doc.title}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.type === 'txt' && (
                    <button onClick={() => openDocument({ document: doc, clientId: null, isPersonal: true })} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover" title={t('common.open')}>
                      <FilePlusIcon size={16} />
                    </button>
                  )}
                  <button onClick={() => handleDownload(doc)} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover" title={t('common.download')}>
                    <DownloadSimpleIcon size={16} />
                  </button>
                  <button onClick={() => handleDelete(doc)} className="p-2 rounded-md text-error hover:bg-error/10" title={t('common.delete')}>
                    <TrashIcon size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => setIsImporting(true)}
          className="flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors"
        >
          <UploadSimpleIcon size={14} />
          {t('profile.upload')}
        </button>
      </div>

      {isImporting && <ImportDocumentModal clientId={null} isPersonal onClose={() => setIsImporting(false)} />}
    </div>
  );
}