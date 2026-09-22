/* Admin → Quick Links: manage the shortcut links shown in the top nav */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { getQuickLinks, setQuickLinks, QuickLink } from '../../../data/quick-links';

@Component({
  selector: 'app-admin-quick-links',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-quick-links.component.html'
})
export class AdminQuickLinksComponent {
  private messages = inject(ToastService);
  private seq = 0;

  rows = signal<QuickLink[]>(getQuickLinks());
  editingId = signal<string | null>(null);
  private cloned: Record<string, QuickLink> = {};

  addRow() {
    const id = `new-${++this.seq}`;
    const row: QuickLink = { id, label: '', url: '' };
    this.rows.update(r => [row, ...r]);
    this.editingId.set(id);
  }

  deleteRow(row: QuickLink) {
    this.rows.update(r => r.filter(x => x.id !== row.id));
    this.persist();
    this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
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

  private persist() {
    const links = this.rows()
      .filter(r => r.label.trim() && r.url.trim())
      .map(r => ({ ...r, label: r.label.trim(), url: r.url.trim() }));
    setQuickLinks(links);
  }
}
