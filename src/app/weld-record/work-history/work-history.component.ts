/* work history screen, activity log across jobs */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideSearch, LucideBriefcase, LucideFileSpreadsheet, LucideListFilter, LucideHistory, LucideRotateCcw, LucideArrowLeft, LucideArrowUpRight, LucideChevronRight, LucideChevronDown, LucideChevronsUpDown, LucideChevronsDownUp } from '@lucide/angular';

import { TableState, inArray } from '../../shared/table-state';
import { TablePagerComponent } from '../../shared/table-pager.component';
import { SortHeaderComponent } from '../../shared/sort-header.component';
import { ConfirmService } from '../../shared/confirm.service';
import { PersonSearchInputComponent } from '../../shared/person-search-input.component';

import { JOBS, Job } from '../../data/jobs';
import { RoutingService } from '../services/routing.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { HistoryEntry, WorkflowStage, getTemplates } from '../../data/workflow';
import { MOCK_ACTIVITY } from '../../data/mock-history';
import { downloadCsv } from '../../data/export-csv';
import { PEOPLE, Person, fullName } from '../../data/people';
import { CorrectStageDialogComponent, CorrectTarget } from './correct-stage-dialog.component';
import { LucidePencil } from '@lucide/angular';

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
    CommonModule, FormsModule,
    TablePagerComponent, SortHeaderComponent, CorrectStageDialogComponent, PersonSearchInputComponent,
    LucideSearch, LucideBriefcase, LucideFileSpreadsheet, LucideListFilter, LucideHistory, LucideRotateCcw, LucideArrowLeft, LucideArrowUpRight,
    LucideChevronRight, LucideChevronDown, LucideChevronsUpDown, LucideChevronsDownUp, LucidePencil
  ],
  templateUrl: './work-history.component.html'
})
export class WorkHistoryComponent {
  private store = inject(WorkflowStore);
  private wfService = inject(RoutingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private confirmSvc = inject(ConfirmService);
  private jobById = new Map<string, Job>(JOBS.map(j => [j.id, j]));

  back() { this.router.navigate(['/pipe-search']); }
  openDetails(jobId: string) { this.router.navigate(['/jobs', jobId], { queryParams: { from: 'history' } }); }

  /* person filter: the chosen person (search assist itself is app-person-search-input) */
  person = signal<Person | null>(null);
  /* job filter: matches XREFID, drawing, joint or order */
  jobQuery = signal<string>('');
  expanded = signal<ReadonlySet<string>>(new Set());
  /* nested "Fabrication at this sign-off" toggle, independent of the row's own expand state */
  fabExpanded = signal<ReadonlySet<string>>(new Set());

  table = new TableState<ActivityRow>(
    ['jobId', 'hull', 'drawing', 'joint', 'order', 'who', 'whoTitle', 'action', 'from', 'to', 'routing', 'inputsText'],
    {
      /* match the formatted date shown in the column, not the raw ISO timestamp */
      when: (rowValue: string, val: string) =>
        new Date(rowValue).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
          .toLowerCase().includes(String(val).toLowerCase()),
      routing: inArray,
    }
  );

  /* canonical stage order (first appearance across every trade's template), so the routing
     filter reads like the actual workflow sequence instead of alphabetically; anything not a
     real stage (e.g. 'All stages complete') sorts to the end */
  private routingOrder = computed(() => {
    const order = new Map<string, number>();
    let i = 0;
    for (const stages of Object.values(getTemplates())) {
      for (const s of stages) {
        const label = s.displayName || s.label;
        if (!order.has(label)) order.set(label, i++);
      }
    }
    return order;
  });

  /* distinct routing values among the pre-filtered rows, for the Routing column's multiselect */
  routingOptions = computed(() => {
    const order = this.routingOrder();
    return [...new Set(this.preFiltered().map(r => r.routing))]
      .sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || a.localeCompare(b))
      .map(s => ({ label: s, value: s }));
  });

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
  }

  clearPerson() {
    this.person.set(null);
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

  toggleFab(key: string) {
    this.fabExpanded.update(s => {
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
        inputsText: [...(e.inputs ?? []), ...(e.fabInputs ?? [])].map(i => `${i.label} ${i.value}`).join(' '),
      });
    };
    for (const wf of this.store.allWorkflows()) {
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

  /* Deprogress is only offered on a job's last sign-off that is still in effect. A job with undo entries
     (signed in this app) offers it on the sign-off its newest undo entry belongs to. Otherwise (seeded demo
     signoffs) it's computed from the job's whole history (not the filtered or sorted rows): a deprogress
     cancels the sign-off before it, and where the job's live workflow is loaded the entry must also be its
     last signed stage, since that is what deprogress reverses then. */
  private deprogressable = computed<ReadonlySet<string>>(() => {
    const lastSigned = new Map<string, WorkflowStage | undefined>();
    const undoTop = new Map<string, string>();
    for (const wf of this.store.allWorkflows()) {
      lastSigned.set(wf.jobId, wf.stages.filter(s => s.signed).pop());
      const top = wf.undo?.at(-1);
      if (top) undoTop.set(wf.jobId, top.historyWhen);
    }
    const keys = new Set<string>();
    const byJob = new Map<string, ActivityRow[]>();
    for (const r of this.allActivity()) {
      if (undoTop.has(r.jobId)) {
        if (r.when === undoTop.get(r.jobId) && (r.section === 'Sign-off' || r.section === 'Release')) keys.add(r.key);
        continue;
      }
      if (r.section === 'Sign-off') byJob.set(r.jobId, [...(byJob.get(r.jobId) ?? []), r]);
    }
    for (const [jobId, rows] of byJob) {
      const inEffect: ActivityRow[] = [];
      for (const r of [...rows].sort((a, b) => a.when.localeCompare(b.when))) {
        if (/deprogressed/i.test(r.action)) inEffect.pop();
        else inEffect.push(r);
      }
      const last = inEffect[inEffect.length - 1];
      if (!last) continue;
      /* only distrust the activity log where the live workflow actually has a signed stage to
         compare against — a job whose live workflow exists but has nothing signed yet (e.g. just
         from being listed in a table) isn't the source of this row's mock history, so there's
         nothing real to contradict it */
      /* by stage id where the row has one: the action text can name the routing option instead of
         the stage (Weld Build-Up, Interim/Final Layer). Older saved entries use an em-dash separator. */
      const expected = lastSigned.get(jobId);
      if (expected && (last.stageId ? last.stageId !== expected.id : last.action.split(/ [-—] /)[0] !== expected.label)) continue;
      keys.add(last.key);
    }
    return keys;
  });

  isLatestEntry(r: ActivityRow): boolean {
    return this.deprogressable().has(r.key);
  }

  /* Correct is offered on a stage's current sign-off record: the latest Sign-off-section entry
     for that (job, stage) pair, as long as it's not itself a deprogress (a deprogressed stage has nothing
     signed to correct) and the live stage is still actually signed — mirrors deprogressable's
     "trust the live workflow over the log" caveat, but per-stage instead of per-job's last stage,
     since Correct can fix an earlier stage even after later ones have since been signed. */
  private correctable = computed<ReadonlySet<string>>(() => {
    const byStage = new Map<string, ActivityRow[]>();
    for (const r of this.allActivity()) {
      if (r.section === 'Sign-off' && r.stageId) {
        const k = `${r.jobId}|${r.stageId}`;
        byStage.set(k, [...(byStage.get(k) ?? []), r]);
      }
    }
    const keys = new Set<string>();
    for (const [k, rows] of byStage) {
      const stageId = k.slice(k.indexOf('|') + 1);
      const jobId = k.slice(0, k.indexOf('|'));
      const latest = [...rows].sort((a, b) => a.when.localeCompare(b.when)).pop();
      if (!latest || /deprogressed/i.test(latest.action)) continue;
      const stage = this.store.allWorkflows().find(w => w.jobId === jobId)?.stages.find(s => s.id === stageId);
      if (!stage?.signed) continue;
      keys.add(latest.key);
    }
    return keys;
  });

  isCorrectable(r: ActivityRow): boolean {
    return this.correctable().has(r.key);
  }

  correctTarget = signal<CorrectTarget | null>(null);

  openCorrect(r: ActivityRow) {
    const job = this.jobById.get(r.jobId);
    if (job && r.stageId) this.correctTarget.set({ job, stageId: r.stageId });
  }

  closeCorrect() {
    this.correctTarget.set(null);
  }

  /* undo a job's most recent sign-off */
  goBack(jobId: string, comment: string) {
    const job = this.jobById.get(jobId);
    if (!job) return;
    this.wfService.deprogress(job, comment);
  }

  deprogress(jobId: string) {
    this.confirmSvc.confirm({
      header: 'Deprogress',
      message: 'This reverses the job\'s most recent sign-off. Enter a reason for the record.',
      acceptLabel: 'Deprogress',
      textInput: { label: 'Reason for deprogress', placeholder: 'Reason for deprogress…' },
      accept: (reason) => { if (reason?.trim()) this.goBack(jobId, reason.trim()); }
    });
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
