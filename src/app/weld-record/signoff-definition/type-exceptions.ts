/* Ordered replacements apply once to the original Type; replacements never chain. */
import { Job } from '../../data/jobs';
import { materialClassification, MaterialFlag } from '../../data/material-classification';
import { ConditionRule, conditionsMatch, JOINT_DETAIL_FIELDS } from '../routing/step-conditions';

export interface TypeException {
  from: string;
  to: string;
  materialFlag?: MaterialFlag | '';
  when?: ConditionRule[];
}

export function replacedType(rules: TypeException[] | undefined, original: string, job?: Job,
  inputs: Record<string, string> = {}): string {
  if (!job) return original;
  return rules?.find(rule => rule.from === original &&
    (!rule.materialFlag || [job.materialType1, job.materialType2].some(code =>
      materialClassification().some(m => m.code === code && m[rule.materialFlag as MaterialFlag]))) &&
    conditionsMatch(rule.when, job, [], { id: '', signed: false, inputs, signoffInputs: {} }))?.to ?? original;
}

export function typeExceptionCondition(rule: TypeException): string {
  const material = rule.materialFlag === 'nonFerrousOrAustenitic' ? 'Either material is non-ferrous or austenitic'
    : rule.materialFlag === 'titanium' ? 'Either material is titanium' : '';
  const conditions = rule.when?.map(r => r.map(c =>
    `${JOINT_DETAIL_FIELDS.find(f => f.key === c.field)?.label ?? c.field} ${c.op === 'isNot' ? 'is not' : c.op} ${c.values.map(v => v || 'Blank').join(' or ')}`
  ).join(' AND ')).join(' OR ');
  return [material, conditions && `(${conditions})`].filter(Boolean).join(' AND ') || 'Always';
}
