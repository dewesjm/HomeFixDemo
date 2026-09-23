/* per-stage sign-off: locking a stage's decision, re-opening it, and the routing side effects
   a sign-off can trigger (defer-tack, fit-up release, repeat stages, reject/repair on NDT unsat) */
import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../shared/toast.service';
import { Job } from '../../data/jobs';
import { SignoffInput, WorkflowStage, REPAIR_STAGE, EXCAVATION_NDT_STAGE, stageFromTemplate, labelFor } from '../../data/workflow';
import { isNonFerrousOrAustenitic } from '../../data/material-classification';
import { WorkflowStore } from './workflow-store.service';

/* Repair's Allowable Thickness text depends on the job's Nuclear Indicator (see the nInd tooltip,
   joint-details.component.ts's N_IND_MEANINGS: '1' = N 250-1500-1, '2' = N TP278, '3' = Non).
   '3' (Non) has no stated rule -- falls back to the TP278 value, unreviewed. */
function allowableThicknessText(nInd: string): string {
  const inches = nInd === '1' ? '3/8' : '3/16';
  return `Allowable thickness: ${inches} inch or 20% of material thickness, whichever is less`;
}

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

      /* reopen a stage that's already signed and log it, same pattern as the reject-to-stage reopen
         below, but usable for a specific single stage id (Repair's own routing, and Excavation
         NDT's routing back to the original inspection -- see both further down) */
      const reopenById = (id: string) => {
        const idx = stages.findIndex(s => s.id === id);
        if (idx < 0) return;
        const target = stages[idx];
        const reopenRecord = {
          stageLabel: target.label,
          fields: Object.entries({ ...target.inputs, ...target.signoffInputs })
            .filter(([, v]) => v)
            .map(([key, value]) => ({ key, label: labelFor(target, key), value })),
          result: target.result,
          who: wf.technician,
          when: new Date().toISOString(),
          action: 'reopened' as const,
        };
        stages[idx] = { ...target, signed: false, signedAt: null, result: null, signoffRecords: [...target.signoffRecords, reopenRecord] };
      };

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
          /* which phase (root/layer/final) this NDT stage belongs to, its own stage id, and which
             method it was checked under (ut/rt/mt/pt/vt/5x) -- Repair's own routing on signoff, and
             Excavation NDT's routing back to "the original joint inspection" after a Weld Repair,
             both need this (see further down). Not real StageFields, just internal bookkeeping on
             stage.inputs. */
          const originPhase = stageId.split('-ndt-')[0];
          const repairStage = stageFromTemplate(REPAIR_STAGE, {
            allowableThickness: allowableThicknessText(job.nInd),
            originPhase,
            originStageId: stageId,
            originInspectionType: st.inspectionType,
          });
          /* reopen all stages after the rejected NDT so repair becomes the active stage */
          for (let i = currentIdx + 1; i < stages.length; i++) {
            if (stages[i].signed) {
              stages[i] = { ...stages[i], signed: false, signedAt: null, result: null };
            }
          }
          stages = [...stages.slice(0, currentIdx + 1), repairStage, ...stages.slice(currentIdx + 1)];
        }
      }

      /* Repair's own routing on signoff (2026-09-23): Allowable thickness exceeded takes priority
         and sends the joint back to that phase's NDT UT/RT stage; otherwise Grind Only sends it to
         that phase's NDT VT/5X stage ("the applicable VT signoff for which the inspection was
         rejected" -- always VT/5X, regardless of which method actually failed); Weld Repair inserts
         Excavation NDT right after Repair (a plain NDT stage -- SAT continues normally, UNSAT routes
         back to Repair like any other NDT reject, via its own rejectToStage). Cut, or no repair
         code chosen: no special routing, proceeds to whatever's next as normal. */
      if (stageId === 'repair') {
        const phase = st.inputs['originPhase'] ?? '';
        const exceeded = st.inputs['allowableThicknessExceeded'] === 'yes';
        const repairType = st.inputs['repairType'] ?? '';
        if (exceeded && phase) {
          reopenById(`${phase}-ndt-utrt`);
        } else if (repairType === 'grind' && phase) {
          reopenById(`${phase}-ndt-vt5x`);
        } else if (repairType === 'weld-repair') {
          const repairIdx = stages.findIndex(s => s.id === 'repair');
          const hasExcavationAlready = stages.some(s => s.id === 'excavation-ndt');
          if (repairIdx >= 0 && !hasExcavationAlready) {
            const excavationStage = stageFromTemplate(EXCAVATION_NDT_STAGE);
            stages = [...stages.slice(0, repairIdx + 1), excavationStage, ...stages.slice(repairIdx + 1)];
          }
        }
      }

      /* Excavation NDT SAT (2026-09-23): "all weld repairs require the original joint inspection
         unless otherwise stated" -- reopens the exact NDT stage that originally rejected the joint
         (read off the still-present Repair stage's own inputs), UNLESS that original inspection was
         PT and the job's material (either Material Type 1 or 2, Admin > Material Classification)
         is non-ferrous or austenitic, in which case it requires 5X instead of PT. Excavation NDT's
         own UNSAT is handled generically above via its rejectToStage: 'repair'. */
      if (stageId === 'excavation-ndt' && st.result === 'sat') {
        const repair = stages.find(s => s.id === 'repair');
        const phase = repair?.inputs['originPhase'] ?? '';
        const originStageId = repair?.inputs['originStageId'] ?? '';
        const originInspectionType = repair?.inputs['originInspectionType'] ?? '';
        const needs5xInstead = originInspectionType === 'pt' && phase
          && (isNonFerrousOrAustenitic(job.materialType1) || isNonFerrousOrAustenitic(job.materialType2));
        if (needs5xInstead) {
          reopenById(`${phase}-ndt-vt5x`);
        } else if (originStageId) {
          reopenById(originStageId);
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
