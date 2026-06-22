//This is the main search, with filters, keywords, frozen columns, export to excel call
import { Component, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TableModule, Table } from 'primeng/table';
import { FilterService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { SliderModule } from 'primeng/slider';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

import {
  JOBS, Job,
  TRADE_OPTIONS, TECHNICIAN_OPTIONS, TAG_OPTIONS
} from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import { currentStepLabel } from '../data/workflow';

@Component({
  selector: 'app-table-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, InputTextModule, IconFieldModule, InputIconModule,
    MultiSelectModule, SliderModule, DatePickerModule,
    TagModule, RatingModule, ButtonModule, SelectModule
  ],
  templateUrl: './table-search.component.html'
})
export class TableSearchComponent {
  @ViewChild('dt') dt!: Table;

  constructor(private router: Router, private wfService: WorkflowService,
              private filterService: FilterService) {
    // Built-in match modes are scalar-only; register one that matches an array
    // (job.tags) against any of the selected values, for the Tags column filter.
    this.filterService.register('arrayAny',
      (value: string[] | undefined, filter: string[] | undefined): boolean => {
        if (!filter || filter.length === 0) return true;
        if (!value || value.length === 0) return false;
        return filter.some(f => value.includes(f));
      });
  }

  jobs = JOBS;
  tradeOptions = TRADE_OPTIONS;
  technicianOptions = TECHNICIAN_OPTIONS;
  tagOptions = TAG_OPTIONS;

  globalFilterFields = ['jobNumber', 'title', 'technician', 'trade', 'tags'];

  /* columns for built-in p-table csv export */
  exportColumns = [
    { field: 'jobNumber',      header: 'Job #' },
    { field: 'id',             header: 'Internal ID' },
    { field: 'title',          header: 'Title' },
    { field: 'trade',          header: 'Trade' },
    { field: 'technician',     header: 'Technician' },
    { field: 'estimatedCost',  header: 'Est. cost' },
    { field: 'estimatedHours', header: 'Est. hours' },
    { field: 'inspectionScore',header: 'Score' },
    { field: 'scheduledFor',   header: 'Scheduled' },
    { field: 'tags',           header: 'Tags' }
  ];

  /** Per-cell formatting for the CSV export for special cases, just to prove we can format stuff */
  exportCell = (cell: { data: any; field: string }): string => {
    switch (cell.field) {
      case 'estimatedCost': return Number(cell.data).toFixed(2);
      case 'scheduledFor':  return new Date(cell.data).toLocaleDateString();
      case 'tags':          return (cell.data as string[]).join('; ');
      default:              return cell.data == null ? '' : String(cell.data);
    }
  };

  totalLoaded = signal(JOBS.length);

  // Role droplist to filter selection
  selectedRole = signal<Job['trade'] | null>(null);
  displayedJobs = computed(() => {
    const role = this.selectedRole();
    const rows = role ? JOBS.filter(j => j.trade === role) : JOBS;
    // Materialize the derived "current step" onto each row so the column can
    // sort and filter on a real field (p-table can't bind those to a method).
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

  clear(table: Table, globalInput: HTMLInputElement) {
    table.clear();
    globalInput.value = '';
  }

  applyGlobal(table: Table, value: string) {
    table.filterGlobal(value, 'contains');
  }
}
