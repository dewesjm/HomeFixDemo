/* Weld Record's Advanced Search: every searchable field, the rows it searches, and saved variants
   (localStorage). Matching itself is shared/filter-engine.ts. */
import { STORAGE } from '../../data/storage-keys';
import { Job } from '../../data/jobs';
import { FABRICATION_FIELDS, fabricationFieldVisible, fabricationFields } from '../fabrication-logic/fabrication-fields';
import { JobWorkflow } from '../model/workflow-types';
import { currentRoutingLabel } from '../routing-logic/current-routing';
import { locationOptions } from '../../data/locations';
import { jointDesignOptions } from '../../data/joint-designs';
import { ConditionCatalogField } from '../catalogs/field-catalog';
import { allStepAnswerFields } from '../catalogs/field-choices';
import { jointDetailsUt, jointDetailsVt } from '../joint-details-logic/joint-details-values';
import { FilterValues, MatchField } from '../../shared/filter-engine';
import { JOINT_FIELD_CATALOG } from '../catalogs/joint-fields';

export interface SearchField extends MatchField {
  key: string;            /* row key: a Job field, 'currentRouting', 'fab.<key>' or a step answer key */
  group: string;
  width?: string;         /* results column min width */
}

/* ── Fields ── */

/* list column widths that aren't the usual min-w-24 */
const WIDTHS: Record<string, string> = {
  xrefid: 'min-w-16', ship: 'min-w-16', joint: 'min-w-20', currentRouting: 'min-w-36', engineeringNotes: 'min-w-32', order: 'min-w-28',
};

/* the joint's own fields (catalogs/joint-fields.ts), with their column widths */
const JOB_FIELDS: SearchField[] = JOINT_FIELD_CATALOG.map(f => ({ ...f, width: WIDTHS[f.key] ?? 'min-w-24' }));

const FAB_KEY = 'fab.';
const fabFields = (): SearchField[] => FABRICATION_FIELDS.map(f => ({
  key: FAB_KEY + f.key, label: f.label, group: 'Fabrication',
  kind: f.type === 'select' || f.type === 'checkbox' ? 'list' : 'text', width: 'min-w-24',
}));

/* "Root Weld: Weld Process" -> group "Step: Root Weld" */
const stepGroup = (f: ConditionCatalogField) => `Routing: ${f.label.split(': ')[0]}`;

/* every field Advanced Search offers, as filters and as columns. Built when the screen opens, since
   step fields come from the (admin-editable) Welding step templates. */
export function searchFields(): SearchField[] {
  const steps = allStepAnswerFields().map<SearchField>(f => ({
    key: f.key, label: f.label, group: stepGroup(f), kind: f.values.length ? 'list' : 'text', width: 'min-w-28',
  }));
  return [...JOB_FIELDS, ...fabFields(), ...steps];
}

/* ── Values ── */

export type SearchRow = Job & { currentRouting: string } & Record<string, any>;

/* blank where the joint's hull doesn't have the field (Usage on S and D hulls) */
function fabValue(fab: Record<string, string>, key: string, hull: string): string {
  const f = fabricationFields(hull).find(x => x.key === key);
  if (!f) return '';
  if (!fabricationFieldVisible(f, fab)) return '';
  const options = key === 'location' ? locationOptions() : key === 'revisedJointDesign' ? jointDesignOptions() : f.options;
  const raw = fab[key] ?? '';
  return options?.find(o => o.value === raw)?.label ?? raw;
}

/* one row per job: the Job's own fields, Routing, and UT/VT as Joint Details shows them, plus any fabrication / step-answer
   fields in `extraKeys` (only the ones in use are worked out; there are a lot of step fields) */
export function buildRow(j: Job, wf: JobWorkflow, extraKeys: string[], stepFields: Map<string, ConditionCatalogField>): SearchRow {
  const row: SearchRow = { ...j, currentRouting: currentRoutingLabel(wf.stages), ut: jointDetailsUt(j), vt: jointDetailsVt(j) };
  for (const key of extraKeys) {
    if (key.startsWith(FAB_KEY)) row[key] = fabValue(wf.fabricationData ?? {}, key.slice(FAB_KEY.length), j.hull);
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

export function loadVariants(): FilterVariant[] {
  try {
    const raw = localStorage.getItem(STORAGE.filterVariants);
    return raw ? JSON.parse(raw) as FilterVariant[] : [];
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
