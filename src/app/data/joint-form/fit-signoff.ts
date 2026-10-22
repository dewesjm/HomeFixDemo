/* Pre-Fit and Fit's Consumable Insert / Backing Ring / Defer Tack sign-off fields: the ones the step's
   Signoff Type Definition has on, each shown when the joint design calls for it and its condition is
   met, the MICs required only when traceability applies */
import { Job } from '../jobs';
import {
  SignoffField, WorkflowStage, jointDesignRequiresInsert, jointDesignRequiresBackingRing,
  hasStepActivation, getActivationForStep, effectiveShowIf, effectiveDisabledIf, effectiveRequired, evaluateCondition, buildConditionContext,
} from '../workflow';
import { micApplies } from './fabrication-form';

type Fab = Record<string, string>;

const INSERT_KEYS = ['consumableInsertType', 'consumableInsertSize', 'consumableInsertId'];
const BACKING_RING_KEYS = ['backingRingType', 'backingRingId'];
const MIC_KEYS = ['consumableInsertId', 'backingRingId'];

/* signoff fields shown, each with whether it's required and greyed out right now */
export function visibleSignoffFields(stage: WorkflowStage, job: Job | undefined, fab: Fab): SignoffField[] {
  const activation = hasStepActivation(stage.id) ? getActivationForStep(stage.id) : undefined;
  const condCtx = buildConditionContext(stage, job, [], fab);
  const isFit = stage.id === 'fit' || stage.id === 'pre-fit';
  const micRequired = micApplies(job, 'id1') || micApplies(job, 'id2');
  return stage.signoffFields.flatMap(f => {
    if (f.showIf && stage.signoffInputs[f.showIf.key] !== f.showIf.equals) return [];
    if (isFit) {
      if (INSERT_KEYS.includes(f.key) && !jointDesignRequiresInsert(job, fab)) return [];
      if (BACKING_RING_KEYS.includes(f.key) && !jointDesignRequiresBackingRing(job, fab)) return [];
    }
    if (!activation) return [f];
    const act = activation.fields.find(a => a.key === f.key);
    if (!act) return [];
    const cond = effectiveShowIf(act);
    if (cond && !evaluateCondition(cond, condCtx)) return [];
    const required = effectiveRequired(act) && (!isFit || !MIC_KEYS.includes(f.key) || micRequired);
    const disabledCond = effectiveDisabledIf(act);
    return [{ ...f, required, ...(disabledCond && evaluateCondition(disabledCond, condCtx) ? { disabled: true } : {}) }];
  });
}

/* Signoff fields currently required: shared by the sign blockers (reasons list) and field
   validation (per-field highlighting) so they can't drift out of sync. */
export function requiredSignoffFields(stage: WorkflowStage, job: Job | undefined, fab: Fab): SignoffField[] {
  return visibleSignoffFields(stage, job, fab).filter(f => f.required);
}
