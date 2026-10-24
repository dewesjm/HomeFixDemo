import { formSignoffFields } from './form-fields';
import { FormField } from './field-catalog';
/* Fields shown by the selected Type form, resolved from the catalog at read time. The joint page adds runtime options on top (joint-form/stage-form.ts);
   History and Correct use these as they are, so all three list the same fields. */
import { Job } from '../../data/jobs';
import { WorkflowStage } from '../model/workflow-types';
import { lookupCatalogField } from './field-catalog';
import { ConditionContext, evaluateCondition } from './field-conditions';
import { buildConditionContext } from './condition-context';
import { getActivationForStep } from './step-field-config';
import { effectiveDisabledIf, effectiveShowIf, isRequiredNow, requiredMessageProp } from './field-rules';
import { drawnByOwnForm } from './signoff-parts';

type Fab = Record<string, string>;

/* one of Affected Item's MIC verified rows (affected-item component, sign-validation): shown when the
   step's definition lists it and its Show when holds (its joint member must also be picked), and
   whether it must be checked */
export function affectedMicRule(stage: WorkflowStage, condCtx: ConditionContext, key: 'affectedMicVerified1' | 'affectedMicVerified2'): { shown: boolean; required: boolean; requiredMessage?: string } {
  const act = getActivationForStep(stage).fields.find(a => a.key === key);
  if (!act) return { shown: false, required: false };
  const show = effectiveShowIf(act);
  const shown = !show || evaluateCondition(show, condCtx);
  return { shown, required: shown && isRequiredNow(act, condCtx), ...requiredMessageProp(act) };
}

/* The definition's fields whose Show when holds, each required and disabled as its rules say right now */
export function definedFields(stage: WorkflowStage, condCtx: ConditionContext): FormField[] {
  return getActivationForStep(stage).fields.flatMap(act => {
    const cat = lookupCatalogField(act.key);
    if (!cat || drawnByOwnForm(stage, act.key)) return [];
    const show = effectiveShowIf(act);
    if (show && !evaluateCondition(show, condCtx)) return [];
    const disabledCond = effectiveDisabledIf(act);
    const disabled = !!disabledCond && evaluateCondition(disabledCond, condCtx);
    const method = condCtx.jointDetail('ndtRoot').toUpperCase();
    const inspectionQuestion = cat.key === 'performed5x' && (method === 'VT' || method === '5X') ? {
      label: `Did you perform ${method} inspection and was it successful?`,
      options: [{ label: `No I didn't perform ${method}`, value: 'no' }, { label: `Yes I performed ${method} and it was successful`, value: 'yes' }],
    } : {};
    return [{ ...cat, ...inspectionQuestion, required: isRequiredNow(act, condCtx), ...requiredMessageProp(act), ...(cat.disabled || disabled ? { disabled: true } : {}) }];
  });
}

/* The step's fields as the joint page shows them, without runtime options; History and Correct
   list these. A routing without a Type form has no fields. */
export function fieldsShown(stage: WorkflowStage, job: Job, stages: WorkflowStage[] = [], fab: Fab = {}): FormField[] {
  const ctx = buildConditionContext(stage, job, stages, fab);
  return definedFields(stage, ctx);
}

/* Pre-Fit and Fit's Consumable Insert / Backing Ring / Defer Tack sign-off fields: the ones the
   step's definition lists, each shown when its condition is met (the insert and ring fields when
   the joint design needs them), with whether it's required and disabled right now */
export function visibleSignoffFields(stage: WorkflowStage, job: Job | undefined, fab: Fab): FormField[] {
  const activation = getActivationForStep(stage);
  const condCtx = buildConditionContext(stage, job, [], fab);
  return formSignoffFields(stage).flatMap(f => {
    const act = activation.fields.find(a => a.key === f.key);
    if (!act) return [];
    const cond = effectiveShowIf(act);
    if (cond && !evaluateCondition(cond, condCtx)) return [];
    const disabledCond = effectiveDisabledIf(act);
    return [{ ...f, required: isRequiredNow(act, condCtx), ...requiredMessageProp(act), ...(disabledCond && evaluateCondition(disabledCond, condCtx) ? { disabled: true } : {}) }];
  });
}
