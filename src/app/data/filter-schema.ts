/* Advanced Search: every searchable field, stacked filter conditions, saved variants (localStorage).
   A field's conditions combine like this: the "include" ones (contains, is, starts with, is blank,
   between, greater/less than) are OR'd, the "exclude" ones (does not contain, is not, is not blank)
   must all hold. Different fields are AND'd. */
import { STORAGE } from './storage-keys';
import { Job } from './jobs';
import { FABRICATION_FIELDS, JobWorkflow, currentRoutingLabel, shopOptions } from './workflow';
import { jointDesignOptions } from './joint-designs';
import { StepConditionField, allStepAnswerFields } from './step-conditions';

export type FieldKind = 'text' | 'list' | 'number' | 'date';

export interface SearchField {
  key: string;            /* row key: a Job field, 'currentRouting', 'fab.<key>' or a step answer key */
  label: string;
  group: string;
  kind: FieldKind;
  width?: string;         /* results column min width */
}

export type Op = 'contains' | 'notContains' | 'is' | 'isNot' | 'startsWith' | 'blank' | 'notBlank' | 'between' | 'gt' | 'lt';

export interface Condition {
  op: Op;
  value: string;          /* typed text / number / yyyy-mm-dd; 'between' start */
  to: string;             /* 'between' end */
  values: string[];       /* list fields: is / is not any of these */
}

export type FilterValues = Record<string, Condition[]>;

export const OPS_BY_KIND: Record<FieldKind, Op[]> = {
  text: ['contains', 'notContains', 'is', 'isNot', 'startsWith', 'blank', 'notBlank'],
  list: ['is', 'isNot', 'contains', 'notContains', 'blank', 'notBlank'],
  number: ['between', 'gt', 'lt'],
  date: ['between', 'gt', 'lt'],
};

export function opLabel(op: Op, kind: FieldKind): string {
  switch (op) {
    case 'contains': return 'contains';
    case 'notContains': return 'does not contain';
    case 'is': return 'is';
    case 'isNot': return 'is not';
    case 'startsWith': return 'starts with';
    case 'blank': return 'is blank';
    case 'notBlank': return 'is not blank';
    case 'between': return 'between';
    case 'gt': return kind === 'date' ? 'after' : 'greater than';
    case 'lt': return kind === 'date' ? 'before' : 'less than';
  }
}

const EXCLUDES: Op[] = ['notContains', 'isNot', 'notBlank'];
export const isExclude = (op: Op) => EXCLUDES.includes(op);
export const needsNoValue = (op: Op) => op === 'blank' || op === 'notBlank';

export function newCondition(kind: FieldKind): Condition {
  return { op: OPS_BY_KIND[kind][0], value: '', to: '', values: [] };
}

/* a condition with nothing filled in yet doesn't filter */
export function isActive(c: Condition, kind: FieldKind): boolean {
  if (needsNoValue(c.op)) return true;
  if (kind === 'list' && (c.op === 'is' || c.op === 'isNot')) return c.values.length > 0;
  if (c.op === 'between') return !!c.value || !!c.to;
  return !!c.value.trim();
}

export const activeConditions = (field: SearchField, conds: Condition[] | undefined) =>
  (conds ?? []).filter(c => isActive(c, field.kind));

/* ── Fields ── */

const job = (key: keyof Job, label: string, group: string, kind: FieldKind = 'text', width = 'min-w-24'): SearchField =>
  ({ key, label, group, kind, width });

const JOB_FIELDS: SearchField[] = [
  job('xrefid', 'XREFID', 'Job', 'text', 'min-w-16'),
  job('ship', 'Ship', 'Job', 'text', 'min-w-16'),
  job('hull', 'Hull', 'Job', 'text', 'min-w-24'),
  job('trade', 'Trade', 'Job', 'list'),
  job('technician', 'Technician', 'Job', 'list'),
  job('drawing', 'Drawing', 'Job'),
  job('drawingRev', 'Drawing Rev', 'Job'),
  job('joint', 'Joint', 'Job', 'text', 'min-w-20'),
  { key: 'currentRouting', label: 'Current routing', group: 'Job', kind: 'list', width: 'min-w-36' },
  job('jointDesign', 'Joint design', 'Welding', 'list'),
  job('weldType', 'Weld type', 'Welding', 'list'),
  job('materialType1', 'Material 1', 'Welding', 'list'),
  job('materialType2', 'Material 2', 'Welding', 'list'),
  job('pipeSize', 'Pipe size', 'Welding'),
  job('wallThickness', 'Wall thickness', 'Welding'),
  job('mcl1', 'MCL 1', 'Welding', 'list'),
  job('mcl2', 'MCL 2', 'Welding', 'list'),
  job('joiningItem', 'Joining item', 'Welding'),
  job('joinToItem', 'Join to item', 'Welding'),
  job('sequenceNumber', 'Sequence', 'Welding'),
  job('nInd', 'Nuclear Indicator', 'Welding', 'list'),
  job('wps', 'WPS', 'Welding'),
  job('engineeringNotes', 'Eng. notes', 'Welding', 'text', 'min-w-32'),
  job('ndt', 'NDT', 'NDT'),
  job('rtRoot', 'RT Root', 'NDT', 'list'),
  job('rtFinal', 'RT Final', 'NDT', 'list'),
  job('ndtRoot', 'NDT Root', 'NDT', 'list'),
  job('ndtEach', 'NDT Each', 'NDT', 'list'),
  job('ndtFinal', 'NDT Final', 'NDT', 'list'),
  job('ut', 'UT', 'NDT'),
  job('pwht', 'PWHT', 'NDT'),
  job('order', 'Order', 'Additional', 'text', 'min-w-28'),
  job('workPackage', 'Work package', 'Additional'),
  job('workPermit', 'Work permit', 'Additional'),
  job('waff', 'WAFF', 'Additional'),
  job('serialNumber', 'Serial number', 'Additional'),
  job('refitNumber', 'Refit number', 'Additional'),
  job('repairNumber', 'Repair number', 'Additional'),
  job('ss', 'SS', 'Additional'),
  job('sfff', 'SFFF', 'Additional'),
  job('dssAaa', 'DSS/AAA', 'Additional'),
  job('er1', 'ER 1', 'Additional'),
  job('er2', 'ER 2', 'Additional'),
  job('er3', 'ER 3', 'Additional'),
  job('er4', 'ER 4', 'Additional'),
  job('attributeCode1', 'Attribute code 1', 'Additional'),
  job('attributeCode2', 'Attribute code 2', 'Additional'),
  job('attributeCode3', 'Attribute code 3', 'Additional'),
  job('attributeCode4', 'Attribute code 4', 'Additional'),
  job('estimatedCost', 'Estimated cost', 'Additional', 'number'),
  job('estimatedHours', 'Estimated hours', 'Additional', 'number'),
  job('scheduledFor', 'Scheduled for', 'Additional', 'date'),
];

const FAB_KEY = 'fab.';
const fabFields = (): SearchField[] => FABRICATION_FIELDS.map(f => ({
  key: FAB_KEY + f.key, label: f.label, group: 'Fabrication',
  kind: f.type === 'select' || f.type === 'checkbox' ? 'list' : 'text', width: 'min-w-24',
}));

/* "Root Weld: Weld Process" -> group "Step: Root Weld" */
const stepGroup = (f: StepConditionField) => `Step: ${f.label.split(': ')[0]}`;

/* every field Advanced Search offers, as filters and as columns. Built when the screen opens, since
   step fields come from the (admin-editable) Welding step templates. */
export function searchFields(): SearchField[] {
  const steps = allStepAnswerFields('Welding').map<SearchField>(f => ({
    key: f.key, label: f.label, group: stepGroup(f), kind: f.values.length ? 'list' : 'text', width: 'min-w-28',
  }));
  return [...JOB_FIELDS, ...fabFields(), ...steps];
}

/* ── Values ── */

export type SearchRow = Job & { currentRouting: string } & Record<string, any>;

function fabValue(fab: Record<string, string>, key: string): string {
  const f = FABRICATION_FIELDS.find(x => x.key === key);
  if (!f) return '';
  if (f.showIf && fab[f.showIf.key] !== f.showIf.equals) return '';
  const options = key === 'location' ? shopOptions() : key === 'revisedJointDesign' ? jointDesignOptions() : f.options;
  const raw = fab[key] ?? '';
  return options?.find(o => o.value === raw)?.label ?? raw;
}

/* one row per job: the Job's own fields and Current routing, plus any fabrication / step-answer
   fields in `extraKeys` (only the ones in use are worked out; there are a lot of step fields) */
export function buildRow(j: Job, wf: JobWorkflow, extraKeys: string[], stepFields: Map<string, StepConditionField>): SearchRow {
  const row: SearchRow = { ...j, currentRouting: currentRoutingLabel(wf.stages) };
  for (const key of extraKeys) {
    if (key.startsWith(FAB_KEY)) row[key] = fabValue(wf.fabricationData ?? {}, key.slice(FAB_KEY.length));
    else {
      const f = stepFields.get(key);
      if (!f) continue;
      const v = f.get(j, wf.stages);
      row[key] = v && f.valueLabel ? f.valueLabel(v) : v;
    }
  }
  return row;
}

export const isExtraKey = (key: string) => !JOB_FIELDS.some(f => f.key === key);

/* ── Matching ── */

const day = (iso: string) => (iso ? new Date(iso + 'T00:00:00').getTime() : NaN);
const DAY_MS = 24 * 3600 * 1000;

function matches(c: Condition, kind: FieldKind, cell: any): boolean {
  if (kind === 'number' || kind === 'date') {
    const v = kind === 'date' ? (cell ? new Date(cell).getTime() : NaN) : Number(cell);
    const n = (s: string) => (kind === 'date' ? day(s) : Number(s));
    if (Number.isNaN(v)) return false;
    switch (c.op) {
      case 'between':
        if (c.value && v < n(c.value)) return false;
        if (c.to) return kind === 'date' ? v < n(c.to) + DAY_MS : v <= n(c.to);
        return true;
      case 'gt': return kind === 'date' ? v >= n(c.value) + DAY_MS : v > n(c.value);
      case 'lt': return v < n(c.value);
      default: return false;
    }
  }
  const text = String(cell ?? '').trim().toLowerCase();
  const typed = c.value.trim().toLowerCase();
  switch (c.op) {
    case 'contains': return text.includes(typed);
    case 'notContains': return !text.includes(typed);
    case 'startsWith': return text.startsWith(typed);
    case 'blank': return !text;
    case 'notBlank': return !!text;
    case 'is':
    case 'isNot': {
      const hit = kind === 'list' ? c.values.some(v => v.trim().toLowerCase() === text) : text === typed;
      return c.op === 'is' ? hit : !hit;
    }
    default: return false;
  }
}

export function fieldMatches(field: SearchField, conds: Condition[] | undefined, cell: any): boolean {
  const active = activeConditions(field, conds);
  if (!active.length) return true;
  const includes = active.filter(c => !isExclude(c.op));
  const excludes = active.filter(c => isExclude(c.op));
  return (!includes.length || includes.some(c => matches(c, field.kind, cell)))
    && excludes.every(c => matches(c, field.kind, cell));
}

export function applyFilters(rows: SearchRow[], fields: SearchField[], values: FilterValues): SearchRow[] {
  const used = fields.filter(f => activeConditions(f, values[f.key]).length);
  if (!used.length) return rows;
  return rows.filter(r => used.every(f => fieldMatches(f, values[f.key], r[f.key])));
}

/* chip text, e.g. Hull: contains "K7" or starts with "S", and not "S9" */
export function chipLabel(field: SearchField, conds: Condition[]): string {
  const one = (c: Condition) => {
    const label = opLabel(c.op, field.kind);
    if (needsNoValue(c.op)) return label;
    if (field.kind === 'list' && (c.op === 'is' || c.op === 'isNot')) return `${label} ${c.values.join(', ')}`;
    if (c.op === 'between') return `${label} ${c.value || '…'} and ${c.to || '…'}`;
    return `${label} "${c.value.trim()}"`;
  };
  const active = activeConditions(field, conds);
  const inc = active.filter(c => !isExclude(c.op)).map(one).join(' or ');
  const exc = active.filter(c => isExclude(c.op)).map(one).join(', and ');
  return `${field.label}: ${[inc, exc].filter(Boolean).join(', and ')}`;
}

/* ── Layouts (the page's own state and saved variants) ── */

export interface SearchLayout {
  filterKeys: string[];   /* fields in the filter bar, in order */
  values: FilterValues;
  columnKeys: string[];   /* results columns, in order */
  columnFilters: Record<string, any>;   /* the filter boxes in the column headers */
  globalFilter: string;
  sortField: string | null;
  sortOrder: 1 | -1;
  role: string;
}

export interface FilterVariant extends SearchLayout { name: string }

/* "Standard": looks like Pipe Welding */
export const STANDARD_VARIANT = 'Standard';
export function standardLayout(): SearchLayout {
  return {
    filterKeys: [],   /* the column headings already filter these */
    values: {},
    columnKeys: ['xrefid', 'hull', 'drawing', 'joint', 'order', 'sequenceNumber', 'currentRouting'],
    columnFilters: {},
    globalFilter: '',
    sortField: null,
    sortOrder: 1,
    role: 'View',
  };
}

/* the old XREFID key */
const renameKey = (k: string) => (k === 'id' ? 'xrefid' : k);
const isoDay = (d: any) => {
  if (!d) return '';
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/* variants saved before stacked conditions held one value per field and no columns */
function migrateOldValues(old: Record<string, any>): FilterValues {
  const out: FilterValues = {};
  const cond = (c: Partial<Condition>): Condition => ({ op: 'contains', value: '', to: '', values: [], ...c });
  for (const [k, v] of Object.entries(old ?? {})) {
    const key = renameKey(k);
    if (v == null) continue;
    if (typeof v === 'string') { if (v) out[key] = [cond({ value: v })]; }
    else if (typeof v === 'object' && 'text' in v) {
      if (v.text) out[key] = [cond({ op: v.negate ? 'notContains' : 'contains', value: v.text })];
    }
    else if (Array.isArray(v) && v.length) {
      if (typeof v[0] === 'number') {
        if (key === 'estimatedCost' && v[0] === 0 && v[1] === 100000) continue;
        if (key === 'estimatedHours' && v[0] === 0 && v[1] === 500) continue;
        out[key] = [cond({ op: 'between', value: String(v[0]), to: String(v[1]) })];
      } else if (key === 'scheduledFor') {
        if (v[0] || v[1]) out[key] = [cond({ op: 'between', value: isoDay(v[0]), to: isoDay(v[1]) })];
      } else out[key] = [cond({ op: 'is', values: v.map(String) })];
    }
  }
  return out;
}

export function loadVariants(): FilterVariant[] {
  try {
    const raw = localStorage.getItem(STORAGE.filterVariants);
    if (!raw) return [];
    return (JSON.parse(raw) as any[]).map(v => v.columnKeys ? v as FilterVariant : {
      ...standardLayout(),
      name: v.name,
      filterKeys: (v.visibleKeys ?? []).map(renameKey),
      values: migrateOldValues(v.values),
    });
  } catch {
    return [];
  }
}

export function saveVariants(variants: FilterVariant[]): void {
  try { localStorage.setItem(STORAGE.filterVariants, JSON.stringify(variants)); } catch { /* */ }
}

/* the page as it was left. Kept twice: per tab (sessionStorage: a refresh or coming back from a
   joint keeps it) and per browser (localStorage: a new visit picks up there unless a default
   variant is set, which a new visit opens on instead) */
export interface SavedSearchState extends SearchLayout { variant: string; page: number; pageSize: number }

function readState(store: Storage): SavedSearchState | null {
  try {
    const raw = store.getItem(STORAGE.advancedSearchState);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export const loadTabSearchState = () => readState(sessionStorage);
export const loadSearchState = () => readState(localStorage);

export function saveSearchState(s: SavedSearchState) {
  const json = JSON.stringify(s);
  try { sessionStorage.setItem(STORAGE.advancedSearchState, json); } catch { /* */ }
  try { localStorage.setItem(STORAGE.advancedSearchState, json); } catch { /* */ }
}

/* this browser's default variant ('' = none, a new visit picks up where the last one left off) */
export function loadDefaultVariant(): string {
  try { return localStorage.getItem(STORAGE.advancedSearchDefault) ?? ''; } catch { return ''; }
}
export function saveDefaultVariant(name: string) {
  try {
    if (name) localStorage.setItem(STORAGE.advancedSearchDefault, name);
    else localStorage.removeItem(STORAGE.advancedSearchDefault);
  } catch { /* */ }
}
