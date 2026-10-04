/* Weld Record's Advanced Search: every searchable field, the rows it searches, and saved variants
   (localStorage). Matching itself is data/filter-engine.ts. */
import { STORAGE } from './storage-keys';
import { Job } from './jobs';
import { FABRICATION_FIELDS, JobWorkflow, currentRoutingLabel } from './workflow';
import { shopOptions } from './shops';
import { jointDesignOptions } from './joint-designs';
import { StepConditionField, allStepAnswerFields } from './step-conditions';
import { Condition, FieldKind, FilterValues, MatchField, isoDay } from './filter-engine';

export interface SearchField extends MatchField {
  key: string;            /* row key: a Job field, 'currentRouting', 'fab.<key>' or a step answer key */
  group: string;
  width?: string;         /* results column min width */
}

/* ── Fields ── */

const job = (key: keyof Job, label: string, group: string, kind: FieldKind = 'text', width = 'min-w-24'): SearchField =>
  ({ key, label, group, kind, width });

const JOB_FIELDS: SearchField[] = [
  job('xrefid', 'XREFID', 'Job', 'text', 'min-w-16'),
  job('ship', 'Ship', 'Job', 'text', 'min-w-16'),
  job('hull', 'Hull', 'Job', 'text', 'min-w-24'),
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

/* the page as it was left. Kept per tab (sessionStorage: a refresh or coming back from a joint
   keeps it; a new visit opens on the default variant instead) and per browser (localStorage: only page
   size is read back from there) */
interface SavedSearchState extends SearchLayout { variant: string; filtersHidden?: boolean; page: number; pageSize: number }

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
