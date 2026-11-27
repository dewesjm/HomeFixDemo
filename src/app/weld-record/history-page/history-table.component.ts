import { ViewerService } from '../access-logic/viewer.service';
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
import { JOINT_TYPES, JOINT_TYPE_LABELS } from '../../data/jobs';
import { HistoryRow, correctableKeys, deprogressableKey, historyRowHasDetail, historyRows } from './rules/history-rows';
import { getTemplates } from '../routing-logic/routing-settings-rules';
import { WorkflowStore } from '../services/workflow-store.service';
import { CorrectStageDialogComponent, CorrectTarget } from './correct-stage-dialog.component';
import { HistoryTableState } from './history-table-state';
import { findJointById, jointRoute } from '../joint-link-logic/joint-route';

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
  private jobFor = (r: Pick<HistoryRow, 'jointType' | 'jobId'>) => findJointById(r.jointType, r.jobId);

  readonly viewer = inject(ViewerService);
  table = input.required<HistoryTableState>();
  hasDetail = historyRowHasDetail;
  /* the Joint Type column's choices */
  readonly jointTypeOptions = JOINT_TYPES.map(t => ({ label: JOINT_TYPE_LABELS[t], value: JOINT_TYPE_LABELS[t] }));
  /* one joint's history: leaves out the Joint Type, XREFID, Hull, Drawing, Joint and Order columns and the open-joint button */
  oneJoint = input(false);
  emptyText = input('No activity matches your filters. Each sign-off records every editable field and its value at that moment.');
  /* Deprogress confirmed with a reason; the parent carries it out */
  deprogress = output<{ row: HistoryRow; reason: string }>();

  /* canonical stage order (Routing Settings order of the rows' joint types), so the routing
     filter reads like the actual workflow sequence instead of alphabetically; anything not a
     real stage (e.g. 'All stages complete') sorts to the end */
  private routingOrder = computed(() => {
    const order = new Map<string, number>();
    const types = new Set(this.table().rows().map(r => r.jointType));
    let i = 0;
    for (const s of JOINT_TYPES.filter(t => types.has(t)).flatMap(t => getTemplates(t))) {
      const label = s.displayName || s.label;
      if (!order.has(label)) order.set(label, i++);
    }
    return order;
  });

  /* distinct routing values among the table's rows, for the Routing column's multiselect */
  typeOptions = computed(() => {
    const order = this.routingOrder();
    return [...new Set(this.table().rows().map(r => r.routing))]
      .sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || a.localeCompare(b))
      .map(s => ({ label: s, value: s }));
  });

  /* rows offering Deprogress / Correct, worked out from each joint's whole History (not the filtered rows) */
  private actionKeys = computed(() => {
    const deprogress = new Set<string>();
    const correct = new Set<string>();
    const joints = new Map(this.table().rows().map(r => [`${r.jointType}|${r.jobId}`, r]));
    for (const r of joints.values()) {
      const job = this.jobFor(r);
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
    return (this.viewer.canUseLegacyWorkflowActions() || this.viewer.showRestrictedWorkflowActions()) && this.actionKeys().deprogress.has(r.key);
  }

  isCorrectable(r: HistoryRow): boolean {
    return (this.viewer.canUseLegacyWorkflowActions() || this.viewer.showRestrictedWorkflowActions()) && this.actionKeys().correct.has(r.key);
  }

  confirmDeprogress(row: HistoryRow) {
    if (!this.viewer.canUseLegacyWorkflowActions()) return;
    this.confirmSvc.confirm({
      header: 'Deprogress',
      message: 'This reverses the job\'s most recent sign-off. Enter a reason for the record.',
      acceptLabel: 'Deprogress',
      textInput: { label: 'Reason for deprogress', placeholder: 'Reason for deprogress…' },
      accept: (reason) => { if (reason?.trim()) this.deprogress.emit({ row, reason: reason.trim() }); }
    });
  }

  correctTarget = signal<CorrectTarget | null>(null);

  openCorrect(r: HistoryRow) {
    const job = this.jobFor(r);
    if (this.viewer.canUseLegacyWorkflowActions() && job && r.stageId) this.correctTarget.set({ job, stageId: r.stageId });
  }

  closeCorrect() {
    this.correctTarget.set(null);
  }

  openDetails(r: HistoryRow) {
    const job = this.jobFor(r);
    if (job) this.router.navigate(jointRoute(job, r.jointType), { queryParams: { from: 'history' } });
  }
}
