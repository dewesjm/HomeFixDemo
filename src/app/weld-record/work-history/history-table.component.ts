/* The History table: one row per History entry, expandable to the fields recorded, with Deprogress
   and Correct. Used by the History screen (every joint) and Records Review (one joint). The parent
   owns the HistoryTableState (rows, search, paging, expanded rows); this owns the row actions. */
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { LucideRotateCcw, LucideArrowUpRight, LucideChevronRight, LucideChevronDown, LucidePencil } from '@lucide/angular';

import { SortHeaderComponent } from '../../shared/sort-header.component';
import { ConfirmService } from '../../shared/confirm.service';
import { AppDateTimePipe } from '../../shared/date-format';
import { JOBS, Job } from '../../data/jobs';
import { HistoryRow, correctableKeys, deprogressableKey, getTemplates, historyRows } from '../../data/workflow';
import { WorkflowStore } from '../services/workflow-store.service';
import { CorrectStageDialogComponent, CorrectTarget } from './correct-stage-dialog.component';
import { HistoryTableState } from './history-table-state';

@Component({
  selector: 'app-history-table',
  standalone: true,
  imports: [AppDateTimePipe, NgTemplateOutlet, SortHeaderComponent, CorrectStageDialogComponent,
    LucideRotateCcw, LucideArrowUpRight, LucideChevronRight, LucideChevronDown, LucidePencil],
  /* the History screen's table area: scrolls sideways, sits directly above the pager (.table-page-wrap > .flex-1) */
  host: { class: 'block overflow-x-auto min-w-0 flex-1' },
  templateUrl: './history-table.component.html'
})
export class HistoryTableComponent {
  private store = inject(WorkflowStore);
  private router = inject(Router);
  private confirmSvc = inject(ConfirmService);
  private jobById = new Map<string, Job>(JOBS.map(j => [j.id, j]));

  table = input.required<HistoryTableState>();
  /* one joint's history: leaves out the XREFID, Hull, Drawing, Joint and Order columns and the open-joint button */
  oneJoint = input(false);
  emptyText = input('No activity matches your filters. Each sign-off records every editable field and its value at that moment.');
  /* Deprogress confirmed with a reason; the parent carries it out */
  deprogress = output<{ jobId: string; reason: string }>();

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

  /* distinct routing values among the table's rows, for the Routing column's multiselect */
  routingOptions = computed(() => {
    const order = this.routingOrder();
    return [...new Set(this.table().rows().map(r => r.routing))]
      .sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || a.localeCompare(b))
      .map(s => ({ label: s, value: s }));
  });

  /* rows offering Deprogress / Correct, worked out from each joint's whole History (not the filtered rows) */
  private actionKeys = computed(() => {
    const deprogress = new Set<string>();
    const correct = new Set<string>();
    for (const jobId of new Set(this.table().rows().map(r => r.jobId))) {
      const job = this.jobById.get(jobId);
      if (!job) continue;
      const wf = this.store.workflowFor(job)();
      const rows = historyRows(wf, job);
      const d = deprogressableKey(wf, rows);
      if (d) deprogress.add(d);
      for (const k of correctableKeys(wf, rows)) correct.add(k);
    }
    return { deprogress, correct };
  });

  isDeprogressable(r: HistoryRow): boolean {
    return this.actionKeys().deprogress.has(r.key);
  }

  isCorrectable(r: HistoryRow): boolean {
    return this.actionKeys().correct.has(r.key);
  }

  confirmDeprogress(jobId: string) {
    this.confirmSvc.confirm({
      header: 'Deprogress',
      message: 'This reverses the job\'s most recent sign-off. Enter a reason for the record.',
      acceptLabel: 'Deprogress',
      textInput: { label: 'Reason for deprogress', placeholder: 'Reason for deprogress…' },
      accept: (reason) => { if (reason?.trim()) this.deprogress.emit({ jobId, reason: reason.trim() }); }
    });
  }

  correctTarget = signal<CorrectTarget | null>(null);

  openCorrect(r: HistoryRow) {
    const job = this.jobById.get(r.jobId);
    if (job && r.stageId) this.correctTarget.set({ job, stageId: r.stageId });
  }

  closeCorrect() {
    this.correctTarget.set(null);
  }

  openDetails(jobId: string) {
    this.router.navigate(['/jobs', jobId], { queryParams: { from: 'history' } });
  }
}
