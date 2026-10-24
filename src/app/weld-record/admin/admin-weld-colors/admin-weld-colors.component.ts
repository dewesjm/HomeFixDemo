/* Admin → Weld Colors: manage weld colors offered on inspection forms */
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { weldColorError } from './weld-color-validation';
import { getWeldColors, setWeldColors } from '../../../data/weld-colors';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../shared/export-csv';

interface WeldColorRow {
  uid: string;
  code: string;
  name: string;
}

@Component({
  selector: 'app-admin-weld-colors',
  standalone: true,
  imports: [TableToolbarComponent, SortHeaderComponent, 
    CommonModule, FormsModule,
    LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-weld-colors.component.html'
})
export class AdminWeldColorsComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private seq = 0;

  rows = signal<WeldColorRow[]>(getWeldColors().map((color, i) => ({
    uid: `wc-${i}`,
    code: color.code,
    name: color.name
  })));
  editingId = signal<string | null>(null);
  private cloned: Record<string, WeldColorRow> = {};
  table = new TableState<WeldColorRow>(['code', 'name']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    if (this.editingId()) return;
    const uid = `new-${++this.seq}`;
    const row: WeldColorRow = { uid, code: '', name: '' };
    this.table.clearFilters();
    this.rows.update(r => [row, ...r]);
    this.editingId.set(uid);
  }

  deleteRow(row: WeldColorRow) {
    this.confirm.confirmDelete(row.code, () => {
      this.rows.update(r => r.filter(x => x.uid !== row.uid));
      this.persist();
      this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
    });
  }

  startEdit(row: WeldColorRow) {
    if (this.editingId()) return;
    this.cloned[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: WeldColorRow) {
    row = this.rows().find(r => r.uid === row.uid)!;
    const error = weldColorError(row, this.rows().filter(r => r.uid !== row.uid));
    if (error) {
      this.messages.add({ severity: 'error', summary: 'Cannot save', detail: error, life: 4000 });
      return;
    }
    this.rows.update(rows => rows.map(r => r.uid === row.uid ? { ...r, code: r.code.trim(), name: r.name.trim() } : r));
    this.persist();
    delete this.cloned[row.uid];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: `${row.code} - ${row.name}`, life: 3000 });
  }

  cancelEdit(row: WeldColorRow) {
    const original = this.cloned[row.uid];
    if (original) {
      this.rows.update(r => r.map(x => x.uid === row.uid ? original : x));
      delete this.cloned[row.uid];
    }
    if (!original) this.rows.update(rows => rows.filter(r => r.uid !== row.uid));
    this.editingId.set(null);
  }

  updateCode(row: WeldColorRow, value: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, code: value.toLowerCase() } : x));
  }

  updateName(row: WeldColorRow, value: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, name: value } : x));
  }

  exportCsv() {
    downloadCsv('weld-colors', [
      { header: 'Code', value: (r: WeldColorRow) => r.code },
      { header: 'Name', value: (r: WeldColorRow) => r.name },
    ], this.table.sorted());
  }

  isNew(row: WeldColorRow): boolean { return row.uid.startsWith('new-') && !this.cloned[row.uid]; }

  private persist() {
    const colors = this.rows()
      .filter(r => r.code.trim() && r.name.trim())
      .map(r => ({ code: r.code.trim(), name: r.name.trim() }));
    setWeldColors(colors);
  }
}


