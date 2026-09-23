//This is the main search, with filters, keywords, frozen columns, export to excel call
import { bannerFor } from '../../data/banner';
import { STORAGE } from '../../data/storage-keys';
import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideSearch, LucideListFilter, LucideFileSpreadsheet, LucideHistory, LucideArrowUpRight, LucideCheck, LucideMegaphone, LucideX } from '@lucide/angular';

import { SortHeaderComponent } from '../../shared/sort-header.component';
import { TablePagerComponent } from '../../shared/table-pager.component';
import { SyncStatusComponent } from '../sync-status/sync-status.component';
import { TableState, inArray } from '../../shared/table-state';
import { downloadCsv } from '../../data/export-csv';

import {
  JOBS, Job
} from '../../data/jobs';
import { SignoffService } from '../services/signoff.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { currentRoutingLabel, ROLES, DEFAULT_ROLE, type Role } from '../../data/workflow';

const SEARCH_STATE_KEY = STORAGE.searchState;

type Row = Job & { currentRouting: string };

@Component({
  selector: 'app-pipe-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    SortHeaderComponent, TablePagerComponent, SyncStatusComponent,
    LucideSearch, LucideListFilter, LucideFileSpreadsheet, LucideHistory, LucideArrowUpRight, LucideCheck, LucideMegaphone, LucideX
  ],
  templateUrl: './pipe-search.component.html'
})
export class PipeSearchComponent {
  constructor(private router: Router, private store: WorkflowStore, private signoffService: SignoffService) {
    // Restore saved state
    const saved = this.loadState();
    if (saved['globalFilter']) this.table['globalFilter'].set(saved['globalFilter']);
    if (saved['columnFilters']) this.table['columnFilters'].set(saved['columnFilters']);
    if (saved['sortField']) this.table['sortField'].set(saved['sortField']);
    if (saved['sortOrder']) this.table['sortOrder'].set(saved['sortOrder']);
    if (saved['pageSize']) {
      const valid = [10, 25, 50, 100];
      const ps = Number(saved['pageSize']);
      this.table['pageSize'].set(valid.includes(ps) ? ps : 10);
    }
    if (saved['page'] != null) this.table['page'].set(saved['page']);

    effect(() => this.table.setRows(this.displayedJobs()));
    // Persist filter/sort state on every change
    effect(() => {
      const state = {
        globalFilter: this.table['globalFilter'](),
        columnFilters: this.table['columnFilters'](),
        sortField: this.table['sortField'](),
        sortOrder: this.table['sortOrder'](),
        pageSize: this.table['pageSize'](),
        page: this.table['page'](),
        selectedRole: this.selectedRole(),
      };
      try { localStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(state)); } catch { /* */ }
    });
  }

  private loadState(): Record<string, any> {
    try {
      const raw = localStorage.getItem(SEARCH_STATE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  /* Admin banner — read from localStorage, re-read on construction */
  banner = signal(bannerFor('pipe-welding'));

  roleOptions = ROLES.map(r => ({ label: r, value: r }));

  table = new TableState<Row>(
    ['xrefid', 'hull', 'drawing', 'joint', 'order', 'sequenceNumber'],
    { currentRouting: inArray }
  );

  // Row selection
  selectedIds = signal<Set<string>>(new Set());

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

  toggleSelect(id: string) {
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
      .every(r => r.currentRouting === 'Fit-Up Release');
  });

  releaseSelected() {
    const ids = this.selectedIds();
    for (const job of this.table.paged()) {
      if (ids.has(job.id)) {
        this.signoffService.releaseFitUp(job);
      }
    }
    this.selectedIds.set(new Set());
  }

  // Role droplist to filter selection
  selectedRole = signal<Role>((this.loadState()['selectedRole'] as Role) ?? DEFAULT_ROLE);
  displayedJobs = computed<Row[]>(() => {
    const role = this.selectedRole();
    let rows: Job[];
    if (role === 'View') {
      rows = JOBS;
    } else {
      // Filter jobs where the current unsignoff'd routing has matching role
      rows = JOBS.filter(j => {
        const wf = this.store.workflowFor(j)();
        const current = wf.stages.find(s => s.required && !s.signed);   /* same "current routing" as the routing label */
        const stageRoles = (current?.role ?? '').split('|');
        return stageRoles.includes(role);
      });
    }
    return rows.map(j => ({ ...j, currentRouting: this.currentRouting(j) }));
  });

  /* distinct current-routing values for that column's multiselect filter */
  routingOptions = computed(() =>
    [...new Set(this.displayedJobs().map(r => r.currentRouting))]
      .sort()
      .map(s => ({ label: s, value: s })));

  //The current routing
  currentRouting(job: Job): string {
    return currentRoutingLabel(this.store.workflowFor(job)().stages);
  }

//nav to details
  openDetails(job: Job) {
    this.router.navigate(['/jobs', job.id]);
  }

//nav to history with this job pre-filled
  openHistory(job: Job) {
    this.router.navigate(['/history'], { queryParams: { job: job.id } });
  }

  onRoleChange(role: Role) {
    this.selectedRole.set(role);
    this.table.columnFilters.update(f => ({ ...f, currentRouting: [] }));
  }

  clear() {
    this.table.clearFilters();
    this.selectedRole.set('View');
  }

  exportCsv() {
    downloadCsv('work-orders', [
      { header: 'XREFID', value: (r: Row) => r.xrefid },
      { header: 'Hull', value: (r: Row) => r.hull },
      { header: 'Drawing', value: (r: Row) => r.drawing },
      { header: 'Joint', value: (r: Row) => r.joint },
      { header: 'Order', value: (r: Row) => r.order },
      { header: 'Sequence', value: (r: Row) => r.sequenceNumber },
      { header: 'Current routing', value: (r: Row) => r.currentRouting }
    ], this.table.sorted());
  }
}
