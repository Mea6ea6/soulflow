import { useState } from 'react';
import { X, Pencil, Plus } from 'lucide-react';
import type { Client } from '../types';
import { useAuth } from '../hooks/useAuthHook';
import { formatDateRu } from '../utils/date';

import { updateClient, useClientEvents, addCalendarEvent, useClientDocuments, deleteDocument } from '../hooks/useDB';
import type { Document } from '../types';
import { downloadOriginalFile, downloadAsTxt, MIME_TYPES } from '../utils/fileExport';
import TextEditor from './TextEditor';
import ImportDocumentModal from './ImportDocumentModal';
import { FilePlus, Upload, Download, Trash2 } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
}

export default function ClientCard({ client, onClose, onEdit }: ClientCardProps) {
  const { masterKey } = useAuth();
  const clientEvents = useClientEvents(client.id, masterKey);

  const [notes, setNotes] = useState(client.notes);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState('');

  const clientDocuments = useClientDocuments(client.id, masterKey);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleDownloadDoc = (doc: Document) => {
    if (doc.type === 'txt') {
      try {
        const json = JSON.parse(doc.content);
        const text = extractPlainTextFromTipTap(json);
        downloadAsTxt(text, doc.title);
      } catch {
        downloadAsTxt(doc.content, doc.title);
      }
    } else if (doc.originalFileBase64) {
      downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
    }
  };

  const handleDeleteDoc = async (doc: Document) => {
    if (!confirm(`Удалить документ "${doc.title}"?`)) return;
    await deleteDocument(doc.id);
  };

  const handleSaveNotes = async () => {
    if (!masterKey) return;
    setIsSavingNotes(true);
    try {
      await updateClient(client.id, { notes }, masterKey);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAddSession = async () => {
    if (!masterKey || !newSessionDate) return;
    await addCalendarEvent(
      {
        date: newSessionDate,
        time: '00:00',
        clientId: client.id,
        title: '',
        note: '',
        isPersonal: false,
      },
      masterKey
    );
    setNewSessionDate('');
  };

  const sortedEvents = [...(clientEvents ?? [])].sort((a, b) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {client.name}
            </h2>
            <span
              className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                client.status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {client.status === 'active' ? 'Активный' : 'Архивный'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Редактировать"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Закрыть"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-6">
          <div className="text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-1">
            {client.phone && <p>Телефон: {client.phone}</p>}
            {client.email && <p>Email: {client.email}</p>}
            {client.workPlace && <p>Место работы/учёбы: {client.workPlace}</p>}
          </div>

          {/* Сеансы — реальные события из календаря */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Сеансы
            </h3>
            {sortedEvents.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Сеансов пока нет</p>
            ) : (
              <ul className="flex flex-col gap-1 mb-3">
                {sortedEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 flex justify-between"
                  >
                    <span>{formatDateRu(ev.date)}</span>
                    <span className="text-gray-400 dark:text-gray-500">{ev.time}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                type="date"
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleAddSession}
                disabled={!newSessionDate}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                Добавить
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Время можно уточнить позже в разделе "Календарь"
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Заметки
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Краткое описание клиента..."
            />
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes || notes === client.notes}
              className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isSavingNotes ? 'Сохранение...' : 'Сохранить заметку'}
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Документы
            </h3>

            {(!clientDocuments || clientDocuments.length === 0) ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center mb-3">
                Документов пока нет
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5 mb-3">
                {clientDocuments.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
                  >
                    <span className="truncate text-gray-700 dark:text-gray-200">{doc.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.type === 'txt' && (
                        <button onClick={() => setEditingDoc(doc)} className="p-1.5 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" title="Открыть">
                          <FilePlus size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDownloadDoc(doc)} className="p-1.5 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" title="Скачать">
                        <Download size={14} />
                      </button>
                      <button onClick={() => handleDeleteDoc(doc)} className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10" title="Удалить">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setIsCreatingDoc(true)}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <FilePlus size={14} />
                Создать документ
              </button>
              <button
                onClick={() => setIsImporting(true)}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Upload size={14} />
                Импортировать документ
              </button>
            </div>
          </div>

          {editingDoc && (
            <TextEditor document={editingDoc} clientId={client.id} onClose={() => setEditingDoc(null)} />
          )}
          {isCreatingDoc && (
            <TextEditor document={null} clientId={client.id} onClose={() => setIsCreatingDoc(false)} />
          )}
          {isImporting && (
            <ImportDocumentModal clientId={client.id} onClose={() => setIsImporting(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

function extractPlainTextFromTipTap(node: { text?: string; content?: unknown[] }): string {
  if (node.text) return node.text;
  if (node.content) {
    return (node.content as { text?: string; content?: unknown[] }[])
      .map((child) => extractPlainTextFromTipTap(child))
      .join('\n');
  }
  return '';
}