/* Admin → Groups: the permission list and the sample groups. A group either allows a permission
   (its key is in allowed) or doesn't. */

import { ROUTING_PERSONAS, type Role } from './roles';
import { getSignoffTypes, seededSignoffTypeIds, WELD_BUILDUP_TYPE } from './signoff-types';
import { STORAGE } from './storage-keys';

interface Permission {
  key: string;
  label: string;
  category: string;
}

export interface AdminGroup {
  id: string;
  name: string;
  description: string;
  personas: Exclude<Role, 'View'>[];
  allowed: string[];
}

export const VIEW_PERMISSION = 'view';
export const JOINT_DETAILS_PERMISSION = 'joint-details';
export const JOINT_HISTORY_PERMISSION = 'joint-history';
export const HISTORY_PAGE_PERMISSION = 'history-page';

const JOINT_READ_PERMISSIONS = [VIEW_PERMISSION, JOINT_DETAILS_PERMISSION, JOINT_HISTORY_PERMISSION];
const VIEW_PERMISSIONS = [...JOINT_READ_PERMISSIONS, HISTORY_PAGE_PERMISSION];

export const EDIT_FABRICATION_PERMISSION = 'edit-fabrication';
export const signoffPermission = (type: string) => `signoff:${type}`;
export const SIGN_EXCAVATION_NDT_PERMISSION = 'sign-excavation-ndt';
const NON_SIGNABLE_TYPE = 'sold';
const SIGNOFF_CATEGORY = 'Signoff Types';
// Preserve the existing signoff access of groups awaiting their role review.
const EXISTING_SIGNOFF_PERMISSIONS = [
  ...seededSignoffTypeIds.filter(type => type !== 'fit' && type !== WELD_BUILDUP_TYPE && type !== NON_SIGNABLE_TYPE)
    .map(signoffPermission),
  SIGN_EXCAVATION_NDT_PERMISSION,
];

export const MANAGE_MAKEUP_PERMISSION = 'manage-makeup';
export const API_ACCESS_PERMISSION = 'api-access';

const PERMISSIONS: Permission[] = [
  { key: API_ACCESS_PERMISSION, label: 'API access', category: 'Access' },
  { key: VIEW_PERMISSION, label: 'Search records', category: 'Access' },
  { key: JOINT_DETAILS_PERMISSION, label: 'View Joint Details', category: 'Access' },
  { key: JOINT_HISTORY_PERMISSION, label: 'Joint History button', category: 'Access' },
  { key: HISTORY_PAGE_PERMISSION, label: 'View History page', category: 'Access' },
  { key: MANAGE_MAKEUP_PERMISSION, label: 'Manage Makeup', category: 'Access' },
  { key: 'force-routing', label: 'Routing Override', category: 'Routing' },
  { key: EDIT_FABRICATION_PERMISSION, label: 'Edit fabrication fields', category: 'Data Entry' },
  { key: 'admin-groups', label: 'Manage groups and permissions', category: 'Administration' },
  { key: 'admin-tables', label: 'Maintain other admin tables', category: 'Administration' },
];

function allPermissions(): string[] {
  return PERMISSION_CATEGORIES.flatMap(category => permissionsIn(category).map(permission => permission.key));
}

function privilegedPermissions(id: string): string[] {
  return allPermissions().filter(key => id === DEVELOPER_GROUP_ID || key !== API_ACCESS_PERMISSION);
}

export const PERMISSION_CATEGORIES = [...new Set(PERMISSIONS.map(p => p.category)), SIGNOFF_CATEGORY];

export function permissionsIn(category: string): Permission[] {
  if (category === SIGNOFF_CATEGORY) {
    return [
      ...getSignoffTypes().filter(type => type.value !== NON_SIGNABLE_TYPE)
        .map(type => ({ key: signoffPermission(type.value), label: `Sign ${type.label}`, category })),
      { key: SIGN_EXCAVATION_NDT_PERMISSION, label: 'Sign Excavation NDT', category },
    ];
  }
  return PERMISSIONS.filter(p => p.category === category);
}

/* the categories the group has anything in, each with its allowed permission labels, in permission-list order */
export function permissionSummary(allowed: readonly string[]): { category: string; labels: string[] }[] {
  return PERMISSION_CATEGORIES
    .map(category => ({
      category,
      labels: permissionsIn(category).filter(p => allowed.includes(p.key)).map(p => p.label),
    }))
    .filter(line => line.labels.length);
}

export const DEVELOPER_GROUP_ID = 'developer';
export const ADMINISTRATORS_GROUP_ID = 'g1';
export const VIEW_GROUP_ID = 'g10';
export const FITTING_GROUP_ID = 'g2';
export const WELDING_GROUP_ID = 'g3';
export const FOREMAN_GROUP_ID = 'g4';
export const INSPECTOR_GROUP_ID = 'g5';
export const NQC_INSPECTOR_GROUP_ID = 'g6';
export const O63_RECORDS_GROUP_ID = 'g7';
export const O04_RECORDS_GROUP_ID = 'g8';

const INSPECTOR_PERMISSIONS = [
  ...VIEW_PERMISSIONS, EDIT_FABRICATION_PERMISSION, SIGN_EXCAVATION_NDT_PERMISSION,
  ...['fitup-insp', 'vt', '5x', 'mt', 'pt', 'ut', 'rt'].map(signoffPermission),
];

const SAMPLE_GROUPS: AdminGroup[] = [
  { id: DEVELOPER_GROUP_ID, name: 'Developer', description: 'Full access to the demo.',
    personas: ROUTING_PERSONAS, allowed: [] },
  { id: ADMINISTRATORS_GROUP_ID, name: 'Administrators', description: 'Full Weld Record workflow and administration access.',
    personas: ROUTING_PERSONAS, allowed: [] },
  { id: FITTING_GROUP_ID, name: 'Fitting', description: 'Fitters who handle Fit.',
    personas: ['Fitting'], allowed: [...JOINT_READ_PERMISSIONS, EDIT_FABRICATION_PERMISSION, signoffPermission('fit')] },
  { id: WELDING_GROUP_ID, name: 'Welding', description: 'Welders who handle welding routings.',
    personas: ['Welding'], allowed: [
      ...VIEW_PERMISSIONS, EDIT_FABRICATION_PERMISSION,
      ...[WELD_BUILDUP_TYPE, 'tack', 'deferred-tack', 'root', 'interim', 'final-weld'].map(signoffPermission),
    ] },
  { id: FOREMAN_GROUP_ID, name: 'Foreman', description: 'Foremen who handle fit-up and repair routings.',
    personas: ['Foreman'], allowed: [
      ...VIEW_PERMISSIONS, MANAGE_MAKEUP_PERMISSION, ...['fitup-insp', 'fitup-release', 'repair'].map(signoffPermission),
    ] },
  { id: INSPECTOR_GROUP_ID, name: 'Inspector', description: 'Inspectors who handle inspection routings.',
    personas: ['Inspector'], allowed: INSPECTOR_PERMISSIONS },
  { id: NQC_INSPECTOR_GROUP_ID, name: 'NQC Inspector', description: 'Inspectors who handle NQC inspection routings.',
    personas: ['NQC Inspector'], allowed: INSPECTOR_PERMISSIONS },
  { id: O63_RECORDS_GROUP_ID, name: 'O63 Records', description: 'O63 records reviewers.',
    personas: ['O63 Records'], allowed: [...VIEW_PERMISSIONS, signoffPermission('review-o63')] },
  { id: O04_RECORDS_GROUP_ID, name: 'O04 Records', description: 'O04 records reviewers.',
    personas: ['O04 Records'], allowed: [...VIEW_PERMISSIONS, signoffPermission('review-o04')] },
  { id: 'g9', name: 'Engineering', description: 'Engineers who handle Engineering Hold and routing overrides.',
    personas: ['Engineering'], allowed: [MANAGE_MAKEUP_PERMISSION, 'force-routing', ...EXISTING_SIGNOFF_PERMISSIONS] },
  { id: VIEW_GROUP_ID, name: 'View', description: 'Search Weld Record.',
    personas: [], allowed: VIEW_PERMISSIONS },
];

export function isPrivilegedGroup(id: string): boolean {
  return id === DEVELOPER_GROUP_ID || id === ADMINISTRATORS_GROUP_ID;
}

export function loadGroups(): AdminGroup[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.adminGroups) ?? 'null');
    if (Array.isArray(saved)) return withPrivilegedPermissions(saved);
  } catch { /* use the sample groups */ }
  return withPrivilegedPermissions(SAMPLE_GROUPS);
}

export function withPrivilegedPermissions(groups: AdminGroup[]): AdminGroup[] {
  return groups.map(group => isPrivilegedGroup(group.id)
    ? { ...group, personas: ROUTING_PERSONAS, allowed: privilegedPermissions(group.id) }
    : group);
}

export function saveGroups(groups: AdminGroup[]) {
  localStorage.setItem(STORAGE.adminGroups, JSON.stringify(groups));
}
