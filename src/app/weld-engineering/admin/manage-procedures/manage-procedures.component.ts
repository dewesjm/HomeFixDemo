/* Weld Engineering Admin - Manage Procedures: list with Edit/Delete, create/edit form is procedure-form.component.ts. */
import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideTrash2, LucideUpload, LucideX } from '@lucide/angular';

import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { TableState, inArray } from '../../../shared/table-state';
import { ConfirmService } from '../../../shared/confirm.service';
import { ToastService } from '../../../shared/toast.service';
import { downloadCsv } from '../../../data/export-csv';
import {
  procedures, deleteProcedure, PROCEDURE_STATUS_OPTIONS, PROCEDURE_CSV_COLUMNS, type Procedure
} from '../../../data/procedures';

@Component({
  selector: 'app-manage-procedures',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    SortHeaderComponent, LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideTrash2, LucideUpload, LucideX
  ],
  templateUrl: './manage-procedures.component.html'
})
export class ManageProceduresComponent {
  table = new TableState<Procedure>(['id', 'title', 'wtn', 'gwp'], { status: inArray });
  statusOptions = PROCEDURE_STATUS_OPTIONS;

  constructor(private router: Router, private confirm: ConfirmService, private toast: ToastService) {
    effect(() => this.table.setRows(procedures()));
  }

  addNew() {
    this.router.navigate(['/weld-engineering/admin/new']);
  }

  edit(row: Procedure) {
    this.router.navigate(['/weld-engineering/admin', row.id, 'edit']);
  }

  deleteRow(row: Procedure) {
    this.confirm.confirm({
      header: 'Delete Procedure',
      message: `Delete ${row.id}?`,
      acceptLabel: 'Delete',
      accept: () => {
        deleteProcedure(row.id);
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: `${row.id} deleted` });
      }
    });
  }

  exportCsv() {
    downloadCsv('procedures-export', PROCEDURE_CSV_COLUMNS, this.table.sorted());
  }
}
