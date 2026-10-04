/* Steps added to a joint while it's worked, not part of the built-in routing: Repair (after an NDT
   UNSAT), Excavation NDT (after a Weld Repair) and Engineering Hold (after accepted deviations or a
   reject rule). Ids and round numbers are in step-ids.ts. */
import { Job } from '../jobs';
import { RejectRule, describeClauses, stageConditionFields } from '../step-conditions';
import { StageTemplate, WorkflowStage } from './types';
import { NDT_COMMON_FIELDS, NDT_KINDS, NdtKind } from './ndt';
import { excavationIdForRepair, isEngineeringHoldId, isRepairStageId, roundLabel } from './step-ids';
import { setRoutingFrom } from './current-routing';

/* ── Repair ── */

/* Repair's allowable thickness depends on the job's Nuclear Indicator (see the nInd tooltip,
   joint-details.component.ts's N_IND_MEANINGS: '1' = N 250-1500-1, '2' = N TP278, '3' = Non).
   '3' (Non) has no stated rule -- falls back to the TP278 value, unreviewed. Shown in the
   "exceeded" checkbox's label (data/joint-form/stage-form.ts stageFieldOptions). */
export function allowableThicknessAmount(nInd: string): string {
  const inches = nInd === '1' ? '3/8' : '3/16';
  return `${inches} inch or 20% of material thickness, which is less`;
}

/* Inserted when an NDT step is UNSAT. Its own routing on signoff (SignoffService.signStage()):
   Allowable thickness exceeded -> back to that phase's NDT RT/UT; else Grind Only -> that phase's
   NDT VT/5X; Weld Repair -> inserts Excavation NDT next; Cut -> back to Fit. Its single-option Type
   droplist is pre-filled, since Foreman isn't an Inspector role (inspectionTypeRequired()). */
export const REPAIR_STAGE: StageTemplate = {
  id: 'repair', label: 'Repair', required: true, role: 'Foreman', fields: [
    { key: 'repairType', label: 'Repair Code', type: 'select', required: true,
      options: [{ label: 'Grind Only', value: 'grind' }, { label: 'Weld Repair', value: 'weld-repair' }, { label: 'Cut', value: 'cut' }] },
    { key: 'allowableThicknessExceeded', label: 'Allowable thickness exceeded - Volumetric inspection (UT/RT) is required', type: 'checkbox' },
  ], signoffFields: [], decisionLabel: 'Inspection Results',
  routingOptions: [{ label: 'Repair', value: 'repair', default: true }],
};

/* every NDT UNSAT adds a new Repair round, with no limit */
export function nextRepairStage(stages: { id: string }[]): StageTemplate {
  const n = stages.filter(s => isRepairStageId(s.id)).length + 1;
  const id = n === 1 ? 'repair' : `repair-${n}`;
  return { ...REPAIR_STAGE, id, label: roundLabel(REPAIR_STAGE.label, id) };
}

/* ── Excavation NDT ── */

const EXCAVATION_NDT_LABEL = 'Excavation NDT';

/* Inserted after Repair when Repair Code = Weld Repair. The excavation is the removal of the rejected
   material; this step signs off that it was cleaned out correctly, so it "requires the same
   inspection that was noted as reject" -- same fields and the same single-option Type as whatever
   method (RT/UT/MT/PT/VT/5X) originally rejected the joint, not a fresh generic NDT check.
   `inspectionType` is the resolved single value the caller (SignoffService) passes in -- normally the
   origin's own inspectionType, except PT on non-ferrous/austenitic material requires 5X instead (the
   caller decides that, since it needs the job's material classification). UNSAT routes back to its
   own round's Repair via rejectToStage. */
export function excavationNdtStage(inspectionType: string, repairId = 'repair'): StageTemplate {
  const kind: NdtKind = (inspectionType === 'ut' || inspectionType === 'rt') ? 'utrt'
    : (inspectionType === 'mt' || inspectionType === 'pt') ? 'mtpt'
    : 'vt5x';
  const k = NDT_KINDS[kind];
  const opt = k.options.find(o => o.value === inspectionType) ?? k.options[0];
  return {
    id: excavationIdForRepair(repairId), label: roundLabel(EXCAVATION_NDT_LABEL, repairId), required: true, role: 'Inspector',
    fields: [...NDT_COMMON_FIELDS, ...k.fields].map(f => ({ ...f })),
    signoffFields: [{ key: 'comments', label: 'Comments', type: 'text', required: false, fullWidth: true }],
    rejectToStage: repairId, decisionLabel: 'Inspection Results',
    routingOptions: [{ label: opt.label, value: opt.value, default: true }],
  };
}

/* Excavation NDT for `repairId`, its Type droplist offering only the one resolved method (still
   blank until picked); the Inspector role gets the same NQC Inspector remap buildStages() gives every
   other NDT step, since this one is built at runtime */
export function excavationNdtStageFor(job: Job, inspectionType: string, repairId: string): WorkflowStage {
  const role = (job.nInd === '1' || job.nInd === '2') ? 'NQC Inspector' : 'Inspector';
  return { ...stageFromTemplate(excavationNdtStage(inspectionType, repairId)), role };
}

/* ── Engineering Hold ── */

/* Signing a step with accepted deviations adds this right after it, and the joint waits there until
   Engineering enters comments and sets the routing on that step (EngineeringReleaseComponent,
   DeviationService.disposition); Pipe Welding's Engineering role lists the joints waiting. Its
   Signoff button never shows. */
const ENGINEERING_HOLD_STAGE: StageTemplate = {
  id: 'engineering-hold', label: 'Engineering Hold', required: true, role: 'Engineering', fields: [], signoffFields: [],
};

export function nextEngineeringHoldId(stages: { id: string }[]): string {
  const n = stages.filter(s => isEngineeringHoldId(s.id)).length + 1;
  return n === 1 ? 'engineering-hold' : `engineering-hold-${n}`;
}

/* why a reject rule sent `stage`'s UNSAT to Engineering Hold (the hold's holdReason), e.g.
   "Final NDT MT/PT was UNSAT (Type is PT, and Final Weld: Weld Process is GTAW)" */
export function rejectHoldReason(stage: WorkflowStage, rule: RejectRule): string {
  return `${stage.label} was UNSAT (${describeClauses(rule.when, stageConditionFields(stage)).join(', and ')})`;
}

/* a new Engineering Hold right after `afterId`, and the current routing starts there. `reason` is
   kept on it (inputs.holdReason) when no deviation explains the hold, e.g. a reject rule's */
export function insertEngineeringHold(stages: WorkflowStage[], afterId: string, reason = ''): WorkflowStage[] {
  const idx = stages.findIndex(s => s.id === afterId);
  if (idx < 0) return stages;
  const id = nextEngineeringHoldId(stages);
  const hold = stageFromTemplate({ ...ENGINEERING_HOLD_STAGE, id, label: roundLabel(ENGINEERING_HOLD_STAGE.label, id) }, reason ? { holdReason: reason } : {});
  return setRoutingFrom([...stages.slice(0, idx + 1), hold, ...stages.slice(idx + 1)], id);
}

/* ── Building an added step ── */

/* Build a live WorkflowStage from a template for a stage inserted at runtime (Repair, Excavation
   NDT, Engineering Hold) -- same shape buildStages() makes, minus the parts only a job's real
   routing needs (role remap, override fields, etc.), since these are always the same regardless
   of job. Type starts blank. */
export function stageFromTemplate(t: StageTemplate, inputs: Record<string, string> = {}): WorkflowStage {
  return {
    id: t.id,
    label: t.label,
    required: true,
    role: t.role ?? '',
    fields: t.fields.map(f => ({ ...f })),
    inputs,
    signoffFields: (t.signoffFields ?? []).map(f => ({ ...f })),
    signoffInputs: {},
    result: null,
    rejectToStage: t.rejectToStage ?? '',
    repeatable: false,
    routingType: 'standard',
    swapStageId: '',
    inspectionType: '',
    routingOptions: t.routingOptions ?? [],
    signed: false,
    signedAt: null,
    decisionLabel: t.decisionLabel,
  };
}
