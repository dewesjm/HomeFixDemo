/* stage-progression routing: filling in a stage's own fields, and moving the job's current
   routing (Admin > Routing Override, Deprogress). Sign-off decisions live in SignoffService. */
import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../shared/toast.service';
import { Job } from '../../data/jobs';
import { JobWorkflow, StageField, show, deprogressWorkflow, fabricationSnapshot, moveRouting } from '../../data/workflow';
import { WorkflowStore } from './workflow-store.service';

@Injectable({ providedIn: 'root' })
export class RoutingService {
  private store = inject(WorkflowStore);
  private messages = inject(ToastService);

  setStageInput(job: Job, stageId: string, field: StageField, value: string) {
    this.setStageInputs(job, stageId, [{ field, value }]);
  }

  /* several field edits on one stage as a single update and a single save; each changed field is logged */
  setStageInputs(job: Job, stageId: string, changes: { field: StageField; value: string }[]) {
    this.store.update(job, wf =>
      changes.reduce((acc, c) => this.applyStageInput(acc, stageId, c.field, c.value), wf));
  }

  private applyStageInput(wf: JobWorkflow, stageId: string, field: StageField, value: string): JobWorkflow {
    const prev = wf.stages.find(s => s.id === stageId)?.inputs[field.key] ?? '';
    if (prev === value) return wf;
    const stages = wf.stages.map(s =>
      s.id === stageId ? { ...s, inputs: { ...s.inputs, [field.key]: value } } : s);
    const stage = stages.find(s => s.id === stageId)!;
    const unit = field.unit ? ` ${field.unit}` : '';
    return this.store.withHistory(wf, { ...wf, stages }, {
      section: 'Stages',
      who: wf.technician,
      action: `${stage.label} - ${field.label}`,
      from: show(prev),
      to: show(value ? value + unit : value)
    });
  }

  /* Admin > Routing Override: changes the joint's current routing to any step. Nothing is marked
     signed. Going back works like any route-back (that step and every step after it come up
     blank); going forward only moves the current routing, and the steps passed stay as they are.
     Deprogress can't reach past this, so the undo entries are dropped. */
  setRouting(job: Job, targetId: string, reason: string) {
    let label = '';
    this.store.update(job, wf => {
      const target = wf.stages.find(s => s.id === targetId);
      if (!target) return wf;
      label = target.label;
      return this.moveWithHistory(wf, job, targetId, 'Admin', 'admin', undefined, reason);
    });
    this.messages.add({ severity: 'success', summary: 'Routing updated', detail: `Set to ${label}`, life: 3000 });
  }

  /* moveRouting() plus its History entry ("Routing set to X (<by>)" / "Routed back to X (<by>)", with the
     reason when given); Deprogress can't reach past a routing set by hand, so the undo entries are dropped */
  moveWithHistory(wf: JobWorkflow, job: Job, targetId: string, who: string, by: string, routingAt?: string, reason?: string): JobWorkflow {
    const target = wf.stages.find(s => s.id === targetId);
    if (!target) return wf;
    const r = moveRouting(wf, job, targetId);
    return this.store.withHistory(wf, { ...r.wf, undo: [] }, {
      section: 'Routing', who,
      action: `${r.back ? 'Routed back to' : 'Routing set to'} ${target.label} (${by})`,
      to: target.label,
      inputs: reason ? [{ label: 'Reason', value: reason }] : undefined,
      fabInputs: r.fabReset ? fabricationSnapshot(wf.fabricationData) : undefined,
    }, routingAt);
  }

  /* Deprogress: undo the most recent sign-off and everything it triggered (deprogressWorkflow) */
  deprogress(job: Job, comment?: string) {
    this.store.update(job, wf => {
      const d = deprogressWorkflow(wf, job);
      if (!d) return wf;
      const s = d.stage;
      if (d.wf.refitNumber !== undefined) job.refitNumber = d.wf.refitNumber;
      if (d.wf.repairNumber !== undefined) job.repairNumber = d.wf.repairNumber;
      return this.store.withHistory(wf, d.wf, {
        section: 'Sign-off',
        who: 'Admin',
        action: `${s.label} - Deprogressed${comment ? ': ' + comment : ''}`,
        from: s.label,
        to: '',
        stageId: s.id,
      });
    });
    this.messages.add({ severity: 'info', summary: 'Routing reversed', life: 3000 });
  }
}
