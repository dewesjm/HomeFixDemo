/* Writes the external system's GWP/WTN/filler assignment (data/weld-assignment.ts) onto a joint's
   unsigned welding steps. It's the system's value, not the person's edit, so no History entry.
   A joint it sends nothing for gets engineeringEntry steps instead, typed in by hand. */
import { Injectable, inject } from '@angular/core';
import { Job } from '../../data/jobs';
import { JobWorkflow, WorkflowStage, ENGINEERING_ENTRY_KEYS, ACTUAL_REQUIREMENT, FILLER_KEYS } from '../../data/workflow';
import { heldQuals } from '../../data/qual-conditions';
import { assignedInputs, isAssignedStage, isEngineeringEntryJoint } from '../../data/weld-assignment';
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
    if (isEngineeringEntryJoint(job)) return stage.engineeringEntry ? wf : this.withEngineeringEntry(wf, stage);
    const inputs = assignedInputs(job, stage, heldQuals());
    if (Object.entries(inputs).every(([k, v]) => (stage.inputs[k] ?? '') === v)) return wf;
    return { ...wf, stages: wf.stages.map(s => s.id === stageId ? { ...s, inputs: { ...s.inputs, ...inputs } } : s) };
  }

  /* first time only: blank anything an earlier assignment left, so the step starts empty */
  private withEngineeringEntry(wf: JobWorkflow, stage: WorkflowStage): JobWorkflow {
    const inputs = { ...stage.inputs };
    const insertOwnsFiller = inputs['consumableInsertOnly'] === 'yes';
    for (const f of stage.fields) {
      if (ENGINEERING_ENTRY_KEYS.has(f.key) && !(insertOwnsFiller && FILLER_KEYS.has(f.key))) inputs[f.key] = '';
    }
    for (const a of Object.keys(ACTUAL_REQUIREMENT)) if (inputs[a] === 'NC') inputs[a] = '';
    return { ...wf, stages: wf.stages.map(s => s.id === stage.id ? { ...s, inputs, engineeringEntry: true } : s) };
  }
}
