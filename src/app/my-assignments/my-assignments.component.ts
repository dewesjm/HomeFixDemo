import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideClipboardList, LucideArrowUpRight, LucideFileText, LucideMegaphone } from '@lucide/angular';

import { ASSIGNMENTS } from '../data/assignments';

@Component({
  selector: 'app-my-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideClipboardList, LucideArrowUpRight, LucideFileText, LucideMegaphone],
  templateUrl: './my-assignments.component.html',
})
export class MyAssignmentsComponent implements OnInit {
  private router = inject(Router);

  keyword = signal('');
  banner = signal<{ message: string; type: string; enabled: boolean } | null>(null);

  ngOnInit() {
    this.loadBanner();
  }

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

  private loadBanner() {
    try {
      const raw = localStorage.getItem('homefix:banner');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.enabled && data.message) {
          this.banner.set(data);
        } else {
          this.banner.set(null);
        }
      } else {
        this.banner.set(null);
      }
    } catch {
      this.banner.set(null);
    }
  }
}
