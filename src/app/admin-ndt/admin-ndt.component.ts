/* Admin → NDT: manage penetrant types and manufacturers */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import {
  getPenetrantTypes, setPenetrantTypes,
  getPenetrantManufacturers, setPenetrantManufacturers
} from '../data/workflow';

interface ItemRow {
  uid: string;
  name: string;
}

@Component({
  selector: 'app-admin-ndt',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-ndt.component.html'
})
export class AdminNdtComponent {
  private messages = inject(ToastService);
  private seq = 0;

  activeTab = signal<'types' | 'manufacturers'>('types');

  typeRows = signal<ItemRow[]>(this.loadTypes());
  mfrRows = signal<ItemRow[]>(this.loadMfrs());

  editingId = signal<string | null>(null);
  private clonedRows: Record<string, ItemRow> = {};

  private loadTypes(): ItemRow[] {
    return getPenetrantTypes().map((t, i) => ({ uid: `t-${i}`, name: t }));
  }
  private loadMfrs(): ItemRow[] {
    return getPenetrantManufacturers().map((m, i) => ({ uid: `m-${i}`, name: m }));
  }

  currentRows = computed(() => this.activeTab() === 'types' ? this.typeRows() : this.mfrRows());

  addRow() {
    const tab = this.activeTab();
    const uid = `${tab}-${++this.seq}`;
    const row: ItemRow = { uid, name: '' };
    if (tab === 'types') {
      this.typeRows.update(r => [row, ...r]);
    } else {
      this.mfrRows.update(r => [row, ...r]);
    }
    this.editingId.set(uid);
  }

  deleteRow(row: ItemRow) {
    const tab = this.activeTab();
    if (tab === 'types') {
      this.typeRows.update(r => r.filter(x => x.uid !== row.uid));
      setPenetrantTypes(this.typeRows().map(x => x.name).filter(Boolean));
    } else {
      this.mfrRows.update(r => r.filter(x => x.uid !== row.uid));
      setPenetrantManufacturers(this.mfrRows().map(x => x.name).filter(Boolean));
    }
    this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
  }

  startEdit(row: ItemRow) {
    this.clonedRows[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: ItemRow) {
    const tab = this.activeTab();
    if (tab === 'types') {
      setPenetrantTypes(this.typeRows().map(x => x.name).filter(Boolean));
    } else {
      setPenetrantManufacturers(this.mfrRows().map(x => x.name).filter(Boolean));
    }
    delete this.clonedRows[row.uid];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: row.name, life: 3000 });
  }

  cancelEdit(row: ItemRow) {
    const original = this.clonedRows[row.uid];
    if (original) {
      if (this.activeTab() === 'types') {
        this.typeRows.update(r => r.map(x => x.uid === row.uid ? original : x));
      } else {
        this.mfrRows.update(r => r.map(x => x.uid === row.uid ? original : x));
      }
      delete this.clonedRows[row.uid];
    }
    this.editingId.set(null);
  }

  updateField(row: ItemRow, value: string) {
    const updater = (r: ItemRow) => r.uid === row.uid ? { ...r, name: value } : r;
    if (this.activeTab() === 'types') {
      this.typeRows.update(r => r.map(updater));
    } else {
      this.mfrRows.update(r => r.map(updater));
    }
  }
}
