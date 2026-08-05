import { useState, useMemo, useEffect, useRef } from 'react';
import { FileTextIcon, UploadSimpleIcon, DownloadSimpleIcon, TrashIcon, FilePlusIcon, UsersIcon, FolderOpenIcon, CalendarCheckIcon, ArchiveIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { useDocumentEditor } from '../hooks/useDocumentEditorHook';
import { usePersonalDocuments, useDocuments, useClients, useCalendarEvents, deleteDocument } from '../hooks/useDB';
import type { Document, PresenceStatus } from '../types';
import { downloadOriginalFile, MIME_TYPES } from '../utils/fileExport';
import { toYMD } from '../utils/date';
import Avatar from '../components/Avatar';
import ImportDocumentModal from '../components/ImportDocumentModal';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
type ProfileTab = 'documents' | 'stats';

const PRESENCE_OPTIONS: PresenceStatus[] = ['available', 'busy', 'away', 'offline'];
const PRESENCE_DOT_CLASS: Record<PresenceStatus, string> = {
  available: 'bg-success',
  busy: 'bg-error',
  away: 'bg-warning',
  offline: 'bg-text-tertiary',
};

function StatusEditor({
  presence,
  statusText,
  onSave,
  onClose,
}: {
  presence: PresenceStatus;
  statusText: string | null;
  onSave: (presence: PresenceStatus, statusText: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draftPresence, setDraftPresence] = useState(presence);
  const [draftText, setDraftText] = useState(statusText ?? '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSave = () => {
    onSave(draftPresence, draftText.trim() ? draftText.trim().slice(0, 60) : null);
    onClose();
  };

  return (
    <div ref={ref} className="absolute z-40 top-full left-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-card-hover p-3 flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{t('profile.status.editTitle')}</p>

      <div className="flex flex-col gap-1">
        {PRESENCE_OPTIONS.map((p) => (
          <button
            key={p}
            onClick={() => setDraftPresence(p)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
              draftPresence === p ? 'bg-primary-tint text-primary' : 'text-text-primary hover:bg-surface-hover'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRESENCE_DOT_CLASS[p]}`} />
            {t(`profile.status.${p}`)}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={draftText}
        onChange={(e) => setDraftText(e.target.value)}
        placeholder={t('profile.status.textPlaceholder')}
        maxLength={60}
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />

      <div className="flex items-center gap-2">
        {draftText && (
          <button onClick={() => setDraftText('')} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
            {t('profile.status.clear')}
          </button>
        )}
        <div className="flex-1" />
        <button onClick={onClose} className="px-3 py-1.5 rounded-full border border-border text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors">
          {t('common.cancel')}
        </button>
        <button onClick={handleSave} className="px-3 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-colors">
          {t('common.save')}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { userProfile, masterKey, updateProfile } = useAuth();
  const { showToast } = useToast();
  const { openDocument } = useDocumentEditor();
  const personalDocuments = usePersonalDocuments(masterKey);
  const allDocuments = useDocuments(masterKey);
  const clients = useClients(masterKey);
  const events = useCalendarEvents(masterKey);

  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('documents');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [todayYMD] = useState(() => toYMD(new Date()));
  const [weekEndYMD] = useState(() => toYMD(new Date(Date.now() + SEVEN_DAYS_MS)));

  const presence = userProfile?.presence ?? 'available';
  const statusText = userProfile?.statusText ?? null;

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

  const handleSaveStatus = async (nextPresence: PresenceStatus, nextText: string | null) => {
    await updateProfile({ presence: nextPresence, statusText: nextText });
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-text-primary mb-6">{t('profile.title')}</h1>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar name={userProfile?.name ?? '?'} photoBase64={userProfile?.avatar} size={64} />
            <button
              onClick={() => setIsEditingStatus((v) => !v)}
              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-bg ${PRESENCE_DOT_CLASS[presence]}`}
              title={t('profile.status.editTitle')}
            />
            {isEditingStatus && (
              <StatusEditor
                presence={presence}
                statusText={statusText}
                onSave={handleSaveStatus}
                onClose={() => setIsEditingStatus(false)}
              />
            )}
          </div>
          <div>
            <p className="font-medium text-text-primary">{userProfile?.name}</p>
            <p className="text-sm text-text-secondary">{userProfile?.email}</p>
            <button
              onClick={() => setIsEditingStatus(true)}
              className="mt-0.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors text-left"
            >
              {statusText || t('profile.status.addPrompt')}
            </button>
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
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-full border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <UploadSimpleIcon size={14} />
            {t('profile.upload')}
          </button>
        </div>
      )}

      {isImporting && <ImportDocumentModal clientId={null} isPersonal onClose={() => setIsImporting(false)} />}
    </div>
  );
}