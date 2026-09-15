import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideClipboardList, LucideArrowUpRight, LucideFileText } from '@lucide/angular';

import { ASSIGNMENTS } from '../data/assignments';
import { ROLES, Role, DEFAULT_ROLE } from '../data/workflow';

@Component({
  selector: 'app-my-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideClipboardList, LucideArrowUpRight, LucideFileText],
  templateUrl: './my-assignments.component.html',
})
export class MyAssignmentsComponent {
  private router = inject(Router);

  selectedRole = signal<Role>(DEFAULT_ROLE);
  keyword = signal('');
  roleOptions = ROLES.filter(r => r !== 'View').map(r => ({ label: r, value: r }));

  assignments = computed(() => {
    const role = this.selectedRole();
    let list = role === 'View' ? ASSIGNMENTS : ASSIGNMENTS.filter(a => a.assignedRoles.includes(role));
    const q = this.keyword().toLowerCase().trim();
    if (!q) return list;
    return list.filter(a =>
      a.jobNumber.toLowerCase().includes(q) ||
      a.drawing.toLowerCase().includes(q) ||
      a.step.toLowerCase().includes(q) ||
      a.joint.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q)
    );
  });

  openDetails(jobId: string) {
    this.router.navigate(['/jobs', jobId], { queryParams: { from: 'assignments' } });
  }
}
