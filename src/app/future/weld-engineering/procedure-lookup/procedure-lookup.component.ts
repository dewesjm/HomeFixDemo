/* Weld Engineering - Procedure Lookup. Every WPS document (one per GWP+WTN pair) shown at once
   (no pager) with sort/search, mirroring an admin list screen rather than a paginated search screen.
   Every column has a filter: text boxes for typed values, droplists for fixed lists. The base metal
   and filler columns are section fields (Admin > Procedure Sections): their headings and choices come
   from the field definitions, and a procedure without that section shows them blank. */
import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideSearch, LucideFileText, LucideX } from '@lucide/angular';

import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { TableState, inArray } from '../../../shared/table-state';
import {
  procedures, Procedure, PROCEDURE_STATUS_OPTIONS, WELD_PROCESSES, PROCESS_TYPES
} from '../../../data/procedures';
import { procedureSections, findField } from '../procedure-sections';
import { fieldChoices, fieldLabel, listValue, textValue } from '../procedure-field-values';
import { AppDatePipe, formatDate } from '../../../shared/date-format';

/* a procedure with the section values the table shows */
type LookupRow = Procedure & { baseMetal1Type: string; baseMetal2Type: string; fillerMetalTypes: string[] };

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
  table = new TableState<LookupRow>(
    ['id', 'title', 'wtn', 'gwp', 'weldProcess', 'processType', 'baseMetal1Type', 'baseMetal2Type', 'fillerMetalTypes'],
    {
      status: inArray, weldProcess: inArray, processType: inArray, baseMetal1Type: inArray, baseMetal2Type: inArray,
      fillerMetalTypes: anyPicked, effectiveDate: shownDateContains
    }
  );
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

  constructor(private router: Router) {
    effect(() => {
      const sections = procedureSections();
      this.table.setRows(procedures().map(p => ({
        ...p,
        baseMetal1Type: textValue(p, 'baseMetal1Type', sections),
        baseMetal2Type: textValue(p, 'baseMetal2Type', sections),
        fillerMetalTypes: listValue(p, 'fillerMetalTypes', sections),
      })));
    });
  }

  openProcedure(row: Procedure) {
    this.router.navigate(['/weld-engineering/procedures', row.id]);
  }
}
