/* stage-progression routing: filling in a stage's own fields, and moving the job's current
   routing (admin force, reject-and-go-back). Sign-off decisions live in SignoffService. */
import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../shared/toast.service';
import { Job } from '../../data/jobs';
import { JobWorkflow, StageField, labelFor, show } from '../../data/workflow';
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

  /* admin override: force a job to a given stage index — everything before it is
     marked signed/accepted, the chosen stage and everything after are re-opened,
     so it becomes the current routing */
  forceRouting(job: Job, targetIndex: number) {
    this.store.update(job, wf => {
      const when = new Date().toISOString();
      const stages = wf.stages.map((s, i) => {
        if (i < targetIndex) {
          return s.signed ? s : {
            ...s, signed: true, signedAt: when,
            result: s.result ?? 'sat',
            signoffInputs: {
              ...s.signoffInputs,
              inspectorName: s.signoffInputs['inspectorName'] || wf.technician
            }
          };
        }
        return s.signed ? {
          ...s,
          signed: false,
          signedAt: null,
          signoffRecords: [...s.signoffRecords, {
            stageLabel: s.label,
            fields: Object.entries({ ...s.inputs, ...s.signoffInputs })
              .filter(([, v]) => v)
              .map(([key, value]) => ({ key, label: labelFor(s, key), value })),
            result: s.result,
            who: 'Admin',
            when,
            action: 'reopened' as const,
          }],
        } : s;
      });
      const target = stages[targetIndex];
      return this.store.withHistory(wf, { ...wf, stages }, {
        section: 'Stages',
        who: 'Admin',
        action: 'Routing forced (admin)',
        to: target?.label ?? `#${targetIndex + 1}`
      });
    });
    this.messages.add({ severity: 'success', summary: 'Routing updated', detail: `Set to routing ${targetIndex + 1}`, life: 3000 });
  }

  /* go back one routing — re-opens the most recently signed stage */
  goBackRouting(job: Job, comment?: string) {
    this.store.update(job, wf => {
      const lastSignedIdx = [...wf.stages].map((s, i) => ({ s, i })).filter(x => x.s.signed).pop()?.i ?? -1;
      if (lastSignedIdx < 0) return wf; // nothing signed
      const now = new Date().toISOString();
      const s = wf.stages[lastSignedIdx];
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
        when: now,
        action: 'reopened' as const,
      };
      const stages = wf.stages.map((st, i) => i === lastSignedIdx ? {
        ...st,
        signed: false,
        signedAt: null,
        result: null,
        inputs: {},
        signoffInputs: {},
        signoffRecords: [...st.signoffRecords, record],
      } : st);
      return this.store.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who: 'Admin',
        action: `${s.label} — Re-opened${comment ? ': ' + comment : ''}`,
        from: s.label,
        to: ''
      });
    });
    this.messages.add({ severity: 'info', summary: 'Routing reversed', life: 3000 });
  }
}
