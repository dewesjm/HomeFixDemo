/* Admin → Quick Links: manage the shortcut links shown in the top nav */
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { getQuickLinks, setQuickLinks, QuickLink } from '../../../data/quick-links';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';

@Component({
  selector: 'app-admin-quick-links',
  standalone: true,
  imports: [TableToolbarComponent, SortHeaderComponent, 
    CommonModule, FormsModule,
    LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-quick-links.component.html'
})
export class AdminQuickLinksComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private seq = 0;

  rows = signal<QuickLink[]>(getQuickLinks());
  editingId = signal<string | null>(null);
  private cloned: Record<string, QuickLink> = {};
  table = new TableState<QuickLink>(['label', 'url']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    const id = `new-${++this.seq}`;
    const row: QuickLink = { id, label: '', url: '' };
    this.table.clearFilters();
    this.rows.update(r => [row, ...r]);
    this.editingId.set(id);
  }

  deleteRow(row: QuickLink) {
    this.confirm.confirmDelete(row.label, () => {
      this.rows.update(r => r.filter(x => x.id !== row.id));
      this.persist();
      this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
    });
  }

  startEdit(row: QuickLink) {
    this.cloned[row.id] = { ...row };
    this.editingId.set(row.id);
  }

  saveEdit(row: QuickLink) {
    this.persist();
    delete this.cloned[row.id];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: row.label, life: 3000 });
  }

  cancelEdit(row: QuickLink) {
    const original = this.cloned[row.id];
    if (original) {
      this.rows.update(r => r.map(x => x.id === row.id ? original : x));
      delete this.cloned[row.id];
    } else {
      /* was a brand-new, never-saved row */
      this.rows.update(r => r.filter(x => x.id !== row.id));
    }
    this.editingId.set(null);
  }

  updateField(row: QuickLink, field: 'label' | 'url', value: string) {
    this.rows.update(r => r.map(x => x.id === row.id ? { ...x, [field]: value } : x));
  }

  exportCsv() {
    downloadCsv('quick-links', [
      { header: 'Label', value: (r: QuickLink) => r.label },
      { header: 'URL', value: (r: QuickLink) => r.url },
    ], this.table.sorted());
  }

  private persist() {
    const links = this.rows()
      .filter(r => r.label.trim() && r.url.trim())
      .map(r => ({ ...r, label: r.label.trim(), url: r.url.trim() }));
    setQuickLinks(links);
  }
}
