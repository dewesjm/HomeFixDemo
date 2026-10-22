/* Pre-Fit and Fit's Consumable Insert / Backing Ring / Defer Tack and Fit-Up Insp's Release to welding
   sign-off fields: the ones the step's Signoff Type Definition has on, each shown when its condition
   is met (the insert and ring fields when the joint design needs them), required when its Required
   rule holds (the MICs only when traceability applies) */
import { Job } from '../jobs';
import {
  SignoffField, WorkflowStage,
  hasStepActivation, getActivationForStep, effectiveShowIf, effectiveDisabledIf, isRequiredNow, evaluateCondition, buildConditionContext,
} from '../workflow';

type Fab = Record<string, string>;

/* signoff fields shown, each with whether it's required and greyed out right now */
export function visibleSignoffFields(stage: WorkflowStage, job: Job | undefined, fab: Fab): SignoffField[] {
  const activation = hasStepActivation(stage.id) ? getActivationForStep(stage.id) : undefined;
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

/* Signoff fields currently required: shared by the sign blockers (reasons list) and field
   validation (per-field highlighting) so they can't drift out of sync. */
export function requiredSignoffFields(stage: WorkflowStage, job: Job | undefined, fab: Fab): SignoffField[] {
  return visibleSignoffFields(stage, job, fab).filter(f => f.required);
}
