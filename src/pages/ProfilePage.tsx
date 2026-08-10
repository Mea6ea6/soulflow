import { useState, useMemo, useEffect, useRef } from 'react';
import { FileTextIcon, UploadSimpleIcon, DownloadSimpleIcon, TrashIcon, FilePlusIcon, UsersIcon, FolderOpenIcon, CalendarCheckIcon, ArchiveIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { useDocumentEditor } from '../hooks/useDocumentEditorHook';
import { usePersonalDocuments, useDocuments, useClients, useCalendarEvents, deleteDocument } from '../hooks/useDB';
import type { Document } from '../types';
import { downloadOriginalFile, downloadAsTxt, downloadAsPdf, downloadAsDocx, MIME_TYPES } from '../utils/fileExport';
import { toYMD } from '../utils/date';
import Avatar from '../components/Avatar';
import ImportDocumentModal from '../components/ImportDocumentModal';
import ConfirmDialog from '../components/ConfirmDialog';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
type ProfileTab = 'documents' | 'stats';

function extractPlainText(node: { text?: string; content?: unknown[] }): string {
  if (node.text) return node.text;
  if (node.content) return (node.content as { text?: string; content?: unknown[] }[]).map((c) => extractPlainText(c)).join('\n');
  return '';
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { userProfile, masterKey } = useAuth();
  const { showToast } = useToast();
  const { openDocument } = useDocumentEditor();
  const personalDocuments = usePersonalDocuments(masterKey);
  const allDocuments = useDocuments(masterKey);
  const clients = useClients(masterKey);
  const events = useCalendarEvents(masterKey);

  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('documents');
  const [todayYMD] = useState(() => toYMD(new Date()));
  const [weekEndYMD] = useState(() => toYMD(new Date(Date.now() + SEVEN_DAYS_MS)));
  const [exportMenuDocId, setExportMenuDocId] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const allClients = clients ?? [];
    const allEvents = events ?? [];
    return {
      activeClients: allClients.filter((c) => c.status === 'active').length,
      archivedClients: allClients.filter((c) => c.status === 'archived').length,
      upcomingEvents: allEvents.filter((e) => e.date >= todayYMD && e.date <= weekEndYMD).length,
      // Сеансы — только встречи с клиентами, личные дела в эту статистику не входят
      completedSessions: allEvents.filter((e) => !e.isPersonal && e.date < todayYMD).length,
      totalDocuments: (allDocuments ?? []).length,
      personalDocuments: (personalDocuments ?? []).length,
    };
  }, [clients, events, allDocuments, personalDocuments, todayYMD, weekEndYMD]);

  useEffect(() => {
    if (!exportMenuDocId) return;
    const handler = (e: MouseEvent) => {
      if (!exportMenuRef.current?.contains(e.target as Node)) setExportMenuDocId(null);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [exportMenuDocId]);

  const handleExportFormat = (doc: Document, format: 'txt' | 'pdf' | 'docx') => {
    let json: object | null = null;
    let text = doc.content;
    try {
      json = JSON.parse(doc.content);
      text = extractPlainText(json as { text?: string; content?: unknown[] });
    } catch { /* уже plain text */ }

    if (format === 'txt') downloadAsTxt(text, doc.title);
    if (format === 'pdf') downloadAsPdf(json ?? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }, doc.title);
    if (format === 'docx') downloadAsDocx(json ?? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }, doc.title);
    setExportMenuDocId(null);
  };

  const handleDownloadOriginal = (doc: Document) => {
    if (doc.originalFileBase64) {
      const mimeType = doc.type === 'pdf' || doc.type === 'docx' ? MIME_TYPES[doc.type] : undefined;
      if (!mimeType) return;
      downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, mimeType);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingDoc) {
      await deleteDocument(deletingDoc.id);
      showToast('success', t('common.delete'));
    }
    setDeletingDoc(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-text-primary mb-6">{t('profile.title')}</h1>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Avatar name={userProfile?.name ?? '?'} photoBase64={userProfile?.avatar} size={64} />
          <div>
            <p className="font-medium text-text-primary">{userProfile?.name}</p>
            <p className="text-sm text-text-secondary">{userProfile?.email}</p>
          </div>
        </div>

        <div className="inline-flex p-1 rounded-full bg-surface-hover">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'documents' ? 'bg-primary-tint text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('profile.tabDocuments')}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'stats' ? 'bg-primary-tint text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('profile.tabStats')}
          </button>
        </div>
      </div>

      {userProfile?.description ? (
        <p className="text-sm text-text-secondary max-w-2xl mb-8">{userProfile.description}</p>
      ) : (
        <p className="text-sm text-text-tertiary max-w-2xl mb-8 italic">{t('profile.bioEmpty')}</p>
      )}

      {activeTab === 'stats' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-surface shadow-card flex flex-col items-center text-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary-tint text-primary flex items-center justify-center"><UsersIcon size={18} /></div>
            <p className="font-display text-2xl font-semibold text-text-primary">{stats.activeClients}</p>
            <p className="text-xs text-text-tertiary">{t('home.stats.activeClients')}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface shadow-card flex flex-col items-center text-center gap-2">
            <div className="w-9 h-9 rounded-full bg-secondary-tint text-secondary flex items-center justify-center"><ArchiveIcon size={18} /></div>
            <p className="font-display text-2xl font-semibold text-text-primary">{stats.archivedClients}</p>
            <p className="text-xs text-text-tertiary">{t('profile.stats.archivedClients')}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface shadow-card flex flex-col items-center text-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary-tint text-primary flex items-center justify-center"><CalendarCheckIcon size={18} /></div>
            <p className="font-display text-2xl font-semibold text-text-primary">{stats.upcomingEvents}</p>
            <p className="text-xs text-text-tertiary">{t('home.stats.upcomingEvents')}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface shadow-card flex flex-col items-center text-center gap-2">
            <div className="w-9 h-9 rounded-full bg-secondary-tint text-secondary flex items-center justify-center"><CheckCircleIcon size={18} /></div>
            <p className="font-display text-2xl font-semibold text-text-primary">{stats.completedSessions}</p>
            <p className="text-xs text-text-tertiary">{t('profile.stats.completedSessions')}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface shadow-card flex flex-col items-center text-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary-tint text-primary flex items-center justify-center"><FolderOpenIcon size={18} /></div>
            <p className="font-display text-2xl font-semibold text-text-primary">{stats.totalDocuments}</p>
            <p className="text-xs text-text-tertiary">{t('profile.stats.totalDocuments')}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface shadow-card flex flex-col items-center text-center gap-2">
            <div className="w-9 h-9 rounded-full bg-secondary-tint text-secondary flex items-center justify-center"><FileTextIcon size={18} /></div>
            <p className="font-display text-2xl font-semibold text-text-primary">{stats.personalDocuments}</p>
            <p className="text-xs text-text-tertiary">{t('profile.stats.myDocuments')}</p>
          </div>
        </div>
      ) : (
        <div>
          {(!personalDocuments || personalDocuments.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-tertiary bg-surface rounded-xl shadow-card mb-3">
              <FileTextIcon size={28} className="mb-2 opacity-60" />
              <p className="text-sm">{t('profile.noDocuments')}</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 mb-3">
              {personalDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface shadow-card">
                  <span className="text-sm text-text-primary truncate">{doc.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.type === 'txt' && (
                      <button onClick={() => openDocument({ document: doc, clientId: null, isPersonal: true })} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover" title={t('common.open')}>
                        <FilePlusIcon size={16} />
                      </button>
                    )}

                    {doc.type === 'txt' ? (
                      <div className="relative" ref={exportMenuDocId === doc.id ? exportMenuRef : undefined}>
                        <button
                          onClick={() => setExportMenuDocId(exportMenuDocId === doc.id ? null : doc.id)}
                          className="p-2 rounded-md text-text-secondary hover:bg-surface-hover"
                          title={t('common.download')}
                        >
                          <DownloadSimpleIcon size={16} />
                        </button>
                        {exportMenuDocId === doc.id && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-xl shadow-card-hover p-1 z-30">
                            <button onClick={() => handleExportFormat(doc, 'txt')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">TXT</button>
                            <button onClick={() => handleExportFormat(doc, 'pdf')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">PDF</button>
                            <button onClick={() => handleExportFormat(doc, 'docx')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">DOCX</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => handleDownloadOriginal(doc)} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover" title={t('common.download')}>
                        <DownloadSimpleIcon size={16} />
                      </button>
                    )}

                    <button onClick={() => setDeletingDoc(doc)} className="p-2 rounded-md text-error hover:bg-error/10" title={t('common.delete')}>
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => setIsImporting(true)}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-full border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <UploadSimpleIcon size={14} />
            {t('profile.upload')}
          </button>
        </div>
      )}

      {isImporting && <ImportDocumentModal clientId={null} isPersonal onClose={() => setIsImporting(false)} />}

      {deletingDoc && (
        <ConfirmDialog
          title={t('client.confirmDeleteDocument', { title: deletingDoc.title })}
          message=""
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingDoc(null)}
        />
      )}
    </div>
  );
}