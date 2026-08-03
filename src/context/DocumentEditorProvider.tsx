import { useState, type ReactNode } from 'react';
import { DocumentEditorContext, type DocumentEditorTarget, type EditorTab } from './DocumentEditorContextDef';
import DocumentEditorPage from '../components/DocumentEditorPage';

let tabIdCounter = 0;
function nextTabId() {
  tabIdCounter += 1;
  return `tab-${tabIdCounter}`;
}

export function DocumentEditorProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openDocument = (target: DocumentEditorTarget) => {
    if (target.document) {
      const existing = tabs.find((tab) => tab.target.document?.id === target.document!.id);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }
    }
    const id = nextTabId();
    setTabs((prev) => [...prev, { id, target }]);
    setActiveTabId(id);
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const next = prev.filter((tab) => tab.id !== id);
      setActiveTabId((current) => (current === id ? (next.length > 0 ? next[next.length - 1].id : null) : current));
      return next;
    });
  };

  const updateTabTarget = (id: string, target: DocumentEditorTarget) => {
    setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, target } : tab)));
  };

  const reorderTabs = (fromId: string, toId: string) => {
    setTabs((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === fromId);
      const toIdx = prev.findIndex((t) => t.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const closeDocument = () => {
    setTabs([]);
    setActiveTabId(null);
  };

  return (
    <DocumentEditorContext.Provider value={{ openDocument, closeDocument }}>
      {children}
      {tabs.length > 0 && activeTabId && (
        <DocumentEditorPage
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={setActiveTabId}
          onCloseTab={closeTab}
          onOpenTab={openDocument}
          onUpdateTabTarget={updateTabTarget}
          onReorderTabs={reorderTabs}
          onCloseAll={closeDocument}
        />
      )}
    </DocumentEditorContext.Provider>
  );
}