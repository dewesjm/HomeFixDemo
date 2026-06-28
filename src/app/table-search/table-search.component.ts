import { Component, ViewChild, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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

import { Job } from '../data/jobs';
import { JobsApiService } from '../services/jobs-api.service';
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

  private jobsApi = inject(JobsApiService);

  constructor(private router: Router, private wfService: WorkflowService,
              private filterService: FilterService) {
    this.filterService.register('arrayAny',
      (value: string[] | undefined, filter: string[] | undefined): boolean => {
        if (!filter || filter.length === 0) return true;
        if (!value || value.length === 0) return false;
        return filter.some(f => value.includes(f));
      });
  }

  // Fetch all jobs once; p-table handles client-side filtering/sorting/paging from here
  private _page    = toSignal(this.jobsApi.getJobs({ pageSize: '500' }));
  private _options = toSignal(this.jobsApi.getOptions());

  private allJobs = computed(() => this._page()?.items ?? []);

  tradeOptions      = computed(() => this._options()?.trades      ?? []);
  technicianOptions = computed(() => this._options()?.technicians ?? []);
  tagOptions        = computed(() => this._options()?.tags        ?? []);

  loading = computed(() => this._page() === undefined);

  globalFilterFields = ['jobNumber', 'title', 'technician', 'trade', 'tags'];

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

  exportCell = (cell: { data: any; field: string }): string => {
    switch (cell.field) {
      case 'estimatedCost': return Number(cell.data).toFixed(2);
      case 'scheduledFor':  return new Date(cell.data).toLocaleDateString();
      case 'tags':          return (cell.data as string[]).join('; ');
      default:              return cell.data == null ? '' : String(cell.data);
    }
  };

  selectedRole = signal<string | null>(null);

  displayedJobs = computed(() => {
    const role = this.selectedRole();
    const rows = role ? this.allJobs().filter(j => j.trade === role) : this.allJobs();
    return rows.map(j => ({ ...j, currentStep: this.currentStep(j) }));
  });

  stepOptions = computed(() =>
    [...new Set(this.displayedJobs().map(r => r.currentStep))]
      .sort()
      .map(s => ({ label: s, value: s })));

  currentStep(job: Job): string {
    return currentStepLabel(this.wfService.workflowFor(job)().stages);
  }

  openDetails(job: Job) {
    this.router.navigate(['/jobs', job.id]);
  }

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
