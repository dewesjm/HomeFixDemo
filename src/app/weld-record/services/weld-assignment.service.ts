/* Writes the external system's GWP/WTN/filler assignment (weld-assignment-mock.ts) onto a joint's
   unsigned welding steps. It's the system's value, not the person's edit, so no History entry.
   A joint it sends nothing for gets engineeringEntry steps instead, typed in by hand. */
import { formInputFields } from '../signoff-forms/form-fields';
import { Injectable, inject } from '@angular/core';
import { Job } from '../../data/jobs';
import { JobWorkflow, WorkflowStage } from '../model/workflow-types';
import { ENGINEERING_ENTRY_KEYS } from '../signoff-forms/weld-fields';
import { isFilledByRule, withFills } from '../signoff-forms/field-fill';
import { heldQuals } from '../qualifications/qual-conditions';
import { assignedInputs, isEngineeringEntryJoint } from '../weld-assignment/weld-assignment-mock';
import { isAssignedStage } from '../weld-assignment/weld-assignment-rules';
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
    const assigned = { ...stage, inputs: { ...stage.inputs, ...assignedInputs(job, stage, heldQuals()) } };
    const inputs = withFills(stage, assigned, wf.stages).inputs;
    if (Object.entries(inputs).every(([k, v]) => (stage.inputs[k] ?? '') === v)) return wf;
    return { ...wf, stages: wf.stages.map(s => s.id === stageId ? { ...s, inputs } : s) };
  }

  /* first time only: blank anything an earlier assignment left, so the step starts empty (an NC
     actual is released by its fill rule once its requirement is blank) */
  private withEngineeringEntry(wf: JobWorkflow, stage: WorkflowStage): JobWorkflow {
    const entry = { ...stage, engineeringEntry: true };
    const inputs = { ...stage.inputs };
    for (const f of formInputFields(stage)) {
      if (ENGINEERING_ENTRY_KEYS.has(f.key) && !isFilledByRule(entry, f.key)) inputs[f.key] = '';
    }
    const blanked = withFills(stage, { ...entry, inputs }, wf.stages);
    return { ...wf, stages: wf.stages.map(s => s.id === stage.id ? blanked : s) };
  }
}
