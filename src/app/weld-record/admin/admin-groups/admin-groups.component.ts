import { Component, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { ConfirmService } from '../../../shared/confirm.service';

interface Permission {
  key: string;
  label: string;
  category: string;
}

interface AdminGroup {
  id: string;
  name: string;
  description: string;
  avatarColor: string;
  memberCount: number;
  permissions: Record<string, 'allow' | 'deny' | 'not-set'>;
}

const PERMISSIONS: Permission[] = [
  // Routing
  { key: 'manage-routing', label: 'Manage routing', category: 'Routing' },
  { key: 'force-routing', label: 'Force routing override', category: 'Routing' },
  // Sign-off
  { key: 'signoff-pre-fit', label: 'Sign off Pre-Fit', category: 'Sign-off' },
  { key: 'signoff-fit', label: 'Sign off Fit', category: 'Sign-off' },
  { key: 'signoff-tack', label: 'Sign off Tack', category: 'Sign-off' },
  { key: 'signoff-fitup-insp', label: 'Sign off Fit-Up Insp', category: 'Sign-off' },
  { key: 'signoff-fitup-release', label: 'Sign off Fit-Up Release', category: 'Sign-off' },
  { key: 'signoff-deferred-tack', label: 'Sign off Deferred Tack', category: 'Sign-off' },
  { key: 'signoff-root', label: 'Sign off Root', category: 'Sign-off' },
  { key: 'signoff-layer', label: 'Sign off Layer', category: 'Sign-off' },
  { key: 'signoff-final-weld', label: 'Sign off Final Weld', category: 'Sign-off' },
  { key: 'signoff-root-ndt', label: 'Sign off Root NDT', category: 'Sign-off' },
  { key: 'signoff-layer-ndt', label: 'Sign off Layer NDT', category: 'Sign-off' },
  { key: 'signoff-final-ndt', label: 'Sign off Final NDT', category: 'Sign-off' },
  { key: 'signoff-repair', label: 'Sign off Repair', category: 'Sign-off' },
  { key: 'signoff-excavation-ndt', label: 'Sign off Excavation NDT', category: 'Sign-off' },
  { key: 'signoff-engineering-hold', label: 'Sign off Engineering Hold', category: 'Sign-off' },
  { key: 'signoff-review-o63', label: 'Sign off O63 Records Review', category: 'Sign-off' },
  { key: 'signoff-review-o04', label: 'Sign off O04 Records Review', category: 'Sign-off' },
  { key: 'signoff-sold', label: 'Sign off Sold', category: 'Sign-off' },
  // Data Entry
  { key: 'edit-fabrication', label: 'Edit fabrication fields', category: 'Data Entry' },
  // Administration
  { key: 'admin-groups', label: 'Manage groups and permissions', category: 'Administration' },
  { key: 'admin-tables', label: 'Maintain other admin tables', category: 'Administration' },
];

const COLORS = ['#1976d2', '#e53935', '#f57c00', '#388e3c', '#7b1fa2', '#00838f', '#c2185b', '#5d4037'];

/* sets the listed permissions to allow and every other one to not-set */
function allowOnly(keys: string[]): Record<string, 'allow' | 'deny' | 'not-set'> {
  return Object.fromEntries(PERMISSIONS.map(p => [p.key, keys.includes(p.key) ? 'allow' : 'not-set']));
}

/* one sample group per persona (the Persona column in Admin > Routing Settings), plus Administrators */
const DEFAULT_GROUPS: AdminGroup[] = [
  {
    id: 'g1', name: 'Administrators', description: 'Maintain groups and the other admin tables.',
    avatarColor: COLORS[0], memberCount: 2,
    permissions: allowOnly(['admin-groups', 'admin-tables']),
  },
  {
    id: 'g2', name: 'Fitting', description: 'Fitters who sign off the Fit step.',
    avatarColor: COLORS[1], memberCount: 6,
    permissions: allowOnly(['signoff-fit', 'edit-fabrication']),
  },
  {
    id: 'g3', name: 'Welding', description: 'Welders who sign off Tack, Root, Layer and Final Weld.',
    avatarColor: COLORS[2], memberCount: 8,
    permissions: allowOnly(['signoff-tack', 'signoff-deferred-tack', 'signoff-root', 'signoff-layer', 'signoff-final-weld', 'edit-fabrication']),
  },
  {
    id: 'g4', name: 'Foreman', description: 'Foremen who sign off Fit-Up Insp, Fit-Up Release and Repair.',
    avatarColor: COLORS[3], memberCount: 3,
    permissions: allowOnly(['signoff-fitup-insp', 'signoff-fitup-release', 'signoff-repair', 'edit-fabrication']),
  },
  {
    id: 'g5', name: 'Inspector', description: 'Inspectors who sign off Fit-Up Insp and the NDT steps.',
    avatarColor: COLORS[4], memberCount: 4,
    permissions: allowOnly(['signoff-fitup-insp', 'signoff-root-ndt', 'signoff-layer-ndt', 'signoff-final-ndt', 'signoff-excavation-ndt']),
  },
  {
    id: 'g6', name: 'NQC Inspector', description: 'NQC Inspectors who sign off Pre-Fit, and Fit-Up Insp and the NDT steps on N Ind. 1 or 2 joints.',
    avatarColor: COLORS[5], memberCount: 2,
    permissions: allowOnly(['signoff-pre-fit', 'signoff-fitup-insp', 'signoff-root-ndt', 'signoff-layer-ndt', 'signoff-final-ndt']),
  },
  {
    id: 'g7', name: 'O63 Records', description: 'O63 Records, who sign off O63 Records Review and Sold.',
    avatarColor: COLORS[6], memberCount: 2,
    permissions: allowOnly(['signoff-review-o63', 'signoff-sold']),
  },
  {
    id: 'g8', name: 'O04 Records', description: 'O04 Records, who sign off O04 Records Review.',
    avatarColor: COLORS[7], memberCount: 2,
    permissions: allowOnly(['signoff-review-o04']),
  },
  {
    id: 'g9', name: 'Engineering', description: 'Engineers who sign off Engineering Hold and can force a routing override.',
    avatarColor: COLORS[0], memberCount: 3,
    permissions: allowOnly(['signoff-engineering-hold', 'manage-routing', 'force-routing']),
  },
  {
    id: 'g10', name: 'View', description: 'Read-only access; no sign-offs.',
    avatarColor: COLORS[1], memberCount: 10,
    permissions: allowOnly([]),
  },
];

@Component({
  selector: 'app-admin-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent, LucideChevronLeft, LucideChevronRight],
  templateUrl: './admin-groups.component.html',
})
export class AdminGroupsComponent {
  private confirm = inject(ConfirmService);
  groups = signal<AdminGroup[]>(DEFAULT_GROUPS.map(g => ({ ...g, permissions: { ...g.permissions } })));
  table = new TableState<AdminGroup>(['name', 'description']);

  constructor() {
    effect(() => this.table.setRows(this.groups()));
  }

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
      id, name, description: this.newGroupDesc().trim(),
      avatarColor: color, memberCount: 0, permissions: perms,
    }]);
    this.newGroupName.set('');
    this.newGroupDesc.set('');
    this.showAddForm.set(false);
  }

  removeGroup(id: string) {
    const name = this.groups().find(g => g.id === id)?.name ?? 'this group';
    this.confirm.confirmDelete(name, () => {
      this.groups.update(g => g.filter(x => x.id !== id));
      if (this.selectedGroupId() === id) this.selectedGroupId.set(null);
    });
  }

  initials(name: string): string {
    return name.split(/[\s-]+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  permCount(groupId: string, state: 'allow' | 'deny'): number {
    const g = this.groups().find(x => x.id === groupId);
    return g ? Object.values(g.permissions).filter(v => v === state).length : 0;
  }
}
