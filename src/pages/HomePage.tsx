import { useState, useMemo, useEffect } from 'react';
import { FileTextIcon, PencilSimpleIcon, DownloadSimpleIcon, CalendarCheckIcon, UserPlusIcon, CalendarPlusIcon, FilePlusIcon, XIcon } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useDocumentEditor } from '../hooks/useDocumentEditorHook';
import { useDocuments, useCalendarEvents, useClients } from '../hooks/useDB';
import { downloadOriginalFile, MIME_TYPES } from '../utils/fileExport';
import type { Document } from '../types';
import { toYMD } from '../utils/date';
import ClientModal from '../components/ClientModal';
import CalendarEventModal from '../components/CalendarEventModal';
import DocumentTargetModal, { type DocumentTarget } from '../components/DocumentTargetModal';

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

function eventDateTime(dateYMD: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const [y, mo, d] = dateYMD.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m, 0);
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function dismissedStorageKey(dateYMD: string): string {
  return `soulflow_dismissed_events_${dateYMD}`;
}

function readDismissed(dateYMD: string): Set<string> {
  try {
    const raw = localStorage.getItem(dismissedStorageKey(dateYMD));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { userProfile, masterKey } = useAuth();
  const { openDocument } = useDocumentEditor();
  const documents = useDocuments(masterKey);
  const events = useCalendarEvents(masterKey);
  const clients = useClients(masterKey);

  const [cutoff] = useState(() => Date.now() - SEVEN_DAYS_MS);
  const [todayYMD] = useState(() => toYMD(new Date()));
  const [greetingKey] = useState(() => pickGreetingKey());
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => readDismissed(todayYMD));

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }, [i18n.language]);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const todayEvents = useMemo(
    () => (events ?? [])
      .filter((e) => e.date === todayYMD && !dismissedIds.has(e.id))
      .sort((a, b) => a.time.localeCompare(b.time)),
    [events, todayYMD, dismissedIds]
  );

  const recentDocuments = useMemo(() => {
    return (documents ?? [])
      .filter((d) => !d.isPersonal && new Date(d.updatedAt).getTime() >= cutoff)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [documents, cutoff]);

  const handleDocumentClick = (doc: Document) => {
    if (doc.type === 'txt') {
      openDocument({ document: doc, clientId: doc.clientId, isPersonal: doc.isPersonal });
    } else if (doc.originalFileBase64) {
      downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
    }
  };

  const handleNewDocConfirm = (target: DocumentTarget) => {
    setIsCreatingDoc(false);
    openDocument({ document: null, clientId: target.clientId, isPersonal: target.isPersonal });
  };

  const handleDismissEvent = (eventId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(eventId);
      try {
        localStorage.setItem(dismissedStorageKey(todayYMD), JSON.stringify([...next]));
      } catch {
        /* localStorage недоступен — просто теряем сохранение между перезагрузками */
      }
      return next;
    });
  };

  return (
    <div className="pt-[6vh] md:pt-[10vh]">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-text-tertiary mb-3">
          {dateLabel}
        </p>
        <h1
          className="font-display text-4xl md:text-6xl font-semibold leading-tight bg-clip-text text-transparent"
          style={{ backgroundImage: 'var(--color-accent-gradient)' }}
        >
          {userProfile ? t(greetingKey, { name: userProfile.name }) : t('home.welcome')}
        </h1>
      </div>

      <div className="flex items-center justify-center gap-3 mb-12">
        <button
          onClick={() => setIsAddingClient(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
        >
          <UserPlusIcon size={16} />
          {t('home.quickAddClient')}
        </button>
        <button
          onClick={() => setIsAddingEvent(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
        >
          <CalendarPlusIcon size={16} />
          {t('home.quickAddEvent')}
        </button>
        <button
          onClick={() => setIsCreatingDoc(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
        >
          <FilePlusIcon size={16} />
          {t('home.quickAddDocument')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8 max-w-4xl w-full mx-auto">
        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-text-tertiary mb-3">
            {t('home.today')}
          </h2>

          {todayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
              <div className="w-14 h-14 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
                <CalendarCheckIcon size={24} />
              </div>
              <p className="text-sm text-center">{t('home.noEventsToday')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {todayEvents.map((ev) => {
                  const msUntil = eventDateTime(ev.date, ev.time).getTime() - now;
                  const hasStarted = msUntil <= 0;
                  return (
                    <motion.div
                      key={ev.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-center gap-3 p-4 rounded-xl bg-surface shadow-card hover:shadow-card-hover overflow-hidden"
                    >
                      <div className="shrink-0 w-11 h-11 rounded-lg bg-primary-tint text-primary flex items-center justify-center font-display font-semibold text-xs">
                        {ev.time}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary truncate">
                          {ev.isPersonal ? ev.title : clientNameById.get(ev.clientId ?? '') ?? t('home.clientFallback')}
                        </p>
                        {ev.isPersonal && <p className="text-xs text-text-tertiary">{t('calendar.personalEvent')}</p>}
                      </div>
                      {hasStarted ? (
                        <button
                          onClick={() => handleDismissEvent(ev.id)}
                          className="shrink-0 p-2 rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
                          title={t('home.dismissEvent')}
                        >
                          <XIcon size={16} />
                        </button>
                      ) : (
                        <span className="shrink-0 text-xs font-mono font-medium text-text-tertiary tabular-nums">
                          {formatCountdown(msUntil)}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-text-tertiary mb-3">
            {t('home.recentDocuments')}
          </h2>

          {recentDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
              <div className="w-14 h-14 rounded-full bg-secondary-tint text-secondary flex items-center justify-center mb-3">
                <FileTextIcon size={24} />
              </div>
              <p className="text-sm text-center">{t('home.noRecentDocuments')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleDocumentClick(doc)}
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

      {isAddingClient && <ClientModal client={null} onClose={() => setIsAddingClient(false)} />}
      {isAddingEvent && <CalendarEventModal date={todayYMD} event={null} onClose={() => setIsAddingEvent(false)} />}
      {isCreatingDoc && (
        <DocumentTargetModal title={t('documents.newTitle')} icon="create" onClose={() => setIsCreatingDoc(false)} onConfirm={handleNewDocConfirm} />
      )}
    </div>
  );
}