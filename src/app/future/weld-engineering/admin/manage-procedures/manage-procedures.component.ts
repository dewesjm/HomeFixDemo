/* Weld Engineering Admin - Manage Procedures: list with Edit/Delete, create/edit form is procedure-form.component.ts.
   The rows come from the procedure service's searchProcedures call (every status unless one is picked),
   and Export sends the same query to exportProcedures, so the file holds what the table shows. */
import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucidePencil, LucideTrash2, LucideUpload } from '@lucide/angular';

import { SortHeaderComponent } from '../../../../shared/sort-header.component';
import { downloadFile } from '../../../../shared/download-file';
import { ConfirmService } from '../../../../shared/confirm.service';
import { ToastService } from '../../../../shared/toast.service';
import { procedureName, PROCEDURE_STATUS_OPTIONS } from '../../../../data/procedures';
import { TableState } from '../../../../shared/table-state';
import { exportProcedures } from '../../procedure-service/procedure-file-service';
import { deleteProcedure, searchProcedures } from '../../procedure-service/procedure-service';
import type { ProcedureSearchRow } from '../../procedure-service/procedure-search';
import type { ProcedureKey } from '../../procedure-service/procedure-record';
import { procedureTableQuery } from '../../procedure-table-query';
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
  table = new TableState<ProcedureSearchRow>([], {}, true);
  statusOptions = PROCEDURE_STATUS_OPTIONS;

  constructor(private router: Router, private confirm: ConfirmService, private toast: ToastService) {
    /* runs again when the query or the procedures change */
    effect(() => {
      const result = searchProcedures(procedureTableQuery(this.table));
      this.table.setRows(result.ok ? result.data.procedures : []);
    });
  }

  addNew() {
    this.router.navigate(['/weld-engineering/admin/new']);
  }

  edit(row: ProcedureKey) {
    this.router.navigate(['/weld-engineering/admin', row.gwp, row.wtn, 'edit']);
  }

  deleteRow(row: ProcedureKey) {
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
    const result = exportProcedures(procedureTableQuery(this.table));
    if (result.ok) downloadFile(result.data);
    else this.toast.add({ severity: 'warn', summary: result.title, detail: result.error });
  }
}
