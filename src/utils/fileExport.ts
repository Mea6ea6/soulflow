import jsPDF from 'jspdf';
import { Document as DocxDocument, Packer, Paragraph } from 'docx';
import { base64ToUint8Array } from '../hooks/useEncryption';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadAsTxt(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${filename}.txt`);
}

export function downloadAsPdf(text: string, filename: string) {
  const doc = new jsPDF();
  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 15, 20);
  doc.save(`${filename}.pdf`);
}

export async function downloadAsDocx(text: string, filename: string) {
  const paragraphs = text.split('\n').map((line) => new Paragraph(line));

  const doc = new DocxDocument({
    sections: [{ children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}

// Скачивание оригинального импортированного файла (pdf/docx) по сохранённому base64
export function downloadOriginalFile(base64: string, filename: string, mimeType: string) {
  const bytes = base64ToUint8Array(base64);
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  downloadBlob(blob, filename);
}

export const MIME_TYPES: Record<'pdf' | 'docx', string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};