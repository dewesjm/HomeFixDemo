/* Per-step rules about what the joint page shows and what can be changed afterwards */
import { WorkflowStage } from './types';
import { WELD_BUILDUP_DEFINITION, baseStepId, isRepairStageId } from './step-ids';
import { QUAL_CHECK_KEY, drawnByOwnForm } from './signoff-forms';
import { DECISION_KEY, TYPE_KEY, definitionHas, hasStepActivation, StepRef } from './step-field-config';

/* true when the user picks SAT/UNSAT on this stage (the Decision radios render on the same
   condition): its Signoff Type Definition lists Inspection Results, or, for a step with no definition
   (added in Admin > Routing Settings), it has a reject target. Other stages are accepted on signoff
   with no choice, so their SAT isn't shown or recorded. */
export function hasDecision(stage: Pick<WorkflowStage, 'id' | 'signoffType' | 'rejectToStage'>): boolean {
  return hasStepActivation(stage) ? definitionHas(stage, DECISION_KEY) : !!stage.rejectToStage;
}

/* UNSAT has nowhere to go on a step with no reject target, so it can't be signed */
export function unsatWithoutRejectTarget(stage: Pick<WorkflowStage, 'result' | 'rejectToStage'>): boolean {
  return stage.result === 'unsat' && !stage.rejectToStage;
}

/* whether the Type droplist shows: the step has Type options (Admin > Signoff Type Availability) and
   its own Signoff Type Definition lists Type (a step with no definition always shows it). A Type that
   loads another definition doesn't change this, so Fit signed as Weld Build-Up can still switch back. */
export function showsType(stage: Pick<WorkflowStage, 'id' | 'typeOptions'>): boolean {
  if (!stage.typeOptions?.length) return false;
  return !hasStepActivation(stage.id) || definitionHas(stage.id, TYPE_KEY);
}

/* a shown Type whose options have no default (Admin > Signoff Type Availability) starts blank
   ("Select the inspection performed…") and can't be signed until one is picked, even when there is
   only one option */
export function inspectionTypeRequired(stage: Pick<WorkflowStage, 'id' | 'typeOptions'>): boolean {
  return showsType(stage) && !stage.typeOptions!.some(o => o.default);
}

/* a step's Type is stored twice: inspectionType (what the joint page shows and NDT rules read) and
   signoffType (what a repeatable Type or a Type that loads another definition is looked up by,
   'standard' when blank); both always hold the same pick */
export function typeValues(value: string): Pick<WorkflowStage, 'inspectionType' | 'signoffType'> {
  return { inspectionType: value, signoffType: value || 'standard' };
}

/* the Type a step starts with and keeps until someone changes it: its default option, or blank when
   it has none. The stored value is what the joint page shows and what History records. */
export function initialInspectionType(stage: Pick<WorkflowStage, 'id' | 'typeOptions'>): string {
  if (inspectionTypeRequired(stage)) return '';
  return stage.typeOptions?.find(o => o.default)?.value ?? stage.typeOptions?.[0]?.value ?? '';
}

/* which steps show the References panel on the joint page: those whose Signoff Type Definition lists
   References (by default RT/UT on Root, Layer and Final NDT, and Repair); Correct shows it on every step */
export const showsReferences = (step: StepRef) => definitionHas(step, 'references');

/* Fields the "Correct" action (Work History — edit a signed stage's recorded values in place,
   distinct from Deprogress) must never touch: SignoffService.signStage() reads these once, at the
   moment a stage is signed, to decide what to insert or route back to. Changing the stored value afterward
   doesn't re-run that decision, so the record and the actual stage list would silently diverge.
   Keyed by stage id since these are only special on the stage that actually branches on them.
   Decision/Type aren't in here because Correct never touches
   `result`/`inspectionType`/`signoffType` at all -- only `inputs`/`signoffInputs`. */
export const ROUTING_LOCKED_FIELD_KEYS: Record<string, string[]> = {
  repair: ['repairType', 'allowableThicknessExceeded'],
  'fitup-insp': ['releaseToWelding'],
  fit: ['deferTack'],
};

export function isRoutingLockedField(stageId: string, key: string): boolean {
  return (ROUTING_LOCKED_FIELD_KEYS[isRepairStageId(stageId) ? 'repair' : baseStepId(stageId)] ?? []).includes(key);
}

/* routing-read fields an admin may still take off a Signoff Type Definition, with what that does;
   the stored value then stays at the one the step starts with */
export const DEFINITION_REMOVAL_NOTES: Record<string, string> = {
  releaseToWelding: 'Unticked: every joint is released to welding and Fit-Up Release never comes up.',
  deferTack: 'Unticked: Tack is never deferred; Tack always follows Fit and Deferred Tack never comes up.',
};

/* routing-read fields on any other step: shown and saved there, but routing reads only the home step's */
const OTHER_STEP_NOTES: Record<string, string> = {
  releaseToWelding: "Only Fit-Up Insp's Release to welding decides Fit-Up Release; on this step it's saved but routing ignores it.",
  deferTack: "Only Fit's Defer Tack decides whether Tack is deferred; on this step it's saved but routing ignores it.",
};

/* fields drawn inside Affected Item */
const AFFECTED_ITEM_PART_NOTES: Record<string, string> = {
  affectedMicVerified1: 'Shown under Affected Item, beside the Joining Item while it is picked.',
  affectedMicVerified2: 'Shown under Affected Item, beside the Join To Item while it is picked.',
};

/* fields the sign-off panel or joint page draws outside the form, and Inspection Results' routing */
const OWN_SPOT_NOTES: Record<string, string> = {
  type: 'Drawn above the form when Admin > Signoff Type Availability gives the step options. No default there means it must be picked.',
  decision: 'UNSAT can be signed only on a step with a Reject routes to target (Admin > Routing Settings).',
  comments: 'Drawn below the form.',
  references: 'Drawn as the References panel under the sign-off.',
};

/* what a field means on a step's definition: where the panel draws it, or for a routing-read field,
   what taking it off does on its home step or that routing ignores it on any other step. Fit signed as
   Weld Build-Up is still the Fit step, so routing reads a Defer Tack there too: no note. */
export function definitionFieldNote(stageId: string, key: string): string {
  if (key === TYPE_KEY && stageId === WELD_BUILDUP_DEFINITION) return "Not used here: Fit's own definition decides whether Fit shows Type, also when signed as Weld Build-Up.";
  if (key in OWN_SPOT_NOTES) return OWN_SPOT_NOTES[key];
  if (key === QUAL_CHECK_KEY && drawnByOwnForm(stageId, key)) return "Drawn above the form: the signer's quals checked against the joint's condition quals (Admin > Qualifications).";
  if (key in AFFECTED_ITEM_PART_NOTES) return AFFECTED_ITEM_PART_NOTES[key];
  if (stageId === WELD_BUILDUP_DEFINITION) return '';
  if (isRoutingLockedField(stageId, key)) return DEFINITION_REMOVAL_NOTES[key] ?? '';
  return OTHER_STEP_NOTES[key] ?? '';
}

/* routing-read fields that can't be taken off a Signoff Type Definition */
export function isDefinitionLockedField(stageId: string, key: string): boolean {
  return isRoutingLockedField(stageId, key) && !(key in DEFINITION_REMOVAL_NOTES);
}
