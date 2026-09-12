//This is the main search, with filters, keywords, frozen columns, export to excel call
import { Component, computed, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideSearch, LucideListFilter, LucideFileSpreadsheet, LucideHistory, LucideArrowUpRight, LucideMenu, LucideCheck } from '@lucide/angular';

import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';
import { TablePagerComponent } from '../shared/table-pager.component';
import { SyncStatusComponent } from '../sync-status/sync-status.component';
import { TableState, inArray } from '../shared/table-state';
import { downloadCsv } from '../data/export-csv';
import { AppComponent } from '../app.component';

import {
  JOBS, Job
} from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import { currentStepLabel, ROLES, DEFAULT_ROLE, type Role } from '../data/workflow';

type Row = Job & { currentStep: string };

@Component({
  selector: 'app-table-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MultiselectDropdownComponent, TablePagerComponent, SyncStatusComponent,
    LucideSearch, LucideListFilter, LucideFileSpreadsheet, LucideHistory, LucideArrowUpRight, LucideMenu, LucideCheck
  ],
  templateUrl: './table-search.component.html'
})
export class TableSearchComponent {
  private app = inject(AppComponent);

  constructor(private router: Router, private wfService: WorkflowService) {
    effect(() => this.table.setRows(this.displayedJobs()));
  }

  toggleMenu() { this.app.toggle(); }

  roleOptions = ROLES.map(r => ({ label: r, value: r }));

  table = new TableState<Row>(
    ['jobNumber', 'title', 'drawing', 'joint'],
    {
      jobNumber: (v, f) => String(v).toLowerCase().includes(String(f).toLowerCase()),
      title: (v, f) => String(v).toLowerCase().includes(String(f).toLowerCase()),
      drawing: (v, f) => String(v).toLowerCase().includes(String(f).toLowerCase()),
      joint: (v, f) => String(v).toLowerCase().includes(String(f).toLowerCase()),
      currentStep: inArray,
    }
  );

  totalLoaded = signal(JOBS.length);

  // Row selection
  selectedIds = signal<Set<number>>(new Set());

  toggleSelectAll() {
    const all = this.table.paged();
    const current = this.selectedIds();
    const allSelected = all.every(r => current.has(r.id));
    if (allSelected) {
      const next = new Set(current);
      all.forEach(r => next.delete(r.id));
      this.selectedIds.set(next);
    } else {
      const next = new Set(current);
      all.forEach(r => next.add(r.id));
      this.selectedIds.set(next);
    }
  }

  toggleSelect(id: number) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selectedIds.set(next);
  }

  allSelected(): boolean {
    const all = this.table.paged();
    return all.length > 0 && all.every(r => this.selectedIds().has(r.id));
  }

  canReleaseSelected = computed(() => {
    if (this.selectedRole() !== 'Foreman') return false;
    const ids = this.selectedIds();
    if (ids.size === 0) return false;
    return this.table.paged()
      .filter(r => ids.has(r.id))
      .every(r => r.currentStep === 'Fit-Up Release');
  });

  releaseSelected() {
    const ids = this.selectedIds();
    for (const job of this.table.paged()) {
      if (ids.has(job.id)) {
        this.wfService.releaseFitUp(job);
      }
    }
    this.selectedIds.set(new Set());
  }

  // Role droplist to filter selection
  selectedRole = signal<Role>(DEFAULT_ROLE);
  displayedJobs = computed<Row[]>(() => {
    const role = this.selectedRole();
    let rows: Job[];
    if (role === 'View') {
      rows = JOBS;
    } else {
      // Filter jobs where the current unsignoff'd step has matching role
      rows = JOBS.filter(j => {
        const wf = this.wfService.workflowFor(j)();
        const current = wf.stages.find(s => !s.signed);
        const stageRoles = (current?.role ?? '').split('|');
        return stageRoles.includes(role);
      });
    }
    return rows.map(j => ({ ...j, currentStep: this.currentStep(j) }));
  });

  /* distinct current-step values for that column's multiselect filter */
  stepOptions = computed(() =>
    [...new Set(this.displayedJobs().map(r => r.currentStep))]
      .sort()
      .map(s => ({ label: s, value: s })));

  //The workflow step
  currentStep(job: Job): string {
    return currentStepLabel(this.wfService.workflowFor(job)().stages);
  }

//nav to details
  openDetails(job: Job) {
    this.router.navigate(['/jobs', job.id]);
  }

//nav to history with this job pre-filled
  openHistory(job: Job) {
    this.router.navigate(['/history'], { queryParams: { job: job.id } });
  }

  clear() {
    this.table.clearFilters();
    this.selectedRole.set('View');
  }

  exportCsv() {
    downloadCsv('work-orders', [
      { header: 'ID', value: (r: Row) => r.jobNumber },
      { header: 'Title', value: (r: Row) => r.title },
      { header: 'Drawing', value: (r: Row) => r.drawing },
      { header: 'Joint', value: (r: Row) => r.joint },
      { header: 'Current step', value: (r: Row) => r.currentStep }
    ], this.table.sorted());
  }
}
