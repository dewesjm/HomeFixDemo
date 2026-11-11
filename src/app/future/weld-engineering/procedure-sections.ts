/* Weld Engineering - procedure sections. Every section of a procedure (WPS) is a row here, edited in
   Admin > Procedure Sections; sections are numbered by list order. The 11 starting sections are
   seeded below. Only the section/field definitions live here; each procedure keeps its values for
   every field in one bag, Procedure.extraFields, keyed by ExtraField.key. A new field is a new key in
   that bag, never a new property on Procedure -- in a real database the definitions are two tables
   and the bag is one JSON column on the procedure row.
   Each procedure ticks which sections it has (Procedure.sectionIds). Locked fields have fixed keys
   because other systems read them (only through procedure-values.ts); they can't be deleted or
   change type. Sections and fields can only be added for now.
   Value rules (blank, text, validation) are in procedure-field-values.ts. */
import { signal } from '@angular/core';
import { STORAGE } from '../../data/storage-keys';
import type { QualGroup } from '../../weld-record/qualifications-logic/qual-requirements';
import type { OptionSourceId } from './procedure-option-sources';

export type ExtraFieldType = 'text' | 'number' | 'range' | 'list' | 'multi' | 'table' | 'limit' | 'override' | 'quals';

/* the types a new field can be; override and quals are only the seeded locked fields' types */
export const EXTRA_FIELD_TYPE_OPTIONS: { label: string; value: ExtraFieldType }[] = [
  { label: 'Text', value: 'text' },
  { label: 'Number', value: 'number' },
  { label: 'Min / Max range', value: 'range' },
  { label: 'Pick one from a list', value: 'list' },
  { label: 'Pick many from a list', value: 'multi' },
  { label: 'Pick from another admin table', value: 'table' },
  { label: 'Number or NC = no limit', value: 'limit' },
];

const TYPE_LABELS: Record<ExtraFieldType, string> = {
  ...Object.fromEntries(EXTRA_FIELD_TYPE_OPTIONS.map(o => [o.value, o.label])) as Record<ExtraFieldType, string>,
  override: 'Override group',
  quals: 'Qualification requirement',
};

export function fieldTypeLabel(type: ExtraFieldType): string {
  return TYPE_LABELS[type];
}

export interface ExtraField {
  key: string;        /* unique across all sections; the extraFields key. Set once from the label, or fixed for a locked field */
  label: string;
  type: ExtraFieldType;
  required: boolean;
  options: string[];  /* the choices typed in for a 'list' or 'multi' field, empty otherwise */
  source?: OptionSourceId;  /* where a 'table' field's choices come from (or a locked list field's) */
  locked?: boolean;
}

export interface ProcedureSection {
  id: string;
  name: string;
  fields: ExtraField[];
}

export interface RangeValue { min: number | null; max: number | null; }

/* an override group's parts, in form/PDF order */
export const OVERRIDE_PARTS = [
  { key: 'phMin', label: 'PH Min' }, { key: 'phMax', label: 'PH Max' },
  { key: 'ipMin', label: 'IP Min' }, { key: 'ipMax', label: 'IP Max' },
  { key: 'note', label: 'Note' },
] as const;
export type OverrideValue = Record<typeof OVERRIDE_PARTS[number]['key'], string>;

/* text, list, table and limit values are strings; multi is string[] */
export type ExtraFieldValue = string | number | string[] | RangeValue | OverrideValue | QualGroup | null;
export type ExtraFields = Record<string, ExtraFieldValue>;

/* ── Seeded sections ── */
export const JOINT_TYPES = ['Groove', 'Fillet', 'Plug', 'Edge'];
export const BACKING_OPTIONS = ['None', 'Backing Strip', 'Consumable Insert', 'Gas Backing'];
export const WELD_PROGRESSIONS = ['N/A', 'Uphill', 'Downhill'];
export const CURRENT_TYPES = ['AC', 'DCEP', 'DCEN'];

const text = (key: string, label: string): ExtraField => ({ key, label, type: 'text', required: false, options: [] });
const list = (key: string, label: string, options: string[]): ExtraField => ({ key, label, type: 'list', required: false, options });
const locked = (key: string, label: string, type: ExtraFieldType, source?: OptionSourceId): ExtraField =>
  ({ key, label, type, required: false, options: [], locked: true, ...(source ? { source } : {}) });

const SEEDED_SECTIONS: ProcedureSection[] = [
  { id: 'sec-base-metal', name: 'Base Metal', fields: [
    locked('baseMetal1Type', 'Base Metal 1 Type', 'list', 'materialTypes'),
    locked('baseMetal2Type', 'Base Metal 2 Type', 'list', 'materialTypes'),
    text('baseMetalThicknessMin', 'Thickness Min'), text('baseMetalThicknessMax', 'Thickness Max'),
  ] },
  { id: 'sec-joint-design', name: 'Joint Design', fields: [
    list('jointType', 'Joint Type', JOINT_TYPES), text('grooveAngle', 'Groove Angle'),
    text('rootOpening', 'Root Opening'), list('backing', 'Backing', BACKING_OPTIONS),
  ] },
  { id: 'sec-welding-position', name: 'Welding Position', fields: [
    locked('weldPosition', 'Position', 'table', 'weldPositions'),
    list('weldProgression', 'Progression', WELD_PROGRESSIONS),
  ] },
  { id: 'sec-filler-metal', name: 'Filler Metal', fields: [
    locked('fillerMetalTypes', 'Filler Metal Types', 'multi', 'fillerMetalTypes'),
    locked('fillerMetalClassification', 'Classification', 'list', 'fillerClassifications'),
    locked('fillerMetalSizes', 'Filler Metal Sizes', 'multi', 'fillerMetalSizes'),
  ] },
  { id: 'sec-welder-quals', name: 'Welder Qualifications', fields: [
    locked('requiredQuals', 'Welder Qualifications', 'quals'),
  ] },
  { id: 'sec-preheat-interpass', name: 'Preheat & Interpass Temperatures', fields: [
    locked('phMin', 'PH Min', 'limit'), locked('phMax', 'PH Max', 'limit'),
    locked('ipMin', 'IP Min', 'limit'), locked('ipMax', 'IP Max', 'limit'),
    locked('override', 'Override Requirements', 'override'),
  ] },
  { id: 'sec-equipment', name: 'Equipment', fields: [
    list('currentType', 'Current Type', CURRENT_TYPES), text('powerSource', 'Power Source'),
  ] },
  { id: 'sec-gas', name: 'Gas', fields: [
    text('shieldingGas', 'Shielding Gas'), text('gasFlowRate', 'Gas Flow Rate'), text('backingGas', 'Backing Gas'),
  ] },
  { id: 'sec-heat-input', name: 'Heat Input', fields: [
    text('heatInputMin', 'Heat Input Min'), text('heatInputMax', 'Heat Input Max'),
  ] },
  { id: 'sec-parameters', name: 'Parameters', fields: [
    text('amperageRange', 'Amperage Range'), text('voltageRange', 'Voltage Range'), text('travelSpeedRange', 'Travel Speed Range'),
  ] },
  { id: 'sec-heat-treatment', name: 'Heat Treatment', fields: [
    text('pwhtTemp', 'PWHT Temp'), text('pwhtTime', 'PWHT Time'),
  ] },
];

/* seeded procedures tick every seeded section */
export const SEEDED_SECTION_IDS = SEEDED_SECTIONS.map(s => s.id);

/* the sections a procedure has, in list order, each with its number: a section keeps its number on
   every procedure, so a WPS without section 3 goes from 2 to 4 */
export function sectionsOnProcedure(
  sectionIds: string[], sections: ProcedureSection[]
): { section: ProcedureSection; number: number }[] {
  return sections
    .map((section, i) => ({ section, number: i + 1 }))
    .filter(s => sectionIds.includes(s.section.id));
}

/* the section a field key belongs to, if any */
export function sectionOfField(key: string, sections: ProcedureSection[]): ProcedureSection | undefined {
  return sections.find(s => s.fields.some(f => f.key === key));
}

export function findField(key: string, sections: ProcedureSection[]): ExtraField | undefined {
  return sections.flatMap(s => s.fields).find(f => f.key === key);
}

/* ── Validation (Admin > Procedure Sections) ── */
export function sectionNameProblem(name: string, sections: ProcedureSection[]): string {
  const n = name.trim().toLowerCase();
  if (!n) return 'Enter a section name.';
  if (sections.some(s => s.name.toLowerCase() === n)) return 'There is already a section with that name.';
  return '';
}

interface ExtraFieldDraft { label: string; type: ExtraFieldType; required: boolean; options: string[]; source?: OptionSourceId; }

export function fieldDraftProblem(draft: ExtraFieldDraft, section: ProcedureSection): string {
  const label = draft.label.trim().toLowerCase();
  if (!label) return 'Enter a field label.';
  if (section.fields.some(f => f.label.toLowerCase() === label)) return 'This section already has a field with that label.';
  if ((draft.type === 'list' || draft.type === 'multi') && !draft.options.length) return 'Enter at least one choice for a list field.';
  if (draft.type === 'table' && !draft.source) return 'Pick the admin table the choices come from.';
  if (!EXTRA_FIELD_TYPE_OPTIONS.some(o => o.value === draft.type)) return 'That field type can\'t be added.';
  return '';
}

/* 'Spice Level' -> 'spice_level'; a clash with another field's key gets _2, _3, ... */
export function fieldKey(label: string, takenKeys: string[]): string {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
  let key = base;
  for (let n = 2; takenKeys.includes(key); n++) key = `${base}_${n}`;
  return key;
}

/* ── localStorage persistence ── */
function loadSections(): ProcedureSection[] {
  try {
    const raw = localStorage.getItem(STORAGE.procedureSections);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return structuredClone(SEEDED_SECTIONS);
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
      options: draft.type === 'list' || draft.type === 'multi' ? draft.options : [],
      ...(draft.type === 'table' && draft.source ? { source: draft.source } : {}),
    };
    const next = list.map(s => s.id === sectionId ? { ...s, fields: [...s.fields, field] } : s);
    persist(next);
    return next;
  });
}
