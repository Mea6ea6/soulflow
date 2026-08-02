import { useState, type ReactNode } from 'react';
import { DocumentEditorContext, type DocumentEditorTarget } from './DocumentEditorContextDef';
import DocumentEditorPage from '../components/DocumentEditorPage';

export function DocumentEditorProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<DocumentEditorTarget | null>(null);

  const openDocument = (t: DocumentEditorTarget) => setTarget(t);
  const closeDocument = () => setTarget(null);

  return (
    <DocumentEditorContext.Provider value={{ openDocument, closeDocument }}>
      {children}
      {target && <DocumentEditorPage initialTarget={target} onClose={closeDocument} />}
    </DocumentEditorContext.Provider>
  );
}