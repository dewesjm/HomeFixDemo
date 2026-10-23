import { formInputFields } from './form-fields';
/* Fields prepopulated from another value (a field's "Prepopulated from" rule, Admin > Signoff Type
   Forms): Weld Process and PH/IP from the WTN, an actual set to NC by its requirement, Root's
   filler from Fit's Consumable Insert while "Only Consumable Insert used as filler" is checked.
   Whether the field can then be typed into is its separate Disabled when rule (field-locks.ts). */
import { WorkflowStage } from '../model/workflow-types';
import { FieldFill } from './field-catalog';
import { evaluateCondition } from './field-conditions';
import { stepOnlyContext } from './condition-context';
import { isDisabledByOwnRule } from './field-locks';
import { fieldActivation } from './step-field-config';
import { effectiveFill } from './field-rules';
import { wtnFillValue } from '../../data/procedures';

/* the field's fill rule when it holds right now on this step */
export function activeFill(stage: WorkflowStage, key: string): FieldFill | undefined {
  if (!formInputFields(stage).some(f => f.key === key)) return undefined;
  const fill = effectiveFill(fieldActivation(stage, key));
  return fill && evaluateCondition(fill.when, stepOnlyContext(stage)) ? fill : undefined;
}

/* prepopulated right now, so the external system doesn't set it and a GWP change doesn't clear it */
export function isFilledByRule(stage: WorkflowStage, key: string): boolean {
  return !!activeFill(stage, key);
}

function filledKeys(stage: WorkflowStage): string[] {
  return formInputFields(stage).map(f => f.key).filter(k => isFilledByRule(stage, k));
}

/* the value a fill brings in; undefined leaves the field alone (a step or field with nothing
   recorded). The WTN always sets its values, blank when GWP+WTN matches no WPS. */
function fillValue(fill: FieldFill, stage: WorkflowStage, stages: WorkflowStage[]): string | undefined {
  if (fill.from === 'wtn') return wtnFillValue(stage.inputs['weldProcedure'] ?? '', stage.inputs['wtn'] ?? '', fill.fieldKey);
  if (fill.from === 'thisStep') return stage.inputs[fill.fieldKey] || undefined;
  const src = stages.find(s => s.id === fill.stepId);
  return src?.signoffInputs[fill.fieldKey] || src?.inputs[fill.fieldKey] || undefined;
}

/* Values to copy in: a fill that holds now but didn't before the change, or whose source value
   changed since, copies its source when that differs from what the step holds; so does any fill on a
   disabled field, which can't have been typed over. A fill on a field that can be typed into, which
   went on holding with the same source, leaves the field alone, so a value typed over it stays. */
function passValues(before: WorkflowStage, stage: WorkflowStage, stages: WorkflowStage[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of filledKeys(stage)) {
    const fill = activeFill(stage, key)!;
    const value = fillValue(fill, stage, stages);
    const held = activeFill(before, key);
    const unchanged = !isDisabledByOwnRule(stage, key) && !!held && JSON.stringify(held) === JSON.stringify(fill) && fillValue(held, before, stages) === value;
    if (!unchanged && value !== undefined && value !== (stage.inputs[key] ?? '')) values[key] = value;
  }
  return values;
}

/* A fill can feed another (the WTN sets PH Min to NC, which makes Actual PH Min NC), so the passes
   repeat until nothing changes; this caps them in case two rules feed each other */
const MAX_PASSES = 5;

/* The values a change on the step brings in: each fill that starts holding or whose source changed
   copies its source's value, and a field prepopulated before the change but not after it is blanked.
   `released` lists the blanked ones. */
export function fillChanges(before: WorkflowStage, after: WorkflowStage, stages: WorkflowStage[]):
    { values: Record<string, string>; released: string[] } {
  const values: Record<string, string> = {};
  let current = after;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const next = passValues(before, current, stages);
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
