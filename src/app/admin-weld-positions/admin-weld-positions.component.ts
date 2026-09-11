/* Admin → Weld Positions: manage weld position codes used in Tack stage */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { getWeldPositions, setWeldPositions } from '../data/workflow';

interface WeldPositionRow {
  uid: string;
  code: string;
  description: string;
}

@Component({
  selector: 'app-admin-weld-positions',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-weld-positions.component.html'
})
export class AdminWeldPositionsComponent {
  private messages = inject(ToastService);
  private seq = 0;

  rows = signal<WeldPositionRow[]>(getWeldPositions().map((pos, i) => ({
    uid: `wp-${i}`,
    code: pos.code,
    description: pos.description
  })));
  editingId = signal<string | null>(null);
  private cloned: Record<string, WeldPositionRow> = {};

  addRow() {
    const uid = `new-${++this.seq}`;
    const row: WeldPositionRow = { uid, code: '', description: '' };
    this.rows.update(r => [row, ...r]);
    this.editingId.set(uid);
  }

  deleteRow(row: WeldPositionRow) {
    this.rows.update(r => r.filter(x => x.uid !== row.uid));
    this.persist();
    this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
  }

  startEdit(row: WeldPositionRow) {
    this.cloned[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: WeldPositionRow) {
    this.persist();
    delete this.cloned[row.uid];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: `${row.code} - ${row.description}`, life: 3000 });
  }

  cancelEdit(row: WeldPositionRow) {
    const original = this.cloned[row.uid];
    if (original) {
      this.rows.update(r => r.map(x => x.uid === row.uid ? original : x));
      delete this.cloned[row.uid];
    }
    this.editingId.set(null);
  }

  updateCode(row: WeldPositionRow, value: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, code: value.toUpperCase() } : x));
  }

  updateDescription(row: WeldPositionRow, value: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, description: value } : x));
  }

  private persist() {
    const positions = this.rows()
      .filter(r => r.code.trim() && r.description.trim())
      .map(r => ({ code: r.code.trim().toUpperCase(), description: r.description.trim() }));
    setWeldPositions(positions);
  }
}
