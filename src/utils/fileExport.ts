import jsPDF from 'jspdf';
import {
  Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from 'docx';
import type { JSONContent } from '@tiptap/core';
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

export function downloadOriginalFile(base64: string, filename: string, mimeType: string) {
  const bytes = base64ToUint8Array(base64);
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  downloadBlob(blob, filename);
}

export const MIME_TYPES: Record<'pdf' | 'docx', string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// ===== Промежуточное представление документа =====
// Общий шаг для PDF и DOCX: превращаем дерево TipTap в плоский список простых
// блоков, чтобы не писать логику разбора дерева дважды.

interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
}

type BlockKind = 'heading' | 'paragraph' | 'bullet' | 'ordered' | 'task' | 'quote' | 'code' | 'divider' | 'table';

interface Block {
  kind: BlockKind;
  level?: number;          // для heading: 1-3
  checked?: boolean;       // для task
  orderIndex?: number;     // для ordered — номер пункта
  runs?: Run[];
  rows?: Run[][][];        // для table: строки -> ячейки -> runs
}

function extractRuns(nodes: JSONContent[] | undefined): Run[] {
  if (!nodes) return [];
  const runs: Run[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      const marks = node.marks ?? [];
      runs.push({
        text: node.text ?? '',
        bold: marks.some((m) => m.type === 'bold'),
        italic: marks.some((m) => m.type === 'italic'),
        underline: marks.some((m) => m.type === 'underline'),
        code: marks.some((m) => m.type === 'code'),
      });
    } else if (node.type === 'hardBreak') {
      runs.push({ text: '\n' });
    } else if (node.content) {
      runs.push(...extractRuns(node.content));
    }
  }
  return runs;
}

function firstParagraphRuns(node: JSONContent): Run[] {
  const p = node.content?.find((c) => c.type === 'paragraph');
  return extractRuns(p?.content ?? node.content);
}

function docToBlocks(doc: JSONContent): Block[] {
  const blocks: Block[] = [];
  const topLevel = doc.content ?? [];

  for (const node of topLevel) {
    switch (node.type) {
      case 'paragraph':
        blocks.push({ kind: 'paragraph', runs: extractRuns(node.content) });
        break;
      case 'heading':
        blocks.push({ kind: 'heading', level: (node.attrs?.level as number) ?? 1, runs: extractRuns(node.content) });
        break;
      case 'bulletList':
        (node.content ?? []).forEach((item) => {
          blocks.push({ kind: 'bullet', runs: firstParagraphRuns(item) });
        });
        break;
      case 'orderedList': {
        let i = 1;
        (node.content ?? []).forEach((item) => {
          blocks.push({ kind: 'ordered', orderIndex: i, runs: firstParagraphRuns(item) });
          i += 1;
        });
        break;
      }
      case 'taskList':
        (node.content ?? []).forEach((item) => {
          blocks.push({ kind: 'task', checked: !!item.attrs?.checked, runs: firstParagraphRuns(item) });
        });
        break;
      case 'blockquote':
        (node.content ?? []).forEach((p) => {
          blocks.push({ kind: 'quote', runs: extractRuns(p.content) });
        });
        break;
      case 'codeBlock':
        blocks.push({ kind: 'code', runs: extractRuns(node.content) });
        break;
      case 'horizontalRule':
        blocks.push({ kind: 'divider' });
        break;
      case 'table': {
        const rows = (node.content ?? []).map((row) =>
          (row.content ?? []).map((cell) => extractRuns(cell.content?.find((c) => c.type === 'paragraph')?.content ?? cell.content))
        );
        blocks.push({ kind: 'table', rows });
        break;
      }
      default:
        break;
    }
  }
  return blocks;
}

// ===== PDF =====

const PDF_MARGIN = 15;
const PDF_MAX_X = 195;
const PDF_LINE_HEIGHT = 6;

function pdfSetFont(doc: jsPDF, run: Run, baseSize: number) {
  doc.setFontSize(baseSize);
  if (run.code) {
    doc.setFont('courier', run.bold ? 'bold' : 'normal');
  } else {
    const style = run.bold && run.italic ? 'bolditalic' : run.bold ? 'bold' : run.italic ? 'italic' : 'normal';
    doc.setFont('helvetica', style);
  }
}

// Печатает runs с переносом по словам, возвращает новый y
function pdfRenderRuns(doc: jsPDF, runs: Run[], startX: number, startY: number, maxX: number, baseSize: number): number {
  let x = startX;
  let y = startY;
  const spaceWidth = 1.4;

  for (const run of runs) {
    const words = run.text.split(/(\s+)/).filter((w) => w.length > 0);
    for (const word of words) {
      if (word === '\n') { x = startX; y += PDF_LINE_HEIGHT; continue; }
      pdfSetFont(doc, run, baseSize);
      const w = doc.getTextWidth(word);
      if (word.trim() && x + w > maxX) {
        x = startX;
        y += PDF_LINE_HEIGHT;
      }
      doc.text(word, x, y);
      if (run.underline && word.trim()) {
        doc.line(x, y + 0.8, x + w, y + 0.8);
      }
      x += w;
      if (!word.trim()) x += spaceWidth;
    }
  }
  return y + PDF_LINE_HEIGHT;
}

export function downloadAsPdf(content: JSONContent, filename: string) {
  const blocks = docToBlocks(content);
  const doc = new jsPDF();
  let y = 20;

  const ensureSpace = (needed: number) => {
    if (y + needed > 280) { doc.addPage(); y = 20; }
  };

  for (const block of blocks) {
    ensureSpace(PDF_LINE_HEIGHT * 2);

    switch (block.kind) {
      case 'heading': {
        const size = block.level === 1 ? 18 : block.level === 2 ? 15 : 13;
        y = pdfRenderRuns(doc, (block.runs ?? []).map((r) => ({ ...r, bold: true })), PDF_MARGIN, y + 2, PDF_MAX_X, size);
        y += 1;
        break;
      }
      case 'paragraph':
        y = pdfRenderRuns(doc, block.runs ?? [], PDF_MARGIN, y, PDF_MAX_X, 11);
        break;
      case 'bullet':
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
        doc.text('•', PDF_MARGIN, y);
        y = pdfRenderRuns(doc, block.runs ?? [], PDF_MARGIN + 5, y, PDF_MAX_X, 11);
        break;
      case 'ordered':
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
        doc.text(`${block.orderIndex}.`, PDF_MARGIN, y);
        y = pdfRenderRuns(doc, block.runs ?? [], PDF_MARGIN + 7, y, PDF_MAX_X, 11);
        break;
      case 'task':
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
        doc.text(block.checked ? '[x]' : '[ ]', PDF_MARGIN, y);
        y = pdfRenderRuns(doc, block.runs ?? [], PDF_MARGIN + 8, y, PDF_MAX_X, 11);
        break;
      case 'quote':
        doc.setDrawColor(180); doc.line(PDF_MARGIN, y - 4, PDF_MARGIN, y + 3);
        y = pdfRenderRuns(doc, (block.runs ?? []).map((r) => ({ ...r, italic: true })), PDF_MARGIN + 4, y, PDF_MAX_X, 11);
        break;
      case 'code':
        y = pdfRenderRuns(doc, (block.runs ?? []).map((r) => ({ ...r, code: true })), PDF_MARGIN + 2, y, PDF_MAX_X, 10);
        break;
      case 'divider':
        doc.setDrawColor(200);
        doc.line(PDF_MARGIN, y, PDF_MAX_X, y);
        y += PDF_LINE_HEIGHT;
        break;
      case 'table': {
        const rows = block.rows ?? [];
        if (rows.length === 0) break;
        const cols = rows[0].length;
        const colWidth = (PDF_MAX_X - PDF_MARGIN) / cols;
        for (const row of rows) {
          ensureSpace(PDF_LINE_HEIGHT * 2);
          const rowStartY = y;
          let maxCellY = y;
          row.forEach((cellRuns, i) => {
            const cellX = PDF_MARGIN + i * colWidth;
            const cellY = pdfRenderRuns(doc, cellRuns, cellX + 1, rowStartY, cellX + colWidth - 1, 10);
            maxCellY = Math.max(maxCellY, cellY);
          });
          for (let i = 0; i <= cols; i++) {
            doc.setDrawColor(210);
            doc.line(PDF_MARGIN + i * colWidth, rowStartY - 4, PDF_MARGIN + i * colWidth, maxCellY - 2);
          }
          doc.line(PDF_MARGIN, rowStartY - 4, PDF_MAX_X, rowStartY - 4);
          y = maxCellY;
          doc.line(PDF_MARGIN, y - 2, PDF_MAX_X, y - 2);
        }
        break;
      }
    }
  }

  doc.save(`${filename}.pdf`);
}

// ===== DOCX =====

function docxRuns(runs: Run[] | undefined, baseItalic = false): TextRun[] {
  if (!runs || runs.length === 0) return [new TextRun('')];
  return runs.map((r) => new TextRun({
    text: r.text,
    bold: r.bold,
    italics: r.italic || baseItalic,
    underline: r.underline ? {} : undefined,
    font: r.code ? 'Courier New' : undefined,
  }));
}

const DOCX_HEADING_MAP: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
};

export async function downloadAsDocx(content: JSONContent, filename: string) {
  const blocks = docToBlocks(content);
  const children: (Paragraph | Table)[] = [];

  for (const block of blocks) {
    switch (block.kind) {
      case 'heading':
        children.push(new Paragraph({ heading: DOCX_HEADING_MAP[block.level ?? 1], children: docxRuns(block.runs) }));
        break;
      case 'paragraph':
        children.push(new Paragraph({ children: docxRuns(block.runs) }));
        break;
      case 'bullet':
        children.push(new Paragraph({ bullet: { level: 0 }, children: docxRuns(block.runs) }));
        break;
      case 'ordered':
        children.push(new Paragraph({ children: [new TextRun(`${block.orderIndex}. `), ...docxRuns(block.runs)] }));
        break;
      case 'task':
        children.push(new Paragraph({ children: [new TextRun(block.checked ? '☑ ' : '☐ '), ...docxRuns(block.runs)] }));
        break;
      case 'quote':
        children.push(new Paragraph({ indent: { left: 480 }, children: docxRuns(block.runs, true) }));
        break;
      case 'code':
        children.push(new Paragraph({ children: docxRuns((block.runs ?? []).map((r) => ({ ...r, code: true }))) }));
        break;
      case 'divider':
        children.push(new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
          children: [new TextRun('')],
        }));
        break;
      case 'table': {
        const rows = block.rows ?? [];
        if (rows.length === 0) break;
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rows.map((row) => new TableRow({
            children: row.map((cellRuns) => new TableCell({
              children: [new Paragraph({ children: docxRuns(cellRuns) })],
            })),
          })),
        });
        children.push(table);
        break;
      }
    }
  }

  const doc = new DocxDocument({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}