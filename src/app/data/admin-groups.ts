/* Admin → Groups: the permission list and the sample groups. A group either allows a permission
   (its key is in allowed) or doesn't. */

export interface Permission {
  key: string;
  label: string;
  category: string;
}

export interface AdminGroup {
  id: string;
  name: string;
  description: string;
  allowed: string[];
}

export const PERMISSIONS: Permission[] = [
  { key: 'manage-routing', label: 'Manage routing', category: 'Routing' },
  { key: 'force-routing', label: 'Force routing override', category: 'Routing' },
  { key: 'signoff-pre-fit', label: 'Pre-Fit', category: 'Sign-off' },
  { key: 'signoff-fit', label: 'Fit', category: 'Sign-off' },
  { key: 'signoff-tack', label: 'Tack', category: 'Sign-off' },
  { key: 'signoff-fitup-insp', label: 'Fit-Up Insp', category: 'Sign-off' },
  { key: 'signoff-fitup-release', label: 'Fit-Up Release', category: 'Sign-off' },
  { key: 'signoff-deferred-tack', label: 'Deferred Tack', category: 'Sign-off' },
  { key: 'signoff-root', label: 'Root', category: 'Sign-off' },
  { key: 'signoff-layer', label: 'Layer', category: 'Sign-off' },
  { key: 'signoff-final-weld', label: 'Final Weld', category: 'Sign-off' },
  { key: 'signoff-root-ndt', label: 'Root NDT', category: 'Sign-off' },
  { key: 'signoff-layer-ndt', label: 'Layer NDT', category: 'Sign-off' },
  { key: 'signoff-final-ndt', label: 'Final NDT', category: 'Sign-off' },
  { key: 'signoff-repair', label: 'Repair', category: 'Sign-off' },
  { key: 'signoff-excavation-ndt', label: 'Excavation NDT', category: 'Sign-off' },
  { key: 'signoff-engineering-hold', label: 'Engineering Hold', category: 'Sign-off' },
  { key: 'signoff-review-o63', label: 'O63 Records Review', category: 'Sign-off' },
  { key: 'signoff-review-o04', label: 'O04 Records Review', category: 'Sign-off' },
  { key: 'signoff-sold', label: 'Sold', category: 'Sign-off' },
  { key: 'edit-fabrication', label: 'Edit fabrication fields', category: 'Data Entry' },
  { key: 'admin-groups', label: 'Manage groups and permissions', category: 'Administration' },
  { key: 'admin-tables', label: 'Maintain other admin tables', category: 'Administration' },
];

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

/* one sample group per persona (the Persona column in Admin > Routing Settings), plus Administrators */
export const SAMPLE_GROUPS: AdminGroup[] = [
  { id: 'g1', name: 'Administrators', description: 'Maintain groups and the other admin tables.',
    allowed: ['admin-groups', 'admin-tables'] },
  { id: 'g2', name: 'Fitting', description: 'Fitters who sign off the Fit step.',
    allowed: ['signoff-fit', 'edit-fabrication'] },
  { id: 'g3', name: 'Welding', description: 'Welders who sign off Tack, Root, Layer and Final Weld.',
    allowed: ['signoff-tack', 'signoff-deferred-tack', 'signoff-root', 'signoff-layer', 'signoff-final-weld', 'edit-fabrication'] },
  { id: 'g4', name: 'Foreman', description: 'Foremen who sign off Fit-Up Insp, Fit-Up Release and Repair.',
    allowed: ['signoff-fitup-insp', 'signoff-fitup-release', 'signoff-repair', 'edit-fabrication'] },
  { id: 'g5', name: 'Inspector', description: 'Inspectors who sign off Fit-Up Insp and the NDT steps.',
    allowed: ['signoff-fitup-insp', 'signoff-root-ndt', 'signoff-layer-ndt', 'signoff-final-ndt', 'signoff-excavation-ndt'] },
  { id: 'g6', name: 'NQC Inspector', description: 'NQC Inspectors who sign off Pre-Fit, and Fit-Up Insp and the NDT steps on N Ind. 1 or 2 joints.',
    allowed: ['signoff-pre-fit', 'signoff-fitup-insp', 'signoff-root-ndt', 'signoff-layer-ndt', 'signoff-final-ndt'] },
  { id: 'g7', name: 'O63 Records', description: 'O63 Records, who sign off O63 Records Review and Sold.',
    allowed: ['signoff-review-o63', 'signoff-sold'] },
  { id: 'g8', name: 'O04 Records', description: 'O04 Records, who sign off O04 Records Review.',
    allowed: ['signoff-review-o04'] },
  { id: 'g9', name: 'Engineering', description: 'Engineers who sign off Engineering Hold and can force a routing override.',
    allowed: ['signoff-engineering-hold', 'manage-routing', 'force-routing'] },
  { id: 'g10', name: 'View', description: 'Read-only access; no sign-offs.',
    allowed: [] },
];
