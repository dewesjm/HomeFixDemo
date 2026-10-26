/* Ordered replacements apply once to the original Type; replacements never chain. */
import { Job } from '../../data/jobs';
import { ConditionRule, conditionsMatch, JOINT_DETAIL_FIELDS } from '../routing/step-conditions';

export interface TypeException {
  from: string;
  to: string;
  /* Accepted when reading saved combined guards; new rules use when clauses. */
  materialFlag?: 'nonFerrousOrAustenitic' | 'titanium' | '';
  when?: ConditionRule[];
}

export function replacedType(rules: TypeException[] | undefined, original: string, job?: Job,
  inputs: Record<string, string> = {}): string {
  if (!job) return original;
  return rules?.map(normalizeTypeException).find(rule => rule.from === original &&
    conditionsMatch(rule.when, job, [], { id: '', signed: false, inputs, signoffInputs: {} }))?.to ?? original;
}

export function typeExceptionCondition(rule: TypeException): string {
  rule = normalizeTypeException(rule);
  const conditions = rule.when?.map(r => r.map(c =>
    `${JOINT_DETAIL_FIELDS.find(f => f.key === c.field)?.label ?? c.field} ${c.op === 'isNot' ? 'is not' : c.op} ${c.values.map(v => v || 'Blank').join(' or ')}`
  ).join(' AND ')).join(' OR ');
  return conditions ? `(${conditions})` : 'Always';
}

/* Distribute the combined material guard across existing OR groups, retaining each AND clause. */
export function normalizeTypeException(rule: TypeException): TypeException {
  const { materialFlag, ...rest } = rule;
  if (!materialFlag) return rest;
  const flags = materialFlag === 'nonFerrousOrAustenitic' ? ['nonFerrous', 'austenitic'] : ['titanium'];
  return { ...rest, when: flags.flatMap(flag => (rule.when?.length ? rule.when : [[]]).map(group => [
    { field: `material.${flag}`, op: 'is' as const, values: ['Yes'] }, ...group,
  ])) };
}
