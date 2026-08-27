import { useState, useMemo, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, FileTextIcon, DownloadSimpleIcon, TrashIcon, PencilSimpleIcon, ArrowsDownUpIcon, PlusIcon, UploadSimpleIcon, ArrowsLeftRightIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useToast } from '../hooks/useToastHook';
import { useDocumentEditor } from '../hooks/useDocumentEditorHook';
import { useDocuments, useClients, deleteDocument, updateDocument } from '../hooks/useDB';
import type { Document } from '../types';
import { downloadOriginalFile, downloadAsTxt, downloadAsPdf, downloadAsDocx, MIME_TYPES } from '../utils/fileExport';
import DocumentTargetModal, { type DocumentTarget } from '../components/DocumentTargetModal';
import DocumentTypeModal, { type DocumentTypeChange } from '../components/DocumentTypeModal';
import ImportDocumentModal from '../components/ImportDocumentModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Select from '../components/Select';
import Tooltip from '../components/Tooltip';

type SortOrder = 'newest' | 'oldest';
type ScopeFilter = 'all' | 'client' | 'personal' | 'imported';
type TypeFilter = 'all' | 'note' | 'txt' | 'pdf' | 'docx';

function extractPlainText(node: { text?: string; content?: unknown[] }): string {
  if (node.text) return node.text;
  if (node.content) return (node.content as { text?: string; content?: unknown[] }[]).map((c) => extractPlainText(c)).join('\n');
  return '';
}

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const { showToast } = useToast();
  const { openDocument } = useDocumentEditor();
  const allDocuments = useDocuments(masterKey);
  const clients = useClients(masterKey);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [creatingStep, setCreatingStep] = useState<'choose' | null>(null);
  const [importingStep, setImportingStep] = useState<'choose' | 'import' | null>(null);
  const [pendingTarget, setPendingTarget] = useState<DocumentTarget | null>(null);
  const [changingTypeDoc, setChangingTypeDoc] = useState<Document | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
  const [exportMenuDocId, setExportMenuDocId] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    let list = allDocuments ?? [];
    if (scopeFilter === 'client') list = list.filter((d) => !d.isPersonal);
    if (scopeFilter === 'personal') list = list.filter((d) => d.isPersonal);
    if (scopeFilter === 'imported') list = list.filter((d) => d.origin === 'imported');

    if (typeFilter === 'note') list = list.filter((d) => d.type === 'txt' && (d.origin ?? 'created') === 'created');
    if (typeFilter === 'txt') list = list.filter((d) => d.type === 'txt' && d.origin === 'imported');
    if (typeFilter === 'pdf') list = list.filter((d) => d.type === 'pdf');
    if (typeFilter === 'docx') list = list.filter((d) => d.type === 'docx');

    if (scopeFilter !== 'personal' && clientFilter !== 'all') list = list.filter((d) => d.clientId === clientFilter);

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((d) => {
        const clientName = d.clientId ? (clientNameById.get(d.clientId) ?? '') : '';
        return d.title.toLowerCase().includes(query) || clientName.toLowerCase().includes(query);
      });
    }

    return [...list].sort((a, b) =>
      sortOrder === 'newest' ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt)
    );
  }, [allDocuments, scopeFilter, typeFilter, clientFilter, search, sortOrder, clientNameById]);

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
    if (doc.originalFileBase64 && (doc.type === 'pdf' || doc.type === 'docx')) {
      downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingDoc) {
      await deleteDocument(deletingDoc.id);
      showToast('success', t('common.delete'));
    }
    setDeletingDoc(null);
  };

  const handleTypeChangeConfirm = async (change: DocumentTypeChange) => {
    if (changingTypeDoc && masterKey) {
      await updateDocument(changingTypeDoc.id, change, masterKey);
      showToast('success', t('common.save'));
    }
    setChangingTypeDoc(null);
  };

  const badgeFor = (doc: Document) => {
    if (doc.type === 'txt' && (doc.origin ?? 'created') === 'created') return t('documents.type.note');
    return doc.type.toUpperCase();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-display font-semibold text-text-primary">{t('documents.title')}</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            onClick={() => setCreatingStep('choose')}
            className="btn-lift flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors"
          >
            <PlusIcon size={16} />
            {t('documents.create')}
          </button>
          <button
            onClick={() => setImportingStep('choose')}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
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
              { value: 'imported', label: t('documents.scope.imported') },
            ]}
            placeholder={t('documents.scope.all')}
          />
        </div>

        <div className="w-36">
          <Select
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TypeFilter)}
            options={[
              { value: 'all', label: t('documents.type.all') },
              { value: 'note', label: t('documents.type.note') },
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
                  {badgeFor(doc)}
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
                  <Tooltip label={t('common.open')}>
                    <button onClick={() => openDocument({ document: doc, clientId: doc.clientId, isPersonal: doc.isPersonal })} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover">
                      <PencilSimpleIcon size={16} />
                    </button>
                  </Tooltip>
                )}
                <Tooltip label={t('documentType.changeAction')}>
                  <button onClick={() => setChangingTypeDoc(doc)} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover">
                    <ArrowsLeftRightIcon size={16} />
                  </button>
                </Tooltip>

                {doc.type === 'txt' ? (
                  <div className="relative" ref={exportMenuDocId === doc.id ? exportMenuRef : undefined}>
                    <Tooltip label={t('common.download')}>
                      <button
                        onClick={() => setExportMenuDocId(exportMenuDocId === doc.id ? null : doc.id)}
                        className="p-2 rounded-md text-text-secondary hover:bg-surface-hover"
                      >
                        <DownloadSimpleIcon size={16} />
                      </button>
                    </Tooltip>
                    {exportMenuDocId === doc.id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-xl shadow-card-hover p-1 z-30">
                        <button onClick={() => handleExportFormat(doc, 'txt')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">TXT</button>
                        <button onClick={() => handleExportFormat(doc, 'pdf')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">PDF</button>
                        <button onClick={() => handleExportFormat(doc, 'docx')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">DOCX</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Tooltip label={t('common.download')}>
                    <button onClick={() => handleDownloadOriginal(doc)} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover">
                      <DownloadSimpleIcon size={16} />
                    </button>
                  </Tooltip>
                )}

                <Tooltip label={t('common.delete')}>
                  <button onClick={() => setDeletingDoc(doc)} className="p-2 rounded-md text-error hover:bg-error/10">
                    <TrashIcon size={16} />
                  </button>
                </Tooltip>
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
            openDocument({ document: null, clientId: target.clientId, isPersonal: target.isPersonal, templateId: target.templateId });
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

      {changingTypeDoc && (
        <DocumentTypeModal
          initialIsPersonal={changingTypeDoc.isPersonal}
          initialClientId={changingTypeDoc.clientId}
          onConfirm={handleTypeChangeConfirm}
          onClose={() => setChangingTypeDoc(null)}
        />
      )}

      {deletingDoc && (
        <ConfirmDialog
          title={t('documents.confirmDelete', { title: deletingDoc.title })}
          message=""
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingDoc(null)}
        />
      )}
    </div>
  );
}