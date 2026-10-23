/* Which form a step's sign-off shows, and whether it has a Comments box. The sign-off panel draws
   the parts every step shares (Type, Decision, Qualification Check off the weld form, Comments,
   Signoff) and picks the step's own form from signoffForm(). */
import { SignoffField, SignoffForm, WorkflowStage } from './types';
import { WELD_BUILDUP_DEFINITION, baseStepId } from './step-ids';
import { COMMENTS_KEY, StepRef, TYPE_KEY, definitionHas, hasStepActivation } from './step-field-config';
import { typeDefinition } from './signoff-types';
import { lookupCatalogField } from './field-catalog';
import { templateForm } from './stage-templates';
import { addedStepForm } from './added-steps';
import { featureToggles } from '../feature-toggles';

export type { SignoffForm };

/* the forms Admin > Routing Settings offers for a routing step (Engineering Hold's is only for the
   hold a joint gets while it's worked) */
export const FORM_OPTIONS: { value: SignoffForm; label: string }[] = [
  { value: 'generic', label: 'Plain' },
  { value: 'fit', label: 'Fit (insert, ring, Defer Tack)' },
  { value: 'fitup-insp', label: 'Fit-Up verify grid' },
  { value: 'weld', label: 'Weld' },
  { value: 'ndt', label: 'NDT' },
  { value: 'records-review', label: 'Records verify grid' },
  { value: 'sold', label: 'Sold (never signed)' },
];

export function formLabel(form: SignoffForm | undefined): string {
  return FORM_OPTIONS.find(o => o.value === (form ?? 'generic'))?.label ?? 'Engineering Hold';
}

/* A step's form: its Form on Admin > Routing Settings, or for a step added while the joint is worked
   (Repair, Excavation NDT, Engineering Hold) its template's. A Type that loads another definition
   gets that definition's form: a routing step's own, and the weld form for Weld Build-Up's, which
   isn't a routing step. Read live, so a change applies to joints in progress. */
export function signoffForm(stage: Pick<WorkflowStage, 'id' | 'signoffType'>): SignoffForm {
  const loaded = typeDefinition(stage.id, stage.signoffType);
  if (loaded) return signoffForm({ id: loaded, signoffType: '' });
  if (stage.id === WELD_BUILDUP_DEFINITION) return 'weld';
  return addedStepForm(stage.id) ?? templateForm(stage.id) ?? 'generic';
}

/* While the Layout from Signoff Type Definition toggle is on, these forms are drawn from the step's
   definition (definition-layout.ts) instead of their built-in layouts. The verify grids keep their
   grid, in definition order; a step with no definition (added in Routing Settings) keeps its template. */
const DEFINITION_LAID_OUT: SignoffForm[] = ['fit', 'weld', 'ndt', 'generic'];

export function drawsFromDefinition(stage: Pick<WorkflowStage, 'id' | 'signoffType'>): boolean {
  return featureToggles().definitionLayout && DEFINITION_LAID_OUT.includes(signoffForm(stage)) && hasStepActivation(stage);
}

/* Whether a field its definition lists is drawn its own way rather than as an ordinary field of the
   step: Affected Item and References on any step, Qualification Check off the weld form, Pre-Fit/Fit's
   insert, ring and Defer Tack (sign-off fields, also on Fit signed as Weld Build-Up) and Fit-Up Insp's
   Release to welding on those steps.
   Anywhere else those last ones are ordinary fields, saved with the step's own values. */
export function drawnByOwnForm(step: StepRef, key: string): boolean {
  const cat = lookupCatalogField(key);
  if (!cat) return false;
  if (key === QUAL_CHECK_KEY) return qualCheckAboveForm(step);
  const id = typeof step === 'string' ? step : step.id;
  const home = id === WELD_BUILDUP_DEFINITION ? 'fit' : baseStepId(id);
  return !!cat.ownComponent || !!cat.ownFormSteps?.includes(home);
}

/* Qualification Check: the weld form draws it among its fields; on any other form the sign-off panel
   draws it above the form (inspection steps check the joint's condition quals, Admin > Qualifications) */
export const QUAL_CHECK_KEY = 'qualificationCheck';

function qualCheckAboveForm(step: StepRef): boolean {
  return signoffForm(typeof step === 'string' ? { id: step, signoffType: '' } : step) !== 'weld';
}

/* whether the sign-off panel draws the step's Qualification Check: its definition lists it and its
   form isn't the weld form */
export function panelDrawsQualCheck(stage: Pick<WorkflowStage, 'id' | 'signoffType'>): boolean {
  return definitionHas(stage, QUAL_CHECK_KEY) && qualCheckAboveForm(stage);
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
