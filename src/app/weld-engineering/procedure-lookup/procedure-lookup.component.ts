/* Weld Engineering - Procedure Lookup. ~100 procedures, shown all at once (no pager) with sort/search,
   mirroring an admin list screen rather than a paginated search screen. */
import { Component, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideSearch, LucideFileText, LucideX } from '@lucide/angular';

import { SortHeaderComponent } from '../../shared/sort-header.component';
import { TableState, inArray } from '../../shared/table-state';
import { procedures, Procedure, PROCEDURE_STATUS_OPTIONS } from '../../data/procedures';

type Row = Procedure & { wtnsText: string };

@Component({
  selector: 'app-procedure-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule, SortHeaderComponent, LucideSearch, LucideFileText, LucideX],
  templateUrl: './procedure-lookup.component.html'
})
export class ProcedureLookupComponent {
  table = new TableState<Row>(['id', 'title', 'wtnsText'], { status: inArray });
  statusOptions = PROCEDURE_STATUS_OPTIONS;

  private rows = computed<Row[]>(() => procedures().map(p => ({ ...p, wtnsText: p.wtns.join(', ') })));

  constructor(private router: Router) {
    effect(() => this.table.setRows(this.rows()));
  }

  openProcedure(row: Row) {
    this.router.navigate(['/weld-engineering/procedures', row.id]);
  }
}
