/* Structural Welding's search: its fields, the rows it searches, and saved views (localStorage).
   Same model as Pipe Welding (pipe-welding-page/filter-schema.ts), matched by shared/filter-engine.ts.
   The joint's own fields plus Routing, which stays blank until structural joints have a routing;
   no Fabrication or step answers yet. */
import { STORAGE } from '../../../data/storage-keys';
import type { Job } from '../../../data/jobs';
import { FilterValues, MatchField } from '../../../shared/filter-engine';
import { JOINT_FIELD_CATALOG } from '../../catalogs/joint-fields';
import { jointDetailsUt, jointDetailsVt } from '../../joint-details-logic/joint-details-values';

export interface SearchField extends MatchField {
  key: string;
  group: string;
  width?: string;         /* results column min width */
}

const WIDTHS: Record<string, string> = {
  xrefid: 'min-w-16', ship: 'min-w-16', joint: 'min-w-20', currentRouting: 'min-w-36', engineeringNotes: 'min-w-32', order: 'min-w-28',
};

export const SEARCH_FIELDS: SearchField[] = JOINT_FIELD_CATALOG.map(f => ({ ...f, width: WIDTHS[f.key] ?? 'min-w-24' }));

export type SearchRow = Job & { currentRouting: string } & Record<string, any>;

/* UT and VT as Joint Details shows them; Routing blank for now */
export const buildRow = (j: Job): SearchRow => ({ ...j, currentRouting: '', ut: jointDetailsUt(j), vt: jointDetailsVt(j) });

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

/* "Standard": Pipe Welding's columns */
export const STANDARD_VARIANT = 'Standard';
export function standardLayout(): SearchLayout {
  return {
    filterKeys: [],
    values: {},
    columnKeys: ['xrefid', 'hull', 'drawing', 'joint', 'order', 'sequenceNumber', 'currentRouting'],
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

export const loadVariants = () => read<FilterVariant[]>(localStorage, STORAGE.structuralFilterVariants) ?? [];
export const saveVariants = (variants: FilterVariant[]) => write(localStorage, STORAGE.structuralFilterVariants, variants);

/* the page as it was left: per tab (a refresh or coming back keeps it) and per browser (only page size
   is read back from there), as Pipe Welding does */
export interface SavedSearchState extends SearchLayout { variant: string; filtersHidden: boolean; page: number; pageSize: number }
export const loadTabSearchState = () => read<SavedSearchState>(sessionStorage, STORAGE.structuralSearchState);
export const loadSearchState = () => read<SavedSearchState>(localStorage, STORAGE.structuralSearchState);
export function saveSearchState(s: SavedSearchState) {
  write(sessionStorage, STORAGE.structuralSearchState, s);
  write(localStorage, STORAGE.structuralSearchState, s);
}

/* this browser's default view ('' = Standard) */
export function loadDefaultVariant(): string {
  try { return localStorage.getItem(STORAGE.structuralSearchDefault) ?? ''; } catch { return ''; }
}
export function saveDefaultVariant(name: string) {
  try {
    if (name) localStorage.setItem(STORAGE.structuralSearchDefault, name);
    else localStorage.removeItem(STORAGE.structuralSearchDefault);
  } catch { /* */ }
}
