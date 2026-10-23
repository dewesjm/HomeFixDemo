import { FormField } from './field-catalog';
/* What a step's sign-off form draws besides its ordinary fields, and whether it has a Comments box.
   The form (definition-form) places Type, Comments and References where the Layout list says. */
import { WorkflowStage } from '../model/workflow-types';
import { baseStepId } from '../routing/step-ids';
import { WELD_BUILDUP_TYPE } from './routing-signoff-types';
import { COMMENTS_KEY, StepRef, definitionHas } from './step-field-config';
import { lookupCatalogField } from './field-catalog';

/* Whether a field its definition lists is drawn its own way rather than as an ordinary field of the
   step: Affected Item, References, Signoff History and the signoff section's fields on any step, and
   Pre-Fit/Fit's insert, ring and Defer Tack (sign-off fields, also on Fit signed as Weld Build-Up).
   Anywhere else those last ones are ordinary fields, saved with the step's own values. `step` is a
   joint's step, or a Type's definition by its id (Weld Build-Up's is signed on Fit). */
export function drawnByOwnForm(step: StepRef, key: string): boolean {
  const cat = lookupCatalogField(key);
  if (!cat) return false;
  const id = typeof step === 'string' ? step : step.id;
  const home = typeof step === 'string' && id === WELD_BUILDUP_TYPE ? 'fit' : baseStepId(id);
  return !!cat.ownComponent || !!cat.ownFormSteps?.includes(home);
}

/* The panel draws it, History and Correct add it (withComments). Saved in the step's signoffInputs. */
export const COMMENTS_FIELD: FormField = { ...lookupCatalogField(COMMENTS_KEY)!, required: false };

/* Comments appear only when the selected Type form lists them. */
export function hasCommentsBox(stage: Pick<WorkflowStage, 'id' | 'signoffType'>): boolean {
  return definitionHas(stage, COMMENTS_KEY);
}

/* a step's sign-off fields plus its Comments box */
export function withComments(stage: Pick<WorkflowStage, 'id' | 'signoffType'>, fields: FormField[]): FormField[] {
  return hasCommentsBox(stage) && !fields.some(f => f.key === COMMENTS_FIELD.key) ? [...fields, COMMENTS_FIELD] : fields;
}
