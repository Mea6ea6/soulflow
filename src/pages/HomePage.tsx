import { useState, useMemo } from 'react';
import { FileTextIcon, PencilSimpleIcon, DownloadSimpleIcon, CalendarCheckIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useDocuments, useCalendarEvents, useClients } from '../hooks/useDB';
import { downloadOriginalFile, downloadAsTxt, MIME_TYPES } from '../utils/fileExport';
import type { Document } from '../types';
import { toYMD } from '../utils/date';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const GREETING_POOLS = {
  night: ['home.greetingNight1', 'home.greetingNight2'],
  morning: ['home.greetingMorning1', 'home.greetingMorning2'],
  day: ['home.greetingDay1', 'home.greetingDay2'],
  evening: ['home.greetingEvening1', 'home.greetingEvening2'],
} as const;

function pickGreetingKey(): string {
  const hour = new Date().getHours();
  const pool =
    hour < 6 ? GREETING_POOLS.night :
    hour < 12 ? GREETING_POOLS.morning :
    hour < 18 ? GREETING_POOLS.day :
    GREETING_POOLS.evening;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { userProfile, masterKey } = useAuth();
  const documents = useDocuments(masterKey);
  const events = useCalendarEvents(masterKey);
  const clients = useClients(masterKey);

  const [cutoff] = useState(() => Date.now() - SEVEN_DAYS_MS);
  const [todayYMD] = useState(() => toYMD(new Date()));
  const [greetingKey] = useState(() => pickGreetingKey());

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [i18n.language]);

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
      <div className="text-center max-w-xl mx-auto py-10 md:py-14">
        <p className="text-xs font-semibold tracking-widest uppercase text-text-tertiary mb-3">
          {dateLabel}
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-text-primary">
          {userProfile ? t(greetingKey, { name: userProfile.name }) : t('home.welcome')}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-text-tertiary mb-3">
            {t('home.today')}
          </h2>

          {todayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
              <CalendarCheckIcon size={32} className="mb-2 opacity-50" />
              <p className="text-sm text-center">{t('home.noEventsToday')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {todayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-surface shadow-card hover:shadow-card-hover transition-shadow"
                >
                  <div className="shrink-0 w-11 h-11 rounded-lg bg-primary-tint text-primary flex items-center justify-center font-display font-semibold text-xs">
                    {ev.time}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary truncate">
                      {ev.isPersonal ? ev.title : clientNameById.get(ev.clientId ?? '') ?? t('home.clientFallback')}
                    </p>
                    {ev.isPersonal && (
                      <p className="text-xs text-text-tertiary">{t('calendar.personalEvent')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-text-tertiary mb-3">
            {t('home.recentDocuments')}
          </h2>

          {recentDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
              <FileTextIcon size={32} className="mb-2 opacity-50" />
              <p className="text-sm text-center">{t('home.noRecentDocuments')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleDownload(doc)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-surface shadow-card hover:shadow-card-hover transition-shadow text-left"
                  title={doc.type === 'txt' ? t('home.downloadTxt') : t('home.downloadOriginal')}
                >
                  <div className="shrink-0 w-11 h-11 rounded-lg bg-secondary-tint text-secondary flex items-center justify-center">
                    <FileTextIcon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary truncate">{doc.title}</p>
                    <p className="text-xs text-text-tertiary">
                      {new Date(doc.updatedAt).toLocaleDateString('ru-RU')} · {doc.type.toUpperCase()}
                    </p>
                  </div>
                  <span className="shrink-0 text-text-tertiary">
                    {doc.type === 'txt' ? <PencilSimpleIcon size={16} /> : <DownloadSimpleIcon size={16} />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function extractPlainText(node: { text?: string; content?: unknown[] }): string {
  if (node.text) return node.text;
  if (node.content) return (node.content as { text?: string; content?: unknown[] }[]).map((c) => extractPlainText(c)).join('\n');
  return '';
}