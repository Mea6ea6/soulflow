import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon, FileTextIcon, CaretLineLeftIcon, CaretLineRightIcon,
  DotsThreeIcon, DownloadSimpleIcon, ArrowsLeftRightIcon, TrashIcon,
} from '@phosphor-icons/react';
import type { Document } from '../../types';
import { useAuth } from '../../hooks/useAuthHook';
import { useDocuments, useClients, deleteDocument, updateDocument } from '../../hooks/useDB';
import { downloadAsTxt, downloadAsPdf, downloadAsDocx, downloadOriginalFile, MIME_TYPES } from '../../utils/fileExport';
import { extractPlainText } from '../../utils/documentEditorHelpers';
import type { DocumentEditorTarget, EditorTab } from '../../context/DocumentEditorContextDef';
import type { DocumentTypeChange } from '../DocumentTypeModal';
import DocumentTypeModal from '../DocumentTypeModal';
import ConfirmDialog from '../ConfirmDialog';
import Select from '../Select';

type SortOrder = 'newest' | 'oldest' | 'title';

const SIDEBAR_COLLAPSED_KEY = 'soulflow_editor_sidebar_collapsed';

interface DocumentSidebarProps {
  tabs: EditorTab[];
  activeTabId: string;
  onOpenTab: (target: DocumentEditorTarget) => void;
  onUpdateTabTarget: (id: string, target: DocumentEditorTarget) => void;
  onCloseTab: (id: string) => void;
}

export default function DocumentSidebar({ tabs, activeTabId, onOpenTab, onUpdateTabTarget, onCloseTab }: DocumentSidebarProps) {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const allDocuments = useDocuments(masterKey);
  const clients = useClients(masterKey);

  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
  const [actionDoc, setActionDoc] = useState<Document | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [typeChangeDoc, setTypeChangeDoc] = useState<Document | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const sidebarDocs = useMemo(() => {
    let list = allDocuments ?? [];
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((d) => {
        const clientName = d.clientId ? (clientNameById.get(d.clientId) ?? '') : '';
        return d.title.toLowerCase().includes(query) || clientName.toLowerCase().includes(query);
      });
    }
    return [...list].sort((a, b) => {
      if (sortOrder === 'title') return a.title.localeCompare(b.title);
      return sortOrder === 'newest' ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt);
    });
  }, [allDocuments, search, sortOrder, clientNameById]);

  useEffect(() => {
    if (!actionDoc) return;
    const handler = (e: MouseEvent) => {
      if (!actionMenuRef.current?.contains(e.target as Node)) setActionDoc(null);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [actionDoc]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  const handleExport = (doc: Document, format: 'txt' | 'pdf' | 'docx') => {
    if (doc.type === 'txt') {
      let json: object | null = null;
      let text = doc.content;
      try {
        json = JSON.parse(doc.content);
        text = extractPlainText(json as { text?: string; content?: unknown[] });
      } catch { /* уже plain text */ }

      if (format === 'txt') downloadAsTxt(text, doc.title);
      if (format === 'pdf') downloadAsPdf(json ?? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }, doc.title);
      if (format === 'docx') downloadAsDocx(json ?? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }, doc.title);
    } else if (doc.originalFileBase64) {
      downloadOriginalFile(doc.originalFileBase64, `${doc.title}.${doc.type}`, MIME_TYPES[doc.type]);
    }
    setActionDoc(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteDoc) {
      await deleteDocument(deleteDoc.id);
      const openTab = tabs.find((tab) => tab.target.document?.id === deleteDoc.id);
      if (openTab) onCloseTab(openTab.id);
    }
    setDeleteDoc(null);
  };

  const handleTypeChangeConfirm = async (change: DocumentTypeChange) => {
    if (typeChangeDoc && masterKey) {
      await updateDocument(typeChangeDoc.id, change, masterKey);
      const openTab = tabs.find((tab) => tab.target.document?.id === typeChangeDoc.id);
      if (openTab) onUpdateTabTarget(openTab.id, { ...openTab.target, ...change });
    }
    setTypeChangeDoc(null);
  };

  return (
    <motion.div
      animate={{ width: isCollapsed ? 40 : 288 }}
      transition={{ type: 'spring', mass: 1, stiffness: 200, damping: 24 }}
      className="shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden"
    >
      {isCollapsed ? (
        <button onClick={toggleCollapsed} className="p-2 m-2 rounded-md bg-surface-hover text-text-secondary hover:text-text-primary self-center" title={t('documentEditor.expandSidebar')}>
          <CaretLineRightIcon size={16} />
        </button>
      ) : (
        <div className="w-72 flex flex-col h-full">
          <div className="p-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t('documentEditor.title')}</h2>
            <button onClick={toggleCollapsed} className="p-1.5 rounded-md bg-surface-hover text-text-secondary hover:text-text-primary" title={t('documentEditor.collapseSidebar')}>
              <CaretLineLeftIcon size={16} />
            </button>
          </div>

          <div className="px-4 pb-3 flex flex-col gap-2">
            <div className="relative">
              <MagnifyingGlassIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('documentEditor.searchPlaceholder')}
                className="w-full pl-8 pr-2 py-2 rounded-xl border border-border bg-bg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Select
              value={sortOrder}
              onChange={(v) => setSortOrder(v as SortOrder)}
              options={[
                { value: 'newest', label: t('documentEditor.sortNewest') },
                { value: 'oldest', label: t('documentEditor.sortOldest') },
                { value: 'title', label: t('documentEditor.sortTitle') },
              ]}
              placeholder={t('documentEditor.sortNewest')}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {sidebarDocs.length === 0 && (
              <p className="text-xs text-text-tertiary text-center py-8">{t('documentEditor.empty')}</p>
            )}
            {sidebarDocs.map((doc) => {
              const openTab = tabs.find((tab) => tab.target.document?.id === doc.id);
              const isActive = openTab?.id === activeTabId;
              const isMenuOpen = actionDoc?.id === doc.id;
              return (
                <div key={doc.id} className={`group relative w-full rounded-md mb-0.5 transition-colors ${isActive ? 'bg-primary-tint' : 'hover:bg-surface-hover'}`}>
                  <button
                    onClick={() => onOpenTab({ document: doc, clientId: doc.clientId, isPersonal: doc.isPersonal })}
                    className="w-full text-left px-3 py-2 pr-8"
                  >
                    <div className="flex items-center gap-2">
                      <FileTextIcon size={13} className="shrink-0 text-text-tertiary" />
                      <p className="text-xs font-medium truncate">{doc.title}</p>
                    </div>
                    <p className="text-[10px] text-text-tertiary pl-5 truncate">
                      {doc.isPersonal ? t('documentEditor.personalLabel') : clientNameById.get(doc.clientId ?? '') ?? t('common.dash')}
                      {' · '}
                      {new Date(doc.updatedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActionDoc(isMenuOpen ? null : doc); }}
                    className="absolute right-1 top-2 p-1 rounded text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-border hover:text-text-primary transition-opacity"
                  >
                    <DotsThreeIcon size={14} weight="bold" />
                  </button>
                  {isMenuOpen && (
                    <div ref={actionMenuRef} className="absolute right-1 top-8 w-44 bg-surface border border-border rounded-xl shadow-card-hover p-1 z-30">
                      <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{t('documentEditor.menuDownload')}</p>
                      {doc.type === 'txt' ? (
                        <>
                          <button onClick={() => handleExport(doc, 'txt')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">TXT</button>
                          <button onClick={() => handleExport(doc, 'pdf')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">PDF</button>
                          <button onClick={() => handleExport(doc, 'docx')} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">DOCX</button>
                        </>
                      ) : (
                        <button onClick={() => handleExport(doc, 'txt')} className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">
                          <DownloadSimpleIcon size={12} />{t('common.download')}
                        </button>
                      )}
                      <div className="h-px bg-border my-1" />
                      <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{t('documentEditor.menuOther')}</p>
                      <button onClick={() => { setTypeChangeDoc(doc); setActionDoc(null); }} className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-lg text-xs text-text-primary hover:bg-surface-hover">
                        <ArrowsLeftRightIcon size={12} />{t('documentType.changeAction')}
                      </button>
                      <button onClick={() => { setDeleteDoc(doc); setActionDoc(null); }} className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-lg text-xs text-error hover:bg-error/10">
                        <TrashIcon size={12} />{t('common.delete')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {deleteDoc && (
        <ConfirmDialog title={t('documents.confirmDelete', { title: deleteDoc.title })} message="" onConfirm={handleDeleteConfirm} onClose={() => setDeleteDoc(null)} />
      )}
      {typeChangeDoc && (
        <DocumentTypeModal initialIsPersonal={typeChangeDoc.isPersonal} initialClientId={typeChangeDoc.clientId} onConfirm={handleTypeChangeConfirm} onClose={() => setTypeChangeDoc(null)} />
      )}
    </motion.div>
  );
}