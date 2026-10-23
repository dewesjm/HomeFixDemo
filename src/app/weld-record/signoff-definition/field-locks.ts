import { formInputFields } from './form-fields';
/* Which fields on a step the user can't type into: a field whose Disabled when rule holds, such as
   Weld Process and PH/IP (prepopulated from the WTN) unless an engineering override has the step, or
   an actual while its requirement is NC */
import { WorkflowStage } from '../model/workflow-types';
import { ConditionClause, conditionClauses, evaluateCondition } from './field-conditions';
import { ACTUAL_REQUIREMENT } from './weld-fields';
import { fieldActivation } from './step-field-config';
import { effectiveDisabledIf } from './field-rules';
import { stepOnlyContext } from './condition-context';

/* clauses that read only the step itself (its fields, its id, the engineering override) */
const readsStepOnly = (c: ConditionClause) => c.source === 'field' || c.source === 'stepId' || c.source === 'stageProperty';

/* Disabled by a rule that reads only the step, so it can be checked from the step alone. A rule
   that reads the joint or another step is checked where the fields are built (definedFields sets
   the field's `disabled`). */
export function isDisabledByOwnRule(stage: WorkflowStage, key: string): boolean {
  if (!formInputFields(stage).some(f => f.key === key)) return false;
  const cond = effectiveDisabledIf(fieldActivation(stage, key));
  return !!cond && conditionClauses(cond).every(readsStepOnly) && evaluateCondition(cond, stepOnlyContext(stage));
}

export function isFieldLocked(stage: WorkflowStage, f: { key: string; disabled?: boolean }): boolean {
  return !!f.disabled || isDisabledByOwnRule(stage, f.key);
}

/* the override values (switched off, see SHOW_WELD_OVERRIDES) come from the WTN and are never typed */
const OVERRIDE_KEYS = new Set(['overridePhMin', 'overridePhMax', 'overrideIpMin', 'overrideIpMax', 'overrideNote']);
const LIMIT_KEYS = new Set(Object.values(ACTUAL_REQUIREMENT));

/* PH/IP limits shown as plain text: the overrides, and a requirement while it's disabled (prepopulated
   from the WTN; an engineering override types them instead) */
export function isReadonlyLimit(stage: WorkflowStage, key: string): boolean {
  return OVERRIDE_KEYS.has(key) || (LIMIT_KEYS.has(key) && isDisabledByOwnRule(stage, key));
}

/* true when the user can actually type or choose a value for this field */
export function isUserEditable(stage: WorkflowStage, f: { key: string; disabled?: boolean }): boolean {
  return f.key !== 'qualificationCheck' && !isReadonlyLimit(stage, f.key) && !isFieldLocked(stage, f);
}
