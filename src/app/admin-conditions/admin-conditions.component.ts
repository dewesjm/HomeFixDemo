// Admin → Condition Codes: table-maintenance screen for
// the shared condition code → description lookup that feeds the Work validation dropdown.
// Inline row editing via a per-row `editingId` signal.
// in memory database only
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { TableState } from '../shared/table-state';
import { downloadCsv } from '../data/export-csv';
import { CONDITION_CODES } from '../data/conditions';

interface ConditionRow {
  id: string;
  code: string;
  description: string;
}

@Component({
  selector: 'app-admin-conditions',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-conditions.component.html'
})
export class AdminConditionsComponent {
  rows = signal<ConditionRow[]>(CONDITION_CODES.map(c => ({ id: c.code, code: c.code, description: c.description })));

  table = new TableState<ConditionRow>(['code', 'description']);
  visibleRows = computed(() => this.table.sorted());

  private messages = inject(ToastService);
  private clonedRows: Record<string, ConditionRow> = {};
  private seq = 0;

  editingId = signal<string | null>(null);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    const row: ConditionRow = { id: `new-${++this.seq}`, code: '', description: '' };
    this.rows.update(r => [row, ...r]);
    this.editingId.set(row.id);
  }

  deleteRow(row: ConditionRow) {
    this.rows.update(r => r.filter(x => x.id !== row.id));
    this.messages.add({ severity: 'info', summary: 'Condition code deleted', life: 3000 });
  }

  startEdit(row: ConditionRow) {
    this.clonedRows[row.id] = { ...row };
    this.editingId.set(row.id);
  }

  saveEdit(row: ConditionRow) {
    delete this.clonedRows[row.id];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Condition code saved', detail: row.code, life: 3000 });
  }

  cancelEdit(row: ConditionRow) {
    const original = this.clonedRows[row.id];
    if (original) {
      this.rows.update(r => r.map(x => (x.id === row.id ? original : x)));
      delete this.clonedRows[row.id];
    }
    this.editingId.set(null);
  }

  updateField(row: ConditionRow, field: 'code' | 'description', value: string) {
    this.rows.update(r => r.map(x => (x.id === row.id ? { ...x, [field]: value } : x)));
  }

  exportCsv() {
    downloadCsv('condition-codes', [
      { header: 'Code', value: (r: ConditionRow) => r.code },
      { header: 'Description', value: (r: ConditionRow) => r.description }
    ], this.visibleRows());
  }
}
