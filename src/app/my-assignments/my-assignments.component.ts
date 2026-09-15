import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideClipboardList, LucideArrowUpRight, LucideFileText } from '@lucide/angular';

import { ASSIGNMENTS } from '../data/assignments';

@Component({
  selector: 'app-my-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideClipboardList, LucideArrowUpRight, LucideFileText],
  templateUrl: './my-assignments.component.html',
})
export class MyAssignmentsComponent {
  private router = inject(Router);

  keyword = signal('');

  assignments = computed(() => {
    let list = ASSIGNMENTS;
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
