// "Jobs / Work orders" screen — the p-table of jobs: Job# column, menu column filters,
// role selector, current-step column (from the workflow), History/Details row actions,
// and CSV export.
import { Component, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TableModule, Table } from 'primeng/table';
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
  TRADE_OPTIONS, TECHNICIAN_OPTIONS, STATUS_OPTIONS, TAG_OPTIONS,
  statusLabel as toStatusLabel
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

  constructor(private router: Router, private wfService: WorkflowService) {}

  jobs = JOBS;
  tradeOptions = TRADE_OPTIONS;
  technicianOptions = TECHNICIAN_OPTIONS;
  statusOptions = STATUS_OPTIONS;
  tagOptions = TAG_OPTIONS;

  globalFilterFields = ['jobNumber', 'title', 'technician', 'trade', 'tags'];

  // Columns the built-in p-table CSV export uses (exportCSV reads `this.columns`).
  exportColumns = [
    { field: 'jobNumber',      header: 'Job #' },
    { field: 'id',             header: 'Internal ID' },
    { field: 'title',          header: 'Title' },
    { field: 'trade',          header: 'Trade' },
    { field: 'technician',     header: 'Technician' },
    { field: 'estimatedCost',  header: 'Est. cost' },
    { field: 'estimatedHours', header: 'Est. hours' },
    { field: 'inspectionScore',header: 'Score' },
    { field: 'status',         header: 'Status' },
    { field: 'scheduledFor',   header: 'Scheduled' },
    { field: 'tags',           header: 'Tags' }
  ];

  /** Per-cell formatting for the CSV export (currency, dates, tag lists). */
  exportCell = (cell: { data: any; field: string }): string => {
    switch (cell.field) {
      case 'estimatedCost': return Number(cell.data).toFixed(2);
      case 'scheduledFor':  return new Date(cell.data).toLocaleDateString();
      case 'tags':          return (cell.data as string[]).join('; ');
      default:              return cell.data == null ? '' : String(cell.data);
    }
  };

  totalLoaded = signal(JOBS.length);

  // Role / trade lane selector — narrows the table to one trade.
  selectedRole = signal<Job['trade'] | null>(null);
  displayedJobs = computed(() => {
    const role = this.selectedRole();
    return role ? JOBS.filter(j => j.trade === role) : JOBS;
  });

  statusSeverity(s: Job['status']): 'success' | 'warn' | 'danger' {
    return s === 'completed' ? 'success' : s === 'in-progress' ? 'warn' : 'danger';
  }

  statusLabel(s: Job['status']): string { return toStatusLabel(s); }

  /** The workflow step this job is currently on (from its inspection workflow). */
  currentStep(job: Job): string {
    return currentStepLabel(this.wfService.workflowFor(job)().stages);
  }

  /** Open the read-only Details page for one job. */
  openDetails(job: Job) {
    this.router.navigate(['/jobs', job.id]);
  }

  /** Jump to the Work history page filtered to this job. */
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
