/* Writes the external system's GWP/WTN/filler assignment (data/weld-assignment.ts) onto a joint's
   unsigned welding steps. It's the system's value, not the person's edit, so no History entry. */
import { Injectable, inject } from '@angular/core';
import { Job } from '../../data/jobs';
import { JobWorkflow } from '../../data/workflow';
import { testUserQuals } from '../../data/qualifications';
import { assignedInputs, isAssignedStage } from '../../data/weld-assignment';
import { WorkflowStore } from './workflow-store.service';

@Injectable({ providedIn: 'root' })
export class WeldAssignmentService {
  private store = inject(WorkflowStore);

  /* every unsigned welding step; call when the joint page opens */
  applyAll(job: Job) {
    this.store.update(job, wf => wf.stages.reduce((acc, s) =>
      !s.signed && isAssignedStage(s) ? this.withAssignment(acc, job, s.id) : acc, wf));
  }

  /* one step, e.g. after its last Foreman Override is removed */
  apply(job: Job, stageId: string) {
    this.store.update(job, wf => this.withAssignment(wf, job, stageId));
  }

  private withAssignment(wf: JobWorkflow, job: Job, stageId: string): JobWorkflow {
    const stage = wf.stages.find(s => s.id === stageId);
    if (!stage) return wf;
    const inputs = assignedInputs(job, stage, testUserQuals());
    if (Object.entries(inputs).every(([k, v]) => (stage.inputs[k] ?? '') === v)) return wf;
    return { ...wf, stages: wf.stages.map(s => s.id === stageId ? { ...s, inputs: { ...s.inputs, ...inputs } } : s) };
  }
}
