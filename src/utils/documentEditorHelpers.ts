import type { Document } from '../types';

export function initialContentFor(doc: Document | null): string | object {
  if (!doc) return '';
  if (doc.type === 'txt') {
    try { return JSON.parse(doc.content); } catch { return `<p>${doc.content}</p>`; }
  }
  return `<p>${doc.content.replace(/\n/g, '</p><p>')}</p>`;
}

export function extractPlainText(node: { text?: string; content?: unknown[] }): string {
  if (node.text) return node.text;
  if (node.content) return (node.content as { text?: string; content?: unknown[] }[]).map((c) => extractPlainText(c)).join('\n');
  return '';
}