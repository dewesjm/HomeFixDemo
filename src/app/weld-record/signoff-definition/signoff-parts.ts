/* What a step's sign-off form draws besides its ordinary fields, and whether it has a Comments box.
   The sign-off panel draws the parts every step shares (Type, Comments, Signoff) around the form
   laid out from the step's Signoff Type Definition (definition-form). */
import { SignoffField, WorkflowStage } from '../model/workflow-types';
import { WELD_BUILDUP_DEFINITION, baseStepId } from '../routing/step-ids';
import { noCommentsBox } from '../routing/built-in-step-rules';
import { COMMENTS_KEY, StepRef, TYPE_KEY, definitionHas, hasStepActivation } from './step-field-config';
import { lookupCatalogField } from './field-catalog';

/* Whether a field its definition lists is drawn its own way rather than as an ordinary field of the
   step: Affected Item, References, Signoff History and the signoff section's fields on any step, and
   Pre-Fit/Fit's insert, ring and Defer Tack (sign-off fields, also on Fit signed as Weld Build-Up).
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

/* The panel draws it, History and Correct add it (withComments). Saved in the step's signoffInputs. */
export const COMMENTS_FIELD: SignoffField = { key: COMMENTS_KEY, label: 'Comments', type: 'text', required: false, fullWidth: true };

/* a step whose Signoff Type Definition lists Comments; a step with no definition (added in Admin >
   Routing Settings) has one unless noCommentsBox() says otherwise */
export function hasCommentsBox(stage: Pick<WorkflowStage, 'id' | 'signoffType'>): boolean {
  if (hasStepActivation(stage)) return definitionHas(stage, COMMENTS_KEY);
  return !noCommentsBox(stage.id);
}

/* a step's sign-off fields plus its Comments box */
export function withComments(stage: Pick<WorkflowStage, 'id' | 'signoffType'>, fields: SignoffField[]): SignoffField[] {
  return hasCommentsBox(stage) && !fields.some(f => f.key === COMMENTS_FIELD.key) ? [...fields, COMMENTS_FIELD] : fields;
}
