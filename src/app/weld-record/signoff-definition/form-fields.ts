/* Catalog fields selected by a Type form, resolved when read and never copied onto routings. */
import { FormField, lookupCatalogField } from './field-catalog';
import { getActivationForStep, StepRef } from './step-field-config';
import { signoffTypeOptions } from './signoff-types';
import { baseStepId } from '../routing/step-ids';
import { WELD_BUILDUP_TYPE } from './routing-signoff-types';

export function formFields(step: StepRef): FormField[] {
  return getActivationForStep(step).fields.flatMap(a => {
    const cat = lookupCatalogField(a.key);
    return cat ? [{ ...cat, required: a.required ?? !!cat.defaultRequired }] : [];
  });
}
function ownValue(step: StepRef, field: FormField): boolean {
  const id = typeof step === 'string' ? (step === WELD_BUILDUP_TYPE ? 'fit' : step) : step.id;
  return !!field.ownFormSteps?.includes(baseStepId(id));
}
export const formInputFields = (step: StepRef): FormField[] => formFields(step).filter(f => !f.ownComponent && !ownValue(step, f));
export const formSignoffFields = (step: StepRef): FormField[] => formFields(step).filter(f => !f.ownComponent && ownValue(step, f));

/* Condition pickers show the union of every Type offered on a routing. */
export function routingFormFields(stageId: string, options = signoffTypeOptions(stageId)): FormField[] {
  const byKey = new Map<string, FormField>();
  for (const opt of options ?? []) for (const f of formFields(opt.value)) {
    if (!f.ownComponent) byKey.set(f.key, f);
  }
  return [...byKey.values()];
}
