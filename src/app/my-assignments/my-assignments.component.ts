import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideClipboardList, LucideArrowUpRight, LucideFileText, LucideMegaphone, LucideChevronRight, LucideChevronDown } from '@lucide/angular';

import { ASSIGNMENTS, Assignment } from '../data/assignments';
import { JOBS } from '../data/jobs';
import { bannerFor } from '../data/banner';

@Component({
  selector: 'app-my-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideClipboardList, LucideArrowUpRight, LucideFileText, LucideMegaphone, LucideChevronRight, LucideChevronDown],
  templateUrl: './my-assignments.component.html',
})
export class MyAssignmentsComponent {
  private router = inject(Router);

  keyword = signal('');
  banner = signal(bannerFor('all'));

  /* demo only: lets you show that different roles' assignments come from different source systems;
     defaults to Welding since that's the role with the most to show */
  roleFilter = signal('Welding');
  roles = [...new Set(ASSIGNMENTS.flatMap(a => a.assignedRoles))].sort();

  assignments = computed(() => {
    let list = ASSIGNMENTS;
    const role = this.roleFilter();
    if (role) list = list.filter(a => a.assignedRoles.includes(role));
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

  /* row click expands/collapses; the Details button (own click, stopped from bubbling) navigates */
  expanded = signal<ReadonlySet<string>>(new Set());
  toggle(id: string) {
    this.expanded.update(s => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /* demo only: purely decorative bar widths for the Charge barcode, derived from the charge digits */
  barcodeBars(charge: string): number[] {
    return charge.split('').map(ch => 1 + (ch.charCodeAt(0) % 4));
  }
}
