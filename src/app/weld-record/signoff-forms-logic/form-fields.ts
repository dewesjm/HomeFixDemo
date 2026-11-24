/* Catalog fields selected by a Type form, resolved when read and never copied onto routings. */
import { FormField, lookupCatalogField } from '../catalogs/field-catalog';
import { getActivationForStep, StepRef } from './signoff-type-form-rules';
import { signoffTypeOptions } from './signoff-type-routing-rules';
import { baseStepId } from '../../data/welding-step-ids';
import { WELD_BUILDUP_TYPE } from '../../data/signoff-types';
import type { JointType } from '../../data/jobs';

function formFields(step: StepRef): FormField[] {
  return getActivationForStep(step).fields.flatMap(a => {
    const cat = lookupCatalogField(a.key);
    return cat ? [{ ...cat, required: a.required ?? !!cat.defaultRequired }] : [];
  });
}
function ownValue(step: StepRef, field: FormField): boolean {
  const id = 'typeId' in step ? (step.typeId === WELD_BUILDUP_TYPE ? 'fit' : step.typeId) : step.id;
  return !!field.signoffValue || !!field.ownFormSteps?.includes(baseStepId(id));
}
export const formInputFields = (step: StepRef): FormField[] => formFields(step).filter(f => !f.ownComponent && !ownValue(step, f));
export const formSignoffFields = (step: StepRef): FormField[] => formFields(step).filter(f => !f.ownComponent && ownValue(step, f));

/* Condition pickers show the union of every Type offered on a routing. */
export function routingFormFields(jointType: JointType, stageId: string, options = signoffTypeOptions(jointType, stageId)): FormField[] {
  const byKey = new Map<string, FormField>();
  for (const opt of options ?? []) for (const f of formFields({ jointType, typeId: opt.value })) {
    if (!f.ownComponent) byKey.set(f.key, f);
  }
  return [...byKey.values()];
}
