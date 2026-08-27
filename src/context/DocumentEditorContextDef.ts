import { createContext } from 'react';
import type { Document } from '../types';

export interface DocumentEditorTarget {
  document: Document | null;
  clientId: string | null;
  isPersonal: boolean;
  initialTitle?: string;
  templateId?: 'blank' | 'soap';
}

export interface EditorTab {
  id: string;
  target: DocumentEditorTarget;
}

export interface DocumentEditorContextValue {
  openDocument: (target: DocumentEditorTarget) => void;
  closeDocument: () => void;
}

export const DocumentEditorContext = createContext<DocumentEditorContextValue | null>(null);