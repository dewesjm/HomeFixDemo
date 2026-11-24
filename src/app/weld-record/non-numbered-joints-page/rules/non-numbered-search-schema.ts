/* Non-Numbered Joints' search: its fields, the rows it searches, and saved views (localStorage).
   Same model as Pipe Welding and Structural Welding, matched by shared/filter-engine.ts. Routing stays
   blank until non-numbered joints have a routing. */
import { STORAGE } from '../../../data/storage-keys';
import type { NonNumberedJoint } from '../../../data/non-numbered-joints';
import { FieldKind, FilterValues, MatchField } from '../../../shared/filter-engine';

export interface SearchField extends MatchField {
  key: string;
  group: string;
  width?: string;         /* results column min width */
}

const f = (key: keyof SearchRow & string, label: string, group: string, kind: FieldKind = 'text', width = 'min-w-28'): SearchField =>
  ({ key, label, group, kind, width });

/* list = picked from the values joints have; List of Hulls holds several hulls per joint */
export const SEARCH_FIELDS: SearchField[] = [
  f('interimPartNumber', 'Interim Part Number', 'Identification'),
  f('order', 'Order', 'Identification'),
  f('sequenceNumber', 'Sequence Number', 'Identification', 'text', 'min-w-20'),
  f('findNumber1', 'Find Number 1', 'Identification', 'text', 'min-w-20'),
  f('findNumber2', 'Find Number 2', 'Identification', 'text', 'min-w-20'),
  f('manufacturingDrawingItem', 'Manufacturing Drawing Item', 'Identification'),
  f('hulls', 'List of Hulls', 'Identification', 'list'),
  f('description', 'Description', 'Description', 'text', 'min-w-32'),
  f('additionalDescription1', 'Additional Description 1', 'Description', 'text', 'min-w-32'),
  f('additionalDescription2', 'Additional Description 2', 'Description', 'text', 'min-w-32'),
  f('weldClass', 'Weld Class', 'Weld', 'list'),
  f('jointType', 'Joint Type', 'Weld', 'list'),
  f('nominalSize', 'Nominal Size', 'Weld', 'list'),
  f('wallThickness', 'Wall Thickness', 'Weld', 'list'),
  f('mcl1', 'MCL 1', 'Weld', 'list'),
  f('mcl2', 'MCL 2', 'Weld', 'list'),
  f('milSpecification', 'Mil Specification', 'Weld', 'list'),
  f('wireSize', 'Wire Size', 'Weld', 'list'),
  f('pipeScheduleClass', 'Pipe Schedule Class', 'Weld', 'list'),
  f('nInd', 'N Indicator', 'Weld', 'list', 'min-w-20'),
  f('currentRouting', 'Routing', 'Routing', 'list', 'min-w-36'),
];

/* a row is the joint plus its key as one id (interim part number + order + sequence number) and Routing */
export type SearchRow = NonNumberedJoint & { id: string; currentRouting: string } & Record<string, any>;
export const buildRow = (j: NonNumberedJoint): SearchRow =>
  ({ ...j, id: `${j.interimPartNumber}|${j.order}|${j.sequenceNumber}`, currentRouting: '' });

/* ── Layouts (the page's own state and saved views) ── */

export interface SearchLayout {
  filterKeys: string[];   /* fields in the filter bar, in order */
  values: FilterValues;
  columnKeys: string[];   /* results columns, in order */
  columnFilters: Record<string, any>;   /* the filter boxes in the column headers */
  globalFilter: string;
  sortField: string | null;
  sortOrder: 1 | -1;
}

export interface FilterVariant extends SearchLayout { name: string }

export const STANDARD_VARIANT = 'Standard';
export const STANDARD_COLUMNS = ['interimPartNumber', 'order', 'sequenceNumber', 'findNumber1', 'findNumber2', 'manufacturingDrawingItem', 'currentRouting'];
export function standardLayout(): SearchLayout {
  return {
    filterKeys: [],
    values: {},
    columnKeys: [...STANDARD_COLUMNS],
    columnFilters: {},
    globalFilter: '',
    sortField: null,
    sortOrder: 1,
  };
}

function read<T>(store: Storage, key: string): T | null {
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch { return null; }
}
function write(store: Storage, key: string, value: unknown) {
  try { store.setItem(key, JSON.stringify(value)); } catch { /* */ }
}

export const loadVariants = () => read<FilterVariant[]>(localStorage, STORAGE.nonNumberedFilterVariants) ?? [];
export const saveVariants = (variants: FilterVariant[]) => write(localStorage, STORAGE.nonNumberedFilterVariants, variants);

/* the page as it was left: per tab (a refresh or coming back keeps it) and per browser (only page size
   is read back from there), as Pipe Welding does */
export interface SavedSearchState extends SearchLayout { variant: string; filtersHidden: boolean; page: number; pageSize: number }
export const loadTabSearchState = () => read<SavedSearchState>(sessionStorage, STORAGE.nonNumberedSearchState);
export const loadSearchState = () => read<SavedSearchState>(localStorage, STORAGE.nonNumberedSearchState);
export function saveSearchState(s: SavedSearchState) {
  write(sessionStorage, STORAGE.nonNumberedSearchState, s);
  write(localStorage, STORAGE.nonNumberedSearchState, s);
}

/* this browser's default view ('' = Standard) */
export function loadDefaultVariant(): string {
  try { return localStorage.getItem(STORAGE.nonNumberedSearchDefault) ?? ''; } catch { return ''; }
}
export function saveDefaultVariant(name: string) {
  try {
    if (name) localStorage.setItem(STORAGE.nonNumberedSearchDefault, name);
    else localStorage.removeItem(STORAGE.nonNumberedSearchDefault);
  } catch { /* */ }
}
