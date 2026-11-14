/* Weld Engineering's section service: the calls that change the procedure section and field definitions
   (Admin > Procedure Sections and Admin > Services both call them, so both run the same checks). Sections
   are named by id, fields by key; a field keeps its key through renames and moves. Each call answers
   { ok: true, data } or { ok: false, error, title } (service-result.ts); a change some procedures block
   also lists them under procedures, to fix first.
   Checks: names (blank, or already used), locked fields (never removed; a section holding one is never
   removed), and procedure-section-usage.ts (a ticked section, a field with a value, a move that would
   hide a value). In real life this would be Weld Engineering's own backend, with restricted access. */
import { procedures } from '../../../data/procedures';
import {
  procedureSections, changeSections, findField, sectionOfField, sectionNameProblem, fieldLabelProblem, fieldDraftProblem,
  newField, withSectionAdded, withFieldAdded, withSectionRenamed, withFieldRenamed, withSectionShifted, withFieldShifted,
  withFieldMoved, withFieldWidth, withFieldRemoved, withSectionRemoved,
  type ExtraField, type ExtraFieldDraft, type ExtraFieldType, type FieldWidth, type ProcedureSection,
} from '../procedure-sections';
import { sectionRemoveBlock, fieldRemoveBlock, fieldMoveBlock, type UsageBlock } from '../procedure-section-usage';
import { ADMIN_TABLE_SOURCES, type OptionSourceId } from '../procedure-option-sources';
import { hasFixedFullWidth, parseWidth } from '../procedure-field-width';
import { fail, type ServiceFailure, type ServiceResult } from './service-result';

export interface NumberedSection extends ProcedureSection { number: number; }
export interface SectionAnswer { section: NumberedSection; }
export interface FieldAnswer { field: ExtraField; section: { id: string; number: number; name: string }; }

/* what addField takes; required and options are optional */
export interface NewField { label: string; type: ExtraFieldType; required?: boolean; options?: string[]; source?: OptionSourceId; }

const text = (v: unknown) => (typeof v === 'string' ? v : '');

function numbered(id: string): NumberedSection | undefined {
  const list = procedureSections();
  const i = list.findIndex(s => s.id === id);
  return i < 0 ? undefined : { ...list[i], number: i + 1 };
}

function sectionAnswer(id: string): ServiceResult<SectionAnswer> {
  return { ok: true, data: { section: numbered(id)! } };
}

function fieldAnswer(key: string): ServiceResult<FieldAnswer> {
  const section = numbered(sectionOfField(key, procedureSections())!.id)!;
  return { ok: true, data: { field: findField(key, procedureSections())!, section: { id: section.id, number: section.number, name: section.name } } };
}

const noSection = (id: unknown) => fail(`There is no section with id ${text(id) || '(blank)'}.`, 'Not found');
const noField = (key: unknown) => fail(`There is no field with key ${text(key) || '(blank)'}.`, 'Not found');
const blocked = (b: UsageBlock, title: string): ServiceFailure => fail(b.problem, title, b.procedures);

function placesProblem(name: string, kind: string, index: number, count: number, places: unknown): string {
  if (!Number.isInteger(places) || places === 0) return 'Places must be a whole number other than 0 (negative = up).';
  const to = index + (places as number);
  if (to < 0 || to >= count) return `${name} can't move that far: it's ${kind} ${index + 1} of ${count}.`;
  return '';
}

/* ── Sections ── */
export function addSection(name: string): ServiceResult<SectionAnswer> {
  const problem = sectionNameProblem(text(name), procedureSections());
  if (problem) return fail(problem, 'Section not added');
  let id = `sec-${Date.now()}`;
  for (let n = 2; procedureSections().some(s => s.id === id); n++) id = `sec-${Date.now()}-${n}`;
  changeSections(l => withSectionAdded(l, id, text(name)));
  return sectionAnswer(id);
}

export function renameSection(sectionId: string, name: string): ServiceResult<SectionAnswer> {
  if (!numbered(sectionId)) return noSection(sectionId);
  const problem = sectionNameProblem(text(name), procedureSections(), sectionId);
  if (problem) return fail(problem, 'Section not renamed');
  changeSections(l => withSectionRenamed(l, sectionId, text(name)));
  return sectionAnswer(sectionId);
}

/* places: how far to move it, negative = up; the sections are numbered by this order */
export function shiftSection(sectionId: string, places: number): ServiceResult<SectionAnswer> {
  const s = numbered(sectionId);
  if (!s) return noSection(sectionId);
  const problem = placesProblem(s.name, 'section', s.number - 1, procedureSections().length, places);
  if (problem) return fail(problem, 'Section not moved');
  changeSections(l => withSectionShifted(l, sectionId, places));
  return sectionAnswer(sectionId);
}

export function removeSection(sectionId: string): ServiceResult<{ removed: { sectionId: string } }> {
  const s = numbered(sectionId);
  if (!s) return noSection(sectionId);
  const block = sectionRemoveBlock(s, procedures());
  if (block) return blocked(block, `${s.name} can't be removed`);
  changeSections(l => withSectionRemoved(l, sectionId));
  return { ok: true, data: { removed: { sectionId } } };
}

/* ── Fields ── */
/* the new field goes at the end of the section; its key is made from the label and skips any key a
   procedure still has a value under */
export function addField(sectionId: string, input: NewField): ServiceResult<FieldAnswer> {
  const section = numbered(sectionId);
  if (!section) return noSection(sectionId);
  const options = input?.options ?? [];
  if (!Array.isArray(options) || options.some(o => typeof o !== 'string')) return fail('Options must be a list of text choices.', 'Field not added');
  if (input?.source !== undefined && !ADMIN_TABLE_SOURCES.some(o => o.value === input.source)) {
    return fail(`Source must be one of ${ADMIN_TABLE_SOURCES.map(o => o.value).join(', ')}.`, 'Field not added');
  }
  const draft: ExtraFieldDraft = {
    label: text(input?.label), type: input?.type, required: input?.required === true,
    options: options.map(o => o.trim()).filter(Boolean), source: input?.source,
  };
  const problem = fieldDraftProblem(draft, section);
  if (problem) return fail(problem, 'Field not added');
  const savedKeys = [...new Set(procedures().flatMap(p => Object.keys(p.extraFields)))];
  const field = newField(draft, procedureSections(), savedKeys);
  changeSections(l => withFieldAdded(l, sectionId, field));
  return fieldAnswer(field.key);
}

export function renameField(key: string, label: string): ServiceResult<FieldAnswer> {
  const section = sectionOfField(key, procedureSections());
  if (!section) return noField(key);
  const problem = fieldLabelProblem(text(label), section, key);
  if (problem) return fail(problem, 'Field not renamed');
  changeSections(l => withFieldRenamed(l, key, text(label)));
  return fieldAnswer(key);
}

/* places: how far to move it within its section, negative = up */
export function shiftField(key: string, places: number): ServiceResult<FieldAnswer> {
  const section = sectionOfField(key, procedureSections());
  if (!section) return noField(key);
  const index = section.fields.findIndex(f => f.key === key);
  const problem = placesProblem(section.fields[index].label, 'field', index, section.fields.length, places);
  if (problem) return fail(problem, 'Field not moved');
  changeSections(l => withFieldShifted(l, key, places));
  return fieldAnswer(key);
}

/* to the end of another section, keeping its key, settings and saved values */
export function moveField(key: string, toSectionId: string): ServiceResult<FieldAnswer> {
  const sections = procedureSections();
  const field = findField(key, sections);
  if (!field) return noField(key);
  const target = numbered(toSectionId);
  if (!target) return noSection(toSectionId);
  if (sectionOfField(key, sections)!.id === toSectionId) return fail(`${field.label} is already in ${target.name}.`, 'Field not moved');
  const block = fieldMoveBlock(key, toSectionId, sections, procedures());
  if (block) return blocked(block, `${field.label} can't be moved`);
  changeSections(l => withFieldMoved(l, key, toSectionId));
  return fieldAnswer(key);
}

/* width on the edit form and PDF: pixels, 'full' (a line of its own), or null for Auto */
export function setFieldWidth(key: string, width: FieldWidth | null): ServiceResult<FieldAnswer> {
  const field = findField(key, procedureSections());
  if (!field) return noField(key);
  if (hasFixedFullWidth(field)) return fail(`${field.label} is always a full line.`, 'Width not set');
  let next: FieldWidth | undefined;
  if (width === null || width === undefined) next = undefined;
  else if (width === 'full') next = 'full';
  else if (typeof width === 'number') {
    const parsed = parseWidth(String(width));
    if ('problem' in parsed) return fail(parsed.problem, 'Width not set');
    next = parsed.width;
  } else return fail('Width must be a number of pixels, "full", or null for Auto.', 'Width not set');
  changeSections(l => withFieldWidth(l, key, next));
  return fieldAnswer(key);
}

export function removeField(key: string): ServiceResult<{ removed: { key: string } }> {
  const sections = procedureSections();
  const field = findField(key, sections);
  if (!field) return noField(key);
  const block = fieldRemoveBlock(key, sections, procedures());
  if (block) return blocked(block, `${field.label} can't be removed`);
  changeSections(l => withFieldRemoved(l, key));
  return { ok: true, data: { removed: { key } } };
}
