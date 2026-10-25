/* Admin → Weld Positions: manage weld position codes used in every weld stage */
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideCheck, LucideX } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { TablePagerComponent } from '../../../shared/table-pager.component';
import { getWeldPositions, setWeldPositions } from '../../../data/weld-positions';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../shared/export-csv';
import { validWeldPosition } from './weld-position-validation';

interface WeldPositionRow {
  uid: string;
  code: string;
  description: string;
  active: boolean;
  status: string;
}

@Component({
  selector: 'app-admin-weld-positions',
  standalone: true,
  imports: [TableToolbarComponent, SortHeaderComponent, TablePagerComponent,
    CommonModule, FormsModule,
    LucidePencil, LucideCheck, LucideX
  ],
  templateUrl: './admin-weld-positions.component.html'
})
export class AdminWeldPositionsComponent {
  private messages = inject(ToastService);
  private seq = 0;

  rows = signal<WeldPositionRow[]>(getWeldPositions().map((pos, i) => ({
    uid: `wp-${i}`,
    code: pos.code,
    description: pos.description, active: pos.active !== false, status: pos.active === false ? 'Inactive' : 'Active'
  })));
  editingId = signal<string | null>(null);
  private cloned: Record<string, WeldPositionRow> = {};
  table = new TableState<WeldPositionRow>(['code', 'description', 'status']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    if (this.editingId()) return;
    const uid = `new-${++this.seq}`;
    const row: WeldPositionRow = { uid, code: '', description: '', active: true, status: 'Active' };
    this.table.clearFilters();
    this.rows.update(r => [row, ...r]);
    this.editingId.set(uid);
  }

  updateActive(row: WeldPositionRow, active: boolean) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, active, status: active ? 'Active' : 'Inactive' } : x));
  }

  startEdit(row: WeldPositionRow) {
    this.cloned[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: WeldPositionRow) {
    if (!validWeldPosition(row, this.rows().filter(r => r.uid !== row.uid))) {
      this.messages.add({ severity: 'warn', summary: 'Enter a unique code and description', life: 3000 });
      return;
    }
    this.persist();
    if (row.uid.startsWith('new-')) this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, uid: `saved-${x.uid}` } : x));
    delete this.cloned[row.uid];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: `${row.code} - ${row.description}`, life: 3000 });
  }

  cancelEdit(row: WeldPositionRow) {
    const original = this.cloned[row.uid];
    if (original) {
      this.rows.update(r => r.map(x => x.uid === row.uid ? original : x));
      delete this.cloned[row.uid];
    } else {
      this.rows.update(r => r.filter(x => x.uid !== row.uid));
    }
    this.editingId.set(null);
  }

  updateCode(row: WeldPositionRow, value: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, code: value.toUpperCase() } : x));
  }

  updateDescription(row: WeldPositionRow, value: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, description: value } : x));
  }

  exportCsv() {
    downloadCsv('weld-positions', [
      { header: 'Code', value: (r: WeldPositionRow) => r.code },
      { header: 'Description', value: (r: WeldPositionRow) => r.description },
      { header: 'Status', value: (r: WeldPositionRow) => r.status },
    ], this.table.sorted());
  }

  private persist() {
    const positions = this.rows()
      .filter(r => r.code.trim() && r.description.trim())
      .map(r => ({ code: r.code.trim().toUpperCase(), description: r.description.trim(), active: r.active }));
    setWeldPositions(positions);
  }
}
