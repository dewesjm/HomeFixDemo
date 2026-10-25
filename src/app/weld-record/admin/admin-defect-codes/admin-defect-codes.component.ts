/* Admin → Defect Codes: Type + code + description; an NDT step's Defect Code lists the codes for its Type */
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideCheck, LucideX } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { TablePagerComponent } from '../../../shared/table-pager.component';
import { INSPECTION_TYPES } from '../../../data/inspection-procedures';
import { DefectCodeEntry, getDefectCodes, setDefectCodes } from '../../../data/defect-codes';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../shared/export-csv';
import { validDefectCode } from './defect-code-validation';

interface DefectRow {
  uid: string;
  type: string;
  code: string;
  description: string;
  active: boolean;
  status: string;
}

function toRow(e: DefectCodeEntry, i: number): DefectRow {
  return { uid: `dc-${i}`, type: e.type, code: e.code, description: e.description, active: e.active !== false, status: e.active === false ? 'Inactive' : 'Active' };
}

@Component({
  selector: 'app-admin-defect-codes',
  standalone: true,
  imports: [TableToolbarComponent, SortHeaderComponent, TablePagerComponent,
    CommonModule, FormsModule,
    LucidePencil, LucideCheck, LucideX
  ],
  templateUrl: './admin-defect-codes.component.html'
})
export class AdminDefectCodesComponent {
  private messages = inject(ToastService);
  private seq = 0;

  types = INSPECTION_TYPES;
  rows = signal<DefectRow[]>(getDefectCodes().map((e, i) => toRow(e, i)));
  editingId = signal<string | null>(null);
  private cloned: Record<string, DefectRow> = {};
  table = new TableState<DefectRow>(['type', 'code', 'description', 'status']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    if (this.editingId()) return;
    const uid = `new-${++this.seq}`;
    const row: DefectRow = { uid, type: '', code: '', description: '', active: true, status: 'Active' };
    this.table.clearFilters();
    this.rows.update(r => [row, ...r]);
    this.editingId.set(uid);
  }

  updateActive(row: DefectRow, active: boolean) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, active, status: active ? 'Active' : 'Inactive' } : x));
  }

  startEdit(row: DefectRow) {
    this.cloned[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: DefectRow) {
    if (!validDefectCode(row, this.rows().filter(r => r.uid !== row.uid))) {
      this.messages.add({ severity: 'warn', summary: 'Enter a unique code and inspection Type', life: 3000 });
      return;
    }
    this.persist();
    if (row.uid.startsWith('new-')) this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, uid: `saved-${x.uid}` } : x));
    delete this.cloned[row.uid];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: `${row.type} - ${row.code}`, life: 3000 });
  }

  cancelEdit(row: DefectRow) {
    const original = this.cloned[row.uid];
    if (original) {
      this.rows.update(r => r.map(x => x.uid === row.uid ? original : x));
      delete this.cloned[row.uid];
    } else {
      this.rows.update(r => r.filter(x => x.uid !== row.uid));
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
      { header: 'Status', value: (r: DefectRow) => r.status },
    ], this.table.sorted());
  }

  private persist() {
    const entries: DefectCodeEntry[] = this.rows()
      .filter(r => r.type && r.code.trim())
      .map(r => ({ type: r.type, code: r.code.trim(), description: r.description.trim(), active: r.active }));
    setDefectCodes(entries);
  }
}
