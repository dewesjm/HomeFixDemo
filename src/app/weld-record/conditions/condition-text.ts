/* Joint conditions (joint-conditions.ts) in plain words, for admin tables, the routing preview and
   attribute code messages. */
import { ConditionCatalogField } from '../catalogs/field-catalog';
import { catalogField } from '../catalogs/field-choices';
import { ConditionClause, ConditionRule } from './joint-conditions';

function describeClause(c: ConditionClause, extra: ConditionCatalogField[]): string {
  const f = extra.find(x => x.key === c.field) ?? catalogField(c.field);
  const label = f?.label.replace(/ \(once .*\)$/, '') ?? c.field;
  if (c.op === 'contains') return `${label} contains "${(c.values[0] ?? '').trim()}"`;
  const vals = c.values.length ? c.values.map(v => f?.valueLabel?.(v) ?? v).join(' or ') : '(nothing)';
  return `${label} ${c.op === 'isNot' ? 'is not' : 'is'} ${vals}`;
}

/* each clause in plain words, e.g. "Type is PT" (the rejected routing's own fields lose their "This routing: ") */
export function describeClauses(rule: ConditionRule, extra: ConditionCatalogField[] = []): string[] {
  return rule.map(c => describeClause(c, extra).replace(/^This routing: /, ''));
}

/* plain words for the Routing table, e.g. "N Ind. is 1 or 2; or Joint Design needs Backing Ring is Yes";
   `extra` is the routing's own fields (stageConditionFields) for reject rules */
export function describeConditions(rules: ConditionRule[] | undefined, extra: ConditionCatalogField[] = []): string {
  if (!rules?.length) return 'Always';
  return rules.map(rule => rule.length ? rule.map(c => describeClause(c, extra)).join(' and ') : 'Always').join('; or ');
}
