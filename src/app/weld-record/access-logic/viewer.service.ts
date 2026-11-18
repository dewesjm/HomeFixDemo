import { DestroyRef, Injectable, NgZone, computed, effect, inject, signal } from '@angular/core';
import { API_ACCESS_PERMISSION, DEVELOPER_GROUP_ID, EDIT_FABRICATION_PERMISSION, ENGINEERING_GROUP_ID, ENGINEERING_OVERRIDE_PERMISSION, RELEASE_ENGINEERING_HOLD_PERMISSION, FITTING_GROUP_ID, FOREMAN_GROUP_ID, HISTORY_PAGE_PERMISSION, INSPECTOR_GROUP_ID, isPrivilegedGroup, JOINT_DETAILS_PERMISSION, JOINT_HISTORY_PERMISSION, MAINTAIN_ADMIN_TABLES_PERMISSION, MANAGE_GROUPS_PERMISSION, MANAGE_MAKEUP_PERMISSION, NQC_INSPECTOR_GROUP_ID, O04_RECORDS_GROUP_ID, O63_RECORDS_GROUP_ID, SIGN_EXCAVATION_NDT_PERMISSION, VIEW_PERMISSION, VIEW_GROUP_ID, WELDING_GROUP_ID, signoffPermission } from '../../data/admin-groups';
import { DEFAULT_DEMO_PERSON, DEMO_PEOPLE, demoPersonName } from '../../data/demo-people';
import { ROLES, type Role } from '../../data/roles';
import { findSignoffType } from '../../data/signoff-types';
import { baseStepId, isExcavationNdtStageId, nqcStepId, NQC_SPLIT_STEP_IDS } from '../../data/welding-step-ids';
import { STORAGE } from '../../data/storage-keys';
import { closesJoint } from '../routing-logic/current-routing';
import { makeupGrants, refreshMakeupGrants } from '../../data/makeup-grants';
import { grantStatus, makeupDate } from '../makeup-logic/makeup-rules';
import type { SignoffAttribution } from '../model/history';
import { GroupsStore } from './groups.store';

const GROUPS_WITH_RESTRICTION_MESSAGES = [
  WELDING_GROUP_ID, FOREMAN_GROUP_ID, INSPECTOR_GROUP_ID, NQC_INSPECTOR_GROUP_ID,
  O04_RECORDS_GROUP_ID, O63_RECORDS_GROUP_ID, ENGINEERING_GROUP_ID,
];
const GROUPS_WITHOUT_LEGACY_ACTIONS = [VIEW_GROUP_ID, FITTING_GROUP_ID, ...GROUPS_WITH_RESTRICTION_MESSAGES];

@Injectable({ providedIn: 'root' })
export class ViewerService {
  private readonly groups = inject(GroupsStore).groups;
  private readonly currentId = signal(localStorage.getItem(STORAGE.viewer));

  readonly people = DEMO_PEOPLE;
  readonly person = computed(() => this.people.find(person => person.id === this.currentId()) ?? DEFAULT_DEMO_PERSON);
  readonly memberships = computed(() => this.groups().filter(group => this.person().groupIds.includes(group.id)));
  private readonly selectedGrantId = signal('');
  private readonly today = signal(makeupDate());
  readonly activeMakeupGrants = computed(() => makeupGrants().filter(grant =>
    grant.personId === this.person().id && grantStatus(grant, this.today()) === 'Active' &&
    this.isMakeupForeman(grant.foremanId)));
  readonly actingGrant = computed(() => this.activeMakeupGrants().find(grant => grant.id === this.selectedGrantId()));
  readonly actingLabel = computed(() => {
    const grant = this.actingGrant();
    return grant ? 'Foreman for ' + this.personName(grant.foremanId) : '';
  });
  private readonly signoffGroups = computed(() => this.actingGrant()
    ? this.groups().filter(group => group.id === FOREMAN_GROUP_ID)
    : this.memberships());

  readonly hasFullWorkflowAccess = computed(() => this.memberships().some(group => isPrivilegedGroup(group.id)));
  readonly permissions = computed(() => new Set(this.memberships().flatMap(group => group.allowed)));
  readonly isViewOnly = computed(() => this.memberships().every(group => group.id === VIEW_GROUP_ID));
  readonly showRestrictedWorkflowActions = computed(() => this.memberships().some(group => GROUPS_WITH_RESTRICTION_MESSAGES.includes(group.id)));
  // Other workflow actions keep their current access until their roles are reviewed.
  readonly canUseLegacyWorkflowActions = computed(() =>
    this.memberships().some(group => !GROUPS_WITHOUT_LEGACY_ACTIONS.includes(group.id)));
  readonly canManageMakeup = computed(() => this.isMakeupForeman(this.person().id));
  readonly canReviewAllMakeup = computed(() => this.memberships().some(group => group.id === DEVELOPER_GROUP_ID));
  readonly hasMakeupStatus = computed(() => makeupGrants().some(grant => grant.personId === this.person().id));
  readonly canViewMakeup = computed(() => this.canReviewAllMakeup() || this.canManageMakeup() || this.hasMakeupStatus());
  readonly canEditFabrication = computed(() => this.permissions().has(EDIT_FABRICATION_PERMISSION));
  readonly canReleaseEngineeringHold = computed(() =>
    this.permissions().has(RELEASE_ENGINEERING_HOLD_PERMISSION) || this.canUseLegacyWorkflowActions());
  /* type engineering values (GWP, WTN, process, preheat/interpass, filler) on welding routings the
     external system sent nothing for, kept without signing */
  readonly canEnterEngineeringValues = computed(() =>
    this.permissions().has(ENGINEERING_OVERRIDE_PERMISSION) || this.canUseLegacyWorkflowActions());
  readonly canManageGroups = computed(() => this.permissions().has(MANAGE_GROUPS_PERMISSION));
  readonly canMaintainAdminTables = computed(() =>
    this.permissions().has(MAINTAIN_ADMIN_TABLES_PERMISSION) || this.canUseLegacyWorkflowActions());
  readonly canAccessAdmin = computed(() => this.canManageGroups() || this.canMaintainAdminTables() || this.canAccessApi());
  readonly canSearch = computed(() => this.permissions().has(VIEW_PERMISSION));
  readonly canViewJoint = computed(() => this.permissions().has(JOINT_DETAILS_PERMISSION));
  readonly canViewJointHistory = computed(() => this.permissions().has(JOINT_HISTORY_PERMISSION));
  readonly canViewHistoryPage = computed(() => this.permissions().has(HISTORY_PAGE_PERMISSION));
  readonly canAccessApi = computed(() => this.permissions().has(API_ACCESS_PERMISSION));
  readonly canAccessWeldRecordServices = computed(() => this.canAccessApi() || this.canManageMakeup());
  readonly roles = computed(() => {
    const personas = new Set(this.signoffGroups().flatMap(group => group.personas));
    return ROLES.filter(role => role === 'View' ? this.permissions().has(VIEW_PERMISSION) : personas.has(role));
  });

  readonly defaultRole = computed<Role | null>(() => {
    const roles = this.roles();
    if (this.actingGrant() && roles.includes('Foreman')) return 'Foreman';
    if (this.hasFullWorkflowAccess() && roles.includes('View')) return 'View';
    return roles[0] ?? null;
  });

  canSignType(type: string): boolean {
    return this.hasFullWorkflowAccess() || (!!findSignoffType(type) &&
      this.signoffGroups().some(group => group.allowed.includes(signoffPermission(type))));
  }

  canSignRouting(stageId: string, type: string): boolean {
    if (closesJoint(stageId)) return false;
    if (this.hasFullWorkflowAccess()) return true;
    if (!findSignoffType(type)) return false;

    const excavation = isExcavationNdtStageId(stageId);
    const inspection = excavation || NQC_SPLIT_STEP_IDS.includes(baseStepId(stageId));
    const nqc = stageId !== baseStepId(stageId);
    const permission = excavation ? SIGN_EXCAVATION_NDT_PERMISSION : signoffPermission(type);
    return this.signoffGroups().some(group => {
      if (!group.allowed.includes(permission)) return false;
      if (group.id === INSPECTOR_GROUP_ID) return inspection && !nqc;
      if (group.id === NQC_INSPECTOR_GROUP_ID) return stageId === 'pre-fit' || (inspection && nqc);
      if (group.id === O63_RECORDS_GROUP_ID) return stageId === 'review-o63';
      if (group.id === O04_RECORDS_GROUP_ID) return stageId === 'review-o04';
      return group.id !== FOREMAN_GROUP_ID || stageId !== nqcStepId('fitup-insp');
    });
  }

  constructor() {
    const zone = inject(NgZone);
    const timer = zone.runOutsideAngular(() => setInterval(() => {
      const date = makeupDate();
      if (date !== this.today()) zone.run(() => this.today.set(date));
    }, 30_000));
    window.addEventListener('storage', refreshMakeupGrants);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      window.removeEventListener('storage', refreshMakeupGrants);
    });
    effect(() => {
      if (this.selectedGrantId() && !this.actingGrant()) this.selectedGrantId.set('');
    });
  }

  private isMakeupForeman(id: string): boolean {
    return !!this.people.find(person => person.id === id)?.groupIds.includes(FOREMAN_GROUP_ID) &&
      this.groups().some(group => group.id === FOREMAN_GROUP_ID && group.allowed.includes(MANAGE_MAKEUP_PERMISSION));
  }

  personName(id: string): string {
    const person = this.people.find(candidate => candidate.id === id);
    return person ? demoPersonName(person) : id;
  }

  selectActingGrant(id: string): void {
    this.today.set(makeupDate());
    this.selectedGrantId.set(this.activeMakeupGrants().some(grant => grant.id === id) ? id : '');
  }

  signoffAttribution(): SignoffAttribution | null {
    const selected = this.selectedGrantId();
    this.today.set(makeupDate());
    const acting = this.actingGrant();
    if (selected && !acting) return null;
    return {
      signerId: this.person().id,
      signerName: demoPersonName(this.person()),
      ...(acting ? { foremanId: acting.foremanId, foremanName: this.personName(acting.foremanId), makeupGrantId: acting.id } : {}),
    };
  }

  select(id: string) {
    if (!this.people.some(person => person.id === id)) return;
    localStorage.setItem(STORAGE.viewer, id);
    this.selectedGrantId.set('');
    this.currentId.set(id);
  }
}
