/* Where a signoff sends the joint: the step is signed (or stays current for a repeatable Type or an
   UNSAT that rejects to the step itself), then
   signed-answer steps turn on or off, UNSAT routes back, adds a Repair or goes to Engineering Hold,
   Repair and Excavation NDT route by what they recorded, a repeatable step's NDT returns to it, and an
   accepted deviation adds Engineering Hold. No saving and no History: SignoffService does both. */
import { Job } from '../../data/jobs';
import { SignoffInput, WorkflowStage, JobWorkflow } from '../model/workflow-types';
import { setRoutingFrom } from './current-routing';
import { applySignedFlags, routeBack, blankStage } from './route-changes';
import { ndtKindOptions } from './ndt';
import { fabricationSnapshot } from '../fabrication/fabrication-fields';
import { nextRepairStage, excavationNdtStageFor, stageFromTemplate, insertEngineeringHold, rejectHoldReason } from './added-steps';
import {
  isRepairStageId,
  isExcavationNdtStageId,
  repairIdForExcavation,
  excavationIdForRepair,
  baseStepId,
  stepOnJoint,
} from './step-ids';
import { hasDecision } from '../signoff-definition/stage-rules';
import { getTemplates } from './stage-templates';
import { CUT_RESTARTS_AT, unsatAddsRepair } from './built-in-step-rules';
import { typeRepeatable } from '../signoff-definition/signoff-types';
import { repeatsThroughNdt, repeatReturnStep, signedAsStep, signAsStep } from './type-routing';
import { describeConditions, matchingRejectRule, stageConditionFields, ENGINEERING_HOLD_TARGET } from './step-conditions';
import { isNonFerrousOrAustenitic } from '../../data/material-classification';

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

/* a repeatable Type (Admin > Signoff Types By Routing, e.g. Interim Layer, Weld Build-Up): the signoff
   is recorded, but the step stays unsigned and the routing stays where it is */
const repeatable = (s: WorkflowStage) => typeRepeatable(s.id, s.signoffType);
const typeLabel = (s: WorkflowStage) => s.typeOptions?.find(o => o.value === s.signoffType)?.label ?? s.signoffType;

/* Where an UNSAT goes: the first Admin > Routing Settings reject rule matching this step's answers /
   Joint Details, if its step is earlier on this joint (or Engineering Hold, or Repair on an NDT step);
   else the step's Reject routes to */
function rejectTarget(stages: WorkflowStage[], job: Job, st: WorkflowStage, stageId: string) {
  const currentIdx = stages.findIndex(s => s.id === stageId);
  const rule = matchingRejectRule(getTemplates()[job.trade]?.find(t => t.id === stageId)?.rejectRules, job, stages, st);
  const usable = !!rule && (rule.to === ENGINEERING_HOLD_TARGET || (unsatAddsRepair(stageId) && rule.to === 'repair')
    || (() => { const i = stages.findIndex(s => s.id === stepOnJoint(stages, rule.to)?.id); return i >= 0 && i < currentIdx; })());
  return usable ? { to: rule!.to, rule: rule! } : { to: st.rejectToStage ?? '', rule: null };
}

export interface SignoffRouting {
  stages: WorkflowStage[];
  fabricationData: JobWorkflow['fabricationData'];
  /* the step this signoff is recorded on (a later step's id when the Type signs that step), as signed */
  recordedId: string;
  signed: WorkflowStage;
  /* the step it went back to, and the fit-up data as it was when going back to Fit or earlier blanked it */
  routedBack: { label: string; fabBefore?: SignoffInput[] } | null;
  /* the joint's new Refit # (a Cut) or Repair # (an NDT UNSAT), '' when unchanged */
  refitNumber: string;
  repairNumber: string;
  /* the special routing rules this signoff hit, for the routing preview's "Why" */
  reasons: string[];
}

/* engineeringHold: the signoff accepted deviations, so the joint goes to Engineering Hold */
export function routeSignoff(wf: JobWorkflow, job: Job, stageId: string, engineeringHold = false): SignoffRouting {
  let refitNumber = '';
  let repairNumber = '';
  const reasons: string[] = [];
  const signing = wf.stages.find(s => s.id === stageId)!;
  /* a repeatable Type with NDT after the step completes it so the NDT comes up (type-routing.ts) */
  const throughNdt = repeatable(signing) && repeatsThroughNdt(wf.stages, stageId);
  /* a Type that loads a later step's definition (Layer's Final Weld) is that step's signoff */
  const asStepId = signedAsStep(wf.stages, signing);
  const now = new Date().toISOString();
  /* an UNSAT whose reject target is this step (Records Review's default): the signoff is recorded, but
     the step isn't signed, so the joint stays there */
  const rejectsToItself = !asStepId && signing.result === 'unsat'
    && stepOnJoint(wf.stages, rejectTarget(wf.stages, job, signing, stageId).to)?.id === stageId;
  const staysPut = (s: WorkflowStage) => repeatable(s) || rejectsToItself;
  /* stages with no SAT/UNSAT choice are accepted by signing */
  let stages: WorkflowStage[] = asStepId ? signAsStep(wf.stages, stageId, asStepId, now) : wf.stages.map(s => {
    if (s.id !== stageId) return s;
    const repeats = repeatable(s) ? { repeats: (s.repeats ?? 0) + 1 } : {};
    /* a repeatable signoff comes up blank with its Type still picked */
    if (repeatable(s) && !throughNdt) return { ...blankStage(s), signoffType: s.signoffType, inspectionType: s.inspectionType, ...repeats };
    return {
      ...s,
      ...repeats,
      result: hasDecision(s) ? s.result : (s.result ?? 'sat'),
      signed: !staysPut(s) || throughNdt,
      signedAt: staysPut(s) && !throughNdt ? null : now,
    };
  });
  /* the History entry and the stage this signoff is recorded on */
  const recordedId = asStepId || stageId;
  const st = stages.find(s => s.id === recordedId)!;
  if (asStepId) reasons.push(`${typeLabel(signing)} is ${st.label}'s signoff, so ${st.label} is signed`);
  else if (throughNdt) reasons.push(`${typeLabel(st)} is repeatable, so ${st.label}'s NDT comes up and then the joint comes back to ${st.label}`);
  else if (repeatable(st)) reasons.push(`${typeLabel(st)} is repeatable, so ${st.label} stays the current routing until it is signed with another Type`);
  if (rejectsToItself) reasons.push(`rejected (UNSAT), and ${st.label}'s reject goes to itself, so the joint stays on ${st.label}`);

  /* go back (never un-sign): the current routing is set back to the target and every stage from
     there on comes up blank (routeBack). One History entry names where it went. */
  let fabricationData = wf.fabricationData;
  let routedBack: { label: string; fabBefore?: SignoffInput[] } | null = null;
  /* a built-in target means the joint's own step for it (its NQC or regular row) */
  const routeBackTo = (id: string) => {
    const target = stepOnJoint(stages, id);
    if (!target) return;
    const r = routeBack({ ...wf, stages, fabricationData }, job, target.id);
    stages = r.wf.stages;
    fabricationData = r.wf.fabricationData;
    routedBack = { label: target.label, fabBefore: r.fabReset ? fabricationSnapshot(wf.fabricationData) : undefined };
  };

  /* steps whose Admin > Routing Settings conditions use a signed answer (Defer Tack, Release to welding) turn on or off */
  const before = stages;
  stages = applySignedFlags(stages, job);
  if (st.result !== 'unsat') {
    stages.forEach((s, i) => {
      if (s.required === before[i].required) return;
      const rule = describeConditions(getTemplates()[job.trade]?.find(t => t.id === s.id)?.includeWhen);
      reasons.push(s.required ? `${s.label} is now required (included when ${rule})` : `${s.label} is skipped (included only when ${rule})`);
    });
  }

  if (st.result === 'unsat' && st.rejectToStage && !rejectsToItself) {
    const currentIdx = stages.findIndex(s => s.id === stageId);
    const isNdtStage = unsatAddsRepair(stageId);
    const { to: rejectTo, rule } = rejectTarget(stages, job, st, stageId);
    if (rule) reasons.push(`a reject rule matched (${describeConditions([rule.when], stageConditionFields(st))})`);
    /* NDT UNSAT adds a new Repair right after this stage, however many repairs the joint has had,
       unless a reject rule sends it elsewhere. Excavation NDT is left out: its UNSAT goes back to
       its own round's Repair. */
    if (rejectTo === ENGINEERING_HOLD_TARGET) {
      /* instead of a Repair or a route-back: the joint waits on Engineering Hold, which keeps why */
      reasons.push('so the joint goes to Engineering Hold instead');
      stages = insertEngineeringHold(stages, stageId, rule ? rejectHoldReason(st, rule) : '');
    } else if (isNdtStage && rejectTo === 'repair') {
      reasons.push('the NDT was UNSAT, so a Repair is added');
      /* which phase (root/layer/final) this NDT stage belongs to, its own stage id, and which
         method it was checked under (ut/rt/mt/pt/5x/vt) -- Repair's own routing on signoff, and
         Excavation NDT's routing back to "the original joint inspection" after a Weld Repair,
         both need this (see further down). Not real StageFields, just internal bookkeeping on
         stage.inputs. */
      const originPhase = baseStepId(stageId).split('-ndt-')[0];
      const repairStage = stageFromTemplate(nextRepairStage(stages), {
        originPhase,
        originStageId: stageId,
        originInspectionType: st.inspectionType,
      });
      /* anything after the rejected NDT comes up blank so repair becomes the current routing;
         earlier repair rounds stay signed as a record */
      const next = stages.slice(currentIdx + 1).find(s => !isRepairStageId(s.id) && !isExcavationNdtStageId(s.id));
      if (next) stages = routeBack({ ...wf, stages }, job, next.id).wf.stages;
      stages = setRoutingFrom([...stages.slice(0, currentIdx + 1), repairStage, ...stages.slice(currentIdx + 1)], repairStage.id);
      repairNumber = String(Number(job.repairNumber || '0') + 1).padStart(2, '0');
    } else {
      /* back to the reject target (Fit-Up Insp -> Fit, Excavation NDT -> its own Repair, or a reject rule's) */
      const targetIdx = stages.findIndex(s => s.id === stepOnJoint(stages, rejectTo)?.id);
      if (targetIdx >= 0 && targetIdx < currentIdx) {
        routeBackTo(rejectTo);
        reasons.push('rejected (UNSAT)');
      }
    }
  }

  /* Repair's own routing on signoff: Allowable thickness exceeded takes priority and sends the
     joint back to that phase's NDT RT/UT stage; otherwise Grind Only sends it back to the NDT
     stage that rejected it; Weld Repair inserts
     Excavation NDT right after Repair, built to require the same inspection method that
     originally rejected the joint (see excavationNdtStage()/resolveExcavationInspectionType()
     above -- its own SAT/UNSAT routing is handled further down). Cut means the joint is redone:
     the current routing goes back to Fit and the path starts over (past records are kept), and
     Refit # goes up by one. No repair code chosen: no special routing. Each repair round is its own stage (isRepairStageId). */
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
      if (stages.some(s => s.id === CUT_RESTARTS_AT)) {
        const r = routeBack({ ...wf, stages }, job, CUT_RESTARTS_AT);
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
        const excavationStage = excavationNdtStageFor(job, resolvedType, stageId);
        stages = [...stages.slice(0, repairIdx + 1), excavationStage, ...stages.slice(repairIdx + 1)];
      }
    }
  }

  /* Excavation NDT SAT: "all weld repairs require the original joint inspection
     unless otherwise stated" -- goes back to the exact NDT stage that originally rejected the joint
     (read off the still-present Repair stage's own inputs), UNLESS the same PT/material
     override applied when Excavation NDT was created (resolveExcavationInspectionType), in
     which case it goes back to that phase's 5X/VT stage instead. Excavation NDT's own UNSAT is
     handled generically above via its rejectToStage (its own round's Repair). */
  if (isExcavationNdtStageId(stageId) && st.result === 'sat') {
    const repair = stages.find(s => s.id === repairIdForExcavation(stageId));
    const phase = repair?.inputs['originPhase'] ?? '';
    const originStageId = repair?.inputs['originStageId'] ?? '';
    const originInspectionType = repair?.inputs['originInspectionType'] ?? '';
    const resolvedType = resolveExcavationInspectionType(originInspectionType, phase, job);
    if (resolvedType !== originInspectionType && phase) {
      /* the 5X/VT stage normally offers only VT; here it also offers the 5X that replaces PT (Type still blank until picked) */
      const vtId = stepOnJoint(stages, `${phase}-ndt-vt5x`)?.id ?? '';
      routeBackTo(vtId);
      stages = stages.map(s => s.id === vtId ? { ...s, typeOptions: ndtKindOptions('vt5x'), inspectionType: '' } : s);
    } else if (originStageId) {
      routeBackTo(originStageId);
    }
  }

  /* everything inspecting a repeatable signoff (Interim Layer's NDT) is signed: the joint comes back
     to that step for the next one, which starts blank */
  const returnTo = repeatReturnStep(stages, stageId);
  if (returnTo) {
    const step = stages.find(s => s.id === returnTo)!;
    stages = routeBack({ ...wf, stages, fabricationData }, job, returnTo).wf.stages
      .map(s => s.id === returnTo ? { ...s, repeats: step.repeats } : s);
    reasons.push(`${step.label} was signed as ${typeLabel(step)}, so the joint goes back to ${step.label} for the next one`);
  }

  /* accepted deviations: the joint waits on Engineering Hold, whatever else this sign-off did */
  if (engineeringHold) {
    stages = insertEngineeringHold(stages, recordedId);
    reasons.push('a deviation was accepted, so the joint goes to Engineering Hold');
  }

  return { stages, fabricationData, recordedId, signed: st, routedBack, refitNumber, repairNumber, reasons };
}
