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
    setTabs((prev) => {
      if (target.document) {
        const existing = prev.find((tab) => tab.target.document?.id === target.document!.id);
        if (existing) {
          setActiveTabId(existing.id);
          return prev;
        }
      }
      const id = nextTabId();
      setActiveTabId(id);
      return [...prev, { id, target }];
    });
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
          onCloseAll={closeDocument}
        />
      )}
    </DocumentEditorContext.Provider>
  );
}