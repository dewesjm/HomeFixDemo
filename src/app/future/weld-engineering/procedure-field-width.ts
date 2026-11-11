/* Weld Engineering - how wide a procedure field is on the edit form and the PDF. Each field is Auto
   (sized to fit), a set width in pixels, or a line of its own; set in Admin > Procedure Sections.
   Qualification requirements and override groups always take a line of their own. The PDF packs
   fields into lines with procedure-pdf/pdf-field-lines.ts. */
import type { ExtraField, FieldWidth } from './procedure-sections';

/* the smallest set width accepted, in pixels */
export const MIN_FIELD_WIDTH = 60;

/* about the PDF page's usable width in pixels (A4 portrait less margins), shown as a hint */
export const PDF_PAGE_WIDTH_PX = 687;

/* field types that are always a line of their own, so they offer no width */
export function hasFixedFullWidth(f: ExtraField): boolean {
  return f.type === 'quals' || f.type === 'override';
}

export function widthText(f: ExtraField): string {
  if (hasFixedFullWidth(f) || f.width === 'full') return 'Full line';
  return typeof f.width === 'number' ? `${f.width} px` : 'Auto';
}

/* typed pixels as a width, or why they can't be used */
export function parseWidth(text: string): { width: number } | { problem: string } {
  const n = Number(text.trim());
  if (!text.trim() || !Number.isFinite(n)) return { problem: 'Enter a width in pixels.' };
  if (n < MIN_FIELD_WIDTH) return { problem: `Width must be at least ${MIN_FIELD_WIDTH} px.` };
  return { width: Math.round(n) };
}

/* CSS flex for the field on the procedure edit form. Auto keeps the form's usual sizing (a
   pick-many list takes a full line); a set width doesn't grow but can shrink on a narrow screen. */
export function formFlex(f: ExtraField): string | null {
  const w: FieldWidth | undefined = f.width;
  if (hasFixedFullWidth(f) || w === 'full') return '1 1 100%';
  if (typeof w === 'number') return `0 1 ${w}px`;
  return f.type === 'multi' ? '1 1 100%' : null;
}
