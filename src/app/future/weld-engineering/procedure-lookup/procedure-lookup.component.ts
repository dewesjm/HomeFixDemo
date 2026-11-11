/* Weld Engineering - Procedure Lookup. Every WPS document (one per GWP+WTN pair) shown at once
   (no pager) with sort/search, mirroring an admin list screen rather than a paginated search screen.
   Every column has a filter: text boxes for typed values, droplists for fixed lists. */
import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideSearch, LucideFileText, LucideX } from '@lucide/angular';

import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { TableState, inArray } from '../../../shared/table-state';
import {
  procedures, Procedure, PROCEDURE_STATUS_OPTIONS, WELD_PROCESSES, PROCESS_TYPES, BASE_METAL_1_TYPES,
  BASE_METAL_2_TYPES, FILLER_METAL_TYPE_OPTIONS
} from '../../../data/procedures';
import { AppDatePipe, formatDate } from '../../../shared/date-format';

const asOptions = (list: string[]) => list.map(v => ({ label: v, value: v }));

/* a procedure lists several filler types: it matches when any of them is picked */
const anyPicked = (rowValue: unknown, picked: string | string[]) =>
  (rowValue as string[]).some(v => (picked as string[]).includes(v));

/* Effective Date is stored ISO but shown formatted, so the filter matches the shown text */
const shownDateContains = (rowValue: unknown, typed: string | string[]) =>
  formatDate(rowValue as string).toLowerCase().includes(String(typed).trim().toLowerCase());

@Component({
  selector: 'app-procedure-lookup',
  standalone: true,
  imports: [AppDatePipe, CommonModule, FormsModule, SortHeaderComponent, LucideSearch, LucideFileText, LucideX],
  templateUrl: './procedure-lookup.component.html'
})
export class ProcedureLookupComponent {
  table = new TableState<Procedure>(
    ['id', 'title', 'wtn', 'gwp', 'weldProcess', 'processType', 'baseMetal1Type', 'baseMetal2Type', 'fillerMetalTypes'],
    {
      status: inArray, weldProcess: inArray, processType: inArray, baseMetal1Type: inArray, baseMetal2Type: inArray,
      fillerMetalTypes: anyPicked, effectiveDate: shownDateContains
    }
  );
  statusOptions = PROCEDURE_STATUS_OPTIONS;
  weldProcessOptions = asOptions(WELD_PROCESSES);
  processTypeOptions = asOptions(PROCESS_TYPES);
  baseMetal1Options = asOptions(BASE_METAL_1_TYPES);
  baseMetal2Options = asOptions(BASE_METAL_2_TYPES);
  fillerTypeOptions = FILLER_METAL_TYPE_OPTIONS;

  /* filler types are stored as option values ('mil-70s-3'); show their labels */
  fillerLabels(values: string[]): string {
    return values.map(v => FILLER_METAL_TYPE_OPTIONS.find(o => o.value === v)?.label ?? v).join(', ');
  }

  constructor(private router: Router) {
    effect(() => this.table.setRows(procedures()));
  }

  openProcedure(row: Procedure) {
    this.router.navigate(['/weld-engineering/procedures', row.id]);
  }
}
