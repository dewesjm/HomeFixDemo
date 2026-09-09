//This is the main search, with filters, keywords, frozen columns, export to excel call
import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideSearch, LucideListFilter, LucideFileSpreadsheet, LucideHistory, LucideArrowUpRight } from '@lucide/angular';

import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';
import { TablePagerComponent } from '../shared/table-pager.component';
import { TableState, inArray } from '../shared/table-state';
import { downloadCsv } from '../data/export-csv';

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
    MultiselectDropdownComponent, TablePagerComponent,
    LucideSearch, LucideListFilter, LucideFileSpreadsheet, LucideHistory, LucideArrowUpRight
  ],
  templateUrl: './table-search.component.html'
})
export class TableSearchComponent {
  constructor(private router: Router, private wfService: WorkflowService) {
    effect(() => this.table.setRows(this.displayedJobs()));
  }

  roleOptions = ROLES.map(r => ({ label: r, value: r }));

  table = new TableState<Row>(
    ['title'],
    {
      title: (v, f) => String(v).toLowerCase().includes(String(f).toLowerCase()),
      currentStep: inArray,
    }
  );

  totalLoaded = signal(JOBS.length);

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
        return current?.role === role;
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
      { header: 'Title', value: (r: Row) => r.title },
      { header: 'Current step', value: (r: Row) => r.currentStep }
    ], this.table.sorted());
  }
}
