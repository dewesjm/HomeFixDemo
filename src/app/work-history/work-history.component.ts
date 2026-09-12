/* work history screen, activity log across jobs */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideSearch, LucideBriefcase, LucideFileSpreadsheet, LucideListFilter, LucideHistory, LucideRotateCcw, LucideArrowLeft } from '@lucide/angular';

import { TableState, inArray } from '../shared/table-state';
import { TablePagerComponent } from '../shared/table-pager.component';
import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';

import { JOBS, Job } from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import { HistoryEntry, getTradeOptions } from '../data/workflow';
import { MOCK_ACTIVITY } from '../data/mock-history';
import { downloadCsv } from '../data/export-csv';

interface ActivityRow extends HistoryEntry {
  jobId: number;
  jobNumber: string;
  jobTitle: string;
  trade: Job['trade'];
}

@Component({
  selector: 'app-work-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    TablePagerComponent, MultiselectDropdownComponent,
    LucideSearch, LucideBriefcase, LucideFileSpreadsheet, LucideListFilter, LucideHistory, LucideRotateCcw, LucideArrowLeft
  ],
  templateUrl: './work-history.component.html'
})
export class WorkHistoryComponent {
  private wfService = inject(WorkflowService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobById = new Map<number, Job>(JOBS.map(j => [j.id, j]));

  back() { this.router.navigate(['/table']); }

  tradeOptions = getTradeOptions();

  person = signal<string | null>(null);
  /* job filter: job number or id */
  jobQuery = signal<string>('');

  table = new TableState<ActivityRow>(
    ['jobTitle', 'action', 'from', 'to', 'step'],
    { trade: inArray }
  );

  constructor() {
    this.table.setPageSize(15);
    /* seed filters from url for deep links */
    this.route.queryParamMap.subscribe(pm => {
      this.jobQuery.set(pm.get('job') ?? '');
      this.person.set(pm.get('person'));
      this.table.setGlobalFilter(pm.get('q') ?? '');
    });
    effect(() => this.table.setRows(this.preFiltered()));
  }

  /* people with a job or activity entry */
  people = computed(() => {
    const set = new Set<string>();
    for (const j of JOBS) set.add(j.technician);
    for (const r of this.allActivity()) if (r.who) set.add(r.who);
    return [...set].sort().map(p => ({ label: p, value: p }));
  });

  /* scope label for the header */
  scopeLabel = computed(() => {
    const parts: string[] = [];
    if (this.person()) parts.push(`by ${this.person()}`);
    const jq = this.jobQuery().trim();
    if (jq) {
      const match = JOBS.find(j => String(j.id) === jq || j.jobNumber.toLowerCase() === jq.toLowerCase());
      parts.push(match ? match.title : `project "${jq}"`);
    }
    return parts.length ? parts.join(' · ') : '(all people)';
  });

  /* all history flattened newest-first, padded with mock activity */
  private allActivity = computed<ActivityRow[]>(() => {
    const rows: ActivityRow[] = [];
    const realJobIds = new Set<number>();
    for (const wf of this.wfService.allWorkflows()) {
      const job = this.jobById.get(wf.jobId);
      if (wf.history.length) realJobIds.add(wf.jobId);
      for (const e of wf.history) {
        rows.push({
          ...e,
          jobId: wf.jobId,
          jobNumber: job?.jobNumber ?? '',
          jobTitle: job?.title ?? `Project #${wf.jobId}`,
          trade: job?.trade ?? 'Inspection'
        });
      }
    }
    for (const m of MOCK_ACTIVITY) {
      if (realJobIds.has(m.jobId)) continue;   // don't double up with real activity
      const job = this.jobById.get(m.jobId);
      rows.push({
        ...m.entry,
        jobId: m.jobId,
        jobNumber: job?.jobNumber ?? '',
        jobTitle: job?.title ?? `Project #${m.jobId}`,
        trade: job?.trade ?? 'Inspection'
      });
    }
    return rows.sort((a, b) => b.when.localeCompare(a.when));
  });

  /* person + job pre-filters, applied before TableState's own sort/search/column filters */
  private preFiltered = computed<ActivityRow[]>(() => {
    const p = this.person();
    const jq = this.jobQuery().trim().toLowerCase();
    return this.allActivity().filter(r =>
      (!jq || String(r.jobId) === jq || r.jobNumber.toLowerCase().includes(jq)) &&
      (!p || r.who === p)
    );
  });

  /* check if this is the latest entry for a given job */
  isLatestEntry(r: ActivityRow): boolean {
    const jobEntries = this.table.sorted().filter(e => e.jobId === r.jobId);
    return jobEntries.length > 0 && jobEntries[0] === r;
  }

  /* go back one step for a job */
  goBack(jobId: number) {
    const job = this.jobById.get(jobId);
    if (!job) return;
    this.wfService.goBackStep(job);
  }

  clear() {
    this.person.set(null);
    this.jobQuery.set('');
    this.table.clearFilters();
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  /* export filtered rows to csv */
  exportCsv() {
    const who = this.person();
    const name = who ? `work-history-${who.replace(/[^a-z0-9]+/gi, '-')}` : 'work-history-all';
    downloadCsv(name, [
      { header: 'When',      value: (r: ActivityRow) => new Date(r.when).toLocaleString() },
      { header: 'Who',       value: (r: ActivityRow) => r.who },
      { header: 'Action',    value: (r: ActivityRow) => r.action },
      { header: 'Old value', value: (r: ActivityRow) => r.from ?? '' },
      { header: 'New value', value: (r: ActivityRow) => r.to ?? '' },
      { header: 'Step',      value: (r: ActivityRow) => r.step },
      { header: 'Project #', value: (r: ActivityRow) => r.jobId },
      { header: 'Project',   value: (r: ActivityRow) => r.jobTitle },
      { header: 'Trade',     value: (r: ActivityRow) => r.trade }
    ], this.table.sorted());
  }
}
