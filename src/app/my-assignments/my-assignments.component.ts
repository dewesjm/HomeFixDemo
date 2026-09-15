import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideClipboardList, LucideArrowUpRight, LucideClock, LucideAlertTriangle,
  LucideCircleCheck, LucideCalendar, LucideUser
} from '@lucide/angular';

import { ASSIGNMENTS, Assignment, AssignmentPriority } from '../data/assignments';
import { ROLES, Role, DEFAULT_ROLE } from '../data/workflow';

@Component({
  selector: 'app-my-assignments',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    LucideClipboardList, LucideArrowUpRight, LucideClock, LucideAlertTriangle,
    LucideCircleCheck, LucideCalendar, LucideUser
  ],
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

  stats = computed(() => {
    const all = this.assignments();
    return {
      total: all.length,
      urgent: all.filter(a => a.status === 'urgent').length,
      high: all.filter(a => a.status === 'high').length,
      overdue: all.filter(a => a.dueDate < new Date().toISOString().slice(0, 10)).length,
    };
  });

  openDetails(jobId: string) {
    this.router.navigate(['/jobs', jobId]);
  }

  priorityClass(p: AssignmentPriority): string {
    if (p === 'urgent') return 'badge-error';
    if (p === 'high') return 'badge-warning';
    if (p === 'normal') return 'badge-info';
    return 'badge-ghost';
  }

  isOverdue(dueDate: string): boolean {
    return dueDate < new Date().toISOString().slice(0, 10);
  }

  daysUntil(dueDate: string): string {
    const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    return `${diff}d left`;
  }
}
