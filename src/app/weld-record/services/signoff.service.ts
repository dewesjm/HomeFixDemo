/* per-stage sign-off: locking a stage's decision and the routing side effects a sign-off can
   trigger (defer-tack, fit-up release, repeat stages, reject/repair on NDT unsat, route-backs) */
import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../shared/toast.service';
import { Job } from '../../data/jobs';
import { SignoffInput, WorkflowStage, JobWorkflow, applySignedFlags, routeBack, signoffUndo, ndtKindOptions, fabricationSnapshot, nextRepairStage, isRepairStageId, isExcavationNdtStageId, repairIdForExcavation, excavationIdForRepair, hasDecision, excavationNdtStage, stageFromTemplate, labelFor, isRoutingLockedField, fieldsShown, isUserEditable, snapshotInputs, displayValue } from '../../data/workflow';
import { isNonFerrousOrAustenitic } from '../../data/material-classification';
import { WorkflowStore } from './workflow-store.service';

/* Repair's Allowable Thickness text depends on the job's Nuclear Indicator (see the nInd tooltip,
   joint-details.component.ts's N_IND_MEANINGS: '1' = N 250-1500-1, '2' = N TP278, '3' = Non).
   '3' (Non) has no stated rule -- falls back to the TP278 value, unreviewed. */
function allowableThicknessText(nInd: string): string {
  const inches = nInd === '1' ? '3/8' : '3/16';
  return `Allowable thickness: ${inches} inch or 20% of material thickness, whichever is less`;
}

/* Excavation NDT "requires the same inspection that was noted as reject" -- same method as
   whatever originally rejected the joint, UNLESS that was PT on non-ferrous/austenitic material
   (Material Type 1 or 2, Admin > Material Classification), which requires 5X instead of PT. Single
   source of truth for this decision -- used both when Excavation NDT is created (to build its
   fields/Type) and when its own SAT decides which stage to route back to. */
function resolveExcavationInspectionType(originInspectionType: string, phase: string, job: Job): string {
  const needs5xInstead = originInspectionType === 'pt' && phase
    && (isNonFerrousOrAustenitic(job.materialType1) || isNonFerrousOrAustenitic(job.materialType2));
  return needs5xInstead ? '5x' : originInspectionType;
}

/* History names Fit-as-Weld-Build-up and Layer's Interim/Final after the chosen option; the
   routing column still shows the stage (Fit, Layer) */
function signedActionLabel(st: WorkflowStage): string {
  const named = (st.id === 'fit' && st.routingType === 'weld-buildup') || st.id === 'root-layer';
  if (!named) return st.label;
  return st.routingOptions?.find(o => o.value === st.routingType)?.label ?? st.label;
}

/* Interim Layer is an end-of-shift signoff: it's recorded, but Layer stays the current routing
   (not signed) until it's signed as Final Layer */
const isInterimLayer = (s: WorkflowStage) => s.id === 'root-layer' && s.routingType === 'interim';

/* Records Review UNSAT doesn't route anywhere yet (user: "it stays in records review until i figure
   that out"): the signoff is recorded but the stage isn't signed, so the joint stays there */
const isRecordsReviewUnsat = (s: WorkflowStage) => (s.id === 'review-o63' || s.id === 'review-o04') && s.result === 'unsat';
const staysPut = (s: WorkflowStage) => isInterimLayer(s) || isRecordsReviewUnsat(s);

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
  signStage(job: Job, stageId: string, inputs?: SignoffInput[]) {
    let signedLabel = '';
    let refitNumber = '';
    let repairNumber = '';
    this.store.update(job, wf => {
      const undo = signoffUndo(wf, job, stageId);
      /* stages with no SAT/UNSAT choice are accepted by signing */
      let stages: WorkflowStage[] = wf.stages.map(s =>
        s.id === stageId ? {
          ...s,
          result: isInterimLayer(s) ? null : hasDecision(s) ? s.result : (s.result ?? 'sat'),
          signed: !staysPut(s),
          signedAt: staysPut(s) ? null : new Date().toISOString(),
          signoffRecords: [
            ...s.signoffRecords,
            {
              stageLabel: s.label,
              fields: Object.entries({ ...s.inputs, ...s.signoffInputs })
                .filter(([, v]) => v)
                .map(([key, value]) => ({ key, label: labelFor(s, key), value })),
              result: hasDecision(s) ? s.result : (s.result ?? 'sat'),
              who: s.signoffInputs['inspectorName'] || wf.technician,
              when: new Date().toISOString(),
              action: 'signed' as const,
            },
          ],
        } : s);
      const st = stages.find(s => s.id === stageId)!;
      const decision = (st.result ?? '').toUpperCase();
      signedLabel = st.label;

      /* go back (never un-sign): the current routing is set back to the target and every stage from
         there on comes up blank (routeBack). One History entry names where it went. */
      let fabricationData = wf.fabricationData;
      let routedBack: { label: string; fabBefore?: SignoffInput[] } | null = null;
      const routeBackTo = (id: string) => {
        const target = stages.find(s => s.id === id);
        if (!target) return;
        const r = routeBack({ ...wf, stages, fabricationData }, job, id);
        stages = r.wf.stages;
        fabricationData = r.wf.fabricationData;
        routedBack = { label: target.label, fabBefore: r.fabReset ? fabricationSnapshot(wf.fabricationData) : undefined };
      };

      /* Defer Tack at Fit, and Fit-Up Insp not releasing to welding, change which stages are required */
      stages = applySignedFlags(stages);

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

      if (st.result === 'unsat' && st.rejectToStage && !isRecordsReviewUnsat(st)) {
        const currentIdx = stages.findIndex(s => s.id === stageId);
        /* NDT UNSAT always adds a new Repair right after this stage, however many repairs the joint
           has had. Excavation NDT is left out: its UNSAT goes back to its own round's Repair. */
        const isNdtStage = stageId.includes('ndt') && !isExcavationNdtStageId(stageId);
        if (isNdtStage) {
          /* which phase (root/layer/final) this NDT stage belongs to, its own stage id, and which
             method it was checked under (ut/rt/mt/pt/vt/5x) -- Repair's own routing on signoff, and
             Excavation NDT's routing back to "the original joint inspection" after a Weld Repair,
             both need this (see further down). Not real StageFields, just internal bookkeeping on
             stage.inputs. */
          const originPhase = stageId.split('-ndt-')[0];
          const repairStage = stageFromTemplate(nextRepairStage(stages), {
            allowableThickness: allowableThicknessText(job.nInd),
            originPhase,
            originStageId: stageId,
            originInspectionType: st.inspectionType,
          });
          /* anything after the rejected NDT comes up blank so repair becomes the current routing;
             earlier repair rounds stay signed as a record */
          const next = stages.slice(currentIdx + 1).find(s => !isRepairStageId(s.id) && !isExcavationNdtStageId(s.id));
          if (next) stages = routeBack({ ...wf, stages }, job, next.id).wf.stages;
          stages = [...stages.slice(0, currentIdx + 1), repairStage, ...stages.slice(currentIdx + 1)];
          repairNumber = String(Number(job.repairNumber || '0') + 1).padStart(2, '0');
        } else {
          /* back to the reject target (Fit-Up Insp -> Fit, Excavation NDT -> its own Repair) */
          const targetIdx = stages.findIndex(s => s.id === st.rejectToStage);
          if (targetIdx >= 0 && targetIdx < currentIdx) routeBackTo(st.rejectToStage);
        }
      }

      /* Repair's own routing on signoff (2026-09-23): Allowable thickness exceeded takes priority
         and sends the joint back to that phase's NDT UT/RT stage; otherwise Grind Only sends it to
         that phase's NDT VT/5X stage ("the applicable VT signoff for which the inspection was
         rejected" -- always VT/5X, regardless of which method actually failed); Weld Repair inserts
         Excavation NDT right after Repair, built to require the same inspection method that
         originally rejected the joint (see excavationNdtStage()/resolveExcavationInspectionType()
         above -- its own SAT/UNSAT routing is handled further down). Cut means the joint is redone:
         the current routing goes back to Fit and the path starts over (past records are kept), and
         Refit # goes up by one. No repair
         code chosen: no special routing. Each repair round is its own stage (isRepairStageId). */
      if (isRepairStageId(stageId)) {
        const phase = st.inputs['originPhase'] ?? '';
        const exceeded = st.inputs['allowableThicknessExceeded'] === 'yes';
        const repairType = st.inputs['repairType'] ?? '';
        if (exceeded && phase) {
          routeBackTo(`${phase}-ndt-utrt`);
        } else if (repairType === 'grind' && phase) {
          /* each phase has only the one NDT stage its Joint Details value asks for, so it goes back to the one that failed */
          routeBackTo(st.inputs['originStageId'] ?? '');
        } else if (repairType === 'cut') {
          /* the joint starts over from Fit; the Refit History entry below says so (no Routing entry) */
          if (stages.some(s => s.id === 'fit')) {
            const r = routeBack({ ...wf, stages }, job, 'fit');
            stages = r.wf.stages;
            fabricationData = r.wf.fabricationData;
            refitNumber = String(Number(job.refitNumber || '0') + 1).padStart(2, '0');
          }
        } else if (repairType === 'weld-repair') {
          const repairIdx = stages.findIndex(s => s.id === stageId);
          const excavationId = excavationIdForRepair(stageId);
          const hasExcavationAlready = stages.some(s => s.id === excavationId);
          /* its Excavation NDT UNSAT sent the joint back to this Repair: that Excavation NDT is required again */
          if (hasExcavationAlready) stages = stages.map(s => s.id === excavationId ? { ...s, required: true } : s);
          if (repairIdx >= 0 && !hasExcavationAlready) {
            const originInspectionType = st.inputs['originInspectionType'] ?? '';
            const resolvedType = resolveExcavationInspectionType(originInspectionType, phase, job);
            /* Inspector role gets the same NQC Inspector remap every other NDT stage gets in
               buildStages() -- this stage bypasses that (built at runtime, not from TRADE_STAGES),
               so it's applied by hand here. */
            const role = (job.nInd === '1' || job.nInd === '2') ? 'NQC Inspector' : 'Inspector';
            const excavationStage = {
              ...stageFromTemplate(excavationNdtStage(resolvedType, stageId), {}, resolvedType),
              role,
            };
            stages = [...stages.slice(0, repairIdx + 1), excavationStage, ...stages.slice(repairIdx + 1)];
          }
        }
      }

      /* Excavation NDT SAT (2026-09-23): "all weld repairs require the original joint inspection
         unless otherwise stated" -- goes back to the exact NDT stage that originally rejected the joint
         (read off the still-present Repair stage's own inputs), UNLESS the same PT/material
         override applied when Excavation NDT was created (resolveExcavationInspectionType), in
         which case it goes back to that phase's VT/5X stage instead. Excavation NDT's own UNSAT is
         handled generically above via its rejectToStage (its own round's Repair). */
      if (isExcavationNdtStageId(stageId) && st.result === 'sat') {
        const repair = stages.find(s => s.id === repairIdForExcavation(stageId));
        const phase = repair?.inputs['originPhase'] ?? '';
        const originStageId = repair?.inputs['originStageId'] ?? '';
        const originInspectionType = repair?.inputs['originInspectionType'] ?? '';
        const resolvedType = resolveExcavationInspectionType(originInspectionType, phase, job);
        if (resolvedType !== originInspectionType && phase) {
          /* the VT/5X stage is normally locked to VT; here it must allow the 5X that replaces PT */
          const vtId = `${phase}-ndt-vt5x`;
          routeBackTo(vtId);
          stages = stages.map(s => s.id === vtId ? { ...s, routingOptions: ndtKindOptions('vt5x'), inspectionType: '5x' } : s);
        } else if (originStageId) {
          routeBackTo(originStageId);
        }
      }

      const who = st.signoffInputs['inspectorName'] || wf.technician;
      let signed: JobWorkflow = this.store.withHistory(wf, { ...wf, stages, fabricationData, ...(repairNumber ? { repairNumber } : {}) }, {
        section: 'Sign-off',
        who,
        action: `${signedActionLabel(st)} — Signed off`,
        to: hasDecision(st) ? decision : '',
        inputs,
        stageId
      });
      signed = { ...signed, undo: [...(wf.undo ?? []), { ...undo, historyWhen: signed.history.at(-1)!.when }] };
      const back = routedBack as { label: string; fabBefore?: SignoffInput[] } | null;
      if (back) {
        /* when it went back to Fit or earlier, fit-up data was blanked; this entry keeps what it was */
        signed = this.store.withHistory(signed, signed, {
          section: 'Routing', who, action: `${signedLabel} — Routed back to ${back.label}`, to: back.label, fabInputs: back.fabBefore,
        });
      }
      if (!refitNumber) return signed;
      /* a Cut resets the fit-up (fabrication) data; this entry keeps what it was */
      return this.store.withHistory(signed, { ...signed, refitNumber }, {
        section: 'Refit',
        who,
        action: 'Cut — routed back to Fit',
        from: job.refitNumber || '00',
        to: `Refit ${refitNumber}`,
        fabInputs: fabricationSnapshot(wf.fabricationData),
      });
    });
    if (refitNumber) job.refitNumber = refitNumber;
    if (repairNumber) job.repairNumber = repairNumber;
    this.messages.add({ severity: 'success', summary: 'Joint Signoff Complete', detail: signedLabel, life: 3000 });
  }

  /* Correct a signed stage's already-recorded field values without deprogressing it (Work History —
     distinct from Deprogress, which undoes the sign-off itself and everything it triggered). Only `inputs`/`signoffInputs` are touched, never `result`/`inspectionType`/
     `routingType`/Decision -- those drive routing directly and are never offered here. Individual
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
      const now = new Date().toISOString();
      const who = updated.signoffInputs['inspectorName'] || wf.technician;
      const record = {
        stageLabel: updated.label,
        fields: Object.entries({ ...updated.inputs, ...updated.signoffInputs })
          .filter(([, v]) => v)
          .map(([key, value]) => ({ key, label: labelFor(updated, key), value })),
        result: updated.result,
        who,
        when: now,
        action: 'corrected' as const,
        reason,
        changes,
      };
      const stages = wf.stages.map(s => (s.id === stageId ? { ...updated, signoffRecords: [...updated.signoffRecords, record] } : s));
      const finalStage = stages.find(s => s.id === stageId)!;
      const inputsSnapshot = snapshotInputs(finalStage, fieldsShown(finalStage).filter(f => isUserEditable(finalStage, f)), finalStage.signoffFields);
      /* display-formatted (option labels, not raw values) so it matches inputsSnapshot's own
         convention -- Work History reads this to show exactly what changed, not just the reason */
      const fieldDefFor = (key: string) => updated.fields.find(f => f.key === key) ?? updated.signoffFields.find(f => f.key === key);
      const historyChanges = changes.map(c => {
        const fd = fieldDefFor(c.key);
        return fd ? { ...c, from: displayValue(fd, c.from), to: displayValue(fd, c.to) } : c;
      });
      return this.store.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who,
        action: `${updated.label} — Corrected ${changes.map(c => c.label).join(', ')}`,
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
      const undo = signoffUndo(wf, job, 'fitup-release');
      const stages = wf.stages.map(s =>
        s.id === 'fitup-release' ? { ...s, signed: true, signedAt: new Date().toISOString() } : s);
      const next = this.store.withHistory(wf, { ...wf, stages }, {
        section: 'Release',
        who: wf.technician,
        action: 'Fit-Up Release — Released to Welding'
      });
      return { ...next, undo: [...(wf.undo ?? []), { ...undo, historyWhen: next.history.at(-1)!.when }] };
    });
    this.messages.add({ severity: 'success', summary: 'Released to Welding', life: 3000 });
  }
}
