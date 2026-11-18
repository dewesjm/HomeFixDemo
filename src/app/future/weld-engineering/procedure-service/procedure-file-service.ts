import { procedures, PROCEDURE_STATUS_OPTIONS } from '../../../data/procedures';
import { textBase64, type DownloadFile } from '../../../shared/download-file';
import { csvText } from '../../../shared/export-csv';
import { xlsxTemplateBase64 } from '../../../shared/spreadsheet-import';
import { procedureCsvColumns, procedureTemplateHeaders } from '../procedure-files';
import { procedureSections } from '../procedure-sections';
import { searchProblem, searchRow, searchRows, type ProcedureSearch } from './procedure-search';
import { fail, type ServiceResult } from './service-result';

const ALL_STATUSES = PROCEDURE_STATUS_OPTIONS.map(o => o.value);

/* The CSV of every procedure matching a searchProcedures query (procedure-search.ts): the same search
   text, column filters and sort, so Manage Procedures exports what it shows. Unlike searchProcedures,
   every status is included unless filtered, and every match is exported (no paging). */
export function exportProcedures(query: ProcedureSearch = {}): ServiceResult<DownloadFile> {
  const q = query ?? {};
  const problem = searchProblem(q);
  if (problem) return fail(problem);
  if (q.page !== undefined || q.pageSize !== undefined) return fail('Export answers every match; leave out page and pageSize.');
  const filters = { ...q.filters };
  if (!filters.status || !filters.status.length) filters.status = ALL_STATUSES;
  const sections = procedureSections();
  const all = procedures();
  const keyOf = (p: { gwp: string; wtn: string }) => `${p.gwp}|${p.wtn}`;
  const byKey = new Map(all.map(p => [keyOf(p), p]));
  const rows = searchRows(all.map(p => searchRow(p, sections)), { ...q, filters }).map(r => byKey.get(keyOf(r))!);
  try {
    return { ok: true, data: {
      fileName: 'procedures-export.csv',
      contentType: 'text/csv;charset=utf-8',
      base64: textBase64(csvText(procedureCsvColumns(sections), rows)),
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
