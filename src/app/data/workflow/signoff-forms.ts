/* Which form a step's sign-off shows, and whether it has a Comments box. The sign-off panel draws
   the parts every step shares (Type, Decision, Comments, Signoff) and picks the step's own form from
   signoffForm(). */
import { SignoffField, WorkflowStage } from './types';
import { WELD_BUILDUP_DEFINITION, baseStepId, isEngineeringHoldId, isExcavationNdtStageId } from './step-ids';
import { COMMENTS_KEY, StepRef, TYPE_KEY, definitionHas, hasStepActivation } from './step-field-config';
import { typeDefinition } from './signoff-types';
import { lookupCatalogField } from './field-catalog';
import { featureToggles } from '../feature-toggles';

export type SignoffForm =
  | 'fit'             /* Pre-Fit, Fit: Consumable Insert / Backing Ring, Defer Tack */
  | 'fitup-insp'      /* verify the fitting values, Release to welding */
  | 'weld'            /* Tack, Deferred Tack, Root, Layer, Final Weld, Fit as Weld Build-Up */
  | 'ndt'             /* every NDT step and Excavation NDT */
  | 'records-review'  /* O63 / O04 Records Review */
  | 'engineering-hold'/* Engineering's release form instead of Signoff */
  | 'sold'            /* closed, never signed by hand */
  | 'generic';        /* Repair, Fit-Up Release, steps added in Admin > Routing Settings */

const WELD_STEP_IDS = ['tack', 'deferred-tack', 'root-weld', 'root-layer', 'final-weld'];

export function signoffForm(stage: Pick<WorkflowStage, 'id' | 'signoffType'>): SignoffForm {
  /* a Type that loads another definition gets that definition's form (Weld Build-Up's is the weld form) */
  const loaded = typeDefinition(stage.id, stage.signoffType);
  if (loaded) return loaded === WELD_BUILDUP_DEFINITION ? 'weld' : signoffForm({ id: loaded, signoffType: '' });
  const id = baseStepId(stage.id);
  if (id === 'fit') return 'fit';
  if (id === 'pre-fit') return 'fit';
  if (id === 'fitup-insp') return 'fitup-insp';
  if (WELD_STEP_IDS.includes(id)) return 'weld';
  if (/^(root|layer|final)-ndt-/.test(id) || isExcavationNdtStageId(id)) return 'ndt';
  if (id === 'review-o63' || id === 'review-o04') return 'records-review';
  if (isEngineeringHoldId(id)) return 'engineering-hold';
  if (id === 'sold') return 'sold';
  return 'generic';
}

/* While the Layout from Signoff Type Definition toggle is on, these forms are drawn from the step's
   definition (definition-layout.ts) instead of their built-in layouts. The verify grids keep their
   grid, in definition order; a step with no definition (added in Routing Settings) keeps its template. */
const DEFINITION_LAID_OUT: SignoffForm[] = ['fit', 'weld', 'ndt', 'generic'];

export function drawsFromDefinition(stage: Pick<WorkflowStage, 'id' | 'signoffType'>): boolean {
  return featureToggles().definitionLayout && DEFINITION_LAID_OUT.includes(signoffForm(stage)) && hasStepActivation(stage);
}

/* Whether a field its definition lists is drawn its own way rather than as an ordinary field of the
   step: Affected Item and References on any step, Pre-Fit/Fit's insert, ring and Defer Tack (sign-off
   fields, also on Fit signed as Weld Build-Up) and Fit-Up Insp's Release to welding on those steps.
   Anywhere else those last ones are ordinary fields, saved with the step's own values. */
export function drawnByOwnForm(step: StepRef, key: string): boolean {
  const cat = lookupCatalogField(key);
  if (!cat) return false;
  const id = typeof step === 'string' ? step : step.id;
  const home = id === WELD_BUILDUP_DEFINITION ? 'fit' : baseStepId(id);
  return !!cat.ownComponent || !!cat.ownFormSteps?.includes(home);
}

/* fields a step's definition lists that the form leaves to another spot: References is the joint
   page's panel, Type and Comments the sign-off panel's, above and below the form */
export function drawnOutsideForm(key: string): boolean {
  return key === 'references' || key === TYPE_KEY || key === COMMENTS_KEY;
}

/* steps whose fields are a grid of values to check off; a Required row must be checked */
export function isVerifyGrid(stage: Pick<WorkflowStage, 'id' | 'signoffType'>): boolean {
  const form = signoffForm(stage);
  return form === 'fitup-insp' || form === 'records-review';
}

/* The panel draws it, History and Correct add it (withComments). Saved in the step's signoffInputs. */
export const COMMENTS_FIELD: SignoffField = { key: COMMENTS_KEY, label: 'Comments', type: 'text', required: false, fullWidth: true };

/* a step whose Signoff Type Definition lists Comments; a step with no definition (added in Admin >
   Routing Settings) has one unless it's Engineering Hold (its own required Comments on its release
   form) or Sold (nobody signs it) */
export function hasCommentsBox(stage: Pick<WorkflowStage, 'id' | 'signoffType'>): boolean {
  if (hasStepActivation(stage)) return definitionHas(stage, COMMENTS_KEY);
  const form = signoffForm(stage);
  return form !== 'engineering-hold' && form !== 'sold';
}

/* a step's sign-off fields plus its Comments box */
export function withComments(stage: Pick<WorkflowStage, 'id' | 'signoffType'>, fields: SignoffField[]): SignoffField[] {
  return hasCommentsBox(stage) && !fields.some(f => f.key === COMMENTS_FIELD.key) ? [...fields, COMMENTS_FIELD] : fields;
}
