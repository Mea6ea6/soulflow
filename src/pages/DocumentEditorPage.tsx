import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentEditorTarget, EditorTab } from '../context/DocumentEditorContextDef';
import DocumentTargetModal, { type DocumentTarget } from '../components/DocumentTargetModal';
import ConfirmDialog from '../components/ConfirmDialog';
import DocumentSidebar from '../components/documentEditor/DocumentSidebar';
import EditorTabs from '../components/documentEditor/EditorTabs';
import DocumentEditorPanel from '../components/documentEditor/DocumentEditorPanel';

type ContentTheme = 'light' | 'dark';

const CONTENT_THEME_STORAGE_KEY = 'soulflow_editor_content_theme';

interface DocumentEditorPageProps {
  tabs: EditorTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onOpenTab: (target: DocumentEditorTarget) => void;
  onUpdateTabTarget: (id: string, target: DocumentEditorTarget) => void;
  onReorderTabs: (fromId: string, toId: string) => void;
  onCloseAll: () => void;
}

export default function DocumentEditorPage({ tabs, activeTabId, onSelectTab, onCloseTab, onOpenTab, onUpdateTabTarget, onReorderTabs, onCloseAll }: DocumentEditorPageProps) {
  const { t } = useTranslation();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [contentTheme, setContentTheme] = useState<ContentTheme>(() => (localStorage.getItem(CONTENT_THEME_STORAGE_KEY) as ContentTheme | null) ?? 'light');
  const [dirtyTabs, setDirtyTabs] = useState<Record<string, boolean>>({});
  const [tabPendingClose, setTabPendingClose] = useState<string | null>(null);
  const [isClosingAll, setIsClosingAll] = useState(false);

  const handleToggleContentTheme = () => {
    setContentTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(CONTENT_THEME_STORAGE_KEY, next);
      return next;
    });
  };

  const requestCloseTab = (id: string) => {
    if (dirtyTabs[id]) setTabPendingClose(id);
    else onCloseTab(id);
  };

  const confirmCloseTab = () => {
    if (tabPendingClose) {
      setDirtyTabs((prev) => { const next = { ...prev }; delete next[tabPendingClose]; return next; });
      onCloseTab(tabPendingClose);
    }
    setTabPendingClose(null);
  };

  const requestCloseAll = () => {
    if (Object.values(dirtyTabs).some(Boolean)) setIsClosingAll(true);
    else onCloseAll();
  };

  const confirmCloseAll = () => {
    setIsClosingAll(false);
    setDirtyTabs({});
    onCloseAll();
  };

  const handleNewDocConfirm = (target: DocumentTarget) => {
    setIsCreatingNew(false);
    onOpenTab({ document: null, clientId: target.clientId, isPersonal: target.isPersonal, templateId: target.templateId });
  };

  return (
    <div className="fixed inset-0 z-60 flex bg-bg text-text-primary">
      <DocumentSidebar
        tabs={tabs}
        activeTabId={activeTabId}
        onOpenTab={onOpenTab}
        onUpdateTabTarget={onUpdateTabTarget}
        onCloseTab={onCloseTab}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <EditorTabs
          tabs={tabs}
          activeTabId={activeTabId}
          dirtyTabs={dirtyTabs}
          contentTheme={contentTheme}
          onSelectTab={onSelectTab}
          onRequestCloseTab={requestCloseTab}
          onReorderTabs={onReorderTabs}
          onNewDocument={() => setIsCreatingNew(true)}
          onToggleContentTheme={handleToggleContentTheme}
          onRequestCloseAll={requestCloseAll}
        />

        {tabs.map((tab) => (
          <DocumentEditorPanel
            key={tab.id}
            target={tab.target}
            isActive={tab.id === activeTabId}
            contentTheme={contentTheme}
            onDirtyChange={(dirty) => setDirtyTabs((prev) => ({ ...prev, [tab.id]: dirty }))}
            onSavedDocument={(doc) => onUpdateTabTarget(tab.id, { ...tab.target, document: doc, clientId: doc.clientId, isPersonal: doc.isPersonal })}
            onDeleted={() => { setDirtyTabs((prev) => { const n = { ...prev }; delete n[tab.id]; return n; }); onCloseTab(tab.id); }}
          />
        ))}
      </div>

      {isCreatingNew && (
        <DocumentTargetModal title={t('documents.newTitle')} icon="create" onClose={() => setIsCreatingNew(false)} onConfirm={handleNewDocConfirm} />
      )}
      {tabPendingClose && (
        <ConfirmDialog title={t('textEditor.discardConfirmTitle')} message={t('textEditor.discardConfirmMessage')} confirmLabel={t('textEditor.discardConfirm')} onConfirm={confirmCloseTab} onClose={() => setTabPendingClose(null)} />
      )}
      {isClosingAll && (
        <ConfirmDialog title={t('textEditor.discardConfirmTitle')} message={t('textEditor.discardConfirmMessage')} confirmLabel={t('textEditor.discardConfirm')} onConfirm={confirmCloseAll} onClose={() => setIsClosingAll(false)} />
      )}
    </div>
  );
}