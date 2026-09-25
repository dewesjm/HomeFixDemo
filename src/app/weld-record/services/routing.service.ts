/* stage-progression routing: filling in a stage's own fields, and moving the job's current
   routing (Admin > Set Routing back, Deprogress). Sign-off decisions live in SignoffService. */
import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../shared/toast.service';
import { Job } from '../../data/jobs';
import { JobWorkflow, StageField, labelFor, show, routeBack, deprogressWorkflow, fabricationSnapshot } from '../../data/workflow';
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
      action: `${stage.label} — ${field.label}`,
      from: show(prev),
      to: show(value ? value + unit : value)
    });
  }

  /* Admin > Set Routing: sets the current routing back to an earlier step. Nothing is marked
     signed; that step and every step after it come up blank (routeBack). Deprogress can't reach
     past this, so the undo entries are dropped. */
  setRoutingBack(job: Job, targetId: string) {
    let label = '';
    this.store.update(job, wf => {
      const target = wf.stages.find(s => s.id === targetId);
      if (!target) return wf;
      label = target.label;
      const r = routeBack(wf, job, targetId);
      return this.store.withHistory(wf, { ...r.wf, undo: [] }, {
        section: 'Routing',
        who: 'Admin',
        action: `Routed back to ${target.label} (admin)`,
        to: target.label,
        fabInputs: r.fabReset ? fabricationSnapshot(wf.fabricationData) : undefined,
      });
    });
    this.messages.add({ severity: 'success', summary: 'Routing updated', detail: `Set back to ${label}`, life: 3000 });
  }

  /* Deprogress: undo the most recent sign-off and everything it triggered (deprogressWorkflow) */
  deprogress(job: Job, comment?: string) {
    this.store.update(job, wf => {
      const d = deprogressWorkflow(wf, job);
      if (!d) return wf;
      const s = d.stage;
      const record = {
        stageLabel: s.label,
        fields: [
          ...Object.entries({ ...s.inputs, ...s.signoffInputs })
            .filter(([, v]) => v)
            .map(([key, value]) => ({ key, label: labelFor(s, key), value })),
          ...(comment ? [{ key: 'comment', label: 'Comment', value: comment }] : []),
        ],
        result: s.result,
        who: 'Admin',
        when: new Date().toISOString(),
        action: 'deprogressed' as const,
      };
      const stages = d.wf.stages.map(st => st.id === s.id ? { ...st, signoffRecords: [...st.signoffRecords, record] } : st);
      if (d.wf.refitNumber !== undefined) job.refitNumber = d.wf.refitNumber;
      if (d.wf.repairNumber !== undefined) job.repairNumber = d.wf.repairNumber;
      return this.store.withHistory(wf, { ...d.wf, stages }, {
        section: 'Sign-off',
        who: 'Admin',
        action: `${s.label} — Deprogressed${comment ? ': ' + comment : ''}`,
        from: s.label,
        to: '',
        stageId: s.id,
      });
    });
    this.messages.add({ severity: 'info', summary: 'Routing reversed', life: 3000 });
  }
}
