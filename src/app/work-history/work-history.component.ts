/* work history screen, activity log across jobs */
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

import { JOBS, Job, TRADE_OPTIONS } from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import { HistoryEntry } from '../data/workflow';
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
    TableModule, SelectModule, MultiSelectModule, InputTextModule,
    IconFieldModule, InputIconModule, TagModule, ButtonModule
  ],
  templateUrl: './work-history.component.html'
})
export class WorkHistoryComponent {
  private wfService = inject(WorkflowService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobById = new Map<number, Job>(JOBS.map(j => [j.id, j]));

  tradeOptions = TRADE_OPTIONS;

  person = signal<string | null>(null);
  query = signal<string>('');
  /* job filter: job number or id */
  jobQuery = signal<string>('');

  constructor() {
    /* seed filters from url for deep links */
    this.route.queryParamMap.subscribe(pm => {
      this.jobQuery.set(pm.get('job') ?? '');
      this.person.set(pm.get('person'));
      this.query.set(pm.get('q') ?? '');
    });
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
      parts.push(match ? match.title : `job “${jq}”`);
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
          jobTitle: job?.title ?? `Job #${wf.jobId}`,
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
        jobTitle: job?.title ?? `Job #${m.jobId}`,
        trade: job?.trade ?? 'Inspection'
      });
    }
    return rows.sort((a, b) => b.when.localeCompare(a.when));
  });

  activity = computed<ActivityRow[]>(() => {
    const p = this.person();
    const jq = this.jobQuery().trim().toLowerCase();
    const q = this.query().trim().toLowerCase();
    return this.allActivity().filter(r =>
      (!jq || String(r.jobId) === jq || r.jobNumber.toLowerCase().includes(jq)) &&
      (!p || r.who === p) &&
      (!q || `${r.jobTitle} ${r.action} ${r.from ?? ''} ${r.to ?? ''} ${r.step}`.toLowerCase().includes(q))
    );
  });

  clear() {
    this.person.set(null);
    this.jobQuery.set('');
    this.query.set('');
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  /* export filtered rows to csv */
  exportCsv() {
    const who = this.person();
    const name = who ? `work-history-${who.replace(/[^a-z0-9]+/gi, '-')}` : 'work-history-all';
    downloadCsv(name, [
      { header: 'When',      value: r => new Date(r.when).toLocaleString() },
      { header: 'Who',       value: r => r.who },
      { header: 'Action',    value: r => r.action },
      { header: 'Old value', value: r => r.from ?? '' },
      { header: 'New value', value: r => r.to ?? '' },
      { header: 'Step',      value: r => r.step },
      { header: 'Job #',     value: r => r.jobId },
      { header: 'Job',       value: r => r.jobTitle },
      { header: 'Trade',     value: r => r.trade }
    ], this.activity());
  }
}
