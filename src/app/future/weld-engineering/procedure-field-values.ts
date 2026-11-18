/* Values of procedure section fields (Procedure.extraFields): empty values, blank checks, save
   validation, one-line text for the PDF/CSV, and reading a value off a procedure. The section and
   field definitions are procedure-sections.ts. */
import {
  OVERRIDE_PARTS, sectionOfField, findField, columnAsField,
  type ExtraField, type ExtraFields, type ExtraFieldValue, type GridRow, type GridValue, type ImagesValue,
  type OverrideValue, type ProcedureSection, type RangeValue
} from './procedure-sections';
import { sourceOptions } from './procedure-option-sources';
import { cloneGroup, pruneGroup, requirementText, type QualGroup } from './qualifications-logic/qual-requirements';

/* ── Value shapes ── */
export function isRange(v: ExtraFieldValue | undefined): v is RangeValue {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && 'min' in v;
}

export function isOverride(v: ExtraFieldValue | undefined): v is OverrideValue {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && 'note' in v;
}

export function isQuals(v: ExtraFieldValue | undefined): v is QualGroup {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && 'op' in v;
}

export function isGrid(v: ExtraFieldValue | undefined): v is GridValue {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && Array.isArray((v as GridValue).rows);
}

export function isImages(v: ExtraFieldValue | undefined): v is ImagesValue {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && Array.isArray((v as ImagesValue).images);
}

/* a grid row with nothing typed in it */
export function isBlankRow(row: GridRow): boolean {
  return Object.values(row).every(c => isBlank(c));
}

export function emptyValue(field: ExtraField): ExtraFieldValue {
  switch (field.type) {
    case 'grid': return { rows: [] };
    case 'images': return { images: [] };
    case 'range': return { min: null, max: null };
    case 'number': return null;
    case 'multi': return [];
    case 'override': return Object.fromEntries(OVERRIDE_PARTS.map(p => [p.key, ''])) as OverrideValue;
    case 'quals': return { op: 'all', items: [] };
    default: return '';
  }
}

export function isBlank(v: ExtraFieldValue | undefined): boolean {
  if (v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (isRange(v)) return v.min === null && v.max === null;
  if (isOverride(v)) return OVERRIDE_PARTS.every(p => !v[p.key]?.trim());
  if (isQuals(v)) return v.items.length === 0;
  if (isGrid(v)) return v.rows.every(isBlankRow);
  if (isImages(v)) return v.images.length === 0;
  return String(v).trim() === '';
}

function cloneValue(v: ExtraFieldValue): ExtraFieldValue {
  if (Array.isArray(v)) return [...v];
  if (isQuals(v)) return cloneGroup(v);
  if (isGrid(v) || isImages(v)) return structuredClone(v);
  if (typeof v === 'object' && v !== null) return { ...v } as ExtraFieldValue;
  return v;
}

/* a copy of a procedure's extraFields with an entry for every defined field, so the form can bind
   to each one; values for fields not defined any more are kept as they are */
export function withAllFields(sections: ProcedureSection[], extras: ExtraFields): ExtraFields {
  const out: ExtraFields = {};
  for (const [k, v] of Object.entries(extras)) out[k] = cloneValue(v);
  for (const f of sections.flatMap(s => s.fields)) {
    if (!(f.key in out)) out[f.key] = emptyValue(f);
  }
  return out;
}

/* a string as stored: trimmed, 'nc' as 'NC' */
const storedText = (v: string) => v.trim().toLowerCase() === 'nc' ? 'NC' : v.trim();

/* a grid's rows as stored: blank rows dropped, text cells trimmed, blank cells left out */
function compactGrid(v: GridValue): GridValue {
  return {
    rows: v.rows.filter(r => !isBlankRow(r)).map(r => Object.fromEntries(Object.entries(r)
      .filter(([, c]) => !isBlank(c))
      .map(([key, c]) => [key, typeof c === 'string' ? storedText(c) : c]))),
  };
}

/* blank values are left out, so a procedure only stores what was filled in; 'nc' is stored as 'NC'
   and qualification groups left empty while editing are dropped */
export function compactExtras(extras: ExtraFields): ExtraFields {
  const out: ExtraFields = {};
  for (const [k, raw] of Object.entries(extras)) {
    const v = isQuals(raw) ? pruneGroup(raw) : raw;
    if (isBlank(v)) continue;
    if (typeof v === 'string') out[k] = storedText(v);
    else if (isGrid(v)) out[k] = compactGrid(v);
    else if (isImages(v)) out[k] = { images: v.images.map(i => ({ ...i, caption: (i.caption ?? '').trim() })) };
    else if (isOverride(v)) out[k] = Object.fromEntries(OVERRIDE_PARTS.map(p => [p.key, (v[p.key] ?? '').trim()])) as OverrideValue;
    else out[k] = v;
  }
  return out;
}

const isLimit = (s: string) => /^nc$/i.test(s.trim()) || (s.trim() !== '' && !isNaN(Number(s)));

/* a value's problems by the same rules as extraFieldProblems, for one field or grid cell; name: how
   the message names it */
function valueProblems(f: ExtraField, v: ExtraFieldValue | undefined, name: string): string[] {
  if (isRange(v)) {
    return v.min !== null && v.max !== null && v.min > v.max ? [`${name}: Min is more than Max.`] : [];
  }
  if (f.type === 'limit' && typeof v === 'string' && v.trim() && !isLimit(v)) return [`${name} must be a number or NC.`];
  return [];
}

/* a grid's cells, checked like fields; rows are counted from 1, skipping blank rows */
function gridProblems(f: ExtraField, v: GridValue): string[] {
  return v.rows.filter(r => !isBlankRow(r)).flatMap((row, i) => (f.columns ?? [])
    .flatMap(c => valueProblems(columnAsField(c), row[c.key] ?? undefined, `${f.label} row ${i + 1} ${c.label}`)));
}

/* save-blocking messages for a procedure's section values: required fields left blank (a required
   range needs both Min and Max, a required grid at least one row), a range whose Min is more than its
   Max, and a limit that isn't a number or NC, in a field or a grid cell */
export function extraFieldProblems(sections: ProcedureSection[], extras: ExtraFields): string[] {
  const problems: string[] = [];
  for (const f of sections.flatMap(s => s.fields)) {
    const v = extras[f.key];
    if (isGrid(v) && !isBlank(v)) {
      problems.push(...gridProblems(f, v));
    } else if (isRange(v)) {
      if (f.required && (v.min === null || v.max === null)) problems.push(`${f.label} needs both Min and Max.`);
      if (v.min !== null && v.max !== null && v.min > v.max) problems.push(`${f.label}: Min is more than Max.`);
    } else if (f.required && isBlank(v)) {
      problems.push(`${f.label} is required.`);
    } else if (f.type === 'limit' && typeof v === 'string' && v.trim() && !isLimit(v)) {
      problems.push(`${f.label} must be a number or NC.`);
    }
  }
  return problems;
}

/* the choices of a list, multi or table field; picked values keep an inactive admin-table row listed */
export function fieldChoices(field: ExtraField, picked: string[] = []): { label: string; value: string }[] {
  return field.source ? sourceOptions(field.source, picked) : field.options.map(o => ({ label: o, value: o }));
}

function choiceLabel(field: ExtraField, value: string): string {
  if (!field.source) return value;
  return sourceOptions(field.source, [value]).find(o => o.value === value)?.label ?? value;
}

/* a grid as one line: each row's filled cells, 'Layer 1, Amps 100 - 150; Layer 2, ...' */
function gridText(field: ExtraField | undefined, value: GridValue): string {
  const columns = field?.columns ?? [];
  return value.rows.filter(r => !isBlankRow(r)).map(row => columns
    .filter(c => !isBlank(row[c.key] ?? undefined))
    .map(c => `${c.label} ${extraValueText(columnAsField(c), row[c.key])}`).join(', ')).join('; ');
}

/* one line of text for the PDF and CSV export, e.g. a range reads '2 - 4' and a multi field lists
   its choices' labels. Admin-table fields show the stored code; images list their file names. */
export function extraValueText(field: ExtraField | undefined, value: ExtraFieldValue | undefined): string {
  if (value === null || value === undefined) return '';
  if (isGrid(value)) return gridText(field, value);
  if (isImages(value)) return value.images.map(i => i.name).join(', ');
  if (Array.isArray(value)) return value.map(v => field ? choiceLabel(field, v) : v).join(', ');
  if (isRange(value)) {
    if (value.min === null && value.max === null) return '';
    return `${value.min ?? ''} - ${value.max ?? ''}`.trim();
  }
  if (isQuals(value)) return requirementText(value);
  if (isOverride(value)) {
    return OVERRIDE_PARTS.filter(p => value[p.key]).map(p => `${p.label} ${value[p.key]}`).join(', ');
  }
  if (field && field.type !== 'table' && typeof value === 'string') return choiceLabel(field, value);
  return String(value);
}

/* ── Reading a value off a procedure ── */
interface HasSectionValues { sectionIds: string[]; extraFields: ExtraFields; }

/* a field's value on a procedure; undefined when the field isn't defined or its section isn't
   ticked on that procedure (an unticked section's values are kept, hidden) */
export function sectionValue(p: HasSectionValues, key: string, sections: ProcedureSection[]): ExtraFieldValue | undefined {
  const section = sectionOfField(key, sections);
  if (!section || !p.sectionIds.includes(section.id)) return undefined;
  return p.extraFields[key];
}

/* a text/list/table/limit value as a string ('' when blank or hidden) */
export function textValue(p: HasSectionValues, key: string, sections: ProcedureSection[]): string {
  const v = sectionValue(p, key, sections);
  return typeof v === 'string' ? v : '';
}

/* a multi value as a list ([] when blank or hidden) */
export function listValue(p: HasSectionValues, key: string, sections: ProcedureSection[]): string[] {
  const v = sectionValue(p, key, sections);
  return Array.isArray(v) ? v : [];
}

/* a field's label, falling back to its key */
export function fieldLabel(key: string, sections: ProcedureSection[]): string {
  return findField(key, sections)?.label ?? key;
}
