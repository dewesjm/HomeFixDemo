/* Whether a field is drawn besides a step's ordinary fields. The form (definition-form) places Type,
   Comments and References where the Layout list says. */
import { baseStepId } from '../routing/step-ids';
import { WELD_BUILDUP_TYPE } from './routing-signoff-types';
import { StepRef } from './step-field-config';
import { lookupCatalogField } from './form-field-catalog';

/* Whether a field its definition lists is drawn its own way rather than as an ordinary field of the
   step: Affected Item, References, Signoff History, Comments and the signoff section's fields on any step, and
   Pre-Fit/Fit's insert, ring and Defer Tack (sign-off fields, also on Fit signed as Weld Build-Up).
   Anywhere else those last ones are ordinary fields, saved with the step's own values. `step` is a
   joint's step, or a Type's definition by its id (Weld Build-Up's is signed on Fit). */
export function drawnByOwnForm(step: StepRef, key: string): boolean {
  const cat = lookupCatalogField(key);
  if (!cat) return false;
  const id = typeof step === 'string' ? step : step.id;
  const home = typeof step === 'string' && id === WELD_BUILDUP_TYPE ? 'fit' : baseStepId(id);
  return !!cat.ownComponent || !!cat.signoffValue || !!cat.ownFormSteps?.includes(home);
}
