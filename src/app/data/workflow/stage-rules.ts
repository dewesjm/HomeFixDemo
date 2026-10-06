/* Per-step rules about what the joint page shows and what can be changed afterwards */
import { WorkflowStage } from './types';
import { isRepairStageId } from './step-ids';

/* true when the user picks SAT/UNSAT on this stage (the Decision radios render on the same
   condition); other stages are accepted on signoff with no choice, so their SAT isn't shown or recorded */
export function hasDecision(stage: { rejectToStage?: string }): boolean {
  return !!stage.rejectToStage;
}

/* inspection steps (Pre-Fit, Fit-Up Insp, every NDT incl. Excavation NDT) run the Qualification
   Check on the joint's condition quals, like welding steps do with their Qualification Check field */
export function isInspectionStage(stage: Pick<WorkflowStage, 'id'>): boolean {
  return stage.id === 'pre-fit' || stage.id === 'fitup-insp' || /-ndt(-|$)/.test(stage.id);
}

/* a step whose Type options have no default (Admin > Signoff Type Availability) starts blank
   ("Select the inspection performed…") and can't be signed until one is picked, even when there is
   only one option. Fit is the exception: its Type is routingType and starts on its first option. */
export function inspectionTypeRequired(stage: Pick<WorkflowStage, 'id' | 'routingOptions'>): boolean {
  return stage.id !== 'fit' && !!stage.routingOptions?.length && !stage.routingOptions.some(o => o.default);
}

/* the Type a step starts with and keeps until someone changes it: its default option, or blank when
   it has none. The stored value is what the joint page shows and what History records. */
export function initialInspectionType(stage: Pick<WorkflowStage, 'id' | 'routingOptions'>): string {
  if (inspectionTypeRequired(stage)) return '';
  return stage.routingOptions?.find(o => o.default)?.value ?? stage.routingOptions?.[0]?.value ?? '';
}

/* which steps show the References panel on the joint page (the Correct dialog shows it on every step):
   RT/UT (Root, Layer and Final NDT) and Repair only */
export const showsReferences = (id: string) => /^(root|layer|final)-ndt-utrt$/.test(id) || isRepairStageId(id);

/* Fields the "Correct" action (Work History — edit a signed stage's recorded values in place,
   distinct from Deprogress) must never touch: SignoffService.signStage() reads these once, at the
   moment a stage is signed, to decide what to insert or route back to. Changing the stored value afterward
   doesn't re-run that decision, so the record and the actual stage list would silently diverge.
   Keyed by stage id since these are only special on the stage that actually branches on them.
   Decision/Type/Routing Type aren't in here because Correct never touches
   `result`/`inspectionType`/`routingType` at all -- only `inputs`/`signoffInputs`. */
export const ROUTING_LOCKED_FIELD_KEYS: Record<string, string[]> = {
  repair: ['repairType', 'allowableThicknessExceeded'],
  'fitup-insp': ['releaseToWelding'],
  fit: ['deferTack'],
};

export function isRoutingLockedField(stageId: string, key: string): boolean {
  return (ROUTING_LOCKED_FIELD_KEYS[isRepairStageId(stageId) ? 'repair' : stageId] ?? []).includes(key);
}
