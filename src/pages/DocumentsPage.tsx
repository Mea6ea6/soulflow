import { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, FileTextIcon, DownloadSimpleIcon, TrashIcon, PencilSimpleIcon, ArrowsDownUpIcon, PlusIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { useDocumentEditor } from '../hooks/useDocumentEditorHook';
import { useDocuments, useClients, deleteDocument } from '../hooks/useDB';
import type { Document, DocumentType } from '../types';
import { downloadOriginalFile, MIME_TYPES } from '../utils/fileExport';
import ImportDocumentModal from '../components/ImportDocumentModal';
import DocumentTargetModal, { type DocumentTarget } from '../components/DocumentTargetModal';
import Select from '../components/Select';

type SortOrder = 'newest' | 'oldest';
type ScopeFilter = 'all' | 'client' | 'personal';

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const { showToast } = useToast();
  const { openDocument } = useDocumentEditor();
  const allDocuments = useDocuments(masterKey);
  const clients = useClients(masterKey);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [creatingStep, setCreatingStep] = useState<'choose' | null>(null);
  const [importingStep, setImportingStep] = useState<'choose' | 'import' | null>(null);
  const [pendingTarget, setPendingTarget] = useState<DocumentTarget | null>(null);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    let list = allDocuments ?? [];
    if (scopeFilter === 'client') list = list.filter((d) => !d.isPersonal);
    if (scopeFilter === 'personal') list = list.filter((d) => d.isPersonal);
    if (typeFilter !== 'all') list = list.filter((d) => d.type === typeFilter);
    if (scopeFilter !== 'personal' && clientFilter !== 'all') list = list.filter((d) => d.clientId === clientFilter);

    const query = search.trim().toLowerCase();
    if (query) list = list.filter((d) => d.title.toLowerCase().includes(query));

    return [...list].sort((a, b) =>
      sortOrder === 'newest' ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt)
    );
  }, [allDocuments, scopeFilter, typeFilter, clientFilter, search, sortOrder]);

  const handleDownload = (doc: Document) => {
    if (doc.type === 'txt') {
      openDocument({ document: doc, clientId: doc.clientId, isPersonal: doc.isPersonal });
    } else if (doc.originalFileBase64) {
      downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(t('documents.confirmDelete', { title: doc.title }))) return;
    await deleteDocument(doc.id);
    showToast('success', t('common.delete'));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-semibold text-text-primary">{t('documents.title')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreatingStep('choose')}
            className="btn-lift flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors"
          >
            <PlusIcon size={16} />
            {t('documents.create')}
          </button>
          <button
            onClick={() => setImportingStep('choose')}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <UploadSimpleIcon size={16} />
            {t('documents.import')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-50">
          <MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('documents.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="w-44">
          <Select
            value={scopeFilter}
            onChange={(v) => setScopeFilter(v as ScopeFilter)}
            options={[
              { value: 'all', label: t('documents.scope.all') },
              { value: 'client', label: t('documents.scope.client') },
              { value: 'personal', label: t('documents.scope.personal') },
            ]}
            placeholder={t('documents.scope.all')}
          />
        </div>

        <div className="w-36">
          <Select
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as DocumentType | 'all')}
            options={[
              { value: 'all', label: t('documents.type.all') },
              { value: 'txt', label: t('documents.type.txt') },
              { value: 'pdf', label: t('documents.type.pdf') },
              { value: 'docx', label: t('documents.type.docx') },
            ]}
            placeholder={t('documents.type.all')}
          />
        </div>

        {scopeFilter !== 'personal' && (
          <div className="w-48">
            <Select
              value={clientFilter}
              onChange={setClientFilter}
              options={[
                { value: 'all', label: t('documents.clientFilter.all') },
                ...(clients ?? []).map((c) => ({ value: c.id, label: c.name })),
              ]}
              placeholder={t('documents.clientFilter.all')}
            />
          </div>
        )}

        <button
          onClick={() => setSortOrder((o) => (o === 'newest' ? 'oldest' : 'newest'))}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors"
        >
          <ArrowsDownUpIcon size={14} />
          {sortOrder === 'newest' ? t('documents.sort.newest') : t('documents.sort.oldest')}
        </button>
      </div>

      {allDocuments === undefined && <p className="text-sm text-text-secondary">{t('common.loading')}</p>}

      {allDocuments && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
          <div className="w-14 h-14 rounded-full bg-secondary-tint text-secondary flex items-center justify-center mb-3">
            <FileTextIcon size={24} />
          </div>
          <p className="text-sm text-center">{t('documents.empty')}</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex flex-col gap-2">
          {filtered.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface shadow-card">
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-hover text-text-tertiary uppercase">
                  {doc.type}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{doc.title}</p>
                  <p className="text-xs text-text-tertiary">
                    {doc.isPersonal ? t('documents.personalLabel') : (doc.clientId && clientNameById.get(doc.clientId)) || t('common.dash')}
                    {' · '}
                    {new Date(doc.updatedAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {doc.type === 'txt' && (
                  <button onClick={() => openDocument({ document: doc, clientId: doc.clientId, isPersonal: doc.isPersonal })} title={t('common.open')} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover">
                    <PencilSimpleIcon size={16} />
                  </button>
                )}
                <button onClick={() => handleDownload(doc)} title={t('common.download')} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover">
                  <DownloadSimpleIcon size={16} />
                </button>
                <button onClick={() => handleDelete(doc)} title={t('common.delete')} className="p-2 rounded-md text-error hover:bg-error/10">
                  <TrashIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creatingStep === 'choose' && (
        <DocumentTargetModal
          title={t('documents.newTitle')}
          icon="create"
          onClose={() => setCreatingStep(null)}
          onConfirm={(target) => {
            setCreatingStep(null);
            openDocument({ document: null, clientId: target.clientId, isPersonal: target.isPersonal });
          }}
        />
      )}

      {importingStep === 'choose' && (
        <DocumentTargetModal
          title={t('documents.importTitle')}
          icon="import"
          onClose={() => setImportingStep(null)}
          onConfirm={(target) => { setPendingTarget(target); setImportingStep('import'); }}
        />
      )}
      {importingStep === 'import' && pendingTarget && (
        <ImportDocumentModal
          clientId={pendingTarget.clientId}
          isPersonal={pendingTarget.isPersonal}
          onClose={() => { setImportingStep(null); setPendingTarget(null); }}
        />
      )}
    </div>
  );
}