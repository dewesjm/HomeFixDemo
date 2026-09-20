import { Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideTrash2, LucideArrowUpRight } from '@lucide/angular';

import { TablePagerComponent } from '../shared/table-pager.component';
import { TableState, inArray } from '../shared/table-state';
import { downloadCsv } from '../data/export-csv';
import { ToastService } from '../shared/toast.service';
import { ConfirmService } from '../shared/confirm.service';
import {
  jointPlans, jointPlanStats, deleteJointPlan,
  JOINT_STATUS_OPTIONS, JOINT_PRIORITY_OPTIONS,
  JOINT_PLAN_CSV_COLUMNS, type JointPlan, type JointStatus, type JointPriority
} from './weld-planning.data';

type Row = JointPlan;

@Component({
  selector: 'app-weld-planning-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    TablePagerComponent,
    LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideTrash2, LucideArrowUpRight
  ],
  template: `
    <div class="table-page-wrap">
      <div class="flex-1" style="overflow-y: auto">
        <!-- Page header -->
        <div class="page-header" style="padding: 0.75rem 1rem">
          <h2 class="section-title">Weld Planning</h2>
          <span class="match-count">{{ table.total() }} joint plans</span>
          <span class="spacer"></span>
          <button class="btn btn-sm btn-primary" (click)="createNew()">
            <svg lucidePlus class="size-4"></svg> New Joint Plan
          </button>
          <button class="btn btn-sm" (click)="exportCsv()">
            <svg lucideFileSpreadsheet class="size-4"></svg> Export
          </button>
        </div>

        <!-- Stats row -->
        <div style="display: flex; gap: 0.75rem; padding: 0 1rem; margin-bottom: 0.75rem; flex-wrap: wrap">
          <div class="stat-box">
            <div style="font-size: 1.25rem; font-weight: 700">{{ stats().total }}</div>
            <div style="font-size: 0.75rem; color: var(--app-text-muted)">Total</div>
          </div>
          <div class="stat-box" (click)="filterByStatus('planned')" style="cursor: pointer">
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--color-info)">{{ stats().planned }}</div>
            <div style="font-size: 0.75rem; color: var(--app-text-muted)">Planned</div>
          </div>
          <div class="stat-box" (click)="filterByStatus('in-progress')" style="cursor: pointer">
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--color-warning)">{{ stats().inProgress }}</div>
            <div style="font-size: 0.75rem; color: var(--app-text-muted)">In Progress</div>
          </div>
          <div class="stat-box" (click)="filterByStatus('completed')" style="cursor: pointer">
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--color-success)">{{ stats().completed }}</div>
            <div style="font-size: 0.75rem; color: var(--app-text-muted)">Completed</div>
          </div>
          <div class="stat-box" (click)="filterByStatus('on-hold')" style="cursor: pointer">
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--color-warning)">{{ stats().onHold }}</div>
            <div style="font-size: 0.75rem; color: var(--app-text-muted)">On Hold</div>
          </div>
        </div>

        <!-- Search + filters -->
        <div class="facet-row" style="margin: 0 1rem 0.75rem">
          <div style="position: relative; flex: 1 1 280px">
            <svg lucideSearch class="size-4" style="position: absolute; left: 0.5rem; top: 50%; transform: translateY(-50%); color: var(--app-text-muted)"></svg>
            <input
              class="input input-sm w-full search-input"
              style="padding-left: 2rem"
              placeholder="Search joint plans..."
              [ngModel]="table.globalFilter()"
              (ngModelChange)="table.setGlobalFilter($event)"
            />
          </div>
          <select class="select select-sm" [(ngModel)]="statusFilter" (ngModelChange)="onStatusFilterChange($event)">
            <option value="">All Statuses</option>
            @for (opt of statusOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
          <select class="select select-sm" [(ngModel)]="priorityFilter" (ngModelChange)="onPriorityFilterChange($event)">
            <option value="">All Priorities</option>
            @for (opt of priorityOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
          <button class="btn btn-sm btn-ghost" (click)="clearFilters()">
            Clear
          </button>
        </div>

        <!-- Table -->
        <div style="overflow-x: auto; padding: 0 1rem">
          <table class="table table-sm">
            <thead>
              <tr>
                <th (click)="table.toggleSort('jointNumber')" style="cursor: pointer; min-width: 6rem">
                  Joint # {{ sortIcon('jointNumber') }}
                </th>
                <th (click)="table.toggleSort('title')" style="cursor: pointer; min-width: 12rem">
                  Title {{ sortIcon('title') }}
                </th>
                <th (click)="table.toggleSort('status')" style="cursor: pointer; min-width: 7rem">
                  Status {{ sortIcon('status') }}
                </th>
                <th (click)="table.toggleSort('priority')" style="cursor: pointer; min-width: 6rem">
                  Priority {{ sortIcon('priority') }}
                </th>
                <th (click)="table.toggleSort('jointDesign')" style="cursor: pointer; min-width: 6rem">
                  Design {{ sortIcon('jointDesign') }}
                </th>
                <th (click)="table.toggleSort('weldType')" style="cursor: pointer; min-width: 5rem">
                  Weld {{ sortIcon('weldType') }}
                </th>
                <th (click)="table.toggleSort('pipeSize')" style="cursor: pointer; min-width: 5rem">
                  Size {{ sortIcon('pipeSize') }}
                </th>
                <th (click)="table.toggleSort('assignedTo')" style="cursor: pointer; min-width: 7rem">
                  Assigned {{ sortIcon('assignedTo') }}
                </th>
                <th (click)="table.toggleSort('scheduledDate')" style="cursor: pointer; min-width: 7rem">
                  Scheduled {{ sortIcon('scheduledDate') }}
                </th>
                <th (click)="table.toggleSort('location')" style="cursor: pointer; min-width: 8rem">
                  Location {{ sortIcon('location') }}
                </th>
                <th style="min-width: 7rem">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of table.paged(); track row.id) {
                <tr>
                  <td class="mono fw-bold">{{ row.jointNumber }}</td>
                  <td>
                    <a [routerLink]="['/weld-planning', row.id]" class="link link-primary" style="text-decoration: none">
                      {{ row.title }}
                    </a>
                  </td>
                  <td>
                    <span class="badge badge-sm" [class]="statusBadgeClass(row.status)">
                      {{ row.status }}
                    </span>
                  </td>
                  <td>
                    <span class="badge badge-sm" [class]="priorityBadgeClass(row.priority)">
                      {{ row.priority }}
                    </span>
                  </td>
                  <td class="mono">{{ row.jointDesign }}</td>
                  <td>{{ row.weldType }}</td>
                  <td>{{ row.pipeSize }}</td>
                  <td>{{ row.assignedTo }}</td>
                  <td>{{ formatDate(row.scheduledDate) }}</td>
                  <td>{{ row.location }}</td>
                  <td>
                    <div class="row-tight">
                      <a [routerLink]="['/weld-planning', row.id]"
                         class="btn btn-xs btn-ghost"
                         title="View details">
                        <svg lucideArrowUpRight class="size-3"></svg>
                      </a>
                      <button class="btn btn-xs btn-ghost" (click)="editRow(row)" title="Edit">
                        <svg lucidePencil class="size-3"></svg>
                      </button>
                      <button class="btn btn-xs btn-ghost text-error" (click)="deleteRow(row)" title="Delete">
                        <svg lucideTrash2 class="size-3"></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="11" class="empty">No joint plans found.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <app-table-pager [state]="table" />
    </div>
  `
})
export class WeldPlanningListComponent {
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  stats = jointPlanStats;
  statusOptions = JOINT_STATUS_OPTIONS;
  priorityOptions = JOINT_PRIORITY_OPTIONS;

  statusFilter = '';
  priorityFilter = '';

  table = new TableState<Row>(
    ['jointNumber', 'title', 'jointDesign', 'weldType', 'assignedTo', 'location'],
    {
      status: inArray,
      priority: inArray,
    }
  );

  constructor() {
    effect(() => this.table.setRows(jointPlans()));
  }

  sortIcon(field: string): string {
    if (this.table.sortField() !== field) return '';
    return this.table.sortOrder() === 1 ? '\u25B2' : '\u25BC';
  }

  onStatusFilterChange(val: string) {
    this.table.setColumnFilter('status', val ? [val] : []);
  }

  onPriorityFilterChange(val: string) {
    this.table.setColumnFilter('priority', val ? [val] : []);
  }

  filterByStatus(status: JointStatus) {
    this.statusFilter = status;
    this.table.setColumnFilter('status', [status]);
  }

  clearFilters() {
    this.statusFilter = '';
    this.priorityFilter = '';
    this.table.clearFilters();
  }

  createNew() {
    this.router.navigate(['/weld-planning/new']);
  }

  editRow(row: JointPlan) {
    this.router.navigate(['/weld-planning', row.id, 'edit']);
  }

  deleteRow(row: JointPlan) {
    this.confirm.confirm({
      header: 'Delete Joint Plan',
      message: `Delete ${row.jointNumber} - ${row.title}?`,
      acceptLabel: 'Delete',
      accept: () => {
        deleteJointPlan(row.id);
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: `${row.jointNumber} deleted` });
      }
    });
  }

  exportCsv() {
    downloadCsv('weld-planning-export', JOINT_PLAN_CSV_COLUMNS, this.table.sorted());
    this.toast.add({ severity: 'info', summary: 'Exported', detail: 'CSV download started' });
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString();
  }

  statusBadgeClass(status: JointStatus): string {
    const map: Record<JointStatus, string> = {
      'planned': 'badge-info',
      'in-progress': 'badge-warning',
      'completed': 'badge-success',
      'on-hold': 'badge-ghost',
      'cancelled': 'badge-error',
    };
    return map[status] || 'badge-ghost';
  }

  priorityBadgeClass(priority: JointPriority): string {
    const map: Record<JointPriority, string> = {
      'low': 'badge-ghost',
      'medium': 'badge-info',
      'high': 'badge-warning',
      'critical': 'badge-error',
    };
    return map[priority] || 'badge-ghost';
  }
}
