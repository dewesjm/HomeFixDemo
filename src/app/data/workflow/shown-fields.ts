/* The fields a step shows: from its Admin > Signoff Type Definition when it has one (the built-in
   routing, Repair, Excavation NDT, Fit as Weld Build-Up), otherwise from its template (steps added
   in Admin > Routing Settings). The joint page adds runtime options on top (joint-form/stage-form.ts);
   History and Correct use these as they are, so all three list the same fields. */
import { Job } from '../jobs';
import { SignoffField, StageField, WorkflowStage } from './types';
import { CatalogField, lookupCatalogField } from './field-catalog';
import { ConditionContext, evaluateCondition } from './field-conditions';
import { buildConditionContext } from './condition-context';
import { StepRef, fieldActivation, getActivationForStep, hasStepActivation } from './step-field-config';
import { effectiveDisabledIf, effectiveShowIf, isRequiredNow } from './field-rules';
import { fieldAppliesToJob, showIfMet } from './stage-display';
import { drawnByOwnForm } from './signoff-forms';

type Fab = Record<string, string>;

function toStageField(cat: CatalogField): StageField {
  return {
    key: cat.key,
    label: cat.label,
    type: cat.type,
    ...(cat.unit !== undefined && { unit: cat.unit }),
    ...(cat.placeholder !== undefined && { placeholder: cat.placeholder }),
    ...(cat.options !== undefined && { options: cat.options }),
    ...(cat.minField !== undefined && { minField: cat.minField }),
    ...(cat.maxField !== undefined && { maxField: cat.maxField }),
    ...(cat.fullWidth !== undefined && { fullWidth: cat.fullWidth }),
    ...(cat.description !== undefined && { description: cat.description }),
  };
}

/* the fields a step's definition lists, as the step's own field list; fields drawn its own way
   (drawnByOwnForm) are left to that */
export function definitionStageFields(step: StepRef): StageField[] {
  return getActivationForStep(step).fields.flatMap(act => {
    const cat = lookupCatalogField(act.key);
    return cat && !drawnByOwnForm(step, act.key) ? [{ ...toStageField(cat), required: !!cat.defaultRequired, ...(cat.disabled && { disabled: true }) }] : [];
  });
}

/* one of Affected Item's MIC verified rows (affected-item component, sign-validation): shown when the
   step's definition lists it and its Show when holds (its joint member must also be picked), and
   whether it must be checked */
export function affectedMicRule(stage: WorkflowStage, condCtx: ConditionContext, key: 'affectedMicVerified1' | 'affectedMicVerified2'): { shown: boolean; required: boolean } {
  const act = getActivationForStep(stage).fields.find(a => a.key === key);
  if (!act) return { shown: false, required: false };
  const show = effectiveShowIf(act);
  const shown = !show || evaluateCondition(show, condCtx);
  return { shown, required: shown && isRequiredNow(act, condCtx) };
}

/* The definition's fields whose Show when holds, each required and disabled as its rules say right now */
export function definedFields(stage: WorkflowStage, condCtx: ConditionContext): StageField[] {
  return getActivationForStep(stage).fields.flatMap(act => {
    const cat = lookupCatalogField(act.key);
    if (!cat || drawnByOwnForm(stage, act.key)) return [];
    const show = effectiveShowIf(act);
    if (show && !evaluateCondition(show, condCtx)) return [];
    const disabledCond = effectiveDisabledIf(act);
    const disabled = !!disabledCond && evaluateCondition(disabledCond, condCtx);
    return [{ ...toStageField(cat), required: isRequiredNow(act, condCtx), ...(cat.disabled || disabled ? { disabled: true } : {}) }];
  });
}

/* The step's fields as the joint page shows them, without runtime options; History and Correct
   list these. A step without a definition uses its template's fields, each following its own
   showIf and its catalog Show when rule. */
export function fieldsShown(stage: WorkflowStage, job: Job, stages: WorkflowStage[] = [], fab: Fab = {}): StageField[] {
  const ctx = buildConditionContext(stage, job, stages, fab);
  if (hasStepActivation(stage)) return definedFields(stage, ctx);
  return stage.fields.filter(f => {
    if (!showIfMet(stage, f) || !fieldAppliesToJob(f, job)) return false;
    const cond = effectiveShowIf(fieldActivation(stage, f.key));
    return !cond || evaluateCondition(cond, ctx);
  });
}

/* Pre-Fit and Fit's Consumable Insert / Backing Ring / Defer Tack sign-off fields: the ones the
   step's definition lists, each shown when its condition is met (the insert and ring fields when
   the joint design needs them), with whether it's required and disabled right now */
export function visibleSignoffFields(stage: WorkflowStage, job: Job | undefined, fab: Fab): SignoffField[] {
  const activation = hasStepActivation(stage) ? getActivationForStep(stage) : undefined;
  const condCtx = buildConditionContext(stage, job, [], fab);
  return stage.signoffFields.flatMap(f => {
    if (f.showIf && stage.signoffInputs[f.showIf.key] !== f.showIf.equals) return [];
    if (!activation) return [f];
    const act = activation.fields.find(a => a.key === f.key);
    if (!act) return [];
    const cond = effectiveShowIf(act);
    if (cond && !evaluateCondition(cond, condCtx)) return [];
    const disabledCond = effectiveDisabledIf(act);
    return [{ ...f, required: isRequiredNow(act, condCtx), ...(disabledCond && evaluateCondition(disabledCond, condCtx) ? { disabled: true } : {}) }];
  });
}
