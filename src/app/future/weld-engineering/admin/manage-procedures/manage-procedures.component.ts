/* Weld Engineering Admin - Manage Procedures: list with Edit/Delete, create/edit form is procedure-form.component.ts. */
import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucidePencil, LucideTrash2, LucideUpload } from '@lucide/angular';

import { SortHeaderComponent } from '../../../../shared/sort-header.component';
import { downloadFile } from '../../../../shared/download-file';
import { ConfirmService } from '../../../../shared/confirm.service';
import { ToastService } from '../../../../shared/toast.service';
import {
  procedures, procedureName, PROCEDURE_STATUS_OPTIONS, type Procedure
} from '../../../../data/procedures';
import { createManageProceduresTable } from '../../procedure-service/manage-procedures-table';
import { exportProcedures } from '../../procedure-service/procedure-file-service';
import { deleteProcedure } from '../../procedure-service/procedure-service';
import { TableToolbarComponent } from '../../../../shared/table-toolbar.component';

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
  table = createManageProceduresTable();
  statusOptions = PROCEDURE_STATUS_OPTIONS;

  constructor(private router: Router, private confirm: ConfirmService, private toast: ToastService) {
    effect(() => this.table.setRows(procedures()));
  }

  addNew() {
    this.router.navigate(['/weld-engineering/admin/new']);
  }

  edit(row: Procedure) {
    this.router.navigate(['/weld-engineering/admin', row.gwp, row.wtn, 'edit']);
  }

  deleteRow(row: Procedure) {
    this.confirm.confirm({
      header: 'Delete Procedure',
      message: `Delete ${procedureName(row)}?`,
      acceptLabel: 'Delete',
      accept: () => {
        const result = deleteProcedure(row);
        this.toast.add(result.ok
          ? { severity: 'success', summary: 'Deleted', detail: `${procedureName(row)} deleted` }
          : { severity: 'warn', summary: result.title, detail: result.error });
      }
    });
  }

  exportCsv() {
    const result = exportProcedures({
      text: this.table.globalFilter(),
      columns: this.table.columnFilters(),
      sort: this.table.sortField(),
      order: this.table.sortOrder(),
    });
    if (result.ok) downloadFile(result.data);
    else this.toast.add({ severity: 'warn', summary: result.title, detail: result.error });
  }
}
