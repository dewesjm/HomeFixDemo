// Admin → Materials: table-maintenance screen  for the
// shared material list that feeds the "Material used" dropdown on the Build/install stage.
// Inline row editing via a per-row `editingId` signal. Seeded from MATERIALS
// no backend
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { TableState } from '../shared/table-state';
import { downloadCsv } from '../data/export-csv';
import { MATERIALS } from '../data/materials';

interface MaterialRow {
  id: string;
  name: string;
}

@Component({
  selector: 'app-admin-materials',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-materials.component.html'
})
export class AdminMaterialsComponent {
  rows = signal<MaterialRow[]>(MATERIALS.map(m => ({ id: m, name: m })));

  table = new TableState<MaterialRow>(['name']);
  visibleRows = computed(() => this.table.sorted());

  private messages = inject(ToastService);
  private clonedRows: Record<string, MaterialRow> = {};
  private seq = 0;

  editingId = signal<string | null>(null);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    const row: MaterialRow = { id: `new-${++this.seq}`, name: '' };
    this.rows.update(r => [row, ...r]);
    this.editingId.set(row.id);
  }

  deleteRow(row: MaterialRow) {
    this.rows.update(r => r.filter(x => x.id !== row.id));
    this.messages.add({ severity: 'info', summary: 'Material deleted', life: 3000 });
  }

  startEdit(row: MaterialRow) {
    this.clonedRows[row.id] = { ...row };
    this.editingId.set(row.id);
  }

  saveEdit(row: MaterialRow) {
    delete this.clonedRows[row.id];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Material saved', detail: row.name, life: 3000 });
  }

  cancelEdit(row: MaterialRow) {
    const original = this.clonedRows[row.id];
    if (original) {
      this.rows.update(r => r.map(x => (x.id === row.id ? original : x)));
      delete this.clonedRows[row.id];
    }
    this.editingId.set(null);
  }

  updateField(row: MaterialRow, value: string) {
    this.rows.update(r => r.map(x => (x.id === row.id ? { ...x, name: value } : x)));
  }

  exportCsv() {
    downloadCsv('materials', [
      { header: 'Material', value: (r: MaterialRow) => r.name }
    ], this.visibleRows());
  }
}
