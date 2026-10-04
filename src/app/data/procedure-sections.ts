/* Weld Engineering - added procedure sections.
   Sections 1-11 are built into the Procedure model (procedures.ts) as fixed fields. Admin > Procedure
   Sections adds more sections after them, each with its own fields. Only the section/field
   definitions live here; each procedure keeps its values for every added field in one bag,
   Procedure.extraFields, keyed by ExtraField.key. A new field is a new key in that bag, never a new
   property on Procedure -- in a real database the definitions are two tables and the bag is one
   JSON column on the procedure row. Added sections and fields can only be added, not changed or removed. */
import { signal } from '@angular/core';
import { STORAGE } from './storage-keys';

export type ExtraFieldType = 'text' | 'number' | 'range' | 'list';

export const EXTRA_FIELD_TYPE_OPTIONS: { label: string; value: ExtraFieldType }[] = [
  { label: 'Text', value: 'text' },
  { label: 'Number', value: 'number' },
  { label: 'Min / Max range', value: 'range' },
  { label: 'Pick from a list', value: 'list' },
];

export interface ExtraField {
  key: string;        /* set once from the label, unique across all added sections; the extraFields key */
  label: string;
  type: ExtraFieldType;
  required: boolean;
  options: string[];  /* the choices for a 'list' field, empty otherwise */
}

export interface ProcedureSection {
  id: string;
  name: string;
  fields: ExtraField[];
}

export interface RangeValue { min: number | null; max: number | null; }
export type ExtraFieldValue = string | number | RangeValue | null;
export type ExtraFields = Record<string, ExtraFieldValue>;

/* the fixed sections, in PDF/form order -- added sections are numbered after these */
export const BUILT_IN_SECTIONS = [
  'Base Metal', 'Joint Design', 'Welding Position', 'Filler Metal', 'Welder Qualifications',
  'Preheat & Interpass Temperatures', 'Equipment', 'Gas', 'Heat Input', 'Parameters', 'Heat Treatment',
];

export function sectionNumber(addedIndex: number): number {
  return BUILT_IN_SECTIONS.length + addedIndex + 1;
}

/* ── Validation (Admin > Procedure Sections) ── */
export function sectionNameProblem(name: string, sections: ProcedureSection[]): string {
  const n = name.trim().toLowerCase();
  if (!n) return 'Enter a section name.';
  if (BUILT_IN_SECTIONS.some(s => s.toLowerCase() === n) || sections.some(s => s.name.toLowerCase() === n)) {
    return 'There is already a section with that name.';
  }
  return '';
}

export interface ExtraFieldDraft { label: string; type: ExtraFieldType; required: boolean; options: string[]; }

export function fieldDraftProblem(draft: ExtraFieldDraft, section: ProcedureSection): string {
  const label = draft.label.trim().toLowerCase();
  if (!label) return 'Enter a field label.';
  if (section.fields.some(f => f.label.toLowerCase() === label)) return 'This section already has a field with that label.';
  if (draft.type === 'list' && !draft.options.length) return 'Enter at least one choice for a list field.';
  return '';
}

/* 'Spice Level' -> 'spice_level'; a clash with another added field's key gets _2, _3, ... */
export function fieldKey(label: string, takenKeys: string[]): string {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
  let key = base;
  for (let n = 2; takenKeys.includes(key); n++) key = `${base}_${n}`;
  return key;
}

/* ── Values on a procedure ── */
export function emptyValue(type: ExtraFieldType): ExtraFieldValue {
  if (type === 'range') return { min: null, max: null };
  if (type === 'number') return null;
  return '';
}

/* a copy of a procedure's extraFields with an entry for every added field, so the form can bind
   to each one; values for fields not defined any more are kept as they are */
export function withAllFields(sections: ProcedureSection[], extras: ExtraFields): ExtraFields {
  const out: ExtraFields = {};
  for (const [k, v] of Object.entries(extras)) out[k] = isRange(v) ? { ...v } : v;
  for (const f of sections.flatMap(s => s.fields)) {
    if (!(f.key in out)) out[f.key] = emptyValue(f.type);
  }
  return out;
}

function isRange(v: ExtraFieldValue | undefined): v is RangeValue {
  return typeof v === 'object' && v !== null;
}

function isBlank(v: ExtraFieldValue | undefined): boolean {
  if (isRange(v)) return v.min === null && v.max === null;
  return v === null || v === undefined || String(v).trim() === '';
}

/* blank values are left out, so a procedure only stores what was filled in */
export function compactExtras(extras: ExtraFields): ExtraFields {
  const out: ExtraFields = {};
  for (const [k, v] of Object.entries(extras)) {
    if (!isBlank(v)) out[k] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

/* save-blocking messages for a procedure's added-section values: required fields left blank (a
   required range needs both Min and Max) and a range whose Min is more than its Max */
export function extraFieldProblems(sections: ProcedureSection[], extras: ExtraFields): string[] {
  const problems: string[] = [];
  for (const f of sections.flatMap(s => s.fields)) {
    const v = extras[f.key];
    if (isRange(v)) {
      if (f.required && (v.min === null || v.max === null)) problems.push(`${f.label} needs both Min and Max.`);
      if (v.min !== null && v.max !== null && v.min > v.max) problems.push(`${f.label}: Min is more than Max.`);
    } else if (f.required && isBlank(v)) {
      problems.push(`${f.label} is required.`);
    }
  }
  return problems;
}

/* one line of text for the PDF and CSV export, e.g. a range reads '2 - 4' */
export function extraValueText(value: ExtraFieldValue | undefined): string {
  if (isRange(value)) {
    if (value.min === null && value.max === null) return '';
    return `${value.min ?? ''} - ${value.max ?? ''}`.trim();
  }
  return value === null || value === undefined ? '' : String(value);
}

/* ── localStorage persistence ── */
function loadSections(): ProcedureSection[] {
  try {
    const raw = localStorage.getItem(STORAGE.procedureSections);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function persist(list: ProcedureSection[]) {
  try { localStorage.setItem(STORAGE.procedureSections, JSON.stringify(list)); } catch { /* ignore */ }
}

export const procedureSections = signal<ProcedureSection[]>(loadSections());

export function addSection(name: string): void {
  procedureSections.update(list => {
    const next = [...list, { id: `sec-${Date.now()}`, name: name.trim(), fields: [] }];
    persist(next);
    return next;
  });
}

export function addField(sectionId: string, draft: ExtraFieldDraft): void {
  procedureSections.update(list => {
    const taken = list.flatMap(s => s.fields.map(f => f.key));
    const field: ExtraField = {
      key: fieldKey(draft.label, taken),
      label: draft.label.trim(),
      type: draft.type,
      required: draft.required,
      options: draft.type === 'list' ? draft.options : [],
    };
    const next = list.map(s => s.id === sectionId ? { ...s, fields: [...s.fields, field] } : s);
    persist(next);
    return next;
  });
}
