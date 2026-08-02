import { useContext } from 'react';
import { DocumentEditorContext, type DocumentEditorContextValue } from '../context/DocumentEditorContextDef';

export function useDocumentEditor(): DocumentEditorContextValue {
  const ctx = useContext(DocumentEditorContext);
  if (!ctx) throw new Error('useDocumentEditor должен использоваться внутри DocumentEditorProvider');
  return ctx;
}