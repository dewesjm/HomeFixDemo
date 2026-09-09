//This is the main search, with filters, keywords, frozen columns, export to excel call
import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideSearch, LucideListFilter, LucideFileSpreadsheet, LucideHistory, LucideArrowUpRight } from '@lucide/angular';

import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';
import { TablePagerComponent } from '../shared/table-pager.component';
import { TableState, arrayAny, inArray } from '../shared/table-state';
import { downloadCsv } from '../data/export-csv';

import {
  JOBS, Job,
  TAG_OPTIONS
} from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import { currentStepLabel, getTradeOptions } from '../data/workflow';

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

  tradeOptions = getTradeOptions();
  tagOptions = TAG_OPTIONS;

  table = new TableState<Row>(
    ['title', 'tags'],
    {
      title: (v, f) => String(v).toLowerCase().includes(String(f).toLowerCase()),
      currentStep: inArray,
      tags: arrayAny,
    }
  );

  totalLoaded = signal(JOBS.length);

  // Role droplist to filter selection
  selectedRole = signal<Job['trade'] | null>(null);
  displayedJobs = computed<Row[]>(() => {
    const role = this.selectedRole();
    const rows = role ? JOBS.filter(j => j.trade === role) : JOBS;
    // Materialize the derived "current step" onto each row so the column can
    // sort and filter on a real field.
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
    this.selectedRole.set(null);
  }

  exportCsv() {
    downloadCsv('work-orders', [
      { header: 'Title', value: (r: Row) => r.title },
      { header: 'Current step', value: (r: Row) => r.currentStep },
      { header: 'Tags', value: (r: Row) => r.tags.join('; ') }
    ], this.table.sorted());
  }
}
