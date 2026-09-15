import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideShield, LucidePlus, LucideTrash2, LucideCheck, LucideX } from '@lucide/angular';

interface Permission {
  key: string;
  label: string;
  category: string;
}

interface TeamGroup {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, 'allow' | 'deny' | 'not-set'>;
}

const PERMISSIONS: Permission[] = [
  // Sign-off
  { key: 'signoff-fitup-release', label: 'Fit-Up Release', category: 'Sign-off' },
  { key: 'signoff-fitup-insp', label: 'Fit-Up Inspection', category: 'Sign-off' },
  { key: 'signoff-visual', label: 'Visual Inspection', category: 'Sign-off' },
  { key: 'signoff-fabrication', label: 'Fabrication', category: 'Sign-off' },
  { key: 'signoff-ndt-root', label: 'NDT Root Pass', category: 'Sign-off' },
  { key: 'signoff-ndt-each', label: 'NDT Each Pass', category: 'Sign-off' },
  { key: 'signoff-ndt-final', label: 'NDT Final', category: 'Sign-off' },
  { key: 'signoff-ut', label: 'UT', category: 'Sign-off' },
  { key: 'signoff-mcl', label: 'MCL Verification', category: 'Sign-off' },
  { key: 'signoff-final', label: 'Final Sign-off', category: 'Sign-off' },
  // Data entry
  { key: 'edit-ndt', label: 'Edit NDT Data', category: 'Data Entry' },
  { key: 'edit-fabrication', label: 'Edit Fabrication Fields', category: 'Data Entry' },
  { key: 'edit-inspection', label: 'Edit Inspection Fields', category: 'Data Entry' },
  { key: 'edit-er-ir', label: 'Enter ER / IR Numbers', category: 'Data Entry' },
  // Admin
  { key: 'admin-routing', label: 'Manage Routing Steps', category: 'Administration' },
  { key: 'admin-templates', label: 'Manage Stage Templates', category: 'Administration' },
  { key: 'admin-set-step', label: 'Force Step Override', category: 'Administration' },
];

const DEFAULT_GROUPS: TeamGroup[] = [
  {
    id: 'g1',
    name: 'Welding-Inspectors',
    description: 'Certified welding inspectors — full sign-off authority',
    permissions: {
      'signoff-fitup-release': 'allow', 'signoff-fitup-insp': 'allow', 'signoff-visual': 'allow',
      'signoff-fabrication': 'allow', 'signoff-ndt-root': 'allow', 'signoff-ndt-each': 'allow',
      'signoff-ndt-final': 'allow', 'signoff-ut': 'allow', 'signoff-mcl': 'allow', 'signoff-final': 'allow',
      'edit-ndt': 'allow', 'edit-fabrication': 'allow', 'edit-inspection': 'allow', 'edit-er-ir': 'allow',
      'admin-routing': 'not-set', 'admin-templates': 'not-set', 'admin-set-step': 'not-set',
    },
  },
  {
    id: 'g2',
    name: 'QC-Leads',
    description: 'Quality control leads — sign-off and data entry, no admin',
    permissions: {
      'signoff-fitup-release': 'allow', 'signoff-fitup-insp': 'allow', 'signoff-visual': 'allow',
      'signoff-fabrication': 'allow', 'signoff-ndt-root': 'allow', 'signoff-ndt-each': 'allow',
      'signoff-ndt-final': 'allow', 'signoff-ut': 'allow', 'signoff-mcl': 'allow', 'signoff-final': 'allow',
      'edit-ndt': 'allow', 'edit-fabrication': 'allow', 'edit-inspection': 'allow', 'edit-er-ir': 'allow',
      'admin-routing': 'not-set', 'admin-templates': 'not-set', 'admin-set-step': 'not-set',
    },
  },
  {
    id: 'g3',
    name: 'NDT-Technicians',
    description: 'NDT technicians — sign off NDT stages only',
    permissions: {
      'signoff-fitup-release': 'not-set', 'signoff-fitup-insp': 'not-set', 'signoff-visual': 'not-set',
      'signoff-fabrication': 'not-set', 'signoff-ndt-root': 'allow', 'signoff-ndt-each': 'allow',
      'signoff-ndt-final': 'allow', 'signoff-ut': 'allow', 'signoff-mcl': 'not-set', 'signoff-final': 'not-set',
      'edit-ndt': 'allow', 'edit-fabrication': 'not-set', 'edit-inspection': 'not-set', 'edit-er-ir': 'not-set',
      'admin-routing': 'not-set', 'admin-templates': 'not-set', 'admin-set-step': 'not-set',
    },
  },
  {
    id: 'g4',
    name: 'Weld-Technicians',
    description: 'Welders / fitters — can enter data, cannot sign off',
    permissions: {
      'signoff-fitup-release': 'not-set', 'signoff-fitup-insp': 'not-set', 'signoff-visual': 'not-set',
      'signoff-fabrication': 'not-set', 'signoff-ndt-root': 'not-set', 'signoff-ndt-each': 'not-set',
      'signoff-ndt-final': 'not-set', 'signoff-ut': 'not-set', 'signoff-mcl': 'not-set', 'signoff-final': 'not-set',
      'edit-ndt': 'not-set', 'edit-fabrication': 'allow', 'edit-inspection': 'allow', 'edit-er-ir': 'allow',
      'admin-routing': 'not-set', 'admin-templates': 'not-set', 'admin-set-step': 'not-set',
    },
  },
  {
    id: 'g5',
    name: 'Project-Admins',
    description: 'Project administrators — full access including admin functions',
    permissions: {
      'signoff-fitup-release': 'allow', 'signoff-fitup-insp': 'allow', 'signoff-visual': 'allow',
      'signoff-fabrication': 'allow', 'signoff-ndt-root': 'allow', 'signoff-ndt-each': 'allow',
      'signoff-ndt-final': 'allow', 'signoff-ut': 'allow', 'signoff-mcl': 'allow', 'signoff-final': 'allow',
      'edit-ndt': 'allow', 'edit-fabrication': 'allow', 'edit-inspection': 'allow', 'edit-er-ir': 'allow',
      'admin-routing': 'allow', 'admin-templates': 'allow', 'admin-set-step': 'allow',
    },
  },
];

@Component({
  selector: 'app-admin-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideShield, LucidePlus, LucideTrash2, LucideCheck, LucideX],
  templateUrl: './admin-teams.component.html',
})
export class AdminTeamsComponent {
  groups = signal<TeamGroup[]>(DEFAULT_GROUPS.map(g => ({ ...g, permissions: { ...g.permissions } })));
  permissions = PERMISSIONS;
  editingId = signal<string | null>(null);
  newGroupName = signal('');
  newGroupDesc = signal('');
  showAddForm = signal(false);

  categories = [...new Set(PERMISSIONS.map(p => p.category))];

  permsForCategory(cat: string): Permission[] {
    return PERMISSIONS.filter(p => p.category === cat);
  }

  cyclePerm(groupId: string, permKey: string) {
    this.groups.update(groups =>
      groups.map(g => {
        if (g.id !== groupId) return g;
        const current = g.permissions[permKey] ?? 'not-set';
        const next = current === 'not-set' ? 'allow' : current === 'allow' ? 'deny' : 'not-set';
        return { ...g, permissions: { ...g.permissions, [permKey]: next } };
      })
    );
  }

  addGroup() {
    const name = this.newGroupName().trim();
    if (!name) return;
    const id = 'g' + Date.now();
    const perms: Record<string, 'allow' | 'deny' | 'not-set'> = {};
    for (const p of PERMISSIONS) perms[p.key] = 'not-set';
    this.groups.update(g => [...g, { id, name, description: this.newGroupDesc().trim(), permissions: perms }]);
    this.newGroupName.set('');
    this.newGroupDesc.set('');
    this.showAddForm.set(false);
  }

  removeGroup(id: string) {
    this.groups.update(g => g.filter(x => x.id !== id));
  }

  permClass(state: string): string {
    if (state === 'allow') return 'badge-success';
    if (state === 'deny') return 'badge-error';
    return 'badge-ghost badge-outline';
  }

  permLabel(state: string): string {
    if (state === 'allow') return 'Allow';
    if (state === 'deny') return 'Deny';
    return '—';
  }
}
