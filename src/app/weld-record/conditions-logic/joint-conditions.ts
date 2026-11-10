/* Joint conditions: the "any rule, all clauses" condition used by Routing Settings (Included when, Reject
   routes to, Then go to, Persona), Signoff Type to Routing (Enable when, Type Exceptions), Attribute Code
   Exceptions and Qualifications. A list of rules matches when any rule does, and a rule matches when
   every one of its clauses does. No rules = always matches.
   Joint Details clauses are decided once, when the joint's routing is built; a routing whose rules
   leave it out isn't on the joint at all. Routing-answer clauses (any routing's own fields, e.g. Fit's
   Defer Tack or an NDT routing's Weld Color) are blank until that routing is signed, so a routing that
   uses one is always on the joint and turns required on or off as those routings are signed
   (routing-logic/route-changes.ts applySignedFlags). */
import { Job } from '../../data/jobs';
import { jointAttributeCodes } from '../attribute-codes-logic/attribute-context';
import { Fabrication, StageAnswers } from '../catalogs/field-catalog';
import { catalogField, readsFabrication } from '../catalogs/field-choices';
import { originalInspectionType, performedInspectionType } from './inspection-types';

export interface ConditionClause {
  field: string;          /* a field-catalog.ts or field-choices.ts key */
  op: 'is' | 'isNot' | 'contains';
  values: string[];       /* matches any of these; 'contains' has one typed text, any case */
}
export type ConditionRule = ConditionClause[];

/* a routing's own answer ('self.<key>'): its Type, or a field (checkbox unticked = '') */
function selfValue(self: StageAnswers | undefined, key: string, stages: StageAnswers[]): string {
  if (!self) return '';
  if (key === 'originalInspectionType') return originalInspectionType(self, stages);
  if (key === 'performedInspectionType') return performedInspectionType(self);
  if (key === 'inspectionType') return self.inspectionType ?? '';
  return self.inputs[key] ?? self.signoffInputs[key] ?? '';
}

function clauseMatches(c: ConditionClause, job: Job, stages: StageAnswers[], self?: StageAnswers, fab?: Fabrication): boolean {
  if (c.field === 'attributeCodes') {
    const codes = jointAttributeCodes(job);
    const hit = c.values.some(value => codes.some(code => code.toLowerCase() === value.trim().toLowerCase()));
    return c.op === 'isNot' ? !hit : hit;
  }
  let value: string;
  if (c.field.startsWith('self.')) value = selfValue(self, c.field.slice(5), stages);
  else {
    const f = catalogField(c.field);
    if (!f) return false;
    value = f.get(job, stages, fab);
  }
  if (c.op === 'contains') {
    const text = (c.values[0] ?? '').trim().toLowerCase();
    return !!text && value.toLowerCase().includes(text);
  }
  const norm = (v: string) => v.trim().toLowerCase();
  const hit = c.values.some(v => norm(v) === norm(value));
  return c.op === 'isNot' ? !hit : hit;
}

/* one rule: every clause matches */
export function ruleMatches(rule: ConditionRule, job: Job, stages: StageAnswers[], self?: StageAnswers, fab?: Fabrication): boolean {
  return rule.every(c => clauseMatches(c, job, stages, self, fab));
}

/* no rules = always matches */
export function conditionsMatch(rules: ConditionRule[] | undefined, job: Job, stages: StageAnswers[] = [], self?: StageAnswers, fab?: Fabrication): boolean {
  if (!rules?.length) return true;
  return rules.some(rule => ruleMatches(rule, job, stages, self, fab));
}

export function usesStepAnswers(rules: ConditionRule[] | undefined): boolean {
  return !!rules?.some(rule => rule.some(c => catalogField(c.field)?.stepAnswer));
}

export function usesFabrication(rules: ConditionRule[] | undefined): boolean {
  return !!rules?.some(rule => rule.some(c => readsFabrication(catalogField(c.field))));
}
