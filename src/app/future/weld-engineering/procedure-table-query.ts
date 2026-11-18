/* The searchProcedures query a procedure list screen sends (Procedure Lookup, Manage Procedures): the
   table's search text, column filters and sort. With no Status picked it asks for every status. */
import { PROCEDURE_STATUS_OPTIONS } from '../../data/procedures';
import type { TableState } from '../../shared/table-state';
import type { ProcedureSearch, ProcedureSearchRow, SearchColumn } from './procedure-service/procedure-search';

const ALL_STATUSES = PROCEDURE_STATUS_OPTIONS.map(o => o.value);

export function procedureTableQuery(table: TableState<ProcedureSearchRow>): ProcedureSearch {
  const filters: NonNullable<ProcedureSearch['filters']> = { ...table.columnFilters() };
  const status = filters.status;
  if (!status || !status.length) filters.status = ALL_STATUSES;
  const by = table.sortField() as SearchColumn | null;
  return {
    text: table.globalFilter(),
    filters,
    ...(by ? { sort: { by, order: table.sortOrder() === 1 ? 'asc' : 'desc' } } : {}),
  };
}
