/* How a step's form is laid out from its Signoff Type Definition, while the Layout from Signoff Type
   Definition toggle is on: the fields in definition order, each on a new line unless it's set to the
   same line as the one before, split by headings (a heading can start a box). Fields on a line share
   its width. */
import type { FieldActivation } from './step-field-config';
import { isHeadingItem } from './step-field-config';

export type LayoutPart = { kind: 'heading'; text: string } | { kind: 'line'; keys: string[] };

export interface LayoutSection {
  box: boolean;
  title: string;
  parts: LayoutPart[];
}

const isLine = (p: LayoutPart | undefined): p is { kind: 'line'; keys: string[] } => p?.kind === 'line';

/* The sections to draw, with only the fields `shown` lets through. A field set to the same line
   joins the line before it when that line is shown; a heading or box with no shown field under it
   is left out. */
export function layoutSections(items: FieldActivation[], shown: (key: string) => boolean): LayoutSection[] {
  const sections: LayoutSection[] = [{ box: false, title: '', parts: [] }];
  for (const item of items) {
    const section = sections[sections.length - 1];
    if (isHeadingItem(item)) {
      if (item.newBox) sections.push({ box: true, title: item.heading ?? '', parts: [] });
      else section.parts.push({ kind: 'heading', text: item.heading ?? '' });
      continue;
    }
    if (!shown(item.key)) continue;
    const last = section.parts[section.parts.length - 1];
    if (item.sameLine && isLine(last)) last.keys.push(item.key);
    else section.parts.push({ kind: 'line', keys: [item.key] });
  }
  return sections
    .map(s => ({ ...s, parts: s.parts.filter((p, i) => isLine(p) || isLine(s.parts[i + 1])) }))
    .filter(s => s.parts.some(isLine));
}
