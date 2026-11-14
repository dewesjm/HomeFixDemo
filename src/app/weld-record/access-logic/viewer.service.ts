import { Injectable, computed, inject, signal } from '@angular/core';
import { DEVELOPER_GROUP_ID, isPrivilegedGroup, VIEW_PERMISSION } from '../../data/admin-groups';
import { DEFAULT_DEMO_PERSON, DEMO_PEOPLE } from '../../data/demo-people';
import { ROLES, type Role } from '../../data/roles';
import { STORAGE } from '../../data/storage-keys';
import { GroupsStore } from './groups.store';

@Injectable({ providedIn: 'root' })
export class ViewerService {
  private readonly groups = inject(GroupsStore).groups;
  private readonly currentId = signal(localStorage.getItem(STORAGE.viewer));

  readonly people = DEMO_PEOPLE;
  readonly person = computed(() => this.people.find(person => person.id === this.currentId()) ?? DEFAULT_DEMO_PERSON);
  readonly memberships = computed(() => this.groups().filter(group => this.person().groupIds.includes(group.id)));
  readonly canAccessApi = computed(() => this.memberships().some(group => group.id === DEVELOPER_GROUP_ID));
  readonly hasFullWorkflowAccess = computed(() => this.memberships().some(group => isPrivilegedGroup(group.id)));
  readonly permissions = computed(() => new Set(this.memberships().flatMap(group => group.allowed)));
  readonly isAdmin = computed(() => this.permissions().has('admin-tables') || this.permissions().has('admin-groups'));
  readonly roles = computed(() => {
    const personas = new Set(this.memberships().flatMap(group => group.personas));
    return ROLES.filter(role => role === 'View' ? this.permissions().has(VIEW_PERMISSION) : personas.has(role));
  });

  readonly defaultRole = computed<Role | null>(() => {
    const roles = this.roles();
    if (this.hasFullWorkflowAccess() && roles.includes('View')) return 'View';
    return roles[0] ?? null;
  });

  select(id: string) {
    if (!this.people.some(person => person.id === id)) return;
    localStorage.setItem(STORAGE.viewer, id);
    this.currentId.set(id);
  }
}
