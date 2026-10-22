/* Which form a step's sign-off shows, and the Comments box every hand-signed step has. The sign-off
   panel draws the parts every step shares (Type, Decision, Comments, Signoff) and picks the step's
   own form from signoffForm(). */
import { SignoffField, WorkflowStage } from './types';
import { baseStepId, isEngineeringHoldId, isExcavationNdtStageId } from './step-ids';
import { StepRef, WELD_BUILDUP_DEFINITION, hasStepActivation } from './step-field-config';
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
  const id = baseStepId(stage.id);
  if (id === 'fit') return stage.signoffType === 'weld-buildup' ? 'weld' : 'fit';
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
   page's panel, an NDT step's Defect Code is drawn below the decision */
export function drawnOutsideForm(stage: Pick<WorkflowStage, 'id' | 'signoffType'>, key: string): boolean {
  return key === 'references' || (key === 'defectCode' && signoffForm(stage) === 'ndt');
}

/* steps whose fields are a grid of values to check off; a Required row must be checked */
export function isVerifyGrid(stage: Pick<WorkflowStage, 'id' | 'signoffType'>): boolean {
  const form = signoffForm(stage);
  return form === 'fitup-insp' || form === 'records-review';
}

/* Not listed on any step: the panel draws it, History and Correct add it (withComments). Saved in
   the step's signoffInputs. */
export const COMMENTS_FIELD: SignoffField = { key: 'comments', label: 'Comments', type: 'text', required: false, fullWidth: true };

/* Engineering Hold has its own required Comments on its release form; nobody signs Sold */
export function hasCommentsBox(stage: Pick<WorkflowStage, 'id' | 'signoffType'>): boolean {
  const form = signoffForm(stage);
  return form !== 'engineering-hold' && form !== 'sold';
}

/* a step's sign-off fields plus its Comments box */
export function withComments(stage: Pick<WorkflowStage, 'id' | 'signoffType'>, fields: SignoffField[]): SignoffField[] {
  return hasCommentsBox(stage) && !fields.some(f => f.key === COMMENTS_FIELD.key) ? [...fields, COMMENTS_FIELD] : fields;
}
