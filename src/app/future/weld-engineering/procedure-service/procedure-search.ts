/* searchProcedures' query and matching: the call behind a procedure list screen (Procedure Lookup). A
   query has search text, column filters, a sort and optional paging; every part is optional. The
   columns are the header properties plus three section fields, named by field key. Matching ignores
   case. Nothing here reads or writes the store. */
import { PROCEDURE_STATUS_OPTIONS, type Procedure, type ProcedureStatus } from '../../../data/procedures';
import type { ProcedureSection } from '../procedure-sections';
import { listValue, textValue } from '../procedure-field-values';
import { formatDate } from '../../../shared/date-format';
import { procedureHeader, type ProcedureHeader } from './procedure-record';

/* one row of the answer: the header plus the section values a list shows (blank when the procedure
   doesn't have that section); filler types are stored values, e.g. 'mil-70s-3' */
export interface ProcedureSearchRow extends ProcedureHeader {
  baseMetal1Type: string;
  baseMetal2Type: string;
  fillerMetalTypes: string[];
}

export type SearchColumn = keyof ProcedureSearchRow;
export const SEARCH_COLUMNS: SearchColumn[] = [
  'gwp', 'wtn', 'revision', 'effectiveDate', 'title', 'status', 'weldProcess', 'processType', 'application',
  'baseMetal1Type', 'baseMetal2Type', 'fillerMetalTypes',
];

/* columns whose filter is one or more exact values (any matches); the rest match typed text */
const PICKED_COLUMNS: SearchColumn[] = ['status', 'weldProcess', 'processType', 'baseMetal1Type', 'baseMetal2Type', 'fillerMetalTypes'];
/* columns the search text looks in */
const TEXT_COLUMNS: SearchColumn[] = ['title', 'wtn', 'gwp', 'weldProcess', 'processType', 'baseMetal1Type', 'baseMetal2Type', 'fillerMetalTypes'];

export interface ProcedureSearch {
  text?: string;
  /* column: typed text (contains), or for a picked column one value or a list (any of them).
     Status defaults to Active when not filtered. */
  filters?: Partial<Record<SearchColumn, string | string[]>>;
  sort?: { by: SearchColumn; order?: 'asc' | 'desc' };
  /* paging: page 1 is the first; left out = every match */
  page?: number;
  pageSize?: number;
}

export function searchRow(p: Procedure, sections: ProcedureSection[]): ProcedureSearchRow {
  return {
    ...procedureHeader(p),
    baseMetal1Type: textValue(p, 'baseMetal1Type', sections),
    baseMetal2Type: textValue(p, 'baseMetal2Type', sections),
    fillerMetalTypes: listValue(p, 'fillerMetalTypes', sections),
  };
}

const isColumn = (c: unknown): c is SearchColumn => SEARCH_COLUMNS.includes(c as SearchColumn);
const positiveInt = (n: unknown) => Number.isInteger(n) && (n as number) > 0;
const asList = (v: string | string[]) => (Array.isArray(v) ? v : [v]).map(s => String(s).toLowerCase());
const blank = (v: unknown) => v == null || v === '' || (Array.isArray(v) && !v.length);

/* why the query can't be run, or '' */
export function searchProblem(q: ProcedureSearch): string {
  if (q.text !== undefined && typeof q.text !== 'string') return 'text must be text.';
  for (const [col, v] of Object.entries(q.filters ?? {})) {
    if (!isColumn(col)) return `${col} isn't a column. Columns: ${SEARCH_COLUMNS.join(', ')}.`;
    if (typeof v !== 'string' && !(Array.isArray(v) && v.every(s => typeof s === 'string'))) return `${col}: a filter is text or a list of text.`;
    if (Array.isArray(v) && !PICKED_COLUMNS.includes(col)) return `${col}: only ${PICKED_COLUMNS.join(', ')} take a list.`;
  }
  const statuses = q.filters?.status;
  if (statuses && !blank(statuses)) {
    const valid = PROCEDURE_STATUS_OPTIONS.map(o => o.value as string);
    const bad = asList(statuses).find(s => !valid.includes(s));
    if (bad) return `status must be one of ${valid.join(', ')}.`;
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

function matchesText(row: ProcedureSearchRow, text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  return TEXT_COLUMNS.some(c => {
    const v = row[c];
    return (Array.isArray(v) ? v.join(' ') : String(v ?? '')).toLowerCase().includes(t);
  });
}

function matchesFilter(row: ProcedureSearchRow, col: SearchColumn, filter: string | string[]): boolean {
  const v = row[col];
  if (PICKED_COLUMNS.includes(col)) {
    const picked = asList(filter);
    return (Array.isArray(v) ? v : [v]).some(x => picked.includes(String(x).toLowerCase()));
  }
  const typed = String(filter).trim().toLowerCase();
  /* a date matches as stored (2026-01-15) or as shown (01/15/2026) */
  const shown = col === 'effectiveDate' ? [String(v), formatDate(String(v))] : [String(v ?? '')];
  return shown.some(s => s.toLowerCase().includes(typed));
}

/* the matching rows, sorted; status is Active unless filtered */
export function searchRows(rows: ProcedureSearchRow[], q: ProcedureSearch): ProcedureSearchRow[] {
  const filters: Partial<Record<SearchColumn, string | string[]>> = { ...q.filters };
  if (blank(filters.status)) filters.status = ['active' satisfies ProcedureStatus];
  const found = rows.filter(r => matchesText(r, q.text ?? '')
    && Object.entries(filters).every(([col, f]) => blank(f) || matchesFilter(r, col as SearchColumn, f!)));
  if (!q.sort) return found;
  const by = q.sort.by;
  const order = q.sort.order === 'desc' ? -1 : 1;
  const key = (r: ProcedureSearchRow) => { const v = r[by]; return Array.isArray(v) ? v.join(', ') : v; };
  return [...found].sort((a, b) => {
    const av = key(a), bv = key(b);
    return av < bv ? -order : av > bv ? order : 0;
  });
}
