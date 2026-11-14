/* Weld Engineering - Procedure Lookup. Every procedure (one per GWP+WTN pair) shown at once
   (no pager) with sort/search, mirroring an admin list screen rather than a paginated search screen.
   Every column has a filter: text boxes for typed values, droplists for fixed lists. The rows come from
   the procedure service's searchProcedures call, sent the search text, filters and sort on every change
   (the table only holds them). With no Status picked it asks for every status. The base metal and filler
   columns are section fields (Admin > Procedure Sections): their headings and choices come from the field
   definitions, and a procedure without that section shows them blank. */
import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideSearch, LucideFileText, LucideX } from '@lucide/angular';

import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { TableState } from '../../../shared/table-state';
import { PROCEDURE_STATUS_OPTIONS, WELD_PROCESSES, PROCESS_TYPES } from '../../../data/procedures';
import { procedureSections, findField } from '../procedure-sections';
import { fieldChoices, fieldLabel } from '../procedure-field-values';
import { AppDatePipe } from '../../../shared/date-format';
import { searchProcedures } from '../procedure-service/procedure-service';
import type { ProcedureSearch, ProcedureSearchRow, SearchColumn } from '../procedure-service/procedure-search';

const asOptions = (list: string[]) => list.map(v => ({ label: v, value: v }));
const ALL_STATUSES = PROCEDURE_STATUS_OPTIONS.map(o => o.value);

@Component({
  selector: 'app-procedure-lookup',
  standalone: true,
  imports: [AppDatePipe, CommonModule, FormsModule, SortHeaderComponent, LucideSearch, LucideFileText, LucideX],
  templateUrl: './procedure-lookup.component.html'
})
export class ProcedureLookupComponent {
  table = new TableState<ProcedureSearchRow>([], {}, true);
  statusOptions = PROCEDURE_STATUS_OPTIONS;
  weldProcessOptions = asOptions(WELD_PROCESSES);
  processTypeOptions = asOptions(PROCESS_TYPES);
  baseMetal1Options = this.choicesOf('baseMetal1Type');
  baseMetal2Options = this.choicesOf('baseMetal2Type');
  fillerTypeOptions = this.choicesOf('fillerMetalTypes');

  label(key: string): string {
    return fieldLabel(key, procedureSections());
  }

  private choicesOf(key: string) {
    const f = findField(key, procedureSections());
    return f ? fieldChoices(f) : [];
  }

  /* filler types are stored as option values ('mil-70s-3'); show their labels */
  fillerLabels(values: string[]): string {
    return values.map(v => this.fillerTypeOptions.find(o => o.value === v)?.label ?? v).join(', ');
  }

  /* the call the table's search, filters and sort make */
  query(): ProcedureSearch {
    const filters: NonNullable<ProcedureSearch['filters']> = { ...this.table.columnFilters() };
    const status = filters.status;
    if (!status || !status.length) filters.status = ALL_STATUSES;
    const by = this.table.sortField() as SearchColumn | null;
    return {
      text: this.table.globalFilter(),
      filters,
      ...(by ? { sort: { by, order: this.table.sortOrder() === 1 ? 'asc' : 'desc' } } : {}),
    };
  }

  constructor(private router: Router) {
    /* runs again when the query or the procedures change */
    effect(() => {
      const result = searchProcedures(this.query());
      this.table.setRows(result.ok ? result.data.procedures : []);
    });
  }

  openProcedure(row: ProcedureSearchRow) {
    this.router.navigate(['/weld-engineering/procedures', row.gwp, row.wtn]);
  }
}
