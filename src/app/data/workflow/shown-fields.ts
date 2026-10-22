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
import { isFilledByRule } from './field-fill';
import { fieldAppliesToJob, showIfMet } from './stage-display';
import { stepOnJoint } from './step-ids';

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

/* the fields a step's definition lists, as the step's own field list; fields its own form draws
   (drawnByStepForm) are left to it */
export function definitionStageFields(step: StepRef): StageField[] {
  return getActivationForStep(step).fields.flatMap(act => {
    const cat = lookupCatalogField(act.key);
    return cat && !cat.drawnByStepForm ? [{ ...toStageField(cat), required: !!cat.defaultRequired, ...(cat.disabled && { disabled: true }) }] : [];
  });
}

/* "exceeded" sends the joint to that phase's RT/UT, so it only shows when the joint has one */
export function allowableThicknessApplies(stage: WorkflowStage, stages: WorkflowStage[]): boolean {
  return !!stepOnJoint(stages, `${stage.inputs['originPhase'] ?? ''}-ndt-utrt`);
}

/* The definition's fields whose Show when holds, each required and greyed out as its rules say
   right now (a field filled by a rule is greyed out too) */
export function definedFields(stage: WorkflowStage, condCtx: ConditionContext, stages: WorkflowStage[]): StageField[] {
  return getActivationForStep(stage).fields.flatMap(act => {
    const cat = lookupCatalogField(act.key);
    if (!cat || cat.drawnByStepForm) return [];
    if (act.key === 'allowableThicknessExceeded' && !allowableThicknessApplies(stage, stages)) return [];
    const show = effectiveShowIf(act);
    if (show && !evaluateCondition(show, condCtx)) return [];
    const disabledCond = effectiveDisabledIf(act);
    const greyed = (!!disabledCond && evaluateCondition(disabledCond, condCtx)) || isFilledByRule(stage, act.key);
    return [{ ...toStageField(cat), required: isRequiredNow(act, condCtx), ...(cat.disabled || greyed ? { disabled: true } : {}) }];
  });
}

/* The step's fields as the joint page shows them, without runtime options; History and Correct
   list these. A step without a definition uses its template's fields, each following its own
   showIf and its catalog Show when rule. */
export function fieldsShown(stage: WorkflowStage, job: Job, stages: WorkflowStage[] = [], fab: Fab = {}): StageField[] {
  const ctx = buildConditionContext(stage, job, stages, fab);
  if (hasStepActivation(stage)) return definedFields(stage, ctx, stages);
  return stage.fields.filter(f => {
    if (f.key === 'allowableThicknessExceeded' && !allowableThicknessApplies(stage, stages)) return false;
    if (!showIfMet(stage, f) || !fieldAppliesToJob(f, job)) return false;
    const cond = effectiveShowIf(fieldActivation(stage, f.key));
    return !cond || evaluateCondition(cond, ctx);
  });
}

/* Pre-Fit and Fit's Consumable Insert / Backing Ring / Defer Tack sign-off fields: the ones the
   step's definition lists, each shown when its condition is met (the insert and ring fields when
   the joint design needs them), with whether it's required and greyed out right now */
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
