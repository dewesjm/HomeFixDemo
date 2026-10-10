/* Admin → Groups: one row per AD group with its description and the permissions it allows; edited in the row */
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { AdminGroup, PERMISSION_CATEGORIES, SAMPLE_GROUPS, permissionSummary, permissionsIn } from '../../../data/admin-groups';

@Component({
  selector: 'app-admin-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent,
    LucidePencil, LucideCheck, LucideX, LucideTrash2],
  templateUrl: './admin-groups.component.html',
})
export class AdminGroupsComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private seq = 0;

  categories = PERMISSION_CATEGORIES;
  permissionsIn = permissionsIn;
  summary = permissionSummary;

  groups = signal<AdminGroup[]>(SAMPLE_GROUPS.map(g => ({ ...g, allowed: [...g.allowed] })));
  editingId = signal<string | null>(null);
  private cloned: Record<string, AdminGroup> = {};
  table = new TableState<AdminGroup>(['name', 'description']);

  constructor() {
    effect(() => this.table.setRows(this.groups()));
  }

  addRow() {
    const id = `new-${++this.seq}`;
    this.table.clearFilters();
    this.groups.update(g => [{ id, name: '', description: '', allowed: [] }, ...g]);
    this.editingId.set(id);
  }

  deleteRow(row: AdminGroup) {
    this.confirm.confirmDelete(row.name || 'this group', () => {
      this.groups.update(g => g.filter(x => x.id !== row.id));
      this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
    });
  }

  startEdit(row: AdminGroup) {
    this.cloned[row.id] = { ...row, allowed: [...row.allowed] };
    this.editingId.set(row.id);
  }

  saveEdit(row: AdminGroup) {
    if (!row.name.trim()) {
      this.messages.add({ severity: 'warn', summary: 'Enter a group name.', life: 3000 });
      return;
    }
    this.updateRow(row, { name: row.name.trim(), description: row.description.trim() });
    delete this.cloned[row.id];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: row.name.trim(), life: 3000 });
  }

  /* a new row that was never saved is removed */
  cancelEdit(row: AdminGroup) {
    const original = this.cloned[row.id];
    this.groups.update(g => original
      ? g.map(x => x.id === row.id ? original : x)
      : g.filter(x => x.id !== row.id));
    delete this.cloned[row.id];
    this.editingId.set(null);
  }

  updateField(row: AdminGroup, field: 'name' | 'description', value: string) {
    this.updateRow(row, { [field]: value });
  }

  togglePermission(row: AdminGroup, key: string, on: boolean) {
    const allowed = row.allowed.filter(k => k !== key);
    this.updateRow(row, { allowed: on ? [...allowed, key] : allowed });
  }

  private updateRow(row: AdminGroup, changes: Partial<AdminGroup>) {
    this.groups.update(g => g.map(x => x.id === row.id ? { ...x, ...changes } : x));
  }
}
