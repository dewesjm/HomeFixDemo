/* How a condition clause behaves while it is edited in Admin > Routing Settings's rule dialogs (Included when
   and Reject rules): the field droplist's sections, a field's value choices, and when a clause is complete */
import { ConditionClause } from '../../routing/routing-conditions';
import { ConditionCatalogField } from '../../catalogs/field-catalog';
import { ROUTING_CONDITION_FIELDS } from '../../catalogs/field-choices';

/* droplist sections, named by Source: this routing's answers (reject rules), Joint Details, Calculated, Fabrication, earlier routings' answers */
export function conditionFieldGroups(fields: ConditionCatalogField[]): { label: string; fields: ConditionCatalogField[] }[] {
  const groups = [
    { label: 'This routing', fields: fields.filter(f => f.source === 'This routing') },
    { label: 'Joint Details', fields: fields.filter(f => f.source === 'Joint Details') },
    { label: 'Calculated', fields: fields.filter(f => f.source === 'Calculated') },
    { label: 'Fabrication', fields: fields.filter(f => f.source === 'Fabrication') },
    { label: 'Earlier routings (once signed)', fields: fields.filter(f => f.source === 'Routing answers') },
  ];
  return groups.filter(g => g.fields.length);
}

export function conditionValueOptions(fields: ConditionCatalogField[], key: string): { value: string; label: string }[] {
  const f = fields.find(x => x.key === key);
  return (f?.values ?? []).map(v => ({ value: v, label: f?.valueLabel?.(v) ?? v }));
}

/* contains, or a field with no value list, takes typed text */
export function clauseTyped(fields: ConditionCatalogField[], c: ConditionClause): boolean {
  return c.op === 'contains' || !conditionValueOptions(fields, c.field).length;
}

/* a picked value, or typed text */
export function clauseValid(fields: ConditionCatalogField[], c: ConditionClause): boolean {
  return clauseTyped(fields, c) ? !!c.values[0]?.trim() : c.values.length > 0;
}

/* the clause after `patch`: a new field, or switching between picked values and typed text, starts with no values */
export function patchClause(fields: ConditionCatalogField[], c: ConditionClause, patch: Partial<ConditionClause>): ConditionClause {
  const clears = (!!patch.field && patch.field !== c.field)
    || (!!patch.op && clauseTyped(fields, { ...c, ...patch }) !== clauseTyped(fields, c));
  return clears ? { ...c, ...patch, values: [] } : { ...c, ...patch };
}

/* the clause a new Included when rule or condition starts with */
export function newConditionClause(): ConditionClause {
  return { field: ROUTING_CONDITION_FIELDS[0].key, op: 'is', values: [] };
}
