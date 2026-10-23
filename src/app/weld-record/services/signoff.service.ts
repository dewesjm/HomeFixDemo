import { formInputFields, formSignoffFields } from '../signoff-definition/form-fields';
/* per-stage sign-off: signing a step (where it routes is routing/signoff-routing.ts), saving it with its
   History entries and undo, Correct, and Fit-Up Release */
import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../shared/toast.service';
import { Job } from '../../data/jobs';
import { SignoffInput, WorkflowStage, JobWorkflow } from '../model/workflow-types';
import { activeStage } from '../routing/current-routing';
import { signoffUndo } from '../routing/route-changes';
import { routeSignoff } from '../routing/signoff-routing';
import { fabricationSnapshot } from '../fabrication/fabrication-fields';
import { hasDecision, isRoutingLockedField } from '../signoff-definition/stage-rules';
import { labelFor, snapshotInputs, displayValue } from '../signoff-definition/stage-display';
import { fieldsShown, visibleSignoffFields } from '../signoff-definition/shown-fields';
import { isUserEditable } from '../signoff-definition/field-locks';
import { isOwnType } from '../signoff-definition/signoff-types';
import { withComments } from '../signoff-definition/signoff-parts';
import { FITUP_RELEASE, namedAfterType } from '../routing/built-in-step-rules';
import { WorkflowStore } from './workflow-store.service';

/* History names a signoff with a Type other than the step's own (Weld Build-Up) and Layer's Interim
   Layer after the chosen option; the routing column still shows the stage (Fit, Layer) */
function signedActionLabel(st: WorkflowStage): string {
  const named = !isOwnType(st.id, st.signoffType) || namedAfterType(st.id);
  if (!named) return st.label;
  return st.typeOptions?.find(o => o.value === st.signoffType)?.label ?? st.label;
}

@Injectable({ providedIn: 'root' })
export class SignoffService {
  private store = inject(WorkflowStore);
  private messages = inject(ToastService);

  /* patch a stage's sign-off fields (decision, Type, signoff inputs) before it's signed; logged under
     'Stages' like other field edits, which Work History hides -- the Signed off entry records them all */
  updateStageSignoff(job: Job, stageId: string, patch: Partial<WorkflowStage>,
                     meta: { action: string; from?: string; to?: string }) {
    this.store.update(job, wf => {
      const stages = wf.stages.map(s => (s.id === stageId ? { ...s, ...patch } : s));
      const st = stages.find(s => s.id === stageId)!;
      return this.store.withHistory(wf, { ...wf, stages }, {
        section: 'Stages',
        who: st.signoffInputs['inspectorName'] || wf.technician,
        ...meta
      });
    });
  }

  /* lock a stage's sign-off and advance (or route back on reject) */
  /* engineeringHold: the sign-off accepted deviations, so the joint goes to Engineering Hold */
  signStage(job: Job, stageId: string, inputs?: SignoffInput[], engineeringHold = false) {
    let r: ReturnType<SignoffService['applySignoff']> | null = null;
    this.store.update(job, wf => (r = this.applySignoff(wf, job, stageId, inputs, engineeringHold)).wf);
    const { signedLabel, refitNumber, repairNumber } = r!;
    if (refitNumber) job.refitNumber = refitNumber;
    if (repairNumber) job.repairNumber = repairNumber;
    this.messages.add({ severity: 'success', summary: 'Joint Signoff Complete', detail: signedLabel, life: 3000 });
  }

  /* Demo routing preview: runs the real sign-off on a copy (nothing is saved) and returns the
     stage the joint would be at afterward (undefined when it'd be complete) and which special
     routing rules applied. `result` tries a SAT/UNSAT the user hasn't picked yet. */
  previewSignoff(wf: JobWorkflow, job: Job, stageId: string, result?: WorkflowStage['result'], engineeringHold = false): { target: WorkflowStage | undefined; reasons: string[] } {
    const tried = result === undefined ? wf : { ...wf, stages: wf.stages.map(s => s.id === stageId ? { ...s, result } : s) };
    const r = this.applySignoff(tried, job, stageId, undefined, engineeringHold);
    return { target: activeStage(r.wf.stages), reasons: r.reasons };
  }

  /* the sign-off itself, without saving: the new workflow plus what signStage() reports/stamps on the job */
  private applySignoff(wf: JobWorkflow, job: Job, stageId: string, inputs?: SignoffInput[], engineeringHold = false) {
    const undo = signoffUndo(wf, job, stageId);
    const { stages, fabricationData, recordedId, signed: st, routedBack, refitNumber, repairNumber, reasons } =
      routeSignoff(wf, job, stageId, engineeringHold);
    const signedLabel = st.label;
    const decision = (st.result ?? '').toUpperCase();

    const who = st.signoffInputs['inspectorName'] || wf.technician;
    let signed: JobWorkflow = this.store.withHistory(wf, { ...wf, stages, fabricationData, ...(repairNumber ? { repairNumber } : {}) }, {
      section: 'Sign-off',
      who,
      action: `${signedActionLabel(st)} - Signed off`,
      to: hasDecision(st) ? decision : '',
      inputs,
      stageId: recordedId
    });
    signed = { ...signed, undo: [...(wf.undo ?? []), { ...undo, historyWhen: signed.history.at(-1)!.when }] };
    if (routedBack) {
      /* when it went back to Fit or earlier, fit-up data was blanked; this entry keeps what it was */
      signed = this.store.withHistory(signed, signed, {
        section: 'Routing', who, action: `${signedLabel} - Routed back to ${routedBack.label}`, to: routedBack.label, fabInputs: routedBack.fabBefore,
      });
    }
    if (refitNumber) {
      /* a Cut resets the fit-up (fabrication) data; this entry keeps what it was */
      signed = this.store.withHistory(signed, { ...signed, refitNumber }, {
        section: 'Refit',
        who,
        action: 'Cut - routed back to Fit',
        from: job.refitNumber || '00',
        to: `Refit ${refitNumber}`,
        fabInputs: fabricationSnapshot(wf.fabricationData),
      });
    }
    return { wf: signed, signedLabel, refitNumber, repairNumber, reasons };
  }

  /* Correct a signed stage's already-recorded field values without deprogressing it (Work History —
     distinct from Deprogress, which undoes the sign-off itself and everything it triggered). Only `inputs`/`signoffInputs` are touched, never `result`/`inspectionType`/
     `signoffType`/Decision -- those drive routing directly and are never offered here. Individual
     field keys that fed a routing decision at the original signoff (see ROUTING_LOCKED_FIELD_KEYS)
     are rejected even if the caller passes one -- the dialog already disables them, this is
     defense in depth against a stale form. */
  correctStage(job: Job, stageId: string, patch: { inputs?: Record<string, string>; signoffInputs?: Record<string, string> }, reason: string) {
    this.store.update(job, wf => {
      const st = wf.stages.find(s => s.id === stageId);
      if (!st || !st.signed) return wf;

      const inputPatch = Object.fromEntries(Object.entries(patch.inputs ?? {}).filter(([k]) => !isRoutingLockedField(stageId, k)));
      const signoffPatch = Object.fromEntries(Object.entries(patch.signoffInputs ?? {}).filter(([k]) => !isRoutingLockedField(stageId, k)));

      const changes = [
        ...Object.entries(inputPatch), ...Object.entries(signoffPatch)
      ]
        .filter(([key, value]) => (st.inputs[key] ?? st.signoffInputs[key] ?? '') !== value)
        .map(([key, value]) => ({ key, label: labelFor(st, key), from: (st.inputs[key] ?? st.signoffInputs[key] ?? ''), to: value }));
      if (!changes.length) return wf;

      const updated: WorkflowStage = {
        ...st,
        inputs: { ...st.inputs, ...inputPatch },
        signoffInputs: { ...st.signoffInputs, ...signoffPatch },
      };
      const who = updated.signoffInputs['inspectorName'] || wf.technician;
      const stages = wf.stages.map(s => (s.id === stageId ? updated : s));
      const inputsSnapshot = snapshotInputs(updated, fieldsShown(updated, job, stages, wf.fabricationData).filter(f => isUserEditable(updated, f)), visibleSignoffFields(updated, job, wf.fabricationData));
      /* display-formatted (option labels, not raw values) so it matches inputsSnapshot's own
         convention -- Work History reads this to show exactly what changed, not just the reason */
      const fieldDefFor = (key: string) => formInputFields(updated).find(f => f.key === key) ?? withComments(updated, formSignoffFields(updated)).find(f => f.key === key);
      const historyChanges = changes.map(c => {
        const fd = fieldDefFor(c.key);
        return fd ? { ...c, from: displayValue(fd, c.from), to: displayValue(fd, c.to) } : c;
      });
      return this.store.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who,
        action: `${updated.label} - Corrected ${changes.map(c => c.label).join(', ')}`,
        stageId,
        inputs: inputsSnapshot,
        changes: historyChanges,
        reason
      });
    });
    this.messages.add({ severity: 'success', summary: 'Sign-off corrected', life: 3000 });
  }

  /* Release a job past the Fit-Up Release stage */
  releaseFitUp(job: Job) {
    this.store.update(job, wf => {
      const undo = signoffUndo(wf, job, FITUP_RELEASE);
      const stages = wf.stages.map(s =>
        s.id === FITUP_RELEASE ? { ...s, signed: true, signedAt: new Date().toISOString() } : s);
      const next = this.store.withHistory(wf, { ...wf, stages }, {
        section: 'Release',
        who: wf.technician,
        action: 'Fit-Up Release - Released to Welding'
      });
      return { ...next, undo: [...(wf.undo ?? []), { ...undo, historyWhen: next.history.at(-1)!.when }] };
    });
    this.messages.add({ severity: 'success', summary: 'Released to Welding', life: 3000 });
  }
}
