import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MagnifyingGlassIcon, UsersIcon, FileTextIcon, CalendarBlankIcon,
  UserPlusIcon, CalendarPlusIcon, FilePlusIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useClients, useDocuments, useCalendarEvents } from '../hooks/useDB';
import { useNavigation } from '../hooks/useNavigationHook';
import { useDocumentEditor } from '../hooks/useDocumentEditorHook';
import { toYMD } from '../utils/date';
import Avatar from '../components/Avatar';
import ClientModal from '../components/ClientModal';
import CalendarEventModal from '../components/CalendarEventModal';
import DocumentTargetModal, { type DocumentTarget } from '../components/DocumentTargetModal';

const DEBOUNCE_MS = 150;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
type Category = 'clients' | 'documents' | 'events';

export default function SearchPage() {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const clients = useClients(masterKey);
  const documents = useDocuments(masterKey);
  const events = useCalendarEvents(masterKey);
  const { navigateToClient, navigateToCalendarDate, setActiveTab } = useNavigation();
  const { openDocument } = useDocumentEditor();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [todayYMD] = useState(() => toYMD(new Date()));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const hasQuery = debouncedQuery.length > 0;

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) setCategory(null);
  };

  const handleCategoryClick = (id: Category) => {
    setQuery('');
    setDebouncedQuery('');
    setCategory((prev) => (prev === id ? null : id));
  };

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const matchedClients = useMemo(() => {
    if (!hasQuery) return [];
    return (clients ?? []).filter(
      (c) =>
        c.name.toLowerCase().includes(debouncedQuery) ||
        c.phone.toLowerCase().includes(debouncedQuery) ||
        (c.notes ?? '').toLowerCase().includes(debouncedQuery)
    );
  }, [clients, debouncedQuery, hasQuery]);

  const matchedDocuments = useMemo(() => {
    if (!hasQuery) return [];
    return (documents ?? []).filter((d) => d.title.toLowerCase().includes(debouncedQuery));
  }, [documents, debouncedQuery, hasQuery]);

  const matchedEvents = useMemo(() => {
    if (!hasQuery) return [];
    return (events ?? []).filter((e) => {
      const clientName = e.clientId ? clientNameById.get(e.clientId) ?? '' : '';
      return (
        (e.title ?? '').toLowerCase().includes(debouncedQuery) ||
        (e.note ?? '').toLowerCase().includes(debouncedQuery) ||
        clientName.toLowerCase().includes(debouncedQuery)
      );
    });
  }, [events, debouncedQuery, hasQuery, clientNameById]);

  const hasAnyResults = matchedClients.length > 0 || matchedDocuments.length > 0 || matchedEvents.length > 0;

  // Списки для режима "просмотр по категории" (пилюли ниже поиска) —
  // показываются только когда поле пустое и выбрана категория
  const allClientsSorted = useMemo(
    () => [...(clients ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [clients]
  );
  const allDocumentsSorted = useMemo(
    () => [...(documents ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [documents]
  );
  const weekEvents = useMemo(() => {
    const weekEndYMD = toYMD(new Date(Date.now() + WEEK_MS));
    return (events ?? [])
      .filter((e) => e.date >= todayYMD && e.date <= weekEndYMD)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [events, todayYMD]);

  const handleDocumentClick = (doc: NonNullable<typeof documents>[number]) => {
    if (doc.type === 'txt') {
      openDocument({ document: doc, clientId: doc.clientId, isPersonal: doc.isPersonal });
    } else {
      setActiveTab('documents');
    }
  };

  const handleNewDocConfirm = (target: DocumentTarget) => {
    setIsCreatingDoc(false);
    openDocument({ document: null, clientId: target.clientId, isPersonal: target.isPersonal, templateId: target.templateId });
  };

  const showResultsBlock = hasQuery || category !== null;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      <motion.div
        animate={{ paddingTop: showResultsBlock ? '2rem' : '14vh' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xl mx-auto px-4"
      >
        <div className="relative">
          <MagnifyingGlassIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t('search.placeholder')}
            autoFocus
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-surface shadow-card text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {!hasQuery && (
          <>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setIsAddingClient(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors"
              >
                <UserPlusIcon size={14} />
                {t('home.quickAddClient')}
              </button>
              <button
                onClick={() => setIsAddingEvent(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors"
              >
                <CalendarPlusIcon size={14} />
                {t('home.quickAddEvent')}
              </button>
              <button
                onClick={() => setIsCreatingDoc(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors"
              >
                <FilePlusIcon size={14} />
                {t('home.quickAddDocument')}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => handleCategoryClick('clients')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  category === 'clients' ? 'border-primary bg-primary-tint text-primary' : 'border-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {t('search.categoryAllClients')}
              </button>
              <button
                onClick={() => handleCategoryClick('documents')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  category === 'documents' ? 'border-primary bg-primary-tint text-primary' : 'border-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {t('search.categoryAllDocuments')}
              </button>
              <button
                onClick={() => handleCategoryClick('events')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  category === 'events' ? 'border-primary bg-primary-tint text-primary' : 'border-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {t('search.categoryEventsWeek')}
              </button>
            </div>
          </>
        )}

        <AnimatePresence mode="wait">
          {hasQuery && (
            <motion.div
              key="search-results"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-6 flex flex-col gap-6"
            >
              {!hasAnyResults && (
                <p className="text-sm text-text-tertiary text-center py-8">{t('search.empty')}</p>
              )}

              {matchedClients.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold tracking-widest uppercase text-text-tertiary mb-2 flex items-center gap-1.5">
                    <UsersIcon size={13} />
                    {t('search.groupClients')}
                  </h2>
                  <div className="flex flex-col gap-1.5">
                    {matchedClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => navigateToClient(client.id)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-surface shadow-card hover:shadow-card-hover transition-shadow text-left"
                      >
                        <Avatar name={client.name} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text-primary truncate">{client.name}</p>
                          {client.phone && <p className="text-xs text-text-tertiary truncate">{client.phone}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {matchedDocuments.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold tracking-widest uppercase text-text-tertiary mb-2 flex items-center gap-1.5">
                    <FileTextIcon size={13} />
                    {t('search.groupDocuments')}
                  </h2>
                  <div className="flex flex-col gap-1.5">
                    {matchedDocuments.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => handleDocumentClick(doc)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-surface shadow-card hover:shadow-card-hover transition-shadow text-left"
                      >
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-secondary-tint text-secondary flex items-center justify-center">
                          <FileTextIcon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text-primary truncate">{doc.title}</p>
                          <p className="text-xs text-text-tertiary truncate">
                            {doc.isPersonal ? t('documents.personalLabel') : clientNameById.get(doc.clientId ?? '') ?? t('common.dash')}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {matchedEvents.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold tracking-widest uppercase text-text-tertiary mb-2 flex items-center gap-1.5">
                    <CalendarBlankIcon size={13} />
                    {t('search.groupEvents')}
                  </h2>
                  <div className="flex flex-col gap-1.5">
                    {matchedEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => navigateToCalendarDate(ev.date)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-surface shadow-card hover:shadow-card-hover transition-shadow text-left"
                      >
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary-tint text-primary flex items-center justify-center text-[10px] font-display font-semibold">
                          {ev.time}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {ev.isPersonal ? ev.title : clientNameById.get(ev.clientId ?? '') ?? t('home.clientFallback')}
                          </p>
                          <p className="text-xs text-text-tertiary truncate">{ev.date}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {!hasQuery && category === 'clients' && (
            <motion.div
              key="category-clients"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-6 flex flex-col gap-1.5"
            >
              {allClientsSorted.map((client) => (
                <button
                  key={client.id}
                  onClick={() => navigateToClient(client.id)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface shadow-card hover:shadow-card-hover transition-shadow text-left"
                >
                  <Avatar name={client.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{client.name}</p>
                    {client.phone && <p className="text-xs text-text-tertiary truncate">{client.phone}</p>}
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {!hasQuery && category === 'documents' && (
            <motion.div
              key="category-documents"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-6 flex flex-col gap-1.5"
            >
              {allDocumentsSorted.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleDocumentClick(doc)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface shadow-card hover:shadow-card-hover transition-shadow text-left"
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-secondary-tint text-secondary flex items-center justify-center">
                    <FileTextIcon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{doc.title}</p>
                    <p className="text-xs text-text-tertiary truncate">
                      {doc.isPersonal ? t('documents.personalLabel') : clientNameById.get(doc.clientId ?? '') ?? t('common.dash')}
                    </p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {!hasQuery && category === 'events' && (
            <motion.div
              key="category-events"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-6 flex flex-col gap-1.5"
            >
              {weekEvents.length === 0 ? (
                <p className="text-sm text-text-tertiary text-center py-8">{t('search.empty')}</p>
              ) : (
                weekEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => navigateToCalendarDate(ev.date)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface shadow-card hover:shadow-card-hover transition-shadow text-left"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary-tint text-primary flex items-center justify-center text-[10px] font-display font-semibold">
                      {ev.time}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {ev.isPersonal ? ev.title : clientNameById.get(ev.clientId ?? '') ?? t('home.clientFallback')}
                      </p>
                      <p className="text-xs text-text-tertiary truncate">{ev.date}</p>
                    </div>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {isAddingClient && <ClientModal client={null} onClose={() => setIsAddingClient(false)} />}
      {isAddingEvent && <CalendarEventModal date={todayYMD} event={null} onClose={() => setIsAddingEvent(false)} />}
      {isCreatingDoc && (
        <DocumentTargetModal title={t('documents.newTitle')} icon="create" onClose={() => setIsCreatingDoc(false)} onConfirm={handleNewDocConfirm} />
      )}
    </div>
  );
}