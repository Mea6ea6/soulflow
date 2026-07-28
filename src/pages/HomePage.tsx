import { useState, useMemo } from 'react';
import { FileTextIcon, PencilSimpleIcon, DownloadSimpleIcon, CalendarCheckIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useDocuments, useCalendarEvents, useClients } from '../hooks/useDB';
import { downloadOriginalFile, downloadAsTxt, MIME_TYPES } from '../utils/fileExport';
import type { Document } from '../types';
import { toYMD } from '../utils/date';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function HomePage() {
  const { t } = useTranslation();
  const { userProfile, masterKey } = useAuth();
  const documents = useDocuments(masterKey);
  const events = useCalendarEvents(masterKey);
  const clients = useClients(masterKey);

  const [cutoff] = useState(() => Date.now() - SEVEN_DAYS_MS);
  const [todayYMD] = useState(() => toYMD(new Date()));

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const todayEvents = useMemo(
    () => (events ?? []).filter((e) => e.date === todayYMD).sort((a, b) => a.time.localeCompare(b.time)),
    [events, todayYMD]
  );

  const recentDocuments = useMemo(() => {
    return (documents ?? [])
      .filter((d) => !d.isPersonal && new Date(d.updatedAt).getTime() >= cutoff)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [documents, cutoff]);

  const handleDownload = (doc: Document) => {
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

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-text-primary mb-6">
        {userProfile ? t('home.welcomeWithName', { name: userProfile.name }) : t('home.welcome')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-lg border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheckIcon size={18} className="text-primary" />
            <h2 className="text-sm font-semibold text-text-primary">{t('home.today')}</h2>
          </div>

          {todayEvents.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('home.noEventsToday')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayEvents.map((ev) => (
                <li key={ev.id} className="flex items-center gap-3 text-sm">
                  <span className="font-medium text-text-primary w-12 shrink-0">{ev.time}</span>
                  <span className="text-text-secondary truncate">
                    {ev.isPersonal ? ev.title : clientNameById.get(ev.clientId ?? '') ?? t('home.clientFallback')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-surface rounded-lg border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <FileTextIcon size={18} className="text-primary" />
            <h2 className="text-sm font-semibold text-text-primary">{t('home.recentDocuments')}</h2>
          </div>

          {recentDocuments.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('home.noRecentDocuments')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between text-sm gap-2">
                  <div className="min-w-0">
                    <p className="text-text-primary truncate">{doc.title}</p>
                    <p className="text-xs text-text-tertiary">
                      {new Date(doc.updatedAt).toLocaleDateString('ru-RU')} · {doc.type.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-1.5 rounded text-text-secondary hover:bg-surface-hover shrink-0"
                    title={doc.type === 'txt' ? t('home.downloadTxt') : t('home.downloadOriginal')}
                  >
                    {doc.type === 'txt' ? <PencilSimpleIcon size={14} /> : <DownloadSimpleIcon size={14} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function extractPlainText(node: { text?: string; content?: unknown[] }): string {
  if (node.text) return node.text;
  if (node.content) return (node.content as { text?: string; content?: unknown[] }[]).map((c) => extractPlainText(c)).join('\n');
  return '';
}