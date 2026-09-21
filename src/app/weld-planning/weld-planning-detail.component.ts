import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucidePencil, LucideArrowLeft } from '@lucide/angular';

import { getWeldJoint, NDT_FIELDS, type WeldJoint } from './weld-planning.data';

@Component({
  selector: 'app-weld-planning-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucidePencil, LucideArrowLeft],
  templateUrl: './weld-planning-detail.component.html'
})
export class WeldPlanningDetailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ndtFields = NDT_FIELDS;
  joint = signal<WeldJoint | null>(null);
  isLocked = computed(() => this.joint()?.status === 'locked');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const found = getWeldJoint(id);
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
    if (j && j.status !== 'locked') {
      this.router.navigate(['/weld-planning', j.id, 'edit']);
    }
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString();
  }
}
