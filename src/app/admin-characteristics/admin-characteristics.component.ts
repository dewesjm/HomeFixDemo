// Admin → Characteristic Codes: table-maintenance screen for the
// shared code → description lookup. Inline row editing via a per-row `editingId` signal.
// in database memory only
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { TableState } from '../shared/table-state';
import { downloadCsv } from '../data/export-csv';
import { CHARACTERISTIC_CODES } from '../data/characteristics';

interface CodeRow {
  id: string;
  code: string;
  description: string;
}

@Component({
  selector: 'app-admin-characteristics',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-characteristics.component.html'
})
export class AdminCharacteristicsComponent {
  rows = signal<CodeRow[]>(CHARACTERISTIC_CODES.map(c => ({ id: c.code, code: c.code, description: c.description })));

  table = new TableState<CodeRow>(['code', 'description']);
  visibleRows = computed(() => this.table.sorted());

  private messages = inject(ToastService);
  private clonedRows: Record<string, CodeRow> = {};
  private seq = 0;

  editingId = signal<string | null>(null);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    const row: CodeRow = { id: `new-${++this.seq}`, code: '', description: '' };
    this.rows.update(r => [row, ...r]);
    this.editingId.set(row.id);
  }

  deleteRow(row: CodeRow) {
    this.rows.update(r => r.filter(x => x.id !== row.id));
    this.messages.add({ severity: 'info', summary: 'Code deleted', life: 3000 });
  }

  startEdit(row: CodeRow) {
    this.clonedRows[row.id] = { ...row };
    this.editingId.set(row.id);
  }

  saveEdit(row: CodeRow) {
    delete this.clonedRows[row.id];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Code saved', detail: row.code, life: 3000 });
  }

  cancelEdit(row: CodeRow) {
    const original = this.clonedRows[row.id];
    if (original) {
      this.rows.update(r => r.map(x => (x.id === row.id ? original : x)));
      delete this.clonedRows[row.id];
    }
    this.editingId.set(null);
  }

  updateField(row: CodeRow, field: 'code' | 'description', value: string) {
    this.rows.update(r => r.map(x => (x.id === row.id ? { ...x, [field]: value } : x)));
  }

  exportCsv() {
    downloadCsv('characteristic-codes', [
      { header: 'Code', value: (r: CodeRow) => r.code },
      { header: 'Description', value: (r: CodeRow) => r.description }
    ], this.visibleRows());
  }
}
