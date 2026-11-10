/* Step conditions (Admin > Routing Settings, "Included when"): which routing steps a joint gets. A step's
   conditions are a list of rules; the step is included when any rule matches, and a rule matches
   when every one of its clauses does. No rules = always included.
   Joint Details clauses are decided once, when the joint's routing is built; a step whose rules
   leave it out isn't on the joint at all. Step-answer clauses (any step's own fields, e.g. Fit's
   Defer Tack or an NDT step's Weld Color) are blank until that step is signed, so a step that uses
   one is always on the joint and turns required on or off as those steps are signed
   (workflow/route-changes.ts applySignedFlags). */
import { Job } from '../../data/jobs';
import { jointAttributeCodes } from '../attribute-codes/attribute-context';
import { ConditionCatalogField, Fabrication, StageAnswers } from '../catalogs/field-catalog';
import { catalogField, readsFabrication } from '../catalogs/field-choices';
import { originalInspectionType, performedInspectionType } from './inspection-context';
export interface ConditionClause {
  field: string;          /* a field-catalog.ts or field-choices.ts key */
  op: 'is' | 'isNot' | 'contains';
  values: string[];       /* matches any of these; 'contains' has one typed text, any case */
}
export type ConditionRule = ConditionClause[];

/* Reject rules (Admin > Routing Settings, "Reject routes to"): when a step is signed UNSAT, the first rule
   whose conditions all match picks where it goes; none matching = the step's normal target. Besides
   Joint Details, a clause can test the rejected step's own answers ('self.<key>', raw option values). */
export interface RejectRule {
  when: ConditionRule;
  to: string;             /* stage id; 'repair' on an NDT step adds a Repair */
}

/* reject target that puts the joint on Engineering Hold instead (routing/inserted/added-routings.ts insertEngineeringHold) */
export const ENGINEERING_HOLD_TARGET = 'engineering-hold';

/* The first accepted-signoff rule whose conditions match. */
export function matchingThenRule(rules: RejectRule[] | undefined, job: Job, stages: StageAnswers[], self: StageAnswers, fab?: Fabrication): RejectRule | undefined {
  return rules?.find(r => r.when.every(c => clauseMatches(c, job, stages, self, fab)));
}

/* a rejected step's own answer: its Type, or a field (checkbox unticked = '') */
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

/* no rules = always included */
export function conditionsMatch(rules: ConditionRule[] | undefined, job: Job, stages: StageAnswers[] = [], self?: StageAnswers, fab?: Fabrication): boolean {
  if (!rules?.length) return true;
  return rules.some(rule => rule.every(c => clauseMatches(c, job, stages, self, fab)));
}

/* the first reject rule matching the rejected step `self`, if any */
export function matchingRejectRule(rules: RejectRule[] | undefined, job: Job, stages: StageAnswers[], self: StageAnswers, fab?: Fabrication): RejectRule | undefined {
  return rules?.find(r => r.when.every(c => clauseMatches(c, job, stages, self, fab)));
}

export function usesStepAnswers(rules: ConditionRule[] | undefined): boolean {
  return !!rules?.some(rule => rule.some(c => catalogField(c.field)?.stepAnswer));
}

export function usesFabrication(rules: ConditionRule[] | undefined): boolean {
  return !!rules?.some(rule => rule.some(c => readsFabrication(catalogField(c.field))));
}

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
   `extra` is the step's own fields (stageConditionFields) for reject rules */
export function describeConditions(rules: ConditionRule[] | undefined, extra: ConditionCatalogField[] = []): string {
  if (!rules?.length) return 'Always';
  return rules.map(rule => rule.length ? rule.map(c => describeClause(c, extra)).join(' and ') : 'Always').join('; or ');
}
