/* How a step's form is laid out from its Signoff Type Definition: the items in line-number order,
   fields with the same line number side by side, split by headings (a heading can start a box).
   Inspection Results is laid out like a field. Fields on a line share its width. */
import type { FieldActivation } from './step-field-config';
import { DECISION_KEY, isHeadingItem } from './step-field-config';
import { isVerifyRow } from './field-catalog';

export type LayoutPart = { kind: 'heading'; text: string } | { kind: 'line'; keys: string[] };

export interface LayoutSection {
  box: boolean;
  title: string;
  parts: LayoutPart[];
}

const isLine = (p: LayoutPart | undefined): p is { kind: 'line'; keys: string[] } => p?.kind === 'line';

/* Inspection Results, a verify-grid row and Signoff History always get a line of their own */
function drawnAlone(key: string): boolean {
  return key === DECISION_KEY || isVerifyRow(key) || key === 'signoffHistory';
}

/* the items sorted by line number, keeping list order within a line */
export function inLineOrder(items: FieldActivation[]): FieldActivation[] {
  return [...items].sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
}

/* the line number after the highest one used */
export function nextLine(items: FieldActivation[]): number {
  return Math.max(0, ...items.map(a => a.line ?? 0)) + 1;
}

/* the list with a newly ticked field on a new line after the others, or in Inspection Results' place
   when that's last on a line of its own (it moves down a line) */
export function withNewField(items: FieldActivation[], key: string): FieldActivation[] {
  const last = items[items.length - 1];
  if (last?.key === DECISION_KEY && last.line && !items.slice(0, -1).some(a => a.line === last.line)) {
    return [...items.slice(0, -1), { key, line: last.line }, { ...last, line: last.line + 1 }];
  }
  return [...items, { key, line: nextLine(items) }];
}

/* The sections to draw, with only the fields `shown` lets through. A field joins the line of the
   shown field before it when they have the same line number; a heading or box with no shown field
   under it is left out. */
export function layoutSections(items: FieldActivation[], shown: (key: string) => boolean): LayoutSection[] {
  const sections: LayoutSection[] = [{ box: false, title: '', parts: [] }];
  /* the line part a field with the same number can still join */
  let open: { keys: string[]; line: number } | null = null;
  for (const item of inLineOrder(items)) {
    const section = sections[sections.length - 1];
    if (isHeadingItem(item)) {
      if (item.newBox) sections.push({ box: true, title: item.heading ?? '', parts: [] });
      else section.parts.push({ kind: 'heading', text: item.heading ?? '' });
      open = null;
      continue;
    }
    if (!shown(item.key)) continue;
    if (open && item.line === open.line && !drawnAlone(item.key)) {
      open.keys.push(item.key);
      continue;
    }
    const keys = [item.key];
    section.parts.push({ kind: 'line', keys });
    open = item.line !== undefined && !drawnAlone(item.key) ? { keys, line: item.line } : null;
  }
  return sections
    .map(s => ({ ...s, parts: s.parts.filter((p, i) => isLine(p) || isLine(s.parts[i + 1])) }))
    .filter(s => s.parts.some(isLine));
}
