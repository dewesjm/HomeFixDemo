/* Admin → Penetrant: manage penetrant type + manufacturer pairs */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { PenetrantEntry, getPenetrants, setPenetrants } from '../data/workflow';

interface PenRow {
  uid: string;
  type: string;
  manufacturer: string;
}

function toRow(e: PenetrantEntry, i: number): PenRow {
  return { uid: `p-${i}`, type: e.type, manufacturer: e.manufacturer };
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

  rows = signal<PenRow[]>(getPenetrants().map((e, i) => toRow(e, i)));
  editingId = signal<string | null>(null);
  private cloned: Record<string, PenRow> = {};

  addRow() {
    const uid = `new-${++this.seq}`;
    const row: PenRow = { uid, type: '', manufacturer: '' };
    this.rows.update(r => [row, ...r]);
    this.editingId.set(uid);
  }

  deleteRow(row: PenRow) {
    this.rows.update(r => r.filter(x => x.uid !== row.uid));
    this.persist();
    this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
  }

  startEdit(row: PenRow) {
    this.cloned[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: PenRow) {
    this.persist();
    delete this.cloned[row.uid];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: `${row.type} — ${row.manufacturer}`, life: 3000 });
  }

  cancelEdit(row: PenRow) {
    const original = this.cloned[row.uid];
    if (original) {
      this.rows.update(r => r.map(x => x.uid === row.uid ? original : x));
      delete this.cloned[row.uid];
    }
    this.editingId.set(null);
  }

  updateField(row: PenRow, field: 'type' | 'manufacturer', value: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, [field]: value } : x));
  }

  private persist() {
    const entries: PenetrantEntry[] = this.rows()
      .filter(r => r.type.trim() && r.manufacturer.trim())
      .map(r => ({ type: r.type.trim(), manufacturer: r.manufacturer.trim() }));
    setPenetrants(entries);
  }
}
