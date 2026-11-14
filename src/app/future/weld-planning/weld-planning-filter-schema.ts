/* Weld Planning's Advanced Search: every searchable field, the rows it searches, and saved views
   (localStorage). Same model as Pipe Welding (weld-record/pipe-welding-page/filter-schema.ts):
   stacked conditions per field, matched by shared/filter-engine.ts. */
import { STORAGE } from '../../data/storage-keys';
import { FieldKind, FilterValues, MatchField } from '../../shared/filter-engine';
import {
  NDT_FIELDS, JOINT_EXTRA_FIELDS, JOINT_STATUS_OPTIONS, JOINT_TYPE_OPTIONS, type WeldJoint
} from '../../data/weld-planning';
import { FILLER_METAL_TYPE_OPTIONS } from '../../data/procedures';
import { getGwpDetails } from '../weld-engineering/procedure-service/procedure-usage';

export interface SearchField extends MatchField {
  key: string;            /* row key: a WeldJoint field or one of the GWP's procedure fields */
  group: string;
  width?: string;         /* results column min width */
}

/* ── Fields ── */

const field = (key: string, label: string, group: string, kind: FieldKind = 'text', width = 'min-w-24'): SearchField =>
  ({ key, label, group, kind, width });

/* free-text fields and fields with a fixed set of values; list fields pick from the values joints have */
export const SEARCH_FIELDS: SearchField[] = [
  field('id', 'XREFID', 'Joint', 'text', 'min-w-16'),
  field('hull', 'Hull', 'Joint', 'list', 'min-w-20'),
  field('joint', 'Joint', 'Joint', 'text', 'min-w-20'),
  field('description', 'Description', 'Joint', 'text', 'min-w-32'),
  field('status', 'Status', 'Joint', 'list'),
  field('priority', 'Priority', 'Joint', 'list'),
  field('jointType', 'Type', 'Joint', 'list'),
  field('drawing', 'Drawing', 'Welding'),
  field('drawingRev', 'Drawing Rev', 'Welding', 'list'),
  field('jointDesign', 'Joint Design', 'Welding', 'list'),
  field('weldType', 'Weld Type', 'Welding', 'list'),
  field('pipeSize', 'Pipe Size', 'Welding', 'list'),
  field('wallThickness', 'Wall Thickness', 'Welding', 'list'),
  field('materialType1', 'Material 1', 'Welding', 'list'),
  field('materialType2', 'Material 2', 'Welding', 'list'),
  field('gwp', 'GWP', 'Procedure', 'list'),
  field('weldProcess', 'Welding Process', 'Procedure', 'list'),
  field('processType', 'Process Type', 'Procedure', 'list'),
  field('baseMetal1Type', 'Base Metal 1 Type', 'Procedure', 'list'),
  field('baseMetal2Type', 'Base Metal 2 Type', 'Procedure', 'list'),
  field('fillerMetalTypes', 'Filler Metal Type', 'Procedure', 'list', 'min-w-32'),
  ...NDT_FIELDS.map(f => field(f.key, f.label, 'NDT', 'list')),
  ...JOINT_EXTRA_FIELDS.map(f => field(f.key, f.label, f.group, f.options ? 'list' : 'text')),
  field('notes', 'Notes', 'Additional', 'text', 'min-w-32'),
  field('createdBy', 'Created By', 'Additional'),
  field('createdAt', 'Created', 'Additional', 'date'),
];

/* ── Values ── */

/* a joint as the search sees it: status/priority/type by their labels, plus what its GWP stands
   for. Filler Metal Type is every filler the GWP's WTNs allow, so it's a list. */
export type SearchRow = Omit<WeldJoint, 'status' | 'priority' | 'jointType'> & {
  status: string; priority: string; jointType: string;
  weldProcess: string; processType: string; baseMetal1Type: string; baseMetal2Type: string;
  fillerMetalTypes: string[];
};

const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const label = (opts: { label: string; value: string }[], v: string) => opts.find(o => o.value === v)?.label ?? v;

export function buildRow(j: WeldJoint): SearchRow {
  const gwp = getGwpDetails(j.gwp ?? '');
  return {
    ...j,
    status: label(JOINT_STATUS_OPTIONS, j.status),
    priority: PRIORITY_LABELS[j.priority] ?? j.priority,
    jointType: label(JOINT_TYPE_OPTIONS, j.jointType),
    gwp: j.gwp ?? '',
    weldProcess: gwp?.weldProcess ?? '',
    processType: gwp?.processType ?? '',
    baseMetal1Type: gwp?.baseMetal1Type ?? '',
    baseMetal2Type: gwp?.baseMetal2Type ?? '',
    fillerMetalTypes: (gwp?.fillerMetalTypes ?? []).map(v => label(FILLER_METAL_TYPE_OPTIONS, v)),
  };
}

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

/* "Standard": the GWP and procedure fields in the filter bar */
export const STANDARD_VARIANT = 'Standard';
export function standardLayout(): SearchLayout {
  return {
    filterKeys: ['gwp', 'weldProcess', 'processType', 'baseMetal1Type', 'baseMetal2Type', 'fillerMetalTypes'],
    values: {},
    columnKeys: ['id', 'hull', 'drawing', 'joint', 'status', 'jointDesign', 'gwp'],
    columnFilters: {},
    globalFilter: '',
    sortField: null,
    sortOrder: 1,
  };
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch { return null; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* */ }
}

export const loadVariants = () => read<FilterVariant[]>(STORAGE.weldPlanningFilterVariants) ?? [];
export const saveVariants = (variants: FilterVariant[]) => write(STORAGE.weldPlanningFilterVariants, variants);

/* the page as it was left, with the view chosen and page size */
export interface SavedSearchState extends SearchLayout { variant: string; filtersHidden: boolean; pageSize: number }
export const loadSearchState = () => read<SavedSearchState>(STORAGE.weldPlanningSearchState);
export const saveSearchState = (s: SavedSearchState) => write(STORAGE.weldPlanningSearchState, s);
