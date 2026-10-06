/* Admin > Material Classification: one row per material code; each row is edited and saved on its own.
   A saved row's code can't be renamed, since joints refer to it by code. */
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
import {
  materialClassification, setMaterialClassification, MaterialClassificationEntry, MaterialFlag
} from '../../../data/material-classification';

interface ClassRow extends MaterialClassificationEntry { uid: string; isNew: boolean; }

@Component({
  selector: 'app-admin-material-classification',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent, LucidePencil, LucideCheck, LucideX, LucideTrash2],
  templateUrl: './admin-material-classification.component.html'
})
export class AdminMaterialClassificationComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private seq = 0;

  rows = signal<ClassRow[]>(materialClassification().map((e, i) => ({ ...e, uid: `mc-${i}`, isNew: false })));
  editingId = signal<string | null>(null);
  private cloned: Record<string, ClassRow> = {};
  table = new TableState<ClassRow>(['code']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  exportCsv() {
    downloadCsv('material-classification', [
      { header: 'Material Code', value: (r: ClassRow) => r.code },
      { header: 'Non-Ferrous or Austenitic', value: (r: ClassRow) => (r.nonFerrousOrAustenitic ? 'Yes' : 'No') },
      { header: 'Titanium', value: (r: ClassRow) => (r.titanium ? 'Yes' : 'No') },
    ], this.table.sorted());
  }

  addRow() {
    this.closeOpenEdit();
    const uid = `new-${++this.seq}`;
    this.table.clearFilters();
    this.rows.update(r => [{ uid, isNew: true, code: '', nonFerrousOrAustenitic: false, titanium: false }, ...r]);
    this.editingId.set(uid);
  }

  startEdit(row: ClassRow) {
    this.closeOpenEdit();
    this.cloned[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: ClassRow) {
    const code = row.code.trim();
    if (!code) {
      this.messages.add({ severity: 'warn', summary: 'Enter a material code', life: 3000 });
      return;
    }
    if (this.rows().some(x => x.uid !== row.uid && x.code === code)) {
      this.messages.add({ severity: 'warn', summary: 'Material code already exists', life: 3000 });
      return;
    }
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, code, isNew: false } : x));
    delete this.cloned[row.uid];
    this.persist();
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: code, life: 3000 });
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

  deleteRow(row: ClassRow) {
    this.confirm.confirmDelete(row.code, () => {
      this.rows.update(r => r.filter(x => x.uid !== row.uid));
      this.persist();
      this.messages.add({ severity: 'info', summary: 'Deleted', detail: row.code, life: 3000 });
    });
  }

  updateCode(row: ClassRow, code: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, code } : x));
  }

  updateFlag(row: ClassRow, flag: MaterialFlag, on: boolean) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, [flag]: on } : x));
  }

  /* stores every saved row; a row still being edited is stored as it was before the edit, a new one not at all */
  private persist() {
    setMaterialClassification(this.rows().map(r => this.cloned[r.uid] ?? r).filter(r => !r.isNew)
      .map(({ code, nonFerrousOrAustenitic, titanium }) => ({ code, nonFerrousOrAustenitic, titanium })));
  }
}
