/* Deviations accepted at sign-off (see data/deviations.ts for what counts as one). The sign-off puts
   the joint on Engineering Hold (SignoffService adds the step); while a deviation is open no later
   step can be signed. Engineering releases it on the hold step (Pipe Welding's Engineering role lists them): comments plus
   the step the routing goes to, and the joint carries on from there. Nothing is deleted: the
   deviation, the hold step and every History entry stay on record. */
import { Injectable, inject } from '@angular/core';
import { Job } from '../../data/jobs';
import { Deviation, DeviationItem, JobWorkflow, WorkflowStage, currentRoutingLabel, isEngineeringHoldId, nextEngineeringHoldId } from '../../data/workflow';
import { WorkflowStore } from './workflow-store.service';
import { RoutingService } from './routing.service';

@Injectable({ providedIn: 'root' })
export class DeviationService {
  private store = inject(WorkflowStore);
  private routing = inject(RoutingService);
  private seq = Date.now();

  /* call just before SignoffService.signStage(..., engineeringHold = true), with the same stage */
  record(job: Job, stageId: string, items: DeviationItem[], reason: string) {
    if (!items.length) return;
    this.store.update(job, wf => {
      const stage = wf.stages.find(s => s.id === stageId);
      const dev: Deviation = {
        id: `d${++this.seq}`, stageId, stageLabel: stage?.label ?? stageId, items, reason,
        who: wf.technician, when: new Date().toISOString(), status: 'open',
        holdStageId: nextEngineeringHoldId(wf.stages),
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

  /* Engineering's release: every open deviation is dispositioned with the comments, each unsigned
     Engineering Hold is signed (by Engineering, with the comments and the routing chosen), and the
     current routing is set to `targetId` the same way Admin > Set Routing does it. A hold a reject
     rule added has no deviation; it's released the same way. */
  disposition(job: Job, comments: string, targetId: string) {
    this.store.update(job, wf => {
      const target = wf.stages.find(s => s.id === targetId);
      const open = this.openDeviations(wf);
      const holds = wf.stages.filter(s => isEngineeringHoldId(s.id) && !s.signed);
      if (!target || (!open.length && !holds.length)) return wf;
      const when = new Date().toISOString();
      const disposition = { comments, routeTo: targetId, routeToLabel: target.label, who: 'Engineering', when };
      const stages = wf.stages.map((s): WorkflowStage => !isEngineeringHoldId(s.id) || s.signed ? s : {
        ...s, signed: true, signedAt: when, result: 'sat',
        inputs: { ...s.inputs, comments, routeTo: targetId },
      });
      const deviations = (wf.deviations ?? []).map(d => d.status === 'open' ? { ...d, status: 'dispositioned' as const, disposition } : d);
      const inputs = [{ label: 'Comments', value: comments }, { label: 'Routing set to', value: target.label }];
      const released = this.store.withHistory(wf, { ...wf, stages, deviations }, open.length ? {
        section: 'Deviation',
        who: 'Engineering',
        action: `${[...new Set(open.map(d => d.stageLabel))].join(', ')} - Deviation dispositioned`,
        to: target.label,
        inputs,
      } : {
        section: 'Sign-off',
        who: 'Engineering',
        action: `${holds.map(h => h.label).join(', ')} - Signed off`,
        to: target.label,
        inputs,
        stageId: holds[0].id,
      });
      /* both entries record the routing as it was: Engineering Hold */
      return this.routing.moveWithHistory(released, job, targetId, 'Engineering', 'Engineering', currentRoutingLabel(wf.stages));
    });
  }
}
