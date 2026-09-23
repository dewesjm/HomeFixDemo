/* Weld Engineering - Procedure Lookup. Every WPS document (one per GWP+WTN pair) shown at once
   (no pager) with sort/search, mirroring an admin list screen rather than a paginated search screen. */
import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideSearch, LucideFileText, LucideX } from '@lucide/angular';

import { SortHeaderComponent } from '../../shared/sort-header.component';
import { TableState, inArray } from '../../shared/table-state';
import { procedures, Procedure, PROCEDURE_STATUS_OPTIONS } from '../../data/procedures';

@Component({
  selector: 'app-procedure-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule, SortHeaderComponent, LucideSearch, LucideFileText, LucideX],
  templateUrl: './procedure-lookup.component.html'
})
export class ProcedureLookupComponent {
  table = new TableState<Procedure>(
    ['id', 'title', 'wtn', 'gwp', 'weldProcess', 'processType', 'baseMetal1Type', 'baseMetal2Type', 'fillerMetalTypes'],
    { status: inArray }
  );
  statusOptions = PROCEDURE_STATUS_OPTIONS;

  constructor(private router: Router) {
    effect(() => this.table.setRows(procedures()));
  }

  openProcedure(row: Procedure) {
    this.router.navigate(['/weld-engineering/procedures', row.id]);
  }
}
