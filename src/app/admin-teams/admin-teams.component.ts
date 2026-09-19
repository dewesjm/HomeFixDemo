import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideShield, LucidePlus, LucideChevronLeft } from '@lucide/angular';

interface Permission {
  key: string;
  label: string;
  category: string;
}

interface TeamGroup {
  id: string;
  name: string;
  description: string;
  type: 'Group' | 'Team';
  avatarColor: string;
  memberCount: number;
  permissions: Record<string, 'allow' | 'deny' | 'not-set'>;
}

const PERMISSIONS: Permission[] = [
  // General
  { key: 'view-project', label: 'View project information', category: 'General' },
  { key: 'edit-project', label: 'Edit project-level information', category: 'General' },
  { key: 'delete-project', label: 'Delete project', category: 'General' },
  // Routing & Stages
  { key: 'manage-routing', label: 'Manage routing steps', category: 'Routing & Stages' },
  { key: 'manage-templates', label: 'Manage stage templates', category: 'Routing & Stages' },
  { key: 'force-step', label: 'Force step override', category: 'Routing & Stages' },
  { key: 'view-all-stages', label: 'View all project stages', category: 'Routing & Stages' },
  // Sign-off
  { key: 'signoff-fitup-release', label: 'Sign off Fit-Up Release', category: 'Sign-off' },
  { key: 'signoff-visual', label: 'Sign off Visual Inspection', category: 'Sign-off' },
  { key: 'signoff-fitup-insp', label: 'Sign off Fit-Up Inspection', category: 'Sign-off' },
  { key: 'signoff-fabrication', label: 'Sign off Fabrication', category: 'Sign-off' },
  { key: 'signoff-ndt-root', label: 'Sign off NDT Root Pass', category: 'Sign-off' },
  { key: 'signoff-ndt-each', label: 'Sign off NDT Each Pass', category: 'Sign-off' },
  { key: 'signoff-ndt-final', label: 'Sign off NDT Final', category: 'Sign-off' },
  { key: 'signoff-ut', label: 'Sign off UT', category: 'Sign-off' },
  { key: 'signoff-mcl', label: 'Sign off MCL Verification', category: 'Sign-off' },
  { key: 'signoff-final', label: 'Sign off Final Completion', category: 'Sign-off' },
  // Data Entry
  { key: 'edit-ndt', label: 'Edit NDT data', category: 'Data Entry' },
  { key: 'edit-fabrication', label: 'Edit fabrication fields', category: 'Data Entry' },
  { key: 'edit-inspection', label: 'Edit inspection fields', category: 'Data Entry' },
  { key: 'edit-er-ir', label: 'Enter ER / IR numbers', category: 'Data Entry' },
  // Administration
  { key: 'admin-teams', label: 'Manage teams and permissions', category: 'Administration' },
  { key: 'admin-all', label: 'Full administration access', category: 'Administration' },
];

const COLORS = ['#1976d2', '#e53935', '#f57c00', '#388e3c', '#7b1fa2', '#00838f', '#c2185b', '#5d4037'];

const DEFAULT_GROUPS: TeamGroup[] = [
  {
    id: 'g1', name: 'Project Administrators', description: 'Members of this group can perform all operations in the team project.',
    type: 'Group', avatarColor: '#1976d2', memberCount: 2,
    permissions: Object.fromEntries(PERMISSIONS.map(p => [p.key, 'allow'])),
  },
  {
    id: 'g2', name: 'Welding Inspectors', description: 'Certified welding inspectors with full sign-off authority across all welding stages.',
    type: 'Group', avatarColor: '#388e3c', memberCount: 4,
    permissions: (() => {
      const perms: Record<string, 'allow' | 'deny' | 'not-set'> = {};
      for (const p of PERMISSIONS) {
        if (p.key.startsWith('signoff-') || p.key === 'view-project' || p.key === 'view-all-stages' || p.key.startsWith('edit-')) {
          perms[p.key] = 'allow';
        } else {
          perms[p.key] = 'not-set';
        }
      }
      return perms;
    })(),
  },
  {
    id: 'g3', name: 'NDT Technicians', description: 'NDT technicians authorized to perform and sign off non-destructive testing stages.',
    type: 'Group', avatarColor: '#7b1fa2', memberCount: 3,
    permissions: (() => {
      const perms: Record<string, 'allow' | 'deny' | 'not-set'> = {};
      for (const p of PERMISSIONS) {
        if (['signoff-ndt-root', 'signoff-ndt-each', 'signoff-ndt-final', 'signoff-ut', 'edit-ndt', 'view-project'].includes(p.key)) {
          perms[p.key] = 'allow';
        } else {
          perms[p.key] = 'not-set';
        }
      }
      return perms;
    })(),
  },
  {
    id: 'g4', name: 'Weld Technicians', description: 'Welders and fitters — can enter data but cannot sign off on inspection stages.',
    type: 'Group', avatarColor: '#f57c00', memberCount: 6,
    permissions: (() => {
      const perms: Record<string, 'allow' | 'deny' | 'not-set'> = {};
      for (const p of PERMISSIONS) {
        if (['edit-fabrication', 'edit-inspection', 'edit-er-ir', 'view-project'].includes(p.key)) {
          perms[p.key] = 'allow';
        } else {
          perms[p.key] = 'not-set';
        }
      }
      return perms;
    })(),
  },
  {
    id: 'g5', name: 'Viewers', description: 'Members of this group have read-only access to the team project.',
    type: 'Group', avatarColor: '#5d4037', memberCount: 8,
    permissions: (() => {
      const perms: Record<string, 'allow' | 'deny' | 'not-set'> = {};
      for (const p of PERMISSIONS) {
        perms[p.key] = p.key === 'view-project' ? 'allow' : 'not-set';
      }
      return perms;
    })(),
  },
];

@Component({
  selector: 'app-admin-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideShield, LucidePlus, LucideChevronLeft],
  templateUrl: './admin-teams.component.html',
})
export class AdminTeamsComponent {
  groups = signal<TeamGroup[]>(DEFAULT_GROUPS.map(g => ({ ...g, permissions: { ...g.permissions } })));
  permissions = PERMISSIONS;
  selectedGroupId = signal<string | null>(null);
  showAddForm = signal(false);
  newGroupName = signal('');
  newGroupDesc = signal('');

  selectedGroup = computed(() => this.groups().find(g => g.id === this.selectedGroupId()) ?? null);

  categories = [...new Set(PERMISSIONS.map(p => p.category))];

  permsForCategory(cat: string): Permission[] {
    return PERMISSIONS.filter(p => p.category === cat);
  }

  selectGroup(id: string) {
    this.selectedGroupId.set(id);
  }

  backToList() {
    this.selectedGroupId.set(null);
  }

  updateDesc(groupId: string, value: string) {
    this.groups.update(groups =>
      groups.map(g => g.id !== groupId ? g : { ...g, description: value })
    );
  }

  updatePerm(groupId: string, permKey: string, value: 'allow' | 'deny' | 'not-set') {
    this.groups.update(groups =>
      groups.map(g => g.id !== groupId ? g : { ...g, permissions: { ...g.permissions, [permKey]: value } })
    );
  }

  addGroup() {
    const name = this.newGroupName().trim();
    if (!name) return;
    const id = 'g' + Date.now();
    const color = COLORS[this.groups().length % COLORS.length];
    const perms: Record<string, 'allow' | 'deny' | 'not-set'> = {};
    for (const p of PERMISSIONS) perms[p.key] = 'not-set';
    this.groups.update(g => [...g, {
      id, name, description: this.newGroupDesc().trim(), type: 'Group' as const,
      avatarColor: color, memberCount: 0, permissions: perms,
    }]);
    this.newGroupName.set('');
    this.newGroupDesc.set('');
    this.showAddForm.set(false);
  }

  removeGroup(id: string) {
    this.groups.update(g => g.filter(x => x.id !== id));
    if (this.selectedGroupId() === id) this.selectedGroupId.set(null);
  }

  initials(name: string): string {
    return name.split(/[\s-]+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  permCount(groupId: string, state: 'allow' | 'deny'): number {
    const g = this.groups().find(x => x.id === groupId);
    return g ? Object.values(g.permissions).filter(v => v === state).length : 0;
  }
}
