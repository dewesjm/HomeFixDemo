/* findJoints' and searchJoints' matching. Nothing here reads or writes the store: the caller passes
   each joint with its current routing. Matching ignores case and surrounding spaces.
     findJoints   = for another system's logic: conditions on any joint field or the current routing,
                    each an exact value; answers whole joint records. No search text, sort or paging.
     searchJoints = for a list screen: search text, filters on its columns (typed text = contains, a
                    list = any of those values exactly), sort, optional paging and a total; answers flat rows. */
import type { Job } from '../../data/jobs';

/* a joint as the calls see it: its record fields (never the internal id), current routing and link */
export type JointRecord = Omit<Job, 'id' | '_fresh'> & { routing: string; url: string };

/* the keys a findJoints condition can name: every joint field plus routing */
export type JointField = Exclude<keyof JointRecord, 'url'>;
export type JointFilter = Partial<Record<JointField, string>>;

export interface JointSearchRow {
  xrefid: string; hull: string; drawing: string; joint: string; ship: string; routing: string;
  weldType: string; pipeSize: string; materialType1: string; materialType2: string; technician: string;
  url: string;
}
export type SearchColumn = Exclude<keyof JointSearchRow, 'url'>;
export const SEARCH_COLUMNS: SearchColumn[] = [
  'xrefid', 'hull', 'drawing', 'joint', 'ship', 'routing', 'weldType', 'pipeSize', 'materialType1', 'materialType2', 'technician',
];
/* the columns search text looks in */
const TEXT_COLUMNS: SearchColumn[] = ['xrefid', 'hull', 'drawing', 'joint', 'routing', 'technician'];

export interface JointSearch {
  text?: string;
  /* column: typed text (contains), or a list of values (any of them, exactly) */
  filters?: Partial<Record<SearchColumn, string | string[]>>;
  sort?: { by: SearchColumn; order?: 'asc' | 'desc' };
  /* paging: page 1 is the first; left out = every match */
  page?: number;
  pageSize?: number;
  /* true leaves out closed joints (at Sold) */
  openOnly?: boolean;
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
const isColumn = (c: unknown): c is SearchColumn => SEARCH_COLUMNS.includes(c as SearchColumn);
const positiveInt = (n: unknown) => Number.isInteger(n) && (n as number) > 0;
const blank = (v: unknown) => v == null || v === '' || (Array.isArray(v) && !v.length);

/* why the filter can't be run, or ''; fields = the keys a condition may name */
export function filterProblem(filter: unknown, fields: string[]): string {
  if (filter == null) return '';
  if (typeof filter !== 'object' || Array.isArray(filter)) return 'filter must be an object of field: value.';
  for (const [key, v] of Object.entries(filter)) {
    if (!fields.includes(key)) return `${key} isn't a joint field. Fields: ${fields.join(', ')}.`;
    if (typeof v !== 'string' && typeof v !== 'number') return `${key}: a condition is one value.`;
  }
  return '';
}

/* every condition holds, each an exact value */
export function matchesFilter(joint: JointRecord, filter: JointFilter): boolean {
  return Object.entries(filter).every(([key, v]) => blank(v) || norm(joint[key as JointField]) === norm(v));
}

export function searchProblem(q: JointSearch): string {
  if (q.text !== undefined && typeof q.text !== 'string') return 'text must be text.';
  for (const [col, v] of Object.entries(q.filters ?? {})) {
    if (!isColumn(col)) return `${col} isn't a column. Columns: ${SEARCH_COLUMNS.join(', ')}.`;
    if (typeof v !== 'string' && !(Array.isArray(v) && v.every(s => typeof s === 'string'))) return `${col}: a filter is text or a list of text.`;
  }
  if (q.sort !== undefined) {
    if (!isColumn(q.sort?.by)) return `sort.by must be a column: ${SEARCH_COLUMNS.join(', ')}.`;
    if (q.sort.order !== undefined && q.sort.order !== 'asc' && q.sort.order !== 'desc') return 'sort.order must be asc or desc.';
  }
  if (q.page !== undefined && !positiveInt(q.page)) return 'page must be a whole number from 1.';
  if (q.pageSize !== undefined && !positiveInt(q.pageSize)) return 'pageSize must be a whole number from 1.';
  if (q.page !== undefined && q.pageSize === undefined) return 'Send pageSize with page.';
  return '';
}

export function searchRow(j: JointRecord): JointSearchRow {
  return {
    xrefid: j.xrefid, hull: j.hull, drawing: j.drawing, joint: j.joint, ship: j.ship, routing: j.routing,
    weldType: j.weldType, pipeSize: j.pipeSize, materialType1: j.materialType1, materialType2: j.materialType2,
    technician: j.technician, url: j.url,
  };
}

function matchesColumn(row: JointSearchRow, col: SearchColumn, f: string | string[]): boolean {
  const v = norm(row[col]);
  return Array.isArray(f) ? f.some(x => norm(x) === v) : v.includes(norm(f));
}

/* the matching rows, sorted */
export function searchRows(rows: JointSearchRow[], q: JointSearch): JointSearchRow[] {
  const text = norm(q.text);
  const found = rows.filter(r => (!text || TEXT_COLUMNS.some(c => norm(r[c]).includes(text)))
    && Object.entries(q.filters ?? {}).every(([col, f]) => blank(f) || matchesColumn(r, col as SearchColumn, f!)));
  if (!q.sort) return found;
  const by = q.sort.by;
  const order = q.sort.order === 'desc' ? -1 : 1;
  return [...found].sort((a, b) => (a[by] < b[by] ? -order : a[by] > b[by] ? order : 0));
}
