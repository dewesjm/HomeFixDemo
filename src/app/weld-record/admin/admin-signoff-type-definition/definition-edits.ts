/* Admin > Signoff Type Definition's edits to a definition's field list that aren't layout: the
   condition editor's working copy written back to the field it's open on (Show when, Disabled when,
   Required when, Prepopulated from), and the fill source picker's values. */
import { FieldActivation } from '../../signoff-definition/step-field-config';
import { disabledIfToStore, fillToStore, requiredIfToStore, showIfToStore } from '../../signoff-definition/field-rules';
import type { FieldCondition } from '../../signoff-definition/field-conditions';
import type { FieldFill } from '../../signoff-definition/field-catalog';
import { WorkGroup, workToCondition } from './condition-work';

/* which of a field's conditions the editor is changing */
export type CondKind = 'show' | 'disabled' | 'fill' | 'required';

/* the condition editor open on one field: its working copy, and for Prepopulated from its source */
export interface OpenCondition {
  condKey: string | null;
  condKind: CondKind;
  condGroup: WorkGroup;
  fillStepId: string;     /* a step id, THIS_STEP or WTN; '' = not prepopulated */
  fillFieldKey: string;
}

/* the fill source picker's entries for this same step and the WTN, beside the other steps' ids */
export const THIS_STEP = '@this-step';
export const WTN = '@wtn';

const copyCondition = (c?: FieldCondition): FieldCondition | undefined => c ? structuredClone(c) : undefined;
const copyFill = (f: FieldFill | null | undefined) => f ? { ...f, when: copyCondition(f.when)! } : f;
export const copyActivation = (f: FieldActivation): FieldActivation =>
  ({ ...f, showIf: copyCondition(f.showIf), disabledIf: copyCondition(f.disabledIf), requiredIf: copyCondition(f.requiredIf), fill: copyFill(f.fill) });

/* a fill's source as the picker's value, and back */
export const fillSourceId = (f: FieldFill | undefined) => !f ? '' : f.from === 'wtn' ? WTN : f.from === 'thisStep' ? THIS_STEP : f.stepId;
function fillFromSource(sourceId: string, fieldKey: string, when: FieldCondition): FieldFill {
  if (sourceId === WTN) return { from: 'wtn', fieldKey, when };
  if (sourceId === THIS_STEP) return { from: 'thisStep', fieldKey, when };
  return { stepId: sourceId, fieldKey, when };
}

/* the fields with the open editor's condition written to its field; a condition the same as the
   catalog default is left off, and a fill with no source or field = not prepopulated */
export function applyOpenCondition(acts: FieldActivation[], o: OpenCondition): FieldActivation[] {
  const key = o.condKey;
  if (!key) return acts;
  const cond = workToCondition(o.condGroup);
  if (o.condKind === 'fill') {
    const fill = o.fillStepId && o.fillFieldKey ? fillFromSource(o.fillStepId, o.fillFieldKey, cond) : undefined;
    const stored = fillToStore(key, fill);
    return acts.map(a => {
      if (a.key !== key) return a;
      const { fill: _old, ...rest } = a;
      return stored === undefined ? rest : { ...rest, fill: stored };
    });
  }
  const prop = o.condKind === 'show' ? 'showIf' : o.condKind === 'disabled' ? 'disabledIf' : 'requiredIf';
  const condition = o.condKind === 'show' ? showIfToStore(key, cond)
    : o.condKind === 'disabled' ? disabledIfToStore(key, cond) : requiredIfToStore(key, cond);
  return acts.map(a => {
    if (a.key !== key) return a;
    const { [prop]: _old, ...rest } = a;
    return condition ? { ...rest, [prop]: condition } : rest;
  });
}
