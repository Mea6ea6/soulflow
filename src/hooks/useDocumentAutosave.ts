import { useCallback, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import type { Document } from '../types';
import type { DocumentEditorTarget } from '../context/DocumentEditorContextDef';
import { addDocument, updateDocument } from './useDB';

const AUTOSAVE_DELAY_MS = 1200;

interface UseDocumentAutosaveArgs {
  editor: Editor | null;
  masterKey: CryptoKey | null;
  isReadonly: boolean;
  target: DocumentEditorTarget;
  title: string;
  onDirtyChange: (dirty: boolean) => void;
  onSavedDocument: (doc: Document) => void;
  onError: () => void;
}

export function useDocumentAutosave({ editor, masterKey, isReadonly, target, title, onDirtyChange, onSavedDocument, onError }: UseDocumentAutosaveArgs) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTargetRef = useRef(target);
  const titleRef = useRef(title);
  const saveRef = useRef<() => void>(() => {});

  useEffect(() => { currentTargetRef.current = target; }, [target]);
  useEffect(() => { titleRef.current = title; }, [title]);

  const doSave = useCallback(async () => {
    if (!editor || !masterKey || isReadonly) return;
    const tgt = currentTargetRef.current;
    const plainText = editor.getText();
    const contentJson = JSON.stringify(editor.getJSON());

    try {
      if (tgt.document) {
        const finalTitle = titleRef.current.trim() || plainText.slice(0, 50) || 'Untitled';
        await updateDocument(tgt.document.id, { title: finalTitle, content: contentJson }, masterKey);
        onSavedDocument({ ...tgt.document, title: finalTitle, content: contentJson, updatedAt: new Date().toISOString() });
      } else {
        const finalTitle = titleRef.current.trim() || plainText.slice(0, 50) || 'Untitled';
        const now = new Date().toISOString();
        const newId = await addDocument(
          { title: finalTitle, type: 'txt', content: contentJson, clientId: tgt.isPersonal ? null : tgt.clientId, isPersonal: tgt.isPersonal, origin: 'created' },
          masterKey
        );
        onSavedDocument({
          id: newId, title: finalTitle, type: 'txt', content: contentJson,
          clientId: tgt.isPersonal ? null : tgt.clientId, isPersonal: tgt.isPersonal,
          origin: 'created', createdAt: now, updatedAt: now,
        });
      }
      onDirtyChange(false);
    } catch {
      onError();
    }
  }, [editor, masterKey, isReadonly, onDirtyChange, onSavedDocument, onError]);

  useEffect(() => { saveRef.current = doSave; }, [doSave]);

  const scheduleAutosave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { doSave(); }, AUTOSAVE_DELAY_MS);
  }, [doSave]);

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  // saveNow — для горячей клавиши Cmd/Ctrl+S: сохраняет немедленно, минуя debounce
  const saveNow = useCallback(() => { saveRef.current(); }, []);

  return { scheduleAutosave, saveNow };
}