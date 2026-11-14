import { procedures, PROCEDURE_STATUS_OPTIONS } from '../../../data/procedures';
import { textBase64, type DownloadFile } from '../../../shared/download-file';
import { csvText } from '../../../shared/export-csv';
import { xlsxTemplateBase64 } from '../../../shared/spreadsheet-import';
import { procedureCsvColumns, procedureTemplateHeaders } from '../procedure-files';
import { procedureSections } from '../procedure-sections';
import { createManageProceduresTable } from './manage-procedures-table';
import { fail, type ServiceResult } from './service-result';

const TEXT_COLUMNS = ['gwp', 'wtn', 'title'];
const SORT_COLUMNS = [...TEXT_COLUMNS, 'status', 'weldProcess'];

export interface ProcedureExportFilter {
  text?: string;
  columns?: Record<string, string | string[]>;
  sort?: string | null;
  order?: 1 | -1;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function filterProblem(filter: unknown): string {
  if (!isObject(filter)) return 'Send the filter as an object.';
  if (Object.keys(filter).some(key => !['text', 'columns', 'sort', 'order'].includes(key))) {
    return 'Filter supports text, columns, sort and order.';
  }
  const { text, sort, order, columns } = filter;
  if (text !== undefined && typeof text !== 'string') return 'Search text must be a string.';
  if (sort != null && (typeof sort !== 'string' || !SORT_COLUMNS.includes(sort))) return 'Choose a Manage Procedures column to sort by.';
  if (order !== undefined && order !== 1 && order !== -1) return 'Sort order must be 1 or -1.';
  if (columns === undefined) return '';
  if (!isObject(columns)) return 'Send column filters as an object.';
  for (const [column, value] of Object.entries(columns)) {
    if (column === 'status') {
      if (!Array.isArray(value) || !value.every(status => PROCEDURE_STATUS_OPTIONS.some(option => option.value === status))) {
        return 'Status must be a list of Active, Draft or Retired values in lowercase.';
      }
    } else if (!TEXT_COLUMNS.includes(column) || typeof value !== 'string') {
      return 'GWP, WTN and Title column filters must be strings.';
    }
  }
  return '';
}

/* Match the Manage Procedures table and export every matching row. */
export function exportProcedures(filter: ProcedureExportFilter = {}): ServiceResult<DownloadFile> {
  const problem = filterProblem(filter);
  if (problem) return fail(problem);
  const table = createManageProceduresTable();
  table.setRows(procedures());
  table.globalFilter.set(filter.text ?? '');
  table.columnFilters.set(filter.columns ?? {});
  table.sortField.set(filter.sort ?? null);
  table.sortOrder.set(filter.order ?? 1);
  try {
    return { ok: true, data: {
      fileName: 'procedures-export.csv',
      contentType: 'text/csv;charset=utf-8',
      base64: textBase64(csvText(procedureCsvColumns(procedureSections()), table.sorted())),
    } };
  } catch {
    return fail('The procedure export could not be made.', 'Export not made');
  }
}

export async function getLoadTemplate(): Promise<ServiceResult<DownloadFile>> {
  try {
    return { ok: true, data: {
      fileName: 'procedures-import-template.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: await xlsxTemplateBase64(procedureTemplateHeaders(procedureSections())),
    } };
  } catch {
    return fail('The procedure load template could not be made.', 'Template not made');
  }
}
