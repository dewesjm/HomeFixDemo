/* work history screen, activity log across jobs */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideSearch, LucideBriefcase, LucideFileSpreadsheet, LucideListFilter, LucideHistory, LucideArrowLeft, LucideChevronsUpDown, LucideChevronsDownUp } from '@lucide/angular';

import { TablePagerComponent } from '../../shared/table-pager.component';
import { PersonSearchInputComponent } from '../../shared/person-search-input.component';

import { JOBS, Job } from '../../data/jobs';
import { RoutingService } from '../services/routing.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { HistoryRow, historyRows } from '../../data/workflow';
import { downloadCsv } from '../../data/export-csv';
import { PEOPLE, Person, fullName } from '../../data/people';
import { formatDateTime } from '../../shared/date-format';
import { HistoryTableComponent } from './history-table.component';
import { HistoryTableState } from './history-table-state';

@Component({
  selector: 'app-work-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TablePagerComponent, PersonSearchInputComponent, HistoryTableComponent,
    LucideSearch, LucideBriefcase, LucideFileSpreadsheet, LucideListFilter, LucideHistory, LucideArrowLeft,
    LucideChevronsUpDown, LucideChevronsDownUp
  ],
  templateUrl: './work-history.component.html'
})
export class WorkHistoryComponent {
  private store = inject(WorkflowStore);
  private wfService = inject(RoutingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobById = new Map<string, Job>(JOBS.map(j => [j.id, j]));

  back() { this.router.navigate(['/pipe-search']); }

  /* person filter: the chosen person (search assist itself is app-person-search-input) */
  person = signal<Person | null>(null);
  /* job filter: matches XREFID, drawing, joint or order */
  jobQuery = signal<string>('');

  table = new HistoryTableState();

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

  /* every joint's history flattened newest-first */
  private allActivity = computed<HistoryRow[]>(() =>
    this.store.everyWorkflow()
      .flatMap(wf => historyRows(wf, this.jobById.get(wf.jobId)))
      .sort((a, b) => b.when.localeCompare(a.when)));

  /* person + job pre-filters, applied before TableState's own sort/search/column filters */
  private preFiltered = computed<HistoryRow[]>(() => {
    const p = this.person();
    const jq = this.jobQuery().trim().toLowerCase();
    return this.allActivity().filter(r =>
      (!jq || [r.jobId, r.drawing, r.joint, r.order].some(v => v.toLowerCase().includes(jq))) &&
      (!p || r.whoId === p.id || r.who === fullName(p))
    );
  });

  /* undo a job's most recent sign-off */
  deprogress(jobId: string, reason: string) {
    const job = this.jobById.get(jobId);
    if (job) this.wfService.deprogress(job, reason);
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
    type Line = { row: HistoryRow; field: string; value: string };
    const lines: Line[] = this.table.sorted().flatMap(r =>
      r.inputs?.length
        ? r.inputs.map(i => ({ row: r, field: i.label, value: i.value }))
        : [{ row: r, field: '', value: r.to ?? '' }]);
    downloadCsv(name, [
      { header: 'When',       value: (l: Line) => formatDateTime(l.row.when) },
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
