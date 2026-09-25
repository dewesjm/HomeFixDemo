/* Foreman Overrides on a welding step: work done outside the procedure, approved by a foreman.
   Unlike a deviation it doesn't hold the joint (user's decision, 2026-09-25); it's only recorded
   in the joint's History, along with any off-list GWP/filler it let the person pick. */
import { Injectable, inject } from '@angular/core';
import { Job } from '../../data/jobs';
import { DeviationItem } from '../../data/workflow';
import { WorkflowStore } from './workflow-store.service';

@Injectable({ providedIn: 'root' })
export class ForemanOverrideService {
  private store = inject(WorkflowStore);

  /* call just before SignoffService.signStage(), with the same stage */
  record(job: Job, stageId: string, notes: string[], offList: DeviationItem[]) {
    if (!notes.length) return;
    this.store.update(job, wf => {
      const stage = wf.stages.find(s => s.id === stageId);
      return this.store.withHistory(wf, wf, {
        section: 'Foreman Override',
        who: wf.technician,
        action: `${stage?.label ?? stageId} — Foreman Override`,
        to: notes.join('; '),
        inputs: [
          ...notes.map(n => ({ label: 'Override', value: n })),
          ...offList.map(i => ({ label: i.label, value: `${i.entered} (allowed: ${i.required})` })),
        ],
      });
    });
  }
}
