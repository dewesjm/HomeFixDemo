import { computed, Injectable, signal } from '@angular/core';
import { loadGroups, saveGroups, withPrivilegedPermissions, type AdminGroup } from '../../data/admin-groups';

@Injectable({ providedIn: 'root' })
export class GroupsStore {
  private readonly rows = signal(loadGroups());
  readonly groups = computed(() => withPrivilegedPermissions(this.rows()));

  save(group: AdminGroup) {
    const rows = this.groups();
    this.commit(rows.some(row => row.id === group.id)
      ? rows.map(row => row.id === group.id ? group : row)
      : [group, ...rows]);
  }

  remove(id: string) {
    this.commit(this.groups().filter(row => row.id !== id));
  }

  removePermission(key: string) {
    const groups = this.rows();
    if (!groups.some(group => group.allowed.includes(key))) return;
    this.commit(groups.map(group => ({ ...group, allowed: group.allowed.filter(permission => permission !== key) })));
  }

  private commit(groups: AdminGroup[]) {
    saveGroups(groups);
    this.rows.set(groups);
  }
}
