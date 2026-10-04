/* Weld Engineering Admin - Manage Procedures: list with Edit/Delete, create/edit form is procedure-form.component.ts. */
import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucidePencil, LucideTrash2, LucideUpload } from '@lucide/angular';

import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { TableState, inArray } from '../../../shared/table-state';
import { ConfirmService } from '../../../shared/confirm.service';
import { ToastService } from '../../../shared/toast.service';
import { downloadCsv } from '../../../data/export-csv';
import {
  procedures, deleteProcedure, PROCEDURE_STATUS_OPTIONS, procedureCsvColumns, type Procedure
} from '../../../data/procedures';
import { procedureSections } from '../../../data/procedure-sections';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';

@Component({
  selector: 'app-manage-procedures',
  standalone: true,
  imports: [TableToolbarComponent, 
    CommonModule, FormsModule, RouterLink,
    SortHeaderComponent, LucidePencil, LucideTrash2, LucideUpload
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
    downloadCsv('procedures-export', procedureCsvColumns(procedureSections()), this.table.sorted());
  }
}
