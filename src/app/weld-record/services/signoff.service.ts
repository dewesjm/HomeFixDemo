/* per-stage sign-off: locking a stage's decision, re-opening it, and the routing side effects
   a sign-off can trigger (defer-tack, fit-up release, repeat stages, reject/repair on NDT unsat) */
import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../shared/toast.service';
import { Job } from '../../data/jobs';
import { SignoffInput, WorkflowStage, REPAIR_STAGE, labelFor } from '../../data/workflow';
import { WorkflowStore } from './workflow-store.service';

@Injectable({ providedIn: 'root' })
export class SignoffService {
  private store = inject(WorkflowStore);
  private messages = inject(ToastService);

  /* patch a stage's sign-off fields and log it */
  updateStageSignoff(job: Job, stageId: string, patch: Partial<WorkflowStage>,
                     meta: { action: string; from?: string; to?: string }) {
    this.store.update(job, wf => {
      const stages = wf.stages.map(s => (s.id === stageId ? { ...s, ...patch } : s));
      const st = stages.find(s => s.id === stageId)!;
      return this.store.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who: st.signoffInputs['inspectorName'] || wf.technician,
        ...meta
      });
    });
  }

  /* lock a stage's sign-off and advance (or route back on reject) */
  signStage(job: Job, stageId: string, inputs?: SignoffInput[]) {
    let signedLabel = '';
    this.store.update(job, wf => {
      let stages: WorkflowStage[] = wf.stages.map(s =>
        s.id === stageId ? {
          ...s,
          signed: true,
          signedAt: new Date().toISOString(),
          signoffRecords: [
            ...s.signoffRecords,
            {
              stageLabel: s.label,
              fields: Object.entries({ ...s.inputs, ...s.signoffInputs })
                .filter(([, v]) => v)
                .map(([key, value]) => ({ key, label: labelFor(s, key), value })),
              result: s.result,
              who: s.signoffInputs['inspectorName'] || wf.technician,
              when: new Date().toISOString(),
              action: 'signed' as const,
            },
          ],
        } : s);
      const st = stages.find(s => s.id === stageId)!;
      const decision = (st.result ?? '').toUpperCase();
      signedLabel = st.label;

      /* Defer Tack logic: when fit stage signs with deferTack='yes', activate deferred-tack and skip regular tack */
      if (stageId === 'fit' && st.signoffInputs['deferTack'] === 'yes') {
        stages = stages.map(s => {
          if (s.id === 'tack') {
            return { ...s, required: false };  // Skip regular tack
          }
          if (s.id === 'deferred-tack') {
            return { ...s, required: true };   // Activate deferred tack
          }
          return s;
        });
      }

      /* Fit-Up Release logic: when fitup-insp signs WITHOUT releaseToWelding (unchecked), activate fitup-release */
      if (stageId === 'fitup-insp' && st.inputs['releaseToWelding'] !== 'yes') {
        stages = stages.map(s => {
          if (s.id === 'fitup-release') {
            return { ...s, required: true };
          }
          return s;
        });
      }

      /* repeatable stage + routingType='repeat': insert a fresh copy after this stage */
      if (st.repeatable && st.routingType === 'repeat') {
        const idx = stages.findIndex(s => s.id === stageId);
        const clone: typeof st = {
          ...st,
          id: `${st.id}-r${Date.now()}`,
          signed: false,
          signedAt: null,
          result: null,
          inputs: {},
          signoffInputs: {},
          signoffRecords: [],
          routingType: 'standard',
        };
        stages = [...stages.slice(0, idx + 1), clone, ...stages.slice(idx + 1)];
      }

      /* on unsat: re-open stages from the reject target up to (not including) this stage */
      if (st.result === 'unsat' && st.rejectToStage) {
        const targetIdx = stages.findIndex(s => s.id === st.rejectToStage);
        const currentIdx = stages.findIndex(s => s.id === stageId);
        if (targetIdx >= 0 && targetIdx < currentIdx) {
          const now = new Date().toISOString();
          for (let i = targetIdx; i < currentIdx; i++) {
            if (stages[i].signed) {
              const reopenRecord = {
                stageLabel: stages[i].label,
                fields: Object.entries({ ...stages[i].inputs, ...stages[i].signoffInputs })
                  .filter(([, v]) => v)
                  .map(([key, value]) => ({ key, label: labelFor(stages[i], key), value })),
                result: stages[i].result,
                who: wf.technician,
                when: now,
                action: 'reopened' as const,
              };
              stages[i] = { ...stages[i], signed: false, signedAt: null, result: null, signoffRecords: [...stages[i].signoffRecords, reopenRecord] };
            }
          }
        }
        /* NDT UNSAT: insert repair stage after this stage if not already present */
        const isNdtStage = stageId.includes('ndt');
        const hasRepairAlready = stages.some(s => s.id === 'repair');
        if (isNdtStage && !hasRepairAlready) {
          const repairStage: WorkflowStage = {
            id: 'repair',
            label: REPAIR_STAGE.label,
            required: true,
            role: REPAIR_STAGE.role ?? '',
            fields: REPAIR_STAGE.fields.map(f => ({ ...f })),
            inputs: { allowableThickness: 'Allowable thickness: 3/16 inch or 20% of material thickness, whichever is less' },
            signoffFields: [],
            signoffInputs: {},
            signoffRecords: [],
            result: null,
            rejectToStage: '',
            repeatable: false,
            routingType: 'standard',
            swapStageId: '',
            inspectionType: '',
            routingOptions: [],
            signed: false,
            signedAt: null,
            decisionLabel: REPAIR_STAGE.decisionLabel,
          };
          /* reopen all stages after the rejected NDT so repair becomes the active stage */
          for (let i = currentIdx + 1; i < stages.length; i++) {
            if (stages[i].signed) {
              stages[i] = { ...stages[i], signed: false, signedAt: null, result: null };
            }
          }
          stages = [...stages.slice(0, currentIdx + 1), repairStage, ...stages.slice(currentIdx + 1)];
        }
      }

      return this.store.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who: st.signoffInputs['inspectorName'] || wf.technician,
        action: `${st.label} — Signed off`,
        to: decision,
        inputs
      });
    });
    this.messages.add({ severity: 'success', summary: 'Joint Signoff Complete', detail: signedLabel, life: 3000 });
  }

  /* re-open a signed stage for edits */
  reopenStage(job: Job, stageId: string) {
    this.store.update(job, wf => {
      const now = new Date().toISOString();
      const stages = wf.stages.map(s => {
        if (s.id !== stageId) return s;
        const who = s.signoffInputs['inspectorName'] || wf.technician;
        return {
          ...s,
          signed: false,
          signedAt: null,
          signoffRecords: [
            ...s.signoffRecords,
            {
              stageLabel: s.label,
              fields: Object.entries({ ...s.inputs, ...s.signoffInputs })
                .filter(([, v]) => v)
                .map(([key, value]) => ({ key, label: labelFor(s, key), value })),
              result: s.result,
              who,
              when: now,
              action: 'reopened' as const,
            },
          ],
        };
      });
      const st = stages.find(s => s.id === stageId)!;
      return this.store.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who: st.signoffInputs['inspectorName'] || wf.technician,
        action: `${st.label} — Sign-off re-opened`
      });
    });
    this.messages.add({ severity: 'info', summary: 'Sign-off re-opened', life: 3000 });
  }

  /* Release a job past the Fit-Up Release stage */
  releaseFitUp(job: Job) {
    this.store.update(job, wf => {
      const stages = wf.stages.map(s =>
        s.id === 'fitup-release' ? { ...s, signed: true, signedAt: new Date().toISOString() } : s);
      return this.store.withHistory(wf, { ...wf, stages }, {
        section: 'Release',
        who: wf.technician,
        action: 'Fit-Up Release — Released to Welding'
      });
    });
    this.messages.add({ severity: 'success', summary: 'Released to Welding', life: 3000 });
  }
}
