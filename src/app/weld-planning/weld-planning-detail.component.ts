import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucidePencil, LucideArrowLeft } from '@lucide/angular';

import { getJointPlan, type JointPlan, type JointStatus, type JointPriority } from './weld-planning.data';

@Component({
  selector: 'app-weld-planning-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucidePencil, LucideArrowLeft],
  templateUrl: './weld-planning-detail.component.html'
})
export class WeldPlanningDetailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  joint = signal<JointPlan | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const found = getJointPlan(id);
      if (found) {
        this.joint.set(found);
      } else {
        this.router.navigate(['/weld-planning']);
      }
    }
  }

  goBack() {
    this.router.navigate(['/weld-planning']);
  }

  edit() {
    const j = this.joint();
    if (j) this.router.navigate(['/weld-planning', j.id, 'edit']);
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString();
  }

  statusBadgeClass(status: JointStatus): string {
    const map: Record<JointStatus, string> = {
      'planned': 'badge-info',
      'in-progress': 'badge-warning',
      'completed': 'badge-success',
      'on-hold': 'badge-ghost',
      'cancelled': 'badge-error',
    };
    return map[status] || 'badge-ghost';
  }

  priorityBadgeClass(priority: JointPriority): string {
    const map: Record<JointPriority, string> = {
      'low': 'badge-ghost',
      'medium': 'badge-info',
      'high': 'badge-warning',
      'critical': 'badge-error',
    };
    return map[priority] || 'badge-ghost';
  }
}
