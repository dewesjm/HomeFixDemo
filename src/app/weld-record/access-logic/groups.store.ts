import { computed, Injectable, Injector, inject, signal } from '@angular/core';
import { isPrivilegedGroup, loadGroups, saveGroups, withPrivilegedPermissions, type AdminGroup } from '../../data/admin-groups';
import { loadGroupHistory, saveGroupHistory, type GroupChange, type GroupChangeAction } from '../../data/admin-group-history';
import { demoPersonName } from '../../data/demo-people';
import { groupChanges } from './group-changes';
import { ViewerService } from './viewer.service';

/* the groups, and the change history every save, delete and permission removal adds to */
@Injectable({ providedIn: 'root' })
export class GroupsStore {
  /* ViewerService reads this store, so the signed-in person is looked up when a change is made */
  private readonly injector = inject(Injector);
  private readonly rows = signal(loadGroups());
  private readonly log = signal(loadGroupHistory());
  readonly groups = computed(() => withPrivilegedPermissions(this.rows()));
  readonly history = this.log.asReadonly();

  save(group: AdminGroup) {
    const rows = this.groups();
    const before = rows.find(row => row.id === group.id);
    this.commit(before
      ? rows.map(row => row.id === group.id ? group : row)
      : [group, ...rows]);
    this.record(before ? 'Changed' : 'Added', this.groups().find(row => row.id === group.id)!,
      groupChanges(before, this.groups().find(row => row.id === group.id)));
  }

  remove(id: string) {
    if (isPrivilegedGroup(id)) return;
    const before = this.groups().find(row => row.id === id);
    this.commit(this.groups().filter(row => row.id !== id));
    if (before) this.record('Deleted', before, groupChanges(before, undefined));
  }

  /* label: the permission's name, read before its Signoff Type was deleted */
  removePermission(key: string, label: string) {
    const groups = this.rows();
    const affected = groups.filter(group => group.allowed.includes(key));
    if (!affected.length) return;
    this.commit(groups.map(group => ({ ...group, allowed: group.allowed.filter(permission => permission !== key) })));
    /* the built-in groups' grants are fixed, not edited, so only the others are logged */
    for (const group of affected.filter(g => !isPrivilegedGroup(g.id))) this.record('Changed', group, [`Removed ${label} (Signoff Type deleted)`]);
  }

  private record(action: GroupChangeAction, group: AdminGroup, changes: string[]) {
    if (!changes.length && action === 'Changed') return;
    const entry: GroupChange = {
      id: crypto.randomUUID(), when: new Date().toISOString(), who: demoPersonName(this.injector.get(ViewerService).person()),
      groupId: group.id, group: group.name, action, changes: changes.length ? changes : ['No personas or permissions'],
    };
    this.log.update(history => [...history, entry]);
    saveGroupHistory(this.log());
  }

  private commit(groups: AdminGroup[]) {
    saveGroups(groups);
    this.rows.set(groups);
  }
}
