// "Work history" screen — activity log aggregated across all jobs, filterable by
// person and by job (job filter arrives via the ?job= query param).
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

import { JOBS, Job } from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import { HistoryEntry } from '../data/workflow';
import { MOCK_ACTIVITY } from '../data/mock-history';
import { downloadCsv } from '../data/export-csv';

interface ActivityRow extends HistoryEntry {
  jobId: number;
  jobTitle: string;
  trade: Job['trade'];
}

@Component({
  selector: 'app-work-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    SelectModule, InputTextModule, IconFieldModule, InputIconModule, TagModule, ButtonModule
  ],
  templateUrl: './work-history.component.html'
})
export class WorkHistoryComponent {
  private wfService = inject(WorkflowService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobById = new Map<number, Job>(JOBS.map(j => [j.id, j]));

  person = signal<string | null>(null);
  query = signal<string>('');
  jobFilter = signal<number | null>(null);

  constructor() {
    // Seed filters from the URL so deep links (e.g. the row's History button) work.
    this.route.queryParamMap.subscribe(pm => {
      const job = pm.get('job');
      this.jobFilter.set(job ? Number(job) : null);
      this.person.set(pm.get('person'));
      this.query.set(pm.get('q') ?? '');
    });
  }

  /** Everyone who is assigned a job or appears in an activity log. */
  people = computed(() => {
    const set = new Set<string>();
    for (const j of JOBS) set.add(j.technician);
    for (const r of this.allActivity()) if (r.who) set.add(r.who);
    return [...set].sort().map(p => ({ label: p, value: p }));
  });

  /** Every job as a filter option — searchable by id, job number, or title. */
  jobOptions = JOBS.map(j => ({ label: `#${j.id} · ${j.jobNumber} · ${j.title}`, value: j.id }));

  /** Human label for the active scope, shown in the activity header. */
  scopeLabel = computed(() => {
    const parts: string[] = [];
    if (this.person()) parts.push(`by ${this.person()}`);
    const id = this.jobFilter();
    if (id) parts.push(this.jobById.get(id)?.title ?? `Job #${id}`);
    return parts.length ? parts.join(' · ') : '(all people)';
  });

  /** Every history entry across every job, flattened and dated newest-first. Real
   *  (user-created) activity is supplemented with seeded mock activity for jobs the
   *  user hasn't touched, so the demo screen looks populated. */
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
        jobTitle: job?.title ?? `Job #${m.jobId}`,
        trade: job?.trade ?? 'Inspection'
      });
    }
    return rows.sort((a, b) => b.when.localeCompare(a.when));
  });

  activity = computed<ActivityRow[]>(() => {
    const p = this.person();
    const job = this.jobFilter();
    const q = this.query().trim().toLowerCase();
    return this.allActivity().filter(r =>
      (!job || r.jobId === job) &&
      (!p || r.who === p) &&
      (!q || `${r.jobTitle} ${r.change} ${r.section} ${r.step}`.toLowerCase().includes(q))
    );
  });

  clear() {
    this.person.set(null);
    this.jobFilter.set(null);
    this.query.set('');
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  /** Export the currently filtered activity rows to CSV. */
  exportCsv() {
    const who = this.person();
    const name = who ? `work-history-${who.replace(/[^a-z0-9]+/gi, '-')}` : 'work-history-all';
    downloadCsv(name, [
      { header: 'When',    value: r => new Date(r.when).toLocaleString() },
      { header: 'Who',     value: r => r.who },
      { header: 'Section', value: r => r.section },
      { header: 'Change',  value: r => r.change },
      { header: 'Step',    value: r => r.step },
      { header: 'Job #',   value: r => r.jobId },
      { header: 'Job',     value: r => r.jobTitle },
      { header: 'Trade',   value: r => r.trade }
    ], this.activity());
  }
}
