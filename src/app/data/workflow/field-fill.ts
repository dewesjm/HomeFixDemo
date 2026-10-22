/* Fields filled from another value and locked (a field's fill rule, Admin > Signoff Type
   Definition): Weld Process and PH/IP from the WTN, an actual set to NC by its requirement, Root's
   filler from Fit's Consumable Insert while "Only Consumable Insert used as filler" is checked */
import { WorkflowStage } from './types';
import { FieldFill } from './field-catalog';
import { ConditionContext, evaluateCondition } from './field-conditions';
import { fieldActivation } from './step-field-config';
import { effectiveFill } from './field-rules';
import { wtnFillValue } from '../procedures';

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
  if (!stage.fields.some(f => f.key === key)) return undefined;
  const fill = effectiveFill(fieldActivation(stage.id, key));
  if (!fill || (fill.from === 'wtn' && stage.engineeringEntry)) return undefined;
  return evaluateCondition(fill.when, ownFieldsContext(stage)) ? fill : undefined;
}

/* filled by a rule, so it can't be typed into or picked by the external system */
export function isFilledByRule(stage: WorkflowStage, key: string): boolean {
  return !!activeFill(stage, key);
}

function filledKeys(stage: WorkflowStage): string[] {
  return stage.fields.map(f => f.key).filter(k => isFilledByRule(stage, k));
}

/* the value a fill brings in; undefined leaves the field alone (a step or field with nothing
   recorded). The WTN always sets its values, blank when GWP+WTN matches no WPS. */
function fillValue(fill: FieldFill, stage: WorkflowStage, stages: WorkflowStage[]): string | undefined {
  if (fill.from === 'wtn') return wtnFillValue(stage.inputs['weldProcedure'] ?? '', stage.inputs['wtn'] ?? '', fill.fieldKey);
  if (fill.from === 'thisStep') return stage.inputs[fill.fieldKey] || undefined;
  const src = stages.find(s => s.id === fill.stepId);
  return src?.signoffInputs[fill.fieldKey] || src?.inputs[fill.fieldKey] || undefined;
}

/* filled values that differ from what the step holds */
function passValues(stage: WorkflowStage, stages: WorkflowStage[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of filledKeys(stage)) {
    const value = fillValue(activeFill(stage, key)!, stage, stages);
    if (value !== undefined && value !== (stage.inputs[key] ?? '')) values[key] = value;
  }
  return values;
}

/* A fill can feed another (the WTN sets PH Min to NC, which makes Actual PH Min NC), so the passes
   repeat until nothing changes; this caps them in case two rules feed each other */
const MAX_PASSES = 5;

/* The values a change on the step brings in: each filled field copies its source's value, and a
   field filled before the change but not after it is blanked. `released` lists the blanked ones. */
export function fillChanges(before: WorkflowStage, after: WorkflowStage, stages: WorkflowStage[]):
    { values: Record<string, string>; released: string[] } {
  const values: Record<string, string> = {};
  let current = after;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const next = passValues(current, stages);
    if (!Object.keys(next).length) break;
    Object.assign(values, next);
    current = { ...current, inputs: { ...current.inputs, ...next } };
  }
  const released = filledKeys(before).filter(k => !isFilledByRule(current, k));
  for (const key of released) if (current.inputs[key]) values[key] = '';
  return { values, released };
}

/* the step with its fills applied, e.g. after the external system or an engineering override set its values */
export function withFills(before: WorkflowStage, after: WorkflowStage, stages: WorkflowStage[]): WorkflowStage {
  const { values } = fillChanges(before, after, stages);
  return Object.keys(values).length ? { ...after, inputs: { ...after.inputs, ...values } } : after;
}
