import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MagnifyingGlassIcon, UsersIcon, FileTextIcon, CalendarBlankIcon,
  UserPlusIcon, CalendarPlusIcon, FilePlusIcon, XIcon, ClockCounterClockwiseIcon,
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

const MAX_RECENT_SEARCHES = 5;
type Category = 'clients' | 'documents' | 'events';

function recentSearchesKey(email: string) {
  return `soulflow_recent_searches_${email}`;
}

function readRecentSearches(email: string): string[] {
  try {
    const raw = localStorage.getItem(recentSearchesKey(email));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function pushRecentSearch(email: string, term: string): string[] {
  const existing = readRecentSearches(email).filter((s) => s.toLowerCase() !== term.toLowerCase());
  const updated = [term, ...existing].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(recentSearchesKey(email), JSON.stringify(updated));
  } catch {
    /* localStorage недоступен */
  }
  return updated;
}

export default function SearchPage() {
  const { t } = useTranslation();
  const { masterKey, userProfile } = useAuth();
  const clients = useClients(masterKey);
  const documents = useDocuments(masterKey);
  const events = useCalendarEvents(masterKey);
  const { navigateToClient, navigateToCalendarDate, setActiveTab } = useNavigation();
  const { openDocument } = useDocumentEditor();

  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => (userProfile ? readRecentSearches(userProfile.email) : []));
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [todayYMD] = useState(() => toYMD(new Date()));
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSearchFocused) return;
    const handler = (e: MouseEvent) => {
      if (!searchContainerRef.current?.contains(e.target as Node)) setIsSearchFocused(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isSearchFocused]);

  const hasQuery = activeQuery.length > 0;
  const showSuggestions = isSearchFocused && query.trim() === '' && !category && recentSearches.length > 0;

  const runSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setActiveQuery(trimmed.toLowerCase());
    setCategory(null);
    setIsSearchFocused(false);
    if (userProfile) setRecentSearches(pushRecentSearch(userProfile.email, trimmed));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    setActiveQuery('');
    setCategory(null);
  };

  const handleCategoryClick = (id: Category) => {
    setQuery('');
    setActiveQuery('');
    setIsSearchFocused(false);
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
        c.name.toLowerCase().includes(activeQuery) ||
        c.phone.toLowerCase().includes(activeQuery) ||
        (c.notes ?? '').toLowerCase().includes(activeQuery)
    );
  }, [clients, activeQuery, hasQuery]);

  const matchedDocuments = useMemo(() => {
    if (!hasQuery) return [];
    return (documents ?? []).filter((d) => d.title.toLowerCase().includes(activeQuery));
  }, [documents, activeQuery, hasQuery]);

  const matchedEvents = useMemo(() => {
    if (!hasQuery) return [];
    return (events ?? []).filter((e) => {
      const clientName = e.clientId ? clientNameById.get(e.clientId) ?? '' : '';
      return (
        (e.title ?? '').toLowerCase().includes(activeQuery) ||
        (e.note ?? '').toLowerCase().includes(activeQuery) ||
        clientName.toLowerCase().includes(activeQuery)
      );
    });
  }, [events, activeQuery, hasQuery, clientNameById]);

  const hasAnyResults = matchedClients.length > 0 || matchedDocuments.length > 0 || matchedEvents.length > 0;

  const allClientsSorted = useMemo(
    () => [...(clients ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [clients]
  );
  const allDocumentsSorted = useMemo(
    () => [...(documents ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [documents]
  );
  const monthEvents = useMemo(() => {
    const now = new Date();
    const monthStart = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = toYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return (events ?? [])
      .filter((e) => e.date >= monthStart && e.date <= monthEnd)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [events]);

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
  const isCompact = showResultsBlock;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      <motion.div
        animate={{ paddingTop: isCompact ? '2rem' : '20vh' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl mx-auto px-4"
      >
        <div className="relative" ref={searchContainerRef}>
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon
                size={isCompact ? 18 : 22}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary transition-all duration-300"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder={t('search.placeholder')}
                autoFocus
                className={`w-full rounded-3xl border border-border bg-surface shadow-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 ${
                  isCompact ? 'pl-11 pr-10 py-2.5 text-sm' : 'pl-13 pr-12 py-4 text-base'
                }`}
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
                >
                  <XIcon size={isCompact ? 14 : 16} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className={`btn-lift shrink-0 rounded-full bg-primary hover:bg-primary-hover text-white font-medium transition-all duration-300 ${
                isCompact ? 'px-4 py-2.5 text-sm' : 'px-6 py-4 text-base'
              }`}
            >
              {t('search.searchAction')}
            </button>
          </form>

          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-2xl shadow-card-hover p-2 z-30"
              >
                <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  {t('search.recentTitle')}
                </p>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => runSearch(term)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-primary hover:bg-surface-hover transition-colors text-left"
                  >
                    <ClockCounterClockwiseIcon size={15} className="shrink-0 text-text-tertiary" />
                    <span className="truncate">{term}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!hasQuery && (
          <>
            <div className="flex items-center justify-center gap-2 mt-4">
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
                {t('search.categoryEventsMonth')}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-3">
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
              {monthEvents.length === 0 ? (
                <p className="text-sm text-text-tertiary text-center py-8">{t('search.empty')}</p>
              ) : (
                monthEvents.map((ev) => (
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