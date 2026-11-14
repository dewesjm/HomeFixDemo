/* Admin → Groups: the permission list and the sample groups. A group either allows a permission
   (its key is in allowed) or doesn't. */

import { ROUTING_PERSONAS, type Role } from './roles';
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

const VIEW_PERMISSIONS = [VIEW_PERMISSION, JOINT_DETAILS_PERMISSION, JOINT_HISTORY_PERMISSION, HISTORY_PAGE_PERMISSION];

export const API_ACCESS_PERMISSION = 'api-access';

const PERMISSIONS: Permission[] = [
  { key: API_ACCESS_PERMISSION, label: 'API access', category: 'Access' },
  { key: VIEW_PERMISSION, label: 'Search records', category: 'Access' },
  { key: JOINT_DETAILS_PERMISSION, label: 'View Joint Details', category: 'Access' },
  { key: JOINT_HISTORY_PERMISSION, label: 'Joint History button', category: 'Access' },
  { key: HISTORY_PAGE_PERMISSION, label: 'View History page', category: 'Access' },
  { key: 'manage-routing', label: 'Manage routing', category: 'Routing' },
  { key: 'force-routing', label: 'Routing Override', category: 'Routing' },
  { key: 'edit-fabrication', label: 'Edit fabrication fields', category: 'Data Entry' },
  { key: 'admin-groups', label: 'Manage groups and permissions', category: 'Administration' },
  { key: 'admin-tables', label: 'Maintain other admin tables', category: 'Administration' },
];

const ALL_GROUP_PERMISSIONS = PERMISSIONS.map(permission => permission.key);

const WORKFLOW_PERMISSIONS = ALL_GROUP_PERMISSIONS.filter(key => key !== API_ACCESS_PERMISSION);

export const PERMISSION_CATEGORIES = [...new Set(PERMISSIONS.map(p => p.category))];

export function permissionsIn(category: string): Permission[] {
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

const SAMPLE_GROUPS: AdminGroup[] = [
  { id: DEVELOPER_GROUP_ID, name: 'Developer', description: 'Full access to the demo.',
    personas: ROUTING_PERSONAS, allowed: ALL_GROUP_PERMISSIONS },
  { id: ADMINISTRATORS_GROUP_ID, name: 'Administrators', description: 'Full Weld Record workflow and administration access.',
    personas: ROUTING_PERSONAS, allowed: WORKFLOW_PERMISSIONS },
  { id: 'g2', name: 'Fitting', description: 'Fitters who handle Fit.',
    personas: ['Fitting'], allowed: ['edit-fabrication'] },
  { id: 'g3', name: 'Welding', description: 'Welders who handle welding routings.',
    personas: ['Welding'], allowed: ['edit-fabrication'] },
  { id: 'g4', name: 'Foreman', description: 'Foremen who handle fit-up and repair routings.',
    personas: ['Foreman'], allowed: ['edit-fabrication'] },
  { id: 'g5', name: 'Inspector', description: 'Inspectors who handle inspection routings.',
    personas: ['Inspector'], allowed: [] },
  { id: 'g6', name: 'NQC Inspector', description: 'Inspectors who handle NQC inspection routings.',
    personas: ['NQC Inspector'], allowed: [] },
  { id: 'g7', name: 'O63 Records', description: 'O63 records reviewers.',
    personas: ['O63 Records'], allowed: [] },
  { id: 'g8', name: 'O04 Records', description: 'O04 records reviewers.',
    personas: ['O04 Records'], allowed: [] },
  { id: 'g9', name: 'Engineering', description: 'Engineers who handle Engineering Hold and routing overrides.',
    personas: ['Engineering'], allowed: ['manage-routing', 'force-routing'] },
  { id: VIEW_GROUP_ID, name: 'View', description: 'Search Weld Record.',
    personas: [], allowed: VIEW_PERMISSIONS },
];

export function isPrivilegedGroup(id: string): boolean {
  return id === DEVELOPER_GROUP_ID || id === ADMINISTRATORS_GROUP_ID;
}

export function loadGroups(): AdminGroup[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.adminGroups) ?? 'null');
    if (Array.isArray(saved)) return saved.map((group: AdminGroup) => isPrivilegedGroup(group.id)
      ? { ...group, personas: ROUTING_PERSONAS,
          allowed: group.id === DEVELOPER_GROUP_ID ? ALL_GROUP_PERMISSIONS : WORKFLOW_PERMISSIONS }
      : group);
  } catch { /* use the sample groups */ }
  return SAMPLE_GROUPS;
}

export function saveGroups(groups: AdminGroup[]) {
  localStorage.setItem(STORAGE.adminGroups, JSON.stringify(groups));
}
