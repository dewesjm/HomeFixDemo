/* Ordered replacements apply once to the original Type; replacements never chain. */
import { Job } from '../../data/jobs';
import { ConditionRule, conditionsMatch } from '../routing/routing-conditions';
import { JOINT_DETAIL_FIELDS } from '../catalogs/field-choices';

export interface TypeException {
  from: string;
  to: string;
  when?: ConditionRule[];
}

export function replacedType(rules: TypeException[] | undefined, original: string, job?: Job,
  inputs: Record<string, string> = {}): string {
  if (!job) return original;
  return rules?.find(rule => rule.from === original &&
    conditionsMatch(rule.when, job, [], { id: '', signed: false, inputs, signoffInputs: {} }))?.to ?? original;
}

export function typeExceptionCondition(rule: TypeException): string {
  const conditions = rule.when?.map(r => r.map(c =>
    `${JOINT_DETAIL_FIELDS.find(f => f.key === c.field)?.label ?? c.field} ${c.op === 'isNot' ? 'is not' : c.op} ${c.values.map(v => v || 'Blank').join(' or ')}`
  ).join(' AND ')).join(' OR ');
  return conditions ? `(${conditions})` : 'Always';
}
