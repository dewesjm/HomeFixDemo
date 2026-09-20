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
  jointPlans, deleteJointPlan,
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
        <div class="page-header" style="padding: 0.75rem 1rem">
          <h2 class="section-title">Weld Planning</h2>
          <span class="match-count">{{ table.total() }} joint plans</span>
          <span class="spacer"></span>
          <button class="btn btn-sm btn-primary" (click)="createNew()">
            <svg lucidePlus class="size-4"></svg> Create
          </button>
          <button class="btn btn-sm" (click)="exportCsv()">
            <svg lucideFileSpreadsheet class="size-4"></svg> Export
          </button>
        </div>

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

        <div style="overflow-x: auto; padding: 0 1rem">
          <table class="table table-sm">
            <thead>
              <tr>
                <th (click)="table.toggleSort('id')" style="cursor: pointer; min-width: 5rem">
                  ID {{ sortIcon('id') }}
                </th>
                <th (click)="table.toggleSort('projectNumber')" style="cursor: pointer; min-width: 6rem">
                  Project {{ sortIcon('projectNumber') }}
                </th>
                <th (click)="table.toggleSort('joint')" style="cursor: pointer; min-width: 5rem">
                  Joint {{ sortIcon('joint') }}
                </th>
                <th (click)="table.toggleSort('jointType')" style="cursor: pointer; min-width: 6rem">
                  Type {{ sortIcon('jointType') }}
                </th>
                <th (click)="table.toggleSort('drawing')" style="cursor: pointer; min-width: 6rem">
                  Drawing {{ sortIcon('drawing') }}
                </th>
                <th (click)="table.toggleSort('jointDesign')" style="cursor: pointer; min-width: 6rem">
                  Design {{ sortIcon('jointDesign') }}
                </th>
                <th (click)="table.toggleSort('weldType')" style="cursor: pointer; min-width: 5rem">
                  Weld {{ sortIcon('weldType') }}
                </th>
                <th (click)="table.toggleSort('status')" style="cursor: pointer; min-width: 7rem">
                  Status {{ sortIcon('status') }}
                </th>
                <th (click)="table.toggleSort('priority')" style="cursor: pointer; min-width: 6rem">
                  Priority {{ sortIcon('priority') }}
                </th>
                <th (click)="table.toggleSort('assignedTo')" style="cursor: pointer; min-width: 7rem">
                  Assigned {{ sortIcon('assignedTo') }}
                </th>
                <th style="min-width: 7rem">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of table.paged(); track row.id) {
                <tr>
                  <td class="mono fw-bold">{{ row.id }}</td>
                  <td>{{ row.projectNumber }}</td>
                  <td>{{ row.joint }}</td>
                  <td>
                    <span class="badge badge-sm" [class]="row.jointType === 'pipe' ? 'badge-info' : 'badge-warning'">
                      {{ row.jointType }}
                    </span>
                  </td>
                  <td class="mono">{{ row.drawing }}</td>
                  <td class="mono">{{ row.jointDesign }}</td>
                  <td>{{ row.weldType }}</td>
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
                  <td>{{ row.assignedTo }}</td>
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

  statusOptions = JOINT_STATUS_OPTIONS;
  priorityOptions = JOINT_PRIORITY_OPTIONS;

  statusFilter = '';
  priorityFilter = '';

  table = new TableState<Row>(
    ['id', 'projectNumber', 'joint', 'jointType', 'drawing', 'jointDesign', 'weldType', 'assignedTo'],
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