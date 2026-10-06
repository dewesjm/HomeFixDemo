/* Admin → Defect Codes: Type + code + description; an NDT step's Defect Code lists the codes for its Type */
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { INSPECTION_TYPES } from '../../../data/inspection-procedures';
import { DefectCodeEntry, getDefectCodes, setDefectCodes } from '../../../data/defect-codes';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';

interface DefectRow {
  uid: string;
  type: string;
  code: string;
  description: string;
}

function toRow(e: DefectCodeEntry, i: number): DefectRow {
  return { uid: `dc-${i}`, type: e.type, code: e.code, description: e.description };
}

@Component({
  selector: 'app-admin-defect-codes',
  standalone: true,
  imports: [TableToolbarComponent, SortHeaderComponent,
    CommonModule, FormsModule,
    LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-defect-codes.component.html'
})
export class AdminDefectCodesComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private seq = 0;

  types = INSPECTION_TYPES;
  rows = signal<DefectRow[]>(getDefectCodes().map((e, i) => toRow(e, i)));
  editingId = signal<string | null>(null);
  private cloned: Record<string, DefectRow> = {};
  table = new TableState<DefectRow>(['type', 'code', 'description']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    const uid = `new-${++this.seq}`;
    const row: DefectRow = { uid, type: '', code: '', description: '' };
    this.table.clearFilters();
    this.rows.update(r => [row, ...r]);
    this.editingId.set(uid);
  }

  deleteRow(row: DefectRow) {
    this.confirm.confirmDelete(`${row.type} - ${row.code}`, () => {
      this.rows.update(r => r.filter(x => x.uid !== row.uid));
      this.persist();
      this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
    });
  }

  startEdit(row: DefectRow) {
    this.cloned[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: DefectRow) {
    this.persist();
    delete this.cloned[row.uid];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: `${row.type} - ${row.code}`, life: 3000 });
  }

  cancelEdit(row: DefectRow) {
    const original = this.cloned[row.uid];
    if (original) {
      this.rows.update(r => r.map(x => x.uid === row.uid ? original : x));
      delete this.cloned[row.uid];
    }
    this.editingId.set(null);
  }

  updateField(row: DefectRow, field: 'type' | 'code' | 'description', value: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, [field]: value } : x));
  }

  exportCsv() {
    downloadCsv('defect-codes', [
      { header: 'Type', value: (r: DefectRow) => r.type },
      { header: 'Defect Code', value: (r: DefectRow) => r.code },
      { header: 'Code Description', value: (r: DefectRow) => r.description },
    ], this.table.sorted());
  }

  private persist() {
    const entries: DefectCodeEntry[] = this.rows()
      .filter(r => r.type && r.code.trim())
      .map(r => ({ type: r.type, code: r.code.trim(), description: r.description.trim() }));
    setDefectCodes(entries);
  }
}
