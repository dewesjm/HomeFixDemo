/* Fields filled from another step's value and locked (a field's fill rule, Admin > Signoff Type
   Definition): Root's filler copies Fit's Consumable Insert while "Only Consumable Insert used as
   filler" is checked */
import { WorkflowStage } from './types';
import { FieldFill } from './field-catalog';
import { ConditionContext, evaluateCondition } from './field-conditions';
import { getActivationForStep, hasStepActivation } from './step-field-config';
import { effectiveFill } from './field-rules';

/* a fill's "when" reads only the step's own fields, so it can be checked from the step alone */
function ownFieldsContext(stage: WorkflowStage): ConditionContext {
  return {
    stageId: stage.id,
    inputs: { ...stage.inputs, inspectionType: stage.inspectionType },
    jointDetail: () => '',
    stageProperty: key => key === 'engineeringEntry' && stage.engineeringEntry ? 'yes' : '',
    priorInput: () => '',
  };
}

/* the field's fill rule when it holds right now on this step */
export function activeFill(stage: WorkflowStage, key: string): FieldFill | undefined {
  if (!stage.fields.some(f => f.key === key) || !hasStepActivation(stage.id)) return undefined;
  const act = getActivationForStep(stage.id).fields.find(a => a.key === key);
  const fill = act && effectiveFill(act);
  return fill && evaluateCondition(fill.when, ownFieldsContext(stage)) ? fill : undefined;
}

/* filled from another step, so it can't be typed into or picked by the external system */
export function isFilledByRule(stage: WorkflowStage, key: string): boolean {
  return !!activeFill(stage, key);
}

function filledKeys(stage: WorkflowStage): string[] {
  return stage.fields.map(f => f.key).filter(k => isFilledByRule(stage, k));
}

/* The values a change on the step brings in: each filled field copies its source step's recorded
   value (a source with nothing recorded leaves the field alone), and a field filled before the
   change but not after it is blanked. `released` lists the blanked ones. */
export function fillChanges(before: WorkflowStage, after: WorkflowStage, stages: WorkflowStage[]):
    { values: Record<string, string>; released: string[] } {
  const values: Record<string, string> = {};
  for (const key of filledKeys(after)) {
    const fill = activeFill(after, key)!;
    const src = stages.find(s => s.id === fill.stepId);
    const value = src?.signoffInputs[fill.fieldKey] || src?.inputs[fill.fieldKey] || '';
    if (value && value !== (after.inputs[key] ?? '')) values[key] = value;
  }
  const released = filledKeys(before).filter(k => !isFilledByRule(after, k));
  for (const key of released) if (after.inputs[key]) values[key] = '';
  return { values, released };
}
