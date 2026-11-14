import { Injectable, computed, inject, signal } from '@angular/core';
import { API_ACCESS_PERMISSION, EDIT_FABRICATION_PERMISSION, HISTORY_PAGE_PERMISSION, isPrivilegedGroup, JOINT_DETAILS_PERMISSION, JOINT_HISTORY_PERMISSION, VIEW_PERMISSION, VIEW_GROUP_ID, signoffPermission } from '../../data/admin-groups';
import { DEFAULT_DEMO_PERSON, DEMO_PEOPLE } from '../../data/demo-people';
import { ROLES, type Role } from '../../data/roles';
import { findSignoffType } from '../../data/signoff-types';
import { STORAGE } from '../../data/storage-keys';
import { GroupsStore } from './groups.store';

@Injectable({ providedIn: 'root' })
export class ViewerService {
  private readonly groups = inject(GroupsStore).groups;
  private readonly currentId = signal(localStorage.getItem(STORAGE.viewer));

  readonly people = DEMO_PEOPLE;
  readonly person = computed(() => this.people.find(person => person.id === this.currentId()) ?? DEFAULT_DEMO_PERSON);
  readonly memberships = computed(() => this.groups().filter(group => this.person().groupIds.includes(group.id)));
  readonly hasFullWorkflowAccess = computed(() => this.memberships().some(group => isPrivilegedGroup(group.id)));
  readonly permissions = computed(() => new Set(this.memberships().flatMap(group => group.allowed)));
  readonly isViewOnly = computed(() => this.memberships().every(group => group.id === VIEW_GROUP_ID));
  private readonly hasFittingMembership = computed(() => this.memberships().some(group => group.id === 'g2'));
  // Other workflow actions keep their current access until their roles are reviewed.
  readonly canUseLegacyWorkflowActions = computed(() =>
    this.hasFullWorkflowAccess() || (!this.isViewOnly() && !this.hasFittingMembership()));
  readonly canEditFabrication = computed(() => this.permissions().has(EDIT_FABRICATION_PERMISSION));
  readonly canAccessAdmin = computed(() => this.isAdmin() || this.canUseLegacyWorkflowActions());
  readonly canSearch = computed(() => this.permissions().has(VIEW_PERMISSION));
  readonly canViewJoint = computed(() => this.permissions().has(JOINT_DETAILS_PERMISSION));
  readonly canViewJointHistory = computed(() => this.permissions().has(JOINT_HISTORY_PERMISSION));
  readonly canViewHistoryPage = computed(() => this.permissions().has(HISTORY_PAGE_PERMISSION));
  readonly canAccessApi = computed(() => this.permissions().has(API_ACCESS_PERMISSION));
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

  canSignType(type: string): boolean {
    return this.hasFullWorkflowAccess() || (!!findSignoffType(type) && this.permissions().has(signoffPermission(type)));
  }

  select(id: string) {
    if (!this.people.some(person => person.id === id)) return;
    localStorage.setItem(STORAGE.viewer, id);
    this.currentId.set(id);
  }
}
