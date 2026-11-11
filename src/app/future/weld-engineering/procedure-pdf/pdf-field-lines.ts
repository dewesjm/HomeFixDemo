/* Weld Engineering PDF - lays a section's fields out in lines: each field is a column (label over
   value), added left to right until the next one won't fit across the page, then a new line starts.
   Auto fields are sized from their label and value (an estimate: pdfmake can't measure text before
   layout, so it errs wide), a set width is used as given, and Full line fields get a line of their
   own. Auto fields then stretch so each line fills the page. Widths are in PDF points. */
import type { FieldWidth } from '../procedure-sections';

export interface PdfFieldCell { label: string; value: string; width?: FieldWidth; }

/* one table row pair; widths are pdfmake column widths (text area, without padding) */
export interface PdfFieldLine { cells: PdfFieldCell[]; widths: number[]; }

const FONT_SIZE = 10;
/* pdfmake's default cell padding (4 + 4) plus one 0.5 border */
const CELL_EXTRA = 8.5;
const PX_TO_PT = 0.75;
/* A4 portrait (595.28pt) less 40pt margins each side, with a little spare */
export const PDF_CONTENT_WIDTH = 513;
const AUTO_MIN = 60;

/* rough text width: capitals, digits and wide letters take more room; bold a little more */
function textWidth(text: string, bold: boolean): number {
  let em = 0;
  for (const ch of text) {
    if (ch === ' ') em += 0.28;
    else if (/[A-Z0-9MWmw%#@&]/.test(ch)) em += 0.68;
    else em += 0.55;
  }
  return em * FONT_SIZE * (bold ? 1.08 : 1);
}

/* a cell's full width on the page, padding and border included */
function outerWidth(cell: PdfFieldCell, pageWidth: number): number {
  if (cell.width === 'full') return pageWidth;
  if (typeof cell.width === 'number') return Math.min(cell.width * PX_TO_PT, pageWidth);
  const fit = Math.max(textWidth(cell.label, true), textWidth(cell.value || '-', false)) + CELL_EXTRA;
  return Math.min(Math.max(fit, AUTO_MIN), (pageWidth - 0.5) / 2);
}

export function packFieldLines(cells: PdfFieldCell[], pageWidth = PDF_CONTENT_WIDTH): PdfFieldLine[] {
  const lines: { cells: PdfFieldCell[]; outer: number[] }[] = [];
  let current: { cells: PdfFieldCell[]; outer: number[] } | null = null;
  const used = (l: { outer: number[] }) => 0.5 + l.outer.reduce((a, b) => a + b, 0);

  for (const cell of cells) {
    const w = outerWidth(cell, pageWidth);
    if (!current || cell.width === 'full' || used(current) + w > pageWidth) {
      current = { cells: [], outer: [] };
      lines.push(current);
    }
    current.cells.push(cell);
    current.outer.push(w);
    if (cell.width === 'full') current = null;
  }

  return lines.map(l => {
    const autoTotal = l.cells.reduce((sum, c, i) => c.width === undefined ? sum + l.outer[i] : sum, 0);
    const spare = Math.max(0, pageWidth - used(l));
    const outer = l.outer.map((w, i) => l.cells[i].width === undefined && autoTotal ? w + spare * (w / autoTotal) : w);
    return { cells: l.cells, widths: outer.map(w => Math.max(1, Math.floor((w - CELL_EXTRA) * 100) / 100)) };
  });
}
