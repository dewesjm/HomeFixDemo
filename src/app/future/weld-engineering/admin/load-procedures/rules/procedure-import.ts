/* Load Procedures: reading one spreadsheet cell of a section field (columns are procedure-files.ts
   sectionColumns) into the value stored on the procedure, or a message when it can't be read.
   Blank cells are skipped by the caller: they keep an existing procedure's value. */
import { OVERRIDE_PARTS, type ExtraFields, type ExtraFieldValue, type OverrideValue } from '../../../procedure-sections';
import { fieldChoices, isOverride } from '../../../procedure-field-values';
import type { SectionColumn } from '../../../procedure-files';
import { parseRequirementText, qualsIn } from '../../../../../weld-record/qualifications-logic/qual-requirements';
import { getQualifications } from '../../../../../weld-record/reference-data-service/reference-data-service';

type CellResult = { value: ExtraFieldValue } | { problem: string };

/* case and inch marks don't matter when matching a choice: '1/16"' matches 1/16 */
const norm = (s: string) => s.trim().toLowerCase().replace(/"/g, '');

function matchChoice(col: SectionColumn, text: string, picked: string[] = []): string | undefined {
  return fieldChoices(col.field, picked).find(c => norm(c.value) === norm(text) || norm(c.label) === norm(text))?.value;
}

function isNumber(s: string): boolean {
  return s.trim() !== '' && !isNaN(Number(s));
}

export function parseCell(col: SectionColumn, text: string): CellResult {
  const t = text.trim();
  const name = col.header;
  if (col.part) return { value: t };
  switch (col.field.type) {
    case 'number':
      return isNumber(t) ? { value: Number(t) } : { problem: `${name} must be a number.` };
    case 'limit':
      if (/^nc$/i.test(t)) return { value: 'NC' };
      return isNumber(t) ? { value: t } : { problem: `${name} must be a number or NC.` };
    case 'range': {
      const m = t.match(/^([\d.]*)\s*-\s*([\d.]*)$/);
      if (!m || (m[1] && !isNumber(m[1])) || (m[2] && !isNumber(m[2]))) return { problem: `${name} must look like 2 - 4.` };
      return { value: { min: m[1] ? Number(m[1]) : null, max: m[2] ? Number(m[2]) : null } };
    }
    case 'list':
    case 'table': {
      const v = matchChoice(col, t, [t]);
      return v !== undefined ? { value: v } : { problem: `${name}: "${t}" isn't one of its choices.` };
    }
    case 'multi': {
      const parts = t.split(';').map(p => p.trim()).filter(Boolean);
      const values: string[] = [];
      for (const p of parts) {
        const v = matchChoice(col, p, [p]);
        if (v === undefined) return { problem: `${name}: "${p}" isn't one of its choices.` };
        if (!values.includes(v)) values.push(v);
      }
      return { value: values };
    }
    case 'quals': {
      const g = parseRequirementText(t);
      if (typeof g === 'string') return { problem: `${name}: ${g}` };
      const { qualifications } = getQualifications().data;
      const unknown = qualsIn(g).filter(q => !qualifications.includes(q));
      return unknown.length ? { problem: `${name}: unknown qual ${unknown.join(', ')}.` } : { value: g };
    }
    default:
      return { value: t };
  }
}

/* the messages for every filled cell that can't be read */
export function cellProblems(columns: SectionColumn[], cells: Record<string, string>): string[] {
  return columns
    .filter(col => cells[col.id]?.trim())
    .map(col => parseCell(col, cells[col.id]))
    .flatMap(r => 'problem' in r ? [r.problem] : []);
}

/* the procedure's values with every filled cell applied on top; an override part fills in its
   group, keeping the group's other parts */
export function applyCells(columns: SectionColumn[], cells: Record<string, string>, base: ExtraFields): ExtraFields {
  const out: ExtraFields = structuredClone(base);
  for (const col of columns) {
    const text = cells[col.id];
    if (!text?.trim()) continue;
    const r = parseCell(col, text);
    if ('problem' in r) continue;
    if (col.part) {
      const current = out[col.field.key];
      const group: OverrideValue = isOverride(current)
        ? { ...current } : Object.fromEntries(OVERRIDE_PARTS.map(p => [p.key, ''])) as OverrideValue;
      group[col.part] = r.value as string;
      out[col.field.key] = group;
    } else {
      out[col.field.key] = r.value;
    }
  }
  return out;
}
