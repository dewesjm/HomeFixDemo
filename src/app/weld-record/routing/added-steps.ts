/* Steps added to a joint while it's worked, not part of the built-in routing: Repair (after an NDT
   UNSAT), Excavation NDT (after a Weld Repair) and Engineering Hold (after accepted deviations or a
   reject rule). Ids and round numbers are in step-ids.ts. */
import { getAddedTemplate } from './stage-templates';
import { Job } from '../../data/jobs';
import { RejectRule, describeClauses, stageConditionFields } from './step-conditions';
import { StageTemplate, WorkflowStage } from '../model/workflow-types';
import { excavationIdForRepair, isEngineeringHoldId, isRepairStageId, roundLabel } from './step-ids';
import { setRoutingFrom } from './current-routing';
import { initialInspectionType, typeValues } from '../signoff-definition/stage-rules';
import { excavationTypeOptions, signoffTypeOptions } from '../signoff-definition/signoff-types';

/* ── Repair ── */

/* Repair's allowable thickness depends on the job's Nuclear Indicator (see the nInd tooltip,
   joint-details.component.ts's N_IND_MEANINGS: '1' = N 250-1500-1, '2' = N TP278, '3' = Non).
   '2' (TP278) and '3' (Non) share the same limit. Shown in the
   "exceeded" checkbox's label (weld-record/joint-page/rules/stage-form.ts stageFieldOptions). */
export function allowableThicknessAmount(nInd: string): string {
  const inches = nInd === '1' ? '3/8' : '3/16';
  return `${inches} inch or 20% of material thickness, which is less`;
}

/* every NDT UNSAT adds a new Repair round, with no limit */
export function nextRepairStage(stages: { id: string }[], job?: Job): StageTemplate {
  const n = stages.filter(s => isRepairStageId(s.id)).length + 1;
  const id = n === 1 ? 'repair' : `repair-${n}`;
  return { ...getAddedTemplate('repair'), id, label: roundLabel(getAddedTemplate('repair').displayName || getAddedTemplate('repair').label, id), typeOptions: signoffTypeOptions(id, job) };
}

/* ── Excavation NDT ── */



/* Build the round's inspection shell. Its selected Type loads the shared inspection form;
   signoff-types.ts resolves the configured Type source and exceptions before insertion. */
export function excavationNdtStage(inspectionType: string, repairId = 'repair', job?: Job): StageTemplate {
  return {
    ...getAddedTemplate('excavation-ndt'),
    id: excavationIdForRepair(repairId), label: roundLabel(getAddedTemplate('excavation-ndt').displayName || getAddedTemplate('excavation-ndt').label, repairId), required: true,
    rejectToStage: getAddedTemplate('excavation-ndt').rejectToStage, decisionLabel: 'Inspection Results',
    typeOptions: excavationTypeOptions(job, inspectionType),
  };
}

/* Excavation NDT for `repairId`, its Type droplist offering only the one resolved method (still
   blank until picked); the Inspector role gets the same NQC Inspector remap buildStages() gives every
   other NDT step, since this one is built at runtime */
export function excavationNdtStageFor(job: Job, inspectionType: string, repairId: string): WorkflowStage {
  const configured = getAddedTemplate('excavation-ndt').role ?? 'Inspector';
  const role = configured === 'Inspector' && (job.nInd === '1' || job.nInd === '2') ? 'NQC Inspector' : configured;
  return { ...stageFromTemplate(excavationNdtStage(inspectionType, repairId, job)), role };
}

/* ── Engineering Hold ── */

/* Signing a step with accepted deviations adds this right after it, and the joint waits there until
   Engineering enters comments and sets the routing on that step (EngineeringReleaseComponent,
   DeviationService.disposition); Pipe Welding's Engineering role lists the joints waiting. Its
   Signoff button never shows. */
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
  const hold = stageFromTemplate({ ...getAddedTemplate('engineering-hold'), id, label: roundLabel(getAddedTemplate('engineering-hold').displayName || getAddedTemplate('engineering-hold').label, id) }, reason ? { holdReason: reason } : {});
  return setRoutingFrom([...stages.slice(0, idx + 1), hold, ...stages.slice(idx + 1)], id);
}

/* ── Building an added step ── */

/* Build a live WorkflowStage from a template for a stage inserted at runtime (Repair, Excavation
   NDT, Engineering Hold) -- same shape buildStages() makes, minus the parts only a job's real
   routing needs (role remap, override fields, etc.), since these are always the same regardless
   of job. Type starts as initialInspectionType() gives it. */
export function stageFromTemplate(t: StageTemplate, inputs: Record<string, string> = {}): WorkflowStage {
  return {
    id: t.id,
    label: t.label,
    required: true,
    role: t.role ?? '',
    inputs,
    signoffInputs: {},
    result: null,
    rejectToStage: t.rejectToStage ?? '',
    ...typeValues(initialInspectionType(t)),
    typeOptions: t.typeOptions,
    signed: false,
    signedAt: null,
    decisionLabel: t.decisionLabel,
  };
}

