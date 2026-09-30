/* Weld Engineering > Engineering Queue: every joint on Engineering Hold (an open deviation accepted
   at sign-off). Review opens the screen where Engineering enters comments and sets the routing. */
import { Component, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideArrowUpRight } from '@lucide/angular';

import { JOBS } from '../../data/jobs';
import { currentRoutingLabel } from '../../data/workflow';
import { WorkflowStore } from '../../weld-record/services/workflow-store.service';
import { DeviationService } from '../../weld-record/services/deviation.service';
import { TableState } from '../../shared/table-state';
import { TableToolbarComponent } from '../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../shared/sort-header.component';
import { AppDateTimePipe, formatDateTime } from '../../shared/date-format';
import { downloadCsv } from '../../data/export-csv';

interface QueueRow {
  jobId: string;
  xrefid: string;
  hull: string;
  drawing: string;
  joint: string;
  routing: string;
  heldAt: string;       /* step(s) the deviation was accepted on */
  items: string;        /* what deviated */
  reason: string;
  acceptedBy: string;
  since: string;        /* ISO, earliest open deviation */
}

@Component({
  selector: 'app-engineering-queue',
  standalone: true,
  imports: [TableToolbarComponent, SortHeaderComponent, AppDateTimePipe, LucideArrowUpRight],
  templateUrl: './engineering-queue.component.html',
})
export class EngineeringQueueComponent {
  private store = inject(WorkflowStore);
  private deviations = inject(DeviationService);
  private router = inject(Router);

  rows = computed<QueueRow[]>(() => JOBS.flatMap(job => {
    const wf = this.store.workflowFor(job)();
    const open = this.deviations.openDeviations(wf);
    if (!open.length) return [];
    return [{
      jobId: job.id, xrefid: job.xrefid, hull: job.hull, drawing: job.drawing, joint: job.joint,
      routing: currentRoutingLabel(wf.stages),
      heldAt: [...new Set(open.map(d => d.stageLabel))].join(', '),
      items: open.flatMap(d => d.items.map(i => i.label)).join(', '),
      reason: open.map(d => d.reason).join(' / '),
      acceptedBy: [...new Set(open.map(d => d.who))].join(', '),
      since: open.map(d => d.when).sort()[0],
    }];
  }));

  table = new TableState<QueueRow>(['xrefid', 'hull', 'drawing', 'joint', 'heldAt', 'items', 'reason', 'acceptedBy']);
  visibleRows = computed(() => this.table.sorted());

  constructor() {
    this.table.sortField.set('since');
    effect(() => this.table.setRows(this.rows()));
  }

  review(row: QueueRow) {
    this.router.navigate(['/weld-engineering/queue', row.jobId]);
  }

  exportCsv() {
    downloadCsv('engineering-queue', [
      { header: 'XREFID', value: (r: QueueRow) => r.xrefid },
      { header: 'Hull', value: (r: QueueRow) => r.hull },
      { header: 'Drawing', value: (r: QueueRow) => r.drawing },
      { header: 'Joint', value: (r: QueueRow) => r.joint },
      { header: 'Held at', value: (r: QueueRow) => r.heldAt },
      { header: 'Deviation', value: (r: QueueRow) => r.items },
      { header: 'Reason', value: (r: QueueRow) => r.reason },
      { header: 'Accepted by', value: (r: QueueRow) => r.acceptedBy },
      { header: 'On hold since', value: (r: QueueRow) => formatDateTime(r.since) },
    ], this.visibleRows());
  }
}
