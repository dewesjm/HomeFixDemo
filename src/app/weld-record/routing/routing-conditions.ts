/* Step conditions (Admin > Routing Settings, "Included when"): which routing steps a joint gets. A step's
   conditions are a list of rules; the step is included when any rule matches, and a rule matches
   when every one of its clauses does. No rules = always included.
   Joint Details clauses are decided once, when the joint's routing is built; a step whose rules
   leave it out isn't on the joint at all. Step-answer clauses (any step's own fields, e.g. Fit's
   Defer Tack or an NDT step's Weld Color) are blank until that step is signed, so a step that uses
   one is always on the joint and turns required on or off as those steps are signed
   (workflow/route-changes.ts applySignedFlags). */
import { PHASE_NDT_KINDS, NQC_SPLIT_STEP_IDS, nqcStepId } from './routing-ids';
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

const RT_TAKEN = ['10', '100', '360', '60', '75'];
const utrtRule = (ndtKey: string, rtKey: string): ConditionRule[] => [
  [{ field: ndtKey, op: 'is', values: ['UT'] }],
  [{ field: rtKey, op: 'is', values: RT_TAKEN }],
];
const mtptRule = (ndtKey: string): ConditionRule[] => [[{ field: ndtKey, op: 'is', values: ['MT', 'PT', 'MT/PT'] }]];

/* the rules the app was built with, before the NQC split below */
const BUILT_IN_CONDITIONS: Record<string, ConditionRule[]> = {
  'pre-fit': [
    [{ field: 'nInd', op: 'is', values: ['1', '2'] }],
    [{ field: 'jdInsert', op: 'is', values: ['Yes'] }],
    [{ field: 'jdRing', op: 'is', values: ['Yes'] }],
  ],
  'tack': [[{ field: 'fitDeferTack', op: 'isNot', values: ['Yes'] }]],
  'fitup-release': [[{ field: 'inspReleaseToWelding', op: 'is', values: ['No'] }]],
  'deferred-tack': [[{ field: 'fitDeferTack', op: 'is', values: ['Yes'] }]],
  'root-ndt-mtpt': mtptRule('ndtRoot'),
  'root-ndt-utrt': utrtRule('ndtRoot', 'rtRoot'),
  /* Layer NDT comes up only when NDT Each is set */
  'layer-ndt-vt5x': [[{ field: 'ndtEach', op: 'is', values: ['VT', '5X'] }]],
  'layer-ndt-mtpt': mtptRule('ndtEach'),
  'final-ndt-mtpt': mtptRule('ndtFinal'),
  'final-ndt-utrt': utrtRule('ndtFinal', 'rtFinal'),
  'review-o63': [
    [{ field: 'sfff', op: 'is', values: ['Yes'] }],
    [{ field: 'dssAaa', op: 'is', values: ['Yes'] }],
    [{ field: 'ss', op: 'is', values: ['Yes'] }],
  ],
  'review-o04': [[
    { field: 'sfff', op: 'is', values: ['No'] },
    { field: 'dssAaa', op: 'is', values: ['No'] },
    { field: 'ss', op: 'is', values: ['No'] },
  ]],
};

/* every rule of `rules` (or the one rule, when it has none) gets an "N Ind. is <values>" clause added */
const withNInd = (rules: ConditionRule[] | undefined, values: string[]): ConditionRule[] => {
  const clause: ConditionClause = { field: 'nInd', op: 'is', values };
  return rules?.length ? rules.map(r => [...r, clause]) : [[clause]];
};

/* the rules the app was built with; Admin > Routing Settings can change any of them. An NQC row
   (routing-ids.ts) is included when N Ind is 1 or 2, its regular row when N Ind is 3, each on top of the
   step's own rules */
export const DEFAULT_STEP_CONDITIONS: Record<string, ConditionRule[]> = {
  ...BUILT_IN_CONDITIONS,
  ...Object.fromEntries(NQC_SPLIT_STEP_IDS.flatMap(id => [
    [id, withNInd(BUILT_IN_CONDITIONS[id], ['3'])],
    [nqcStepId(id), withNInd(BUILT_IN_CONDITIONS[id], ['1', '2'])],
  ])),
};

/* reject target that puts the joint on Engineering Hold instead (routing/inserted/added-routings.ts insertEngineeringHold) */
export const ENGINEERING_HOLD_TARGET = 'engineering-hold';

/* built-in reject rules (Admin > Routing Settings can change them): a PT failure on a GTAW weld goes to
   Engineering Hold instead of Repair; the weld that counts is that phase's own weld step */
const gtawPtHold = (weldStepId: string): RejectRule[] => [{
  when: [
    { field: 'self.inspectionType', op: 'is', values: ['pt'] },
    { field: `step.${weldStepId}.weldProcess`, op: 'is', values: ['gtaw'] },
  ],
  to: ENGINEERING_HOLD_TARGET,
}];
const BUILT_IN_REJECT_RULES: Record<string, RejectRule[]> = {
  'root-ndt-mtpt': gtawPtHold('root-weld'),
  'layer-ndt-mtpt': gtawPtHold('root-layer'),
  'final-ndt-mtpt': gtawPtHold('final-weld'),
};
/* an NQC row starts with its regular row's reject rules */
export const DEFAULT_REJECT_RULES: Record<string, RejectRule[]> = {
  ...BUILT_IN_REJECT_RULES,
  ...Object.fromEntries(Object.entries(BUILT_IN_REJECT_RULES).map(([id, rules]) => [nqcStepId(id), rules])),
};

/* Starting accepted-signoff rules, editable in Routing Settings. Attribute code IA can add Layer MT/PT
   (Admin > Attribute Code Exceptions), so Layer and Layer VT/5X go back to Layer only without IA and
   Layer MT/PT does it after them. */
const NOT_IA: ConditionClause = { field: 'attributeCodes', op: 'isNot', values: ['IA'] };
export const DEFAULT_THEN_RULES: Record<string, RejectRule[]> = {
  fit: [{ when: [{ field: 'self.inspectionType', op: 'is', values: ['weld-buildup'] }], to: 'fit' }],
  'root-layer': [{ when: [
    { field: 'self.inspectionType', op: 'is', values: ['interim'] },
    { field: 'ndtEach', op: 'is', values: [''] },
    NOT_IA,
  ], to: 'root-layer' }],
  ...Object.fromEntries(PHASE_NDT_KINDS.layer.flatMap(kind => {
    const id = `layer-ndt-${kind}`;
    const rules: RejectRule[] = [{ when: [
      { field: 'step.root-layer.inspectionType', op: 'is', values: ['interim'] },
      ...(kind === 'vt5x' ? [NOT_IA] : []),
    ], to: 'root-layer' }];
    return [[id, rules], [nqcStepId(id), rules]];
  })),
};

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
