/* How a condition clause behaves while it is edited in Admin > Routing's rule dialogs (Included when
   and Reject rules): the field droplist's sections, a field's value choices, and when a clause is complete */
import { ConditionClause, StepConditionField, STEP_CONDITION_FIELDS } from './step-conditions';

/* droplist sections: this step's answers (reject rules), Joint Details, earlier steps' answers */
export function conditionFieldGroups(fields: StepConditionField[]): { label: string; fields: StepConditionField[] }[] {
  const groups = [
    { label: 'This step', fields: fields.filter(f => f.key.startsWith('self.')) },
    { label: 'Joint Details', fields: fields.filter(f => !f.key.startsWith('self.') && !f.stepAnswer) },
    { label: 'Earlier steps (once signed)', fields: fields.filter(f => f.stepAnswer) },
  ];
  return groups.filter(g => g.fields.length);
}

export function conditionValueOptions(fields: StepConditionField[], key: string): { value: string; label: string }[] {
  const f = fields.find(x => x.key === key);
  return (f?.values ?? []).map(v => ({ value: v, label: f?.valueLabel?.(v) ?? v }));
}

/* contains, or a field with no value list, takes typed text */
export function clauseTyped(fields: StepConditionField[], c: ConditionClause): boolean {
  return c.op === 'contains' || !conditionValueOptions(fields, c.field).length;
}

/* a picked value, or typed text */
export function clauseValid(fields: StepConditionField[], c: ConditionClause): boolean {
  return clauseTyped(fields, c) ? !!c.values[0]?.trim() : c.values.length > 0;
}

/* the clause after `patch`: a new field, or switching between picked values and typed text, starts with no values */
export function patchClause(fields: StepConditionField[], c: ConditionClause, patch: Partial<ConditionClause>): ConditionClause {
  const clears = (!!patch.field && patch.field !== c.field)
    || (!!patch.op && clauseTyped(fields, { ...c, ...patch }) !== clauseTyped(fields, c));
  return clears ? { ...c, ...patch, values: [] } : { ...c, ...patch };
}

/* the clause a new Included when rule or condition starts with */
export function newConditionClause(): ConditionClause {
  return { field: STEP_CONDITION_FIELDS[0].key, op: 'is', values: [] };
}
