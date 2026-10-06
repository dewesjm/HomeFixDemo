/* Admin > Material Traceability: one row per MCL value; each row is edited and saved on its own.
   A saved row's value can't be renamed, since joints refer to it by value. */
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';
import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';
import { mclTraceability, setMclTraceability, MclTraceabilityEntry } from '../../../data/mcl-traceability';

interface MclRow extends MclTraceabilityEntry { uid: string; isNew: boolean; }

@Component({
  selector: 'app-admin-material-traceability',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent, LucidePencil, LucideCheck, LucideX, LucideTrash2],
  templateUrl: './admin-material-traceability.component.html'
})
export class AdminMaterialTraceabilityComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private seq = 0;

  rows = signal<MclRow[]>(mclTraceability().map((e, i) => ({ ...e, uid: `mcl-${i}`, isNew: false })));
  editingId = signal<string | null>(null);
  private cloned: Record<string, MclRow> = {};
  table = new TableState<MclRow>(['mclValue']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  exportCsv() {
    downloadCsv('material-traceability', [
      { header: 'MCL Value', value: (r: MclRow) => r.mclValue },
      { header: 'Requires Traceability', value: (r: MclRow) => (r.requiresTraceability ? 'Yes' : 'No') },
    ], this.table.sorted());
  }

  addRow() {
    this.closeOpenEdit();
    const uid = `new-${++this.seq}`;
    this.table.clearFilters();
    this.rows.update(r => [{ uid, isNew: true, mclValue: '', requiresTraceability: true }, ...r]);
    this.editingId.set(uid);
  }

  startEdit(row: MclRow) {
    this.closeOpenEdit();
    this.cloned[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: MclRow) {
    const mclValue = row.mclValue.trim();
    if (!mclValue) {
      this.messages.add({ severity: 'warn', summary: 'Enter an MCL value', life: 3000 });
      return;
    }
    if (this.rows().some(x => x.uid !== row.uid && x.mclValue === mclValue)) {
      this.messages.add({ severity: 'warn', summary: 'MCL value already exists', life: 3000 });
      return;
    }
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, mclValue, isNew: false } : x));
    delete this.cloned[row.uid];
    this.persist();
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: mclValue, life: 3000 });
  }

  /* a new row that was never saved goes away */
  cancelEdit(row: { uid: string }) {
    const original = this.cloned[row.uid];
    this.rows.update(r => original ? r.map(x => x.uid === row.uid ? original : x) : r.filter(x => x.uid !== row.uid));
    delete this.cloned[row.uid];
    this.editingId.set(null);
  }

  /* one row is open at a time: opening or adding another cancels the open one */
  private closeOpenEdit() {
    const id = this.editingId();
    if (id) this.cancelEdit({ uid: id });
  }

  deleteRow(row: MclRow) {
    this.confirm.confirmDelete(row.mclValue, () => {
      this.rows.update(r => r.filter(x => x.uid !== row.uid));
      this.persist();
      this.messages.add({ severity: 'info', summary: 'Deleted', detail: row.mclValue, life: 3000 });
    });
  }

  updateValue(row: MclRow, mclValue: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, mclValue } : x));
  }

  updateTraceability(row: MclRow, on: boolean) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, requiresTraceability: on } : x));
  }

  /* stores every saved row; a row still being edited is stored as it was before the edit, a new one not at all */
  private persist() {
    setMclTraceability(this.rows().map(r => this.cloned[r.uid] ?? r).filter(r => !r.isNew)
      .map(({ mclValue, requiresTraceability }) => ({ mclValue, requiresTraceability })));
  }
}
