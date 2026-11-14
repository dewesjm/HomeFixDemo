/* Admin → Groups: one row per AD group with its description and the permissions it allows; edited in the row */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { AdminGroup, API_ACCESS_PERMISSION, PERMISSION_CATEGORIES, isPrivilegedGroup, permissionSummary, permissionsIn } from '../../../data/admin-groups';

import { ROUTING_PERSONAS } from '../../../data/roles';
import { GroupsStore } from '../../access-logic/groups.store';

@Component({
  selector: 'app-admin-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent,
    LucidePencil, LucideCheck, LucideX, LucideTrash2],
  templateUrl: './groups.component.html',
})
export class AdminGroupsComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private store = inject(GroupsStore);

  categories = PERMISSION_CATEGORIES;
  permissionsIn = permissionsIn;
  summary = permissionSummary;

  isPrivilegedGroup = isPrivilegedGroup;
  personas = ROUTING_PERSONAS;
  draft = signal<AdminGroup | null>(null);
  groups = computed(() => {
    const draft = this.draft();
    const groups = this.store.groups();
    if (!draft) return groups;
    return groups.some(row => row.id === draft.id)
      ? groups.map(row => row.id === draft.id ? draft : row)
      : [draft, ...groups];
  });
  table = new TableState<AdminGroup>(['name', 'description']);

  constructor() {
    effect(() => this.table.setRows(this.groups()));
  }

  addRow() {
    if (this.draft()) return;
    this.table.clearFilters();
    this.draft.set({ id: crypto.randomUUID(), name: '', description: '', personas: [], allowed: [] });
  }

  deleteRow(row: AdminGroup) {
    this.confirm.confirmDelete(row.name, () => {
      this.store.remove(row.id);
      this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
    });
  }

  startEdit(row: AdminGroup) {
    this.draft.set(row);
  }

  saveEdit(row: AdminGroup) {
    const name = row.name.trim();
    if (!name) {
      this.messages.add({ severity: 'warn', summary: 'Enter a group name.', life: 3000 });
      return;
    }
    this.store.save({ ...row, name, description: row.description.trim() });
    this.draft.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: name, life: 3000 });
  }

  updateField(field: 'name' | 'description', value: string) {
    this.updateDraft({ [field]: value });
  }

  readonly apiAccessPermission = API_ACCESS_PERMISSION;

  togglePermission(row: AdminGroup, key: string, on: boolean) {
    if (key === API_ACCESS_PERMISSION) return;
    this.updateDraft({ allowed: on ? [...row.allowed, key] : row.allowed.filter(value => value !== key) });
  }

  togglePersona(row: AdminGroup, persona: AdminGroup['personas'][number], on: boolean) {
    this.updateDraft({ personas: on ? [...row.personas, persona] : row.personas.filter(value => value !== persona) });
  }

  private updateDraft(changes: Partial<AdminGroup>) {
    this.draft.update(draft => draft && { ...draft, ...changes });
  }
}
