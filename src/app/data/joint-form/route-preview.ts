/* The demo routing preview under the Signoff button (Admin > Feature Toggles): where the joint goes
   when this step is signed, and why. Repair and Excavation NDT have their own wording, mirroring
   SignoffService.signStage()'s routing:
     Repair: Allowable thickness exceeded takes priority -> that phase's NDT RT/UT; else Grind Only ->
       the NDT step that rejected the joint; else Weld Repair -> inserts Excavation NDT; else Cut ->
       starts over from Fit, Refit # up by one; no code chosen -> nothing shown.
     Excavation NDT (SAT; UNSAT routes back to Repair via rejectToStage): the original joint
       inspection, unless that was PT and the job's material (Material Type 1 or 2, Admin > Material
       Classification) is non-ferrous or austenitic, in which case 5X instead of PT.
   Every other step runs the real sign-off as a dry run (the `preview` callback, SignoffService.previewSignoff). */
import { Job } from '../jobs';
import {
  WorkflowStage, excavationNdtStage, getTemplates, hasDecision, isEngineeringHoldId, isExcavationNdtStageId, isRepairStageId,
  repairIdForExcavation,
} from '../workflow';
import { isNonFerrousOrAustenitic } from '../material-classification';

export type SignoffPreview = (result?: WorkflowStage['result']) => { target: WorkflowStage | undefined; reasons: string[] };

/* The preview for `stage`, '' when there's nothing to say. A SAT/UNSAT step with no decision picked
   yet shows both outcomes. */
export function routePreviewLabel(job: Job, stages: WorkflowStage[], stage: WorkflowStage, activeId: string | null, preview: SignoffPreview): string {
  return routeLabel(job, stages, stage, activeId, preview);
}

function routeLabel(job: Job, stages: WorkflowStage[], stage: WorkflowStage, activeId: string | null, preview: SignoffPreview): string {
  if (isRepairStageId(stage.id) || isExcavationNdtStageId(stage.id)) {
    const templates = getTemplates()[job.trade] ?? [];
    return repairRouteLabel(job, stages, stage, id => templates.find(t => t.id === id)?.label ?? id);
  }
  if (stage.signed || stage.id === 'sold' || stage.id !== activeId || isEngineeringHoldId(stage.id)) return '';
  const from = stages.findIndex(s => s.id === stage.id);
  const phrase = (when: string, result?: WorkflowStage['result']) => {
    const { target, reasons } = preview(result);
    const why = `Why: ${reasons.length ? reasons.join('; ') : 'no special conditions'}.`;
    if (!target) return `${when}, the joint is complete. ${why}`;
    if (target.id === stage.id) return `${when}, the joint stays at ${stage.label}. ${why}`;
    if (target.label === stage.label) return `${when}, this routes to another ${stage.label}. ${why}`;
    const back = stages.findIndex(s => s.id === target.id);
    return `${when}, this routes ${back >= 0 && back < from ? 'back ' : ''}to ${target.label}. ${why}`;
  };
  if (hasDecision(stage) && !stage.result) return `${phrase('On SAT', 'sat')} ${phrase('On UNSAT', 'unsat')}`;
  return phrase('On signoff');
}

/* The stage Excavation NDT's SAT routes back to (the NDT stage that originally rejected the joint,
   or that phase's VT/5X when the PT/material rule applies). `repair` carries the origin bookkeeping
   (inputs originPhase / originStageId / originInspectionType). */
function originInspectionLabel(job: Job, repair: WorkflowStage | undefined, labelOf: (id: string) => string): string {
  if (!repair) return 'the original joint inspection';
  const phase = repair.inputs['originPhase'] ?? '';
  const originStageId = repair.inputs['originStageId'] ?? '';
  const originInspectionType = repair.inputs['originInspectionType'] ?? '';
  const needs5xInstead = originInspectionType === 'pt' && phase
    && (isNonFerrousOrAustenitic(job.materialType1) || isNonFerrousOrAustenitic(job.materialType2));
  if (needs5xInstead) {
    return `${labelOf(`${phase}-ndt-vt5x`)} (5X instead of PT - material is non-ferrous or austenitic)`;
  }
  return originStageId ? labelOf(originStageId) : 'the original joint inspection';
}

/* where `stage` (a Repair or Excavation NDT) routes on signoff, given its current inputs; '' when
   nothing is chosen yet */
function repairRouteLabel(job: Job, stages: WorkflowStage[], stage: WorkflowStage, labelOf: (id: string) => string): string {
  if (isRepairStageId(stage.id)) {
    const phase = stage.inputs['originPhase'] ?? '';
    if (stage.inputs['allowableThicknessExceeded'] === 'yes') {
      return phase ? `On signoff, this routes back to ${labelOf(`${phase}-ndt-utrt`)}. Why: Allowable thickness exceeded is checked (this comes before the Repair Code).` : '';
    }
    const repairType = stage.inputs['repairType'] ?? '';
    if (repairType === 'grind') {
      const target = stage.inputs['originStageId'] ?? '';
      return target ? `On signoff, this routes to ${labelOf(target)}. Why: Repair Code is Grind Only.` : '';
    }
    if (repairType === 'weld-repair') {
      return `On signoff, this routes to ${excavationNdtStage('', stage.id).label}; SAT there routes back to ${originInspectionLabel(job, stage, labelOf)}, UNSAT routes back to ${stage.label}. Why: Repair Code is Weld Repair.`;
    }
    if (repairType === 'cut') {
      return `On signoff, the joint starts over from ${labelOf('fit')} and continues along the path from there. Past records are kept, and Refit # goes up to ${String(Number(job.refitNumber || '0') + 1).padStart(2, '0')}. Why: Repair Code is Cut.`;
    }
    return '';
  }
  if (isExcavationNdtStageId(stage.id)) {
    const repair = stages.find(s => s.id === repairIdForExcavation(stage.id));
    return `On SAT, this routes back to ${originInspectionLabel(job, repair, labelOf)}. UNSAT routes back to ${repair?.label ?? 'Repair'}. Why: weld repairs require the original joint inspection; UNSAT means the repair was rejected.`;
  }
  return '';
}
