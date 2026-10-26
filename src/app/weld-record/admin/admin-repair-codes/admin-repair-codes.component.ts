import { Component, effect, inject, signal } from '@angular/core';
import { LucidePencil, LucideCheck, LucideX } from '@lucide/angular';
import { FormsModule } from '@angular/forms';
import { getRepairCodes, RepairCode, setRepairCodes } from '../../../data/repair-codes';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { TablePagerComponent } from '../../../shared/table-pager.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { ToastService } from '../../../shared/toast.service';
import { downloadCsv } from '../../../shared/export-csv';
import { newRepairCodeId, repairCodeError } from './repair-code-validation';

@Component({
  selector: 'app-admin-repair-codes', standalone: true,
  imports: [LucidePencil, LucideCheck, LucideX, FormsModule, TableToolbarComponent, TablePagerComponent, SortHeaderComponent],
  templateUrl: './admin-repair-codes.component.html',
})
export class AdminRepairCodesComponent {
  private messages = inject(ToastService);
  rows = signal<RepairCode[]>(getRepairCodes());
  editing = signal<string | null>(null);
  draft: RepairCode = { code: '', name: '', active: true };
  error = '';
  private isNew = false;
  table = new TableState<RepairCode & { status: string }>(['name', 'status']);

  editorRows(): RepairCode[] {
    return this.isNew && this.editing() ? [this.draft, ...this.table.paged()] : this.table.paged();
  }

  constructor() {
    effect(() => this.table.setRows(this.rows().map(r => ({ ...r, status: r.active ? 'Active' : 'Inactive' }))));
  }
  add() {
    if (this.editing()) return;
    this.table.clearFilters();
    this.isNew = true;
    this.draft = { code: 'repair-code-' + crypto.randomUUID(), name: '', active: true };
    this.error = '';
    this.editing.set(this.draft.code);
  }
  edit(row: RepairCode) {
    if (this.editing()) return;
    this.isNew = false;
    this.draft = { code: row.code, name: row.name, active: row.active };
    this.error = '';
    this.editing.set(row.code);
  }
  cancel() { this.editing.set(null); this.error = ''; }
  save() {
    this.error = repairCodeError(this.draft, this.rows().filter(r => r.code !== this.draft.code));
    if (this.error) return;
    const saved: RepairCode = { code: this.isNew ? newRepairCodeId(this.draft.name, this.rows()) : this.draft.code, name: this.draft.name.trim(), active: this.draft.active };
    const next = this.isNew ? [saved, ...this.rows()] : this.rows().map(r => r.code === saved.code ? saved : r);
    try { setRepairCodes(next); }
    catch { this.error = 'Repair Codes could not be saved. Try again.'; return; }
    this.rows.set(next);
    this.cancel();
    this.messages.add({ severity: 'success', summary: 'Repair Code saved', detail: saved.name, life: 3000 });
  }
  exportCsv() {
    downloadCsv('repair-codes', [
      { header: 'Repair Code', value: (r: RepairCode) => r.name },
      { header: 'Status', value: (r: RepairCode) => r.active ? 'Active' : 'Inactive' },
    ], this.table.sorted());
  }
}
