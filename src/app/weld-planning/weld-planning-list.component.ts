import { bannerFor } from '../data/banner';
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideTrash2, LucideArrowUpRight, LucideUpload, LucideFileEdit, LucideMegaphone } from '@lucide/angular';

import { TablePagerComponent } from '../shared/table-pager.component';
import { TableState, inArray } from '../shared/table-state';
import { downloadCsv } from '../data/export-csv';
import { ToastService } from '../shared/toast.service';
import { ConfirmService } from '../shared/confirm.service';
import {
  weldJoints, deleteWeldJoint,
  JOINT_STATUS_OPTIONS,
  WELD_JOINT_CSV_COLUMNS, type WeldJoint
} from './weld-planning.data';

type Row = WeldJoint;

@Component({
  selector: 'app-weld-planning-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    TablePagerComponent,
    LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideTrash2, LucideArrowUpRight, LucideUpload, LucideFileEdit, LucideMegaphone
  ],
  template: `
    <div style="max-width: 100%">
        <div class="page-header" style="padding: 0.75rem 1rem">
          <h2 class="section-title">Weld Planning</h2>
          <span class="spacer"></span>
          <button class="btn btn-sm btn-primary" (click)="createNew()">
            <svg lucidePlus class="size-4"></svg> Create
          </button>
          <button class="btn btn-sm" (click)="advancedSearch()">
            <svg lucideSearch class="size-4"></svg> Advanced Search
          </button>
          <button class="btn btn-sm" (click)="importFile()">
            <svg lucideUpload class="size-4"></svg> Import
          </button>
          <button class="btn btn-sm" (click)="massEdit()">
            <svg lucideFileEdit class="size-4"></svg> Mass Edit
          </button>
          <button class="btn btn-sm" (click)="exportCsv()">
            <svg lucideFileSpreadsheet class="size-4"></svg> Export
          </button>
        </div>

        @if (banner(); as b) {
          <div class="alert text-sm mx-1 mb-2"
               [class.alert-info]="b.type === 'info'"
               [class.alert-warning]="b.type === 'warning'"
               [class.alert-error]="b.type === 'error'"
               [class.alert-success]="b.type === 'success'">
            <svg lucideMegaphone class="size-4"></svg>
            <span>{{ b.message }}</span>
          </div>
        }

        <div class="facet-row" style="margin: 0 1rem 0.75rem">
          <div style="position: relative; flex: 1 1 280px">
            <svg lucideSearch class="size-4" style="position: absolute; left: 0.5rem; top: 50%; transform: translateY(-50%); color: var(--app-text-muted)"></svg>
            <input
              class="input input-sm w-full search-input"
              style="padding-left: 2rem"
              placeholder="Search joints..."
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
          <button class="btn btn-sm btn-ghost" (click)="clearFilters()">
            Clear
          </button>
        </div>

        <div style="overflow-x: auto; padding: 0 1rem">
          <table class="table table-sm">
            <thead>
              <tr>
                <th (click)="table.toggleSort('id')" style="cursor: pointer; min-width: 5rem">
                  XREFID {{ sortIcon('id') }}
                </th>
                <th (click)="table.toggleSort('hull')" style="cursor: pointer; min-width: 6rem">
                  Hull {{ sortIcon('hull') }}
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
                <th style="min-width: 7rem">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of table.paged(); track row.id) {
                <tr>
                  <td class="mono fw-bold">{{ row.id }}</td>
                  <td>{{ row.hull }}</td>
                  <td>{{ row.joint }}</td>
                  <td>{{ row.jointType === 'pipe' ? 'Pipe' : 'Structural' }}</td>
                  <td class="mono">{{ row.drawing }}</td>
                  <td class="mono">{{ row.jointDesign }}</td>
                  <td>{{ row.weldType }}</td>
                  <td>{{ statusLabel(row.status) }}</td>
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
                  <td colspan="8" class="empty">No joints found.</td>
                </tr>
              }
            </tbody>
          </table>
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
  private statusMap: Record<string, string> = Object.fromEntries(JOINT_STATUS_OPTIONS.map(o => [o.value, o.label]));

  statusFilter = '';

  banner = signal(bannerFor('weld-planning'));

  statusLabel(value: string): string {
    return this.statusMap[value] ?? value;
  }

  table = new TableState<Row>(
    ['id', 'hull', 'joint', 'jointType', 'drawing', 'jointDesign', 'weldType'],
    {
      status: inArray,
    }
  );

  constructor() {
    effect(() => this.table.setRows(weldJoints()));
  }

  sortIcon(field: string): string {
    if (this.table.sortField() !== field) return '';
    return this.table.sortOrder() === 1 ? '\u25B2' : '\u25BC';
  }

  onStatusFilterChange(val: string) {
    this.table.setColumnFilter('status', val ? [val] : []);
  }

  clearFilters() {
    this.statusFilter = '';
    this.table.clearFilters();
  }

  createNew() {
    this.router.navigate(['/weld-planning/new']);
  }

  advancedSearch() {
    this.router.navigate(['/weld-planning/search']);
  }

  importFile() {
    this.router.navigate(['/weld-planning/import']);
  }

  massEdit() {
    this.router.navigate(['/weld-planning/import'], { queryParams: { mode: 'edit' } });
  }

  editRow(row: WeldJoint) {
    this.router.navigate(['/weld-planning', row.id, 'edit']);
  }

  deleteRow(row: WeldJoint) {
    this.confirm.confirm({
      header: 'Delete Joint',
      message: `Delete ${row.jointNumber}?`,
      acceptLabel: 'Delete',
      accept: () => {
        deleteWeldJoint(row.id);
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: `${row.jointNumber} deleted` });
      }
    });
  }

  exportCsv() {
    downloadCsv('weld-planning-export', WELD_JOINT_CSV_COLUMNS, this.table.sorted());
    this.toast.add({ severity: 'info', summary: 'Exported', detail: 'CSV download started' });
  }
}