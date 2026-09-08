//This is the main search, with filters, keywords, frozen columns, export to excel call
import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideSearch, LucideListFilter, LucideFileSpreadsheet, LucideHistory, LucideArrowUpRight } from '@lucide/angular';

import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';
import { DateRangeComponent } from '../shared/date-range.component';
import { TablePagerComponent } from '../shared/table-pager.component';
import { TableState, arrayAny, inArray, numberBetween, dateBetween } from '../shared/table-state';
import { downloadCsv } from '../data/export-csv';

import {
  JOBS, Job,
  TRADE_OPTIONS, TECHNICIAN_OPTIONS, TAG_OPTIONS
} from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import { currentStepLabel, getTradeOptions } from '../data/workflow';

type Row = Job & { currentStep: string };

@Component({
  selector: 'app-table-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MultiselectDropdownComponent, DateRangeComponent, TablePagerComponent,
    LucideSearch, LucideListFilter, LucideFileSpreadsheet, LucideHistory, LucideArrowUpRight
  ],
  templateUrl: './table-search.component.html'
})
export class TableSearchComponent {
  constructor(private router: Router, private wfService: WorkflowService) {
    effect(() => this.table.setRows(this.displayedJobs()));
  }

  tradeOptions = getTradeOptions();
  technicianOptions = TECHNICIAN_OPTIONS;
  tagOptions = TAG_OPTIONS;

  table = new TableState<Row>(
    ['jobNumber', 'title', 'technician', 'trade', 'tags'],
    {
      jobNumber: (v, f) => String(v).toLowerCase().includes(String(f).toLowerCase()),
      title: (v, f) => String(v).toLowerCase().includes(String(f).toLowerCase()),
      trade: inArray,
      technician: inArray,
      currentStep: inArray,
      tags: arrayAny,
      estimatedCost: numberBetween,
      scheduledFor: dateBetween
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

  costMin = computed<number | null>(() => this.table.columnFilters()['estimatedCost']?.[0] ?? null);
  costMax = computed<number | null>(() => this.table.columnFilters()['estimatedCost']?.[1] ?? null);
  setCostRange(min: number | string | null, max: number | string | null) {
    const m = min === '' || min == null ? null : Number(min);
    const x = max === '' || max == null ? null : Number(max);
    this.table.setColumnFilter('estimatedCost', m == null && x == null ? null : [m, x]);
  }

  scheduledFrom = computed<Date | null>(() => this.table.columnFilters()['scheduledFor']?.[0] ?? null);
  scheduledTo = computed<Date | null>(() => this.table.columnFilters()['scheduledFor']?.[1] ?? null);
  setScheduledRange([from, to]: [Date | null, Date | null]) {
    this.table.setColumnFilter('scheduledFor', !from && !to ? null : [from, to]);
  }

  exportCsv() {
    downloadCsv('work-orders', [
      { header: 'Job #', value: (r: Row) => r.jobNumber },
      { header: 'Internal ID', value: (r: Row) => r.id },
      { header: 'Title', value: (r: Row) => r.title },
      { header: 'Trade', value: (r: Row) => r.trade },
      { header: 'Technician', value: (r: Row) => r.technician },
      { header: 'Est. cost', value: (r: Row) => Number(r.estimatedCost).toFixed(2) },
      { header: 'Est. hours', value: (r: Row) => r.estimatedHours },
      { header: 'Score', value: (r: Row) => r.inspectionScore },
      { header: 'Scheduled', value: (r: Row) => new Date(r.scheduledFor).toLocaleDateString() },
      { header: 'Tags', value: (r: Row) => r.tags.join('; ') }
    ], this.table.sorted());
  }
}
