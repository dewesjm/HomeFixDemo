/* Admin → Inspection Procedures: Type + procedure pairs; an NDT step's Procedure Used for
   Inspection lists the procedures for its Type */
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { InspectionProcedureEntry, INSPECTION_TYPES, getInspectionProcedures, setInspectionProcedures } from '../../../data/inspection-procedures';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';

interface ProcRow {
  uid: string;
  type: string;
  procedure: string;
}

function toRow(e: InspectionProcedureEntry, i: number): ProcRow {
  return { uid: `ip-${i}`, type: e.type, procedure: e.procedure };
}

@Component({
  selector: 'app-admin-inspection-procedures',
  standalone: true,
  imports: [TableToolbarComponent, SortHeaderComponent,
    CommonModule, FormsModule,
    LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-inspection-procedures.component.html'
})
export class AdminInspectionProceduresComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private seq = 0;

  types = INSPECTION_TYPES;
  rows = signal<ProcRow[]>(getInspectionProcedures().map((e, i) => toRow(e, i)));
  editingId = signal<string | null>(null);
  private cloned: Record<string, ProcRow> = {};
  table = new TableState<ProcRow>(['type', 'procedure']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    const uid = `new-${++this.seq}`;
    const row: ProcRow = { uid, type: '', procedure: '' };
    this.table.clearFilters();
    this.rows.update(r => [row, ...r]);
    this.editingId.set(uid);
  }

  deleteRow(row: ProcRow) {
    this.confirm.confirmDelete(`${row.type} - ${row.procedure}`, () => {
      this.rows.update(r => r.filter(x => x.uid !== row.uid));
      this.persist();
      this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
    });
  }

  startEdit(row: ProcRow) {
    this.cloned[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: ProcRow) {
    this.persist();
    delete this.cloned[row.uid];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: `${row.type} - ${row.procedure}`, life: 3000 });
  }

  cancelEdit(row: ProcRow) {
    const original = this.cloned[row.uid];
    if (original) {
      this.rows.update(r => r.map(x => x.uid === row.uid ? original : x));
      delete this.cloned[row.uid];
    }
    this.editingId.set(null);
  }

  updateField(row: ProcRow, field: 'type' | 'procedure', value: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, [field]: value } : x));
  }

  exportCsv() {
    downloadCsv('inspection-procedures', [
      { header: 'Type', value: (r: ProcRow) => r.type },
      { header: 'Procedure', value: (r: ProcRow) => r.procedure },
    ], this.table.sorted());
  }

  private persist() {
    const entries: InspectionProcedureEntry[] = this.rows()
      .filter(r => r.type && r.procedure.trim())
      .map(r => ({ type: r.type, procedure: r.procedure.trim() }));
    setInspectionProcedures(entries);
  }
}
