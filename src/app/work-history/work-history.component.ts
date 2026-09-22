/* work history screen, activity log across jobs */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideSearch, LucideBriefcase, LucideFileSpreadsheet, LucideListFilter, LucideHistory, LucideRotateCcw, LucideArrowLeft, LucideUser, LucideX, LucideChevronRight, LucideChevronDown, LucideChevronsUpDown, LucideChevronsDownUp } from '@lucide/angular';

import { TableState } from '../shared/table-state';
import { TablePagerComponent } from '../shared/table-pager.component';
import { SortHeaderComponent } from '../shared/sort-header.component';

import { JOBS, Job } from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import { HistoryEntry } from '../data/workflow';
import { MOCK_ACTIVITY } from '../data/mock-history';
import { downloadCsv } from '../data/export-csv';
import { PEOPLE, Person, fullName, searchPeople } from '../data/people';

/* one history entry; sign-offs carry inputs (every editable field and its value at that moment) */
interface ActivityRow extends HistoryEntry {
  key: string;
  jobId: string;
  hull: string;
  drawing: string;
  joint: string;
  order: string;
  /* searchable text of the sign-off's field values */
  inputsText: string;
}

@Component({
  selector: 'app-work-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    TablePagerComponent, SortHeaderComponent,
    LucideSearch, LucideBriefcase, LucideFileSpreadsheet, LucideListFilter, LucideHistory, LucideRotateCcw, LucideArrowLeft,
    LucideUser, LucideX, LucideChevronRight, LucideChevronDown, LucideChevronsUpDown, LucideChevronsDownUp
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
  /* job filter: matches XREFID, drawing, joint or order */
  jobQuery = signal<string>('');
  expanded = signal<ReadonlySet<string>>(new Set());
  deprogressTarget = signal<string | null>(null);
  deprogressComment = signal('');

  table = new TableState<ActivityRow>(
    ['jobId', 'hull', 'drawing', 'joint', 'order', 'who', 'whoTitle', 'action', 'from', 'to', 'routing', 'inputsText'],
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
    effect(() => this.table.setRows(this.preFiltered()));
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

  /* every sign-off matching the current filters that has fields to show, across all pages */
  expandableKeys = computed(() => this.table.sorted().filter(r => r.inputs?.length).map(r => r.key));
  allExpanded = computed(() => {
    const keys = this.expandableKeys();
    return keys.length > 0 && keys.every(k => this.expanded().has(k));
  });

  toggleAll() {
    this.expanded.set(this.allExpanded() ? new Set() : new Set(this.expandableKeys()));
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
      const exact = JOBS.find(j => j.id.toLowerCase() === jq.toLowerCase());
      parts.push(exact ? `XREFID ${exact.id}` : `matching "${jq}"`);
    }
    return parts.length ? parts.join(' · ') : '(all people)';
  });

  /* all history flattened newest-first, padded with mock activity */
  private allActivity = computed<ActivityRow[]>(() => {
    const rows: ActivityRow[] = [];
    const realJobIds = new Set<string>();
    /* per-field edits are not shown: History records what was input at each sign-off */
    const add = (e: HistoryEntry, jobId: string) => {
      if (e.section === 'Stages' || e.section === 'Fabrication') return;
      const job = this.jobById.get(jobId);
      rows.push({
        ...e,
        key: `${jobId}|${e.when}|${e.action}`,
        jobId,
        hull: job?.hull ?? `#${jobId}`,
        drawing: job?.drawing ?? '',
        joint: job?.joint ?? '',
        order: job?.order ?? '',
        inputsText: (e.inputs ?? []).map(i => `${i.label} ${i.value}`).join(' '),
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
      (!jq || [r.jobId, r.drawing, r.joint, r.order].some(v => v.toLowerCase().includes(jq))) &&
      (!p || r.whoId === p.id || r.who === fullName(p))
    );
  });

  /* Deprogress is only offered on a job's last sign-off that is still in effect. Computed from the job's
     whole history (not the filtered or sorted rows): a re-open cancels the sign-off before it, and where the
     job's live workflow is loaded the entry must also be its last signed stage, since that is what deprogress reverses. */
  private deprogressable = computed<ReadonlySet<string>>(() => {
    const lastSignedLabel = new Map<string, string | undefined>();
    for (const wf of this.wfService.allWorkflows()) {
      lastSignedLabel.set(wf.jobId, wf.stages.filter(s => s.signed).pop()?.label);
    }
    const byJob = new Map<string, ActivityRow[]>();
    for (const r of this.allActivity()) {
      if (r.section === 'Sign-off') byJob.set(r.jobId, [...(byJob.get(r.jobId) ?? []), r]);
    }
    const keys = new Set<string>();
    for (const [jobId, rows] of byJob) {
      const inEffect: ActivityRow[] = [];
      for (const r of [...rows].sort((a, b) => a.when.localeCompare(b.when))) {
        if (/re-opened/i.test(r.action)) inEffect.pop();
        else inEffect.push(r);
      }
      const last = inEffect[inEffect.length - 1];
      if (!last) continue;
      if (lastSignedLabel.has(jobId) && last.action.split(' — ')[0] !== lastSignedLabel.get(jobId)) continue;
      keys.add(last.key);
    }
    return keys;
  });

  isLatestEntry(r: ActivityRow): boolean {
    return this.deprogressable().has(r.key);
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

  /* export filtered rows to csv; a sign-off becomes one line per field it recorded */
  exportCsv() {
    const p = this.person();
    const name = p ? `work-history-${fullName(p).replace(/[^a-z0-9]+/gi, '-')}` : 'work-history-all';
    type Line = { row: ActivityRow; field: string; value: string };
    const lines: Line[] = this.table.sorted().flatMap(r =>
      r.inputs?.length
        ? r.inputs.map(i => ({ row: r, field: i.label, value: i.value }))
        : [{ row: r, field: '', value: r.to ?? '' }]);
    downloadCsv(name, [
      { header: 'When',       value: (l: Line) => new Date(l.row.when).toLocaleString() },
      { header: 'Who',        value: (l: Line) => l.row.who },
      { header: 'Identifier', value: (l: Line) => l.row.whoId ?? '' },
      { header: 'Title',      value: (l: Line) => l.row.whoTitle ?? '' },
      { header: 'Action',     value: (l: Line) => l.row.action },
      { header: 'Field',      value: (l: Line) => l.field },
      { header: 'Value',      value: (l: Line) => l.value },
      { header: 'Routing',    value: (l: Line) => l.row.routing },
      { header: 'XREFID',     value: (l: Line) => l.row.jobId },
      { header: 'Hull',       value: (l: Line) => l.row.hull },
      { header: 'Drawing',    value: (l: Line) => l.row.drawing },
      { header: 'Joint',      value: (l: Line) => l.row.joint },
      { header: 'Order',      value: (l: Line) => l.row.order }
    ], lines);
  }
}
