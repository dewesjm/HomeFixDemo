import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideClipboardList, LucideArrowUpRight, LucideFileText, LucideMegaphone } from '@lucide/angular';

import { ASSIGNMENTS, Assignment } from '../data/assignments';
import { JOBS } from '../data/jobs';
import { bannerFor } from '../data/banner';

@Component({
  selector: 'app-my-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideClipboardList, LucideArrowUpRight, LucideFileText, LucideMegaphone],
  templateUrl: './my-assignments.component.html',
})
export class MyAssignmentsComponent {
  private router = inject(Router);

  keyword = signal('');
  banner = signal(bannerFor('all'));

  assignments = computed(() => {
    let list = ASSIGNMENTS;
    const q = this.keyword().toLowerCase().trim();
    if (!q) return list;
    return list.filter(a =>
      a.hull.toLowerCase().includes(q) ||
      a.drawing.toLowerCase().includes(q) ||
      a.routing.toLowerCase().includes(q) ||
      a.joint.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q)
    );
  });

  /* XREFID is sometimes blank (mock data imperfection); a job's real key is hull + drawing + joint */
  openDetails(a: Assignment) {
    const job = JOBS.find(j => j.hull === a.hull && j.drawing === a.drawing && j.joint === a.joint);
    if (job) this.router.navigate(['/jobs', job.id], { queryParams: { from: 'assignments' } });
  }
}
