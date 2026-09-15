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
  roleOptions = ROLES.filter(r => r !== 'View').map(r => ({ label: r, value: r }));

  assignments = computed(() => {
    const role = this.selectedRole();
    if (role === 'View') return ASSIGNMENTS;
    return ASSIGNMENTS.filter(a => a.assignedRoles.includes(role));
  });

  openDetails(jobId: string) {
    this.router.navigate(['/jobs', jobId]);
  }
}
