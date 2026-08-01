import { useState, useMemo } from 'react';
import {
  PencilSimpleIcon, PlusIcon, FileTextIcon, FilePlusIcon,
  UploadSimpleIcon, DownloadSimpleIcon, TrashIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { Client, Document } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { updateClient, deleteClient, useClientEvents, addCalendarEvent, useClientDocuments, deleteDocument } from '../hooks/useDB';
import { formatDateRu, toYMD } from '../utils/date';
import { downloadOriginalFile, downloadAsTxt, MIME_TYPES } from '../utils/fileExport';
import Avatar from './Avatar';
import ModalShell from './ModalShell';
import TextEditor from './TextEditor';
import ImportDocumentModal from './ImportDocumentModal';
import DateInput from './DateInput';
import TimeInput from './TimeInput';
import ConfirmDialog from './ConfirmDialog';

interface ClientCardProps {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
}

type SessionsView = 'upcoming' | 'completed';

export default function ClientCard({ client, onClose, onEdit }: ClientCardProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const { showToast } = useToast();
  const clientEvents = useClientEvents(client.id, masterKey);
  const clientDocuments = useClientDocuments(client.id, masterKey);

  const [notes, setNotes] = useState(client.notes);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('');
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [sessionsView, setSessionsView] = useState<SessionsView>('upcoming');
  const [todayYMD] = useState(() => toYMD(new Date()));

  const handleSaveNotes = async () => {
    if (!masterKey) return;
    setIsSavingNotes(true);
    try {
      await updateClient(client.id, { notes }, masterKey);
      showToast('success', t('client.saveNotes'));
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAddSession = async () => {
    if (!masterKey || !newSessionDate || !newSessionTime) return;
    await addCalendarEvent(
      { date: newSessionDate, time: newSessionTime, clientId: client.id, title: '', note: '', isPersonal: false },
      masterKey
    );
    setNewSessionDate('');
    setNewSessionTime('');
  };

  const handleDownloadDoc = (doc: Document) => {
    if (doc.type === 'txt') {
      try {
        downloadAsTxt(extractPlainText(JSON.parse(doc.content)), doc.title);
      } catch {
        downloadAsTxt(doc.content, doc.title);
      }
    } else if (doc.originalFileBase64) {
      downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
    }
  };

  const handleDeleteDoc = async (doc: Document) => {
    if (!confirm(t('client.confirmDeleteDocument', { title: doc.title }))) return;
    await deleteDocument(doc.id);
    showToast('success', t('common.delete'));
  };

  const handleDeleteClient = async () => {
    await deleteClient(client.id);
    showToast('success', t('common.delete'));
    setIsConfirmingDelete(false);
    onClose();
  };

  const { upcomingEvents, completedEvents } = useMemo(() => {
    const sorted = [...(clientEvents ?? [])].sort((a, b) =>
      a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
    );
    return {
      upcomingEvents: sorted.filter((ev) => ev.date >= todayYMD),
      completedEvents: sorted.filter((ev) => ev.date < todayYMD).reverse(),
    };
  }, [clientEvents, todayYMD]);

  const visibleEvents = sessionsView === 'upcoming' ? upcomingEvents : completedEvents;

  return (
    <>
      <ModalShell onClose={onClose} maxWidth="max-w-lg">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface">
          <div className="flex items-center gap-3">
            <Avatar name={client.name} size={44} />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{client.name}</h2>
              <span
                className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  client.status === 'active' ? 'bg-success/15 text-success' : 'bg-surface-hover text-text-tertiary'
                }`}
              >
                {client.status === 'active' ? t('clients.status.active') : t('clients.status.archived')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover" title={t('common.edit')}>
              <PencilSimpleIcon size={16} />
            </button>
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="p-2 rounded-md text-error hover:bg-error/10"
              title={t('common.delete')}
            >
              <TrashIcon size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-6">
          <div className="text-sm text-text-secondary flex flex-col gap-1">
            {client.phone && <p>{t('client.phone')}: {client.phone}</p>}
            {client.email && <p>{t('client.email')}: {client.email}</p>}
            {client.workPlace && <p>{t('client.workPlace')}: {client.workPlace}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-text-primary">{t('client.sessions')}</h3>
              <button
                onClick={() => setSessionsView((v) => (v === 'upcoming' ? 'completed' : 'upcoming'))}
                className="text-xs font-medium text-primary hover:underline"
              >
                {sessionsView === 'upcoming'
                  ? t('client.showCompletedSessions', { count: completedEvents.length })
                  : t('client.showUpcomingSessions', { count: upcomingEvents.length })}
              </button>
            </div>

            {visibleEvents.length === 0 ? (
              <p className="text-sm text-text-secondary mb-3">
                {sessionsView === 'upcoming' ? t('client.noSessions') : t('client.noCompletedSessions')}
              </p>
            ) : (
              <ul className="flex flex-col gap-1 mb-3 max-h-48 overflow-y-auto pr-1">
                {visibleEvents.map((ev) => (
                  <li key={ev.id} className="text-sm text-text-secondary bg-surface-hover rounded-md px-3 py-1.5 flex justify-between shrink-0">
                    <span>{formatDateRu(ev.date)}</span>
                    <span className="text-text-tertiary">{ev.time}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-end gap-2">
              <DateInput value={newSessionDate} onChange={setNewSessionDate} />
              <TimeInput value={newSessionTime} onChange={setNewSessionTime} />
              <button
                onClick={handleAddSession}
                disabled={!newSessionDate || !newSessionTime}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                <PlusIcon size={14} />
                {t('common.add')}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">{t('client.notes')}</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder={t('client.notesPlaceholder')}
            />
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes || notes === client.notes}
              className="mt-2 px-3 py-1.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isSavingNotes ? t('common.saving') : t('client.saveNotes')}
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">{t('client.documents')}</h3>

            {(!clientDocuments || clientDocuments.length === 0) ? (
              <div className="text-sm text-text-secondary bg-surface-hover rounded-xl p-4 flex flex-col items-center gap-2 mb-3">
                <FileTextIcon size={20} className="text-text-tertiary" />
                <span>{t('client.noDocuments')}</span>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5 mb-3">
                {clientDocuments.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between text-sm bg-surface-hover rounded-xl px-3 py-2">
                    <span className="truncate text-text-primary">{doc.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.type === 'txt' && (
                        <button onClick={() => setEditingDoc(doc)} className="p-1.5 rounded text-text-secondary hover:bg-surface" title={t('common.open')}>
                          <FilePlusIcon size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDownloadDoc(doc)} className="p-1.5 rounded text-text-secondary hover:bg-surface" title={t('common.download')}>
                        <DownloadSimpleIcon size={14} />
                      </button>
                      <button onClick={() => handleDeleteDoc(doc)} className="p-1.5 rounded text-error hover:bg-error/10" title={t('common.delete')}>
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setIsCreatingDoc(true)}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors"
              >
                <FilePlusIcon size={14} />
                {t('client.createDocument')}
              </button>
              <button
                onClick={() => setIsImporting(true)}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors"
              >
                <UploadSimpleIcon size={14} />
                {t('client.importDocument')}
              </button>
            </div>
          </div>
        </div>
      </ModalShell>

      {editingDoc && <TextEditor document={editingDoc} clientId={client.id} onClose={() => setEditingDoc(null)} />}
      {isCreatingDoc && <TextEditor document={null} clientId={client.id} onClose={() => setIsCreatingDoc(false)} />}
      {isImporting && <ImportDocumentModal clientId={client.id} onClose={() => setIsImporting(false)} />}
      {isConfirmingDelete && (
        <ConfirmDialog
          title={t('client.deleteConfirmTitle')}
          message={t('client.deleteConfirmMessage', { name: client.name })}
          onConfirm={handleDeleteClient}
          onClose={() => setIsConfirmingDelete(false)}
        />
      )}
    </>
  );
}

function extractPlainText(node: { text?: string; content?: unknown[] }): string {
  if (node.text) return node.text;
  if (node.content) {
    return (node.content as { text?: string; content?: unknown[] }[]).map((c) => extractPlainText(c)).join('\n');
  }
  return '';
}