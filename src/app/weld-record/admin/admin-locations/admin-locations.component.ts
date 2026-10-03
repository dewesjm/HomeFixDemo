/* Admin → Locations: manage shop/location list used in Fabrication section */
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { getShops, setShops } from '../../../data/shops';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';

interface LocRow {
  uid: string;
  name: string;
}

@Component({
  selector: 'app-admin-locations',
  standalone: true,
  imports: [TableToolbarComponent, SortHeaderComponent, 
    CommonModule, FormsModule,
    LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-locations.component.html'
})
export class AdminLocationsComponent {
  private messages = inject(ToastService);
  private seq = 0;

  rows = signal<LocRow[]>(getShops().map((name, i) => ({ uid: `l-${i}`, name })));
  editingId = signal<string | null>(null);
  private cloned: Record<string, LocRow> = {};
  table = new TableState<LocRow>(['name']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    const uid = `new-${++this.seq}`;
    const row: LocRow = { uid, name: '' };
    this.table.clearFilters();
    this.rows.update(r => [row, ...r]);
    this.editingId.set(uid);
  }

  deleteRow(row: LocRow) {
    this.rows.update(r => r.filter(x => x.uid !== row.uid));
    this.persist();
    this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
  }

  startEdit(row: LocRow) {
    this.cloned[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: LocRow) {
    this.persist();
    delete this.cloned[row.uid];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: row.name, life: 3000 });
  }

  cancelEdit(row: LocRow) {
    const original = this.cloned[row.uid];
    if (original) {
      this.rows.update(r => r.map(x => x.uid === row.uid ? original : x));
      delete this.cloned[row.uid];
    }
    this.editingId.set(null);
  }

  updateField(row: LocRow, value: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, name: value } : x));
  }

  exportCsv() {
    downloadCsv('locations', [
      { header: 'Name', value: (r: LocRow) => r.name },
    ], this.table.sorted());
  }

  private persist() {
    const names = this.rows()
      .filter(r => r.name.trim())
      .map(r => r.name.trim());
    setShops(names);
  }
}
