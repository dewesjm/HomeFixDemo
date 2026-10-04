/* Moving a joint's routing: going back (never un-sign, see ROUTING.md), Set Routing, Deprogress, and
   discarding unsigned edits */
import { Job } from '../jobs';
import { conditionsMatch, usesStepAnswers } from '../step-conditions';
import { JobWorkflow, SignoffUndo, WorkflowStage } from './types';
import { getTemplates } from './stage-templates';
import { buildStages } from './build-stages';
import { blankFabricationData } from './fabrication';
import { excavationIdForRepair, isEngineeringHoldId, isExcavationNdtStageId, isRepairStageId } from './step-ids';
import { activeStageId, setRoutingFrom } from './current-routing';
import { initialInspectionType } from './stage-rules';

/* Repair's own bookkeeping (not fields): kept when a Repair comes up blank */
const REPAIR_BOOKKEEPING_KEYS = ['originPhase', 'originStageId', 'originInspectionType'];

/* a stage with nothing entered and not signed; `fresh` is its buildStages() copy, when it has one */
function blankStage(s: WorkflowStage, fresh?: WorkflowStage): WorkflowStage {
  const inputs = fresh ? { ...fresh.inputs }
    : Object.fromEntries(REPAIR_BOOKKEEPING_KEYS.filter(k => isRepairStageId(s.id) && s.inputs[k]).map(k => [k, s.inputs[k]]));
  return {
    ...s, inputs, signoffInputs: {}, result: null, signed: false, signedAt: null,
    routingType: fresh?.routingType ?? s.routingType,
    inspectionType: fresh?.inspectionType ?? initialInspectionType(s),
  };
}

/* required flags set by signed answers: every unsigned step whose Admin > Routing conditions use a
   step answer (by default Tack, Deferred Tack and Fit-Up Release) is re-checked against them */
export function applySignedFlags(stages: WorkflowStage[], job: Job): WorkflowStage[] {
  const templates = getTemplates()[job.trade] ?? [];
  return stages.map(s => {
    if (s.signed) return s;
    const rules = templates.find(t => t.id === s.id)?.includeWhen;
    if (!usesStepAnswers(rules)) return s;
    const required = conditionsMatch(rules, job, stages);
    return required === s.required ? s : { ...s, required };
  });
}

/* fit-up (fabrication) data belongs to Fit: it's blanked whenever the joint goes back to Fit or earlier */
function goesBackPastFit(stages: WorkflowStage[], idx: number): boolean {
  const fitIdx = stages.findIndex(s => s.id === 'fit');
  return fitIdx >= 0 && idx <= fitIdx;
}

/* Set the current routing back to `targetId`: every stage from there on comes up as on a new joint
   and is signed again. Earlier signoffs are untouched. Other Repair /
   Excavation NDT rounds stay as records (unsigned ones stop being required); the target's own round
   comes up blank, its Excavation NDT waiting for the Repair to choose Weld Repair again. */
export function routeBack(wf: JobWorkflow, job: Job, targetId: string): { wf: JobWorkflow; fabReset: boolean } {
  const targetIdx = wf.stages.findIndex(s => s.id === targetId);
  if (targetIdx < 0) return { wf, fabReset: false };
  const fresh = new Map(buildStages(job).map(s => [s.id, s]));
  const ownRound = isRepairStageId(targetId) ? [targetId, excavationIdForRepair(targetId)] : [];
  const stages = wf.stages.map((s, i) => {
    if (i < targetIdx) return s;
    if ((isRepairStageId(s.id) || isExcavationNdtStageId(s.id) || isEngineeringHoldId(s.id)) && !ownRound.includes(s.id)) {
      return s.signed ? s : { ...s, required: false };
    }
    if (isExcavationNdtStageId(s.id)) return { ...blankStage(s), required: false };
    const f = fresh.get(s.id);
    return f ?? blankStage(s);
  });
  const fabReset = goesBackPastFit(wf.stages, targetIdx);
  const fabricationData = fabReset ? blankFabricationData() : wf.fabricationData;
  return { wf: { ...wf, stages: applySignedFlags(setRoutingFrom(stages, targetId), job), fabricationData }, fabReset };
}

/* set the current routing to any step (Admin > Set Routing, Engineering's disposition): going back
   works like any route-back (that step and every step after it come up blank); going forward only
   moves the current routing, and the steps passed stay as they are */
export function moveRouting(wf: JobWorkflow, job: Job, targetId: string): { wf: JobWorkflow; back: boolean; fabReset: boolean } {
  const targetIdx = wf.stages.findIndex(s => s.id === targetId);
  const activeIdx = wf.stages.findIndex(s => s.id === activeStageId(wf.stages));
  if (targetIdx < 0) return { wf, back: false, fabReset: false };
  if (activeIdx < 0 || targetIdx >= activeIdx) {
    return { wf: { ...wf, stages: setRoutingFrom(wf.stages, targetId) }, back: false, fabReset: false };
  }
  const r = routeBack(wf, job, targetId);
  return { wf: r.wf, back: true, fabReset: r.fabReset };
}

/* the undo entry signStage() pushes before a sign-off */
export function signoffUndo(wf: JobWorkflow, job: Job, stageId: string): SignoffUndo {
  return {
    stageId,
    historyWhen: '',
    stages: wf.stages.map(({ fields: _f, signoffFields: _sf, ...rest }) => rest),
    fabricationData: { ...wf.fabricationData },
    refitNumber: job.refitNumber ?? '',
    repairNumber: job.repairNumber ?? '',
  };
}

/* Deprogress: undo the joint's most recent sign-off and everything it triggered (an inserted Repair,
   a route-back, a Cut, Defer Tack...). The deprogressed step and everything after it comes up blank.
   Without an undo entry (seeded demo signoffs) it falls back to the last signed step in routing order. */
export function deprogressWorkflow(wf: JobWorkflow, job: Job): { wf: JobWorkflow; stage: WorkflowStage } | null {
  const top = wf.undo?.at(-1);
  let stages: WorkflowStage[];
  let stageId: string;
  let rest: Partial<JobWorkflow> = {};
  if (top) {
    const current = new Map(wf.stages.map(s => [s.id, s]));
    const fresh = new Map(buildStages(job).map(s => [s.id, s]));
    stages = top.stages.map(snap => {
      const cur = current.get(snap.id);
      /* a signoff this one didn't touch stays as it is now (keeps any Correct made since) */
      if (cur?.signed && snap.signed && cur.signedAt === snap.signedAt) return cur;
      const defs = cur ?? fresh.get(snap.id);
      return { ...snap, fields: defs?.fields ?? [], signoffFields: defs?.signoffFields ?? [] };
    });
    const from = top.stages.find(s => s.routingFrom);
    stages = from ? setRoutingFrom(stages, from.id) : stages.map(({ routingFrom: _r, ...s }) => s as WorkflowStage);
    stageId = top.stageId;
    rest = { undo: wf.undo!.slice(0, -1), fabricationData: top.fabricationData, refitNumber: top.refitNumber, repairNumber: top.repairNumber };
  } else {
    const last = wf.stages.filter(s => s.signed).pop();
    if (!last) return null;
    stageId = last.id;
    stages = wf.stages.some(s => s.routingFrom) ? setRoutingFrom(wf.stages, stageId) : wf.stages;
  }
  const idx = stages.findIndex(s => s.id === stageId);
  if (idx < 0) return null;
  const stage = (top ? wf.stages.find(s => s.id === stageId) : undefined) ?? stages[idx];
  const fresh = new Map(buildStages(job).map(s => [s.id, s]));
  stages = stages.map((s, i) => (i === idx || (i > idx && !s.signed) ? blankStage(s, fresh.get(s.id)) : s));
  const fabricationData = goesBackPastFit(stages, idx)
    ? blankFabricationData() : rest.fabricationData ?? wf.fabricationData;
  /* deprogressing the sign-off that accepted a deviation takes its Engineering Hold away: the
     deviation stays on record as withdrawn */
  const deviations = wf.deviations?.map(d => d.status === 'open' && d.holdStageId && !stages.some(s => s.id === d.holdStageId)
    ? { ...d, status: 'withdrawn' as const } : d);
  return { wf: { ...wf, ...rest, stages, fabricationData, ...(deviations ? { deviations } : {}) }, stage };
}

/* Leaving the joint page without signing discards what was typed this visit: each stage that was
   unsigned when the page opened, and still is, gets back the values it had then. Only the values
   the user edits are put back -- required/signed and the rest belong to the routing, which a
   sign-off this visit may have changed (Defer Tack, Fit-Up Release, a route-back), and are kept. */
export function discardUnsignedEdits(
  wf: JobWorkflow, snapshot: { fabricationData: Record<string, string>; stages: Record<string, WorkflowStage> }
): JobWorkflow {
  const fitSigned = wf.stages.find(s => s.id === 'fit')?.signed ?? false;
  const fabricationData = fitSigned ? wf.fabricationData : { ...snapshot.fabricationData };
  const stages = wf.stages.map(s => {
    const snap = snapshot.stages[s.id];
    if (s.signed || !snap || snap.signed) return s;
    return {
      ...s,
      inputs: { ...snap.inputs }, signoffInputs: { ...snap.signoffInputs },
      fields: [...snap.fields], signoffFields: [...snap.signoffFields],
      routingType: snap.routingType, result: snap.result, inspectionType: snap.inspectionType, swapStageId: snap.swapStageId,
    };
  });
  return { ...wf, fabricationData, stages };
}
