import { Injectable, signal } from '@angular/core';
import { loadGroups, saveGroups, type AdminGroup } from '../../data/admin-groups';

@Injectable({ providedIn: 'root' })
export class GroupsStore {
  private readonly rows = signal(loadGroups());
  readonly groups = this.rows.asReadonly();

  save(group: AdminGroup) {
    const rows = this.groups();
    this.commit(rows.some(row => row.id === group.id)
      ? rows.map(row => row.id === group.id ? group : row)
      : [group, ...rows]);
  }

  remove(id: string) {
    this.commit(this.groups().filter(row => row.id !== id));
  }

  private commit(groups: AdminGroup[]) {
    saveGroups(groups);
    this.rows.set(groups);
  }
}
