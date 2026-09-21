/* work history screen, activity log across jobs */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideSearch, LucideBriefcase, LucideFileSpreadsheet, LucideListFilter, LucideHistory, LucideRotateCcw, LucideArrowLeft, LucideUser, LucideX, LucideChevronRight, LucideChevronDown } from '@lucide/angular';

import { TableState } from '../shared/table-state';
import { TablePagerComponent } from '../shared/table-pager.component';
import { SortHeaderComponent } from '../shared/sort-header.component';

import { JOBS, Job } from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import { HistoryEntry, FABRICATION_FIELDS } from '../data/workflow';
import { MOCK_ACTIVITY } from '../data/mock-history';
import { downloadCsv } from '../data/export-csv';
import { PEOPLE, Person, fullName, searchPeople } from '../data/people';

/* one field edit, or a group of edits made together (children) */
interface ActivityRow extends HistoryEntry {
  key: string;
  jobId: string;
  hull: string;
  drawing: string;
  /* searchable text of a group's field changes */
  detail: string;
  children?: ActivityRow[];
}

/* field edits by the same person on the same job and stage within this gap read as one change */
const GROUP_GAP_MS = 15 * 60 * 1000;
const FABRICATION_LABELS = new Map(FABRICATION_FIELDS.map(f => [f.key, f.label]));

@Component({
  selector: 'app-work-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    TablePagerComponent, SortHeaderComponent,
    LucideSearch, LucideBriefcase, LucideFileSpreadsheet, LucideListFilter, LucideHistory, LucideRotateCcw, LucideArrowLeft,
    LucideUser, LucideX, LucideChevronRight, LucideChevronDown
  ],
  templateUrl: './work-history.component.html'
})
export class WorkHistoryComponent {
  private wfService = inject(WorkflowService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobById = new Map<string, Job>(JOBS.map(j => [j.id, j]));

  back() { this.router.navigate(['/table']); }

  /* person filter: the chosen person, plus the typeahead's text and open state */
  person = signal<Person | null>(null);
  personQuery = signal('');
  suggestOpen = signal(false);
  suggestions = computed(() => searchPeople(this.personQuery()));
  /* job filter: job number or id */
  jobQuery = signal<string>('');
  expanded = signal<ReadonlySet<string>>(new Set());
  deprogressTarget = signal<string | null>(null);
  deprogressComment = signal('');

  table = new TableState<ActivityRow>(
    ['hull', 'who', 'action', 'from', 'to', 'routing', 'detail'],
    {}
  );

  constructor() {
    this.table.setPageSize(15);
    /* seed filters from url for deep links (person by name or identifier) */
    this.route.queryParamMap.subscribe(pm => {
      this.jobQuery.set(pm.get('job') ?? '');
      const p = pm.get('person');
      this.person.set(p ? PEOPLE.find(x => x.id === p || fullName(x) === p) ?? null : null);
      this.table.setGlobalFilter(pm.get('q') ?? '');
    });
    effect(() => this.table.setRows(this.grouped()));
  }

  choosePerson(p: Person) {
    this.person.set(p);
    this.personQuery.set('');
    this.suggestOpen.set(false);
  }

  clearPerson() {
    this.person.set(null);
    this.personQuery.set('');
  }

  toggle(key: string) {
    this.expanded.update(s => {
      const next = new Set(s);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  /* scope label for the header */
  scopeLabel = computed(() => {
    const parts: string[] = [];
    const p = this.person();
    if (p) parts.push(`by ${fullName(p)}`);
    const jq = this.jobQuery().trim();
    if (jq) {
      const match = JOBS.find(j => String(j.id) === jq || j.hull.toLowerCase() === jq.toLowerCase());
      parts.push(`Hull ${match ? match.hull : jq}`);
    }
    return parts.length ? parts.join(' · ') : '(all people)';
  });

  /* all history flattened newest-first, padded with mock activity */
  private allActivity = computed<ActivityRow[]>(() => {
    const rows: ActivityRow[] = [];
    const realJobIds = new Set<string>();
    const add = (e: HistoryEntry, jobId: string) => {
      const job = this.jobById.get(jobId);
      rows.push({
        ...e,
        key: `${jobId}|${e.when}|${e.action}`,
        jobId,
        hull: job?.hull ?? `#${jobId}`,
        drawing: job?.drawing ?? '',
        detail: '',
      });
    };
    for (const wf of this.wfService.allWorkflows()) {
      if (wf.history.length) realJobIds.add(wf.jobId);
      for (const e of wf.history) add(e, wf.jobId);
    }
    for (const m of MOCK_ACTIVITY) {
      if (realJobIds.has(m.jobId)) continue;   // don't double up with real activity
      add(m.entry, m.jobId);
    }
    return rows.sort((a, b) => b.when.localeCompare(a.when));
  });

  /* person + job pre-filters, applied before TableState's own sort/search/column filters */
  private preFiltered = computed<ActivityRow[]>(() => {
    const p = this.person();
    const jq = this.jobQuery().trim().toLowerCase();
    return this.allActivity().filter(r =>
      (!jq || r.jobId.toLowerCase() === jq || r.hull.toLowerCase().includes(jq)) &&
      (!p || r.whoId === p.id || r.who === fullName(p))
    );
  });

  /* Field edits made together (same person, job and stage, close in time) collapse into one
     expandable row. Sign-offs, attachments and every other event stay as their own rows. */
  private grouped = computed<ActivityRow[]>(() => {
    const rows = this.preFiltered();
    const out: ActivityRow[] = [];
    const buckets = new Map<string, ActivityRow[]>();
    for (const r of rows) {
      const isFieldEdit = (r.section === 'Stages' || r.section === 'Fabrication') && r.from !== undefined;
      if (!isFieldEdit) { out.push(r); continue; }
      const k = `${r.jobId}|${r.who}|${r.section}|${this.groupLabel(r)}`;
      buckets.set(k, [...(buckets.get(k) ?? []), r]);
    }
    for (const list of buckets.values()) {
      let run: ActivityRow[] = [];
      const flush = () => { if (run.length) out.push(this.makeGroup(run)); run = []; };
      for (const r of list) {   // newest first
        if (run.length && Date.parse(run[run.length - 1].when) - Date.parse(r.when) > GROUP_GAP_MS) flush();
        run.push(r);
      }
      flush();
    }
    return out.sort((a, b) => b.when.localeCompare(a.when));
  });

  /* "Root" for a stage edit ("Root — Actual PH"), "Fabrication" for fabrication edits */
  private groupLabel(r: ActivityRow): string {
    return r.section === 'Fabrication' ? 'Fabrication' : r.action.split(' — ')[0];
  }

  /* field name shown for one child change */
  fieldName(r: ActivityRow): string {
    if (r.section === 'Fabrication') return FABRICATION_LABELS.get(r.action) ?? r.action;
    return r.action.split(' — ').slice(1).join(' — ') || r.action;
  }

  private makeGroup(run: ActivityRow[]): ActivityRow {
    if (run.length === 1) return run[0];
    const latest = run[0];
    const label = this.groupLabel(latest);
    return {
      ...latest,
      key: `group|${latest.key}`,
      action: `${label} — ${run.length} fields changed`,
      from: undefined,
      to: undefined,
      detail: run.map(c => `${this.fieldName(c)} ${c.from ?? ''} ${c.to ?? ''}`).join(' '),
      children: run,
    };
  }

  /* check if this is the latest signoff entry for a given job */
  isLatestEntry(r: ActivityRow): boolean {
    if (r.section !== 'Sign-off' || r.action?.includes('Re-opened')) return false;
    const jobEntries = this.table.sorted().filter(e =>
      e.jobId === r.jobId && e.section === 'Sign-off' && !e.action?.includes('Re-opened'));
    return jobEntries.length > 0 && jobEntries[0] === r;
  }

  /* go back one routing for a job */
  goBack(jobId: string, comment: string) {
    const job = this.jobById.get(jobId);
    if (!job) return;
    this.wfService.goBackRouting(job, comment);
    this.cancelDeprogress();
  }

  confirmDeprogress(jobId: string) {
    if (!this.deprogressComment().trim()) return;
    this.goBack(jobId, this.deprogressComment().trim());
  }

  cancelDeprogress() {
    this.deprogressTarget.set(null);
    this.deprogressComment.set('');
  }

  clear() {
    this.clearPerson();
    this.jobQuery.set('');
    this.table.clearFilters();
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  /* export filtered rows to csv, one line per field change (groups expand) */
  exportCsv() {
    const p = this.person();
    const name = p ? `work-history-${fullName(p).replace(/[^a-z0-9]+/gi, '-')}` : 'work-history-all';
    downloadCsv(name, [
      { header: 'When',      value: (r: ActivityRow) => new Date(r.when).toLocaleString() },
      { header: 'Who',       value: (r: ActivityRow) => r.who },
      { header: 'Identifier', value: (r: ActivityRow) => r.whoId ?? '' },
      { header: 'Title',     value: (r: ActivityRow) => r.whoTitle ?? '' },
      { header: 'Action',    value: (r: ActivityRow) => r.action },
      { header: 'Old value', value: (r: ActivityRow) => r.from ?? '' },
      { header: 'New value', value: (r: ActivityRow) => r.to ?? '' },
      { header: 'Routing',   value: (r: ActivityRow) => r.routing },
      { header: 'XREFID', value: (r: ActivityRow) => r.jobId },
      { header: 'Hull',      value: (r: ActivityRow) => r.hull }
    ], this.table.sorted().flatMap(r => r.children ?? [r]));
  }
}
