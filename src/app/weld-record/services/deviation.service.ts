/* Deviations accepted at sign-off (see data/deviations.ts for what counts as one). An open
   deviation holds the joint: no later step can be signed. Nothing can release it yet; dealing
   with a deviation (disposition) comes later, per the user (2026-09-25). */
import { Injectable, inject } from '@angular/core';
import { Job } from '../../data/jobs';
import { Deviation, DeviationItem, JobWorkflow } from '../../data/workflow';
import { WorkflowStore } from './workflow-store.service';

@Injectable({ providedIn: 'root' })
export class DeviationService {
  private store = inject(WorkflowStore);
  private seq = Date.now();

  /* call just before SignoffService.signStage(), with the same stage */
  record(job: Job, stageId: string, items: DeviationItem[], reason: string) {
    if (!items.length) return;
    this.store.update(job, wf => {
      const stage = wf.stages.find(s => s.id === stageId);
      const dev: Deviation = {
        id: `d${++this.seq}`, stageId, stageLabel: stage?.label ?? stageId, items, reason,
        who: wf.technician, when: new Date().toISOString(), status: 'open',
      };
      return this.store.withHistory(wf, { ...wf, deviations: [...(wf.deviations ?? []), dev] }, {
        section: 'Deviation',
        who: wf.technician,
        action: `${dev.stageLabel} - Deviation created`,
        to: items.map(i => i.label).join(', '),
        inputs: [
          { label: 'Reason', value: reason },
          ...items.map(i => ({ label: i.label, value: `${i.entered} (required: ${i.required})` })),
        ],
      });
    });
  }

  openDeviations(wf: JobWorkflow): Deviation[] {
    return (wf.deviations ?? []).filter(d => d.status === 'open');
  }

  /* the joint holds while any deviation is open */
  isOnHold(wf: JobWorkflow): boolean {
    return this.openDeviations(wf).length > 0;
  }
}
