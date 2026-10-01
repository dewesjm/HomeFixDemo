/* Engineering override: values engineering types on a welding step the external system sent nothing
   for (WorkflowStage.engineeringEntry). Engineering doesn't sign, so these are kept on leaving the
   joint (unlike other unsigned edits), with one History entry: the reason plus every value set. */
import { Injectable, inject } from '@angular/core';
import { Job } from '../../data/jobs';
import { SignoffInput } from '../../data/workflow';
import { WorkflowStore } from './workflow-store.service';

@Injectable({ providedIn: 'root' })
export class EngineeringOverrideService {
  private store = inject(WorkflowStore);

  /* values = the inputs to keep (applied to the step if it's still unsigned); shown = what History lists */
  record(job: Job, stageId: string, reason: string, values: Record<string, string>, shown: SignoffInput[]) {
    if (!Object.keys(values).length) return;
    this.store.update(job, wf => {
      const stage = wf.stages.find(s => s.id === stageId);
      if (!stage) return wf;
      const next = stage.signed ? wf
        : { ...wf, stages: wf.stages.map(s => s.id === stageId ? { ...s, inputs: { ...s.inputs, ...values } } : s) };
      return this.store.withHistory(wf, next, {
        section: 'Engineering Override',
        who: wf.technician,
        action: `${stage.label} - Engineering Override`,
        to: reason,
        inputs: [{ label: 'Reason', value: reason }, ...shown],
      });
    });
  }
}
