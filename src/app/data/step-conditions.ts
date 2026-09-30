/* Step conditions (Admin > Routing, "Included when"): which routing steps a joint gets. A step's
   conditions are a list of rules; the step is included when any rule matches, and a rule matches
   when every one of its clauses does. No rules = always included.
   Joint Details clauses are decided once, when the joint's routing is built; a step whose rules
   leave it out isn't on the joint at all. Step-answer clauses (Fit's Defer Tack, Fit-Up Insp's
   Release to welding) are blank until that step is signed, so a step that uses one is always on
   the joint and turns required on or off as those steps are signed (workflow.ts applySignedFlags). */
import { Job, N_IND_POOL, NDT_REQUIREMENT_VALUES, WELD_TYPES } from './jobs';
import { getJointDesign } from './joint-designs';
import { requiresTraceability } from './mcl-traceability';

export interface ConditionClause {
  field: string;          /* STEP_CONDITION_FIELDS key */
  op: 'is' | 'isNot' | 'contains';
  values: string[];       /* matches any of these; 'contains' has one typed text, any case */
}
export type ConditionRule = ConditionClause[];

/* Reject rules (Admin > Routing, "Reject routes to"): when a step is signed UNSAT, the first rule
   whose conditions all match picks where it goes; none matching = the step's normal target. Besides
   Joint Details, a clause can test the rejected step's own answers ('self.<key>', raw option values). */
export interface RejectRule {
  when: ConditionRule;
  to: string;             /* stage id; 'repair' on an NDT step adds a Repair */
}

/* the part of a workflow stage a step-answer clause reads (kept structural to avoid importing workflow.ts) */
interface StageAnswers {
  id: string;
  signed: boolean;
  inputs: Record<string, string>;
  signoffInputs: Record<string, string>;
  inspectionType?: string;
}

export interface StepConditionField {
  key: string;
  label: string;
  values: string[];
  /* step answers only have a value once that step is signed */
  stepAnswer?: boolean;
  get: (job: Job, stages: StageAnswers[]) => string;
  /* shown instead of the stored value (a step's own option values, e.g. straw -> Straw) */
  valueLabel?: (v: string) => string;
}

const yesNo = (b: boolean) => b ? 'Yes' : 'No';
const upper = (v: string) => (v || '').trim().toUpperCase();
const RT_DEGREES = ['NA', '10', '100', '360', '60', '75'];

/* Yes/No from a signed step's checkbox, blank until that step is signed */
const signedAnswer = (stageId: string, key: string, signoff: boolean) => (_: Job, stages: StageAnswers[]) => {
  const s = stages.find(st => st.id === stageId);
  if (!s?.signed) return '';
  return yesNo((signoff ? s.signoffInputs : s.inputs)[key] === 'yes');
};

export const STEP_CONDITION_FIELDS: StepConditionField[] = [
  { key: 'nInd', label: 'N Ind.', values: N_IND_POOL, get: j => j.nInd },
  { key: 'jdInsert', label: 'Joint Design needs Consumable Insert', values: ['Yes', 'No'],
    get: j => yesNo(!!getJointDesign(j.jointDesign)?.requiresConsumableInsert) },
  { key: 'jdRing', label: 'Joint Design needs Backing Ring', values: ['Yes', 'No'],
    get: j => yesNo(!!getJointDesign(j.jointDesign)?.requiresBackingRing) },
  { key: 'ss', label: 'SS', values: ['Yes', 'No'], get: j => yesNo(!!j.ss) },
  { key: 'sfff', label: 'SFFF', values: ['Yes', 'No'], get: j => yesNo(!!j.sfff) },
  { key: 'dssAaa', label: 'DSS-AAA', values: ['Yes', 'No'], get: j => yesNo(!!j.dssAaa) },
  { key: 'controlledMaterial', label: 'Controlled Material', values: ['Yes', 'No'],
    get: j => yesNo(requiresTraceability(j.mcl1) || requiresTraceability(j.mcl2)) },
  { key: 'weldType', label: 'Weld Type', values: WELD_TYPES, get: j => j.weldType },
  { key: 'ndtRoot', label: 'NDT Root', values: NDT_REQUIREMENT_VALUES, get: j => upper(j.ndtRoot) },
  { key: 'rtRoot', label: 'RT Root', values: RT_DEGREES, get: j => j.rtRoot },
  { key: 'ndtEach', label: 'NDT Each', values: NDT_REQUIREMENT_VALUES, get: j => upper(j.ndtEach) },
  { key: 'ndtFinal', label: 'NDT Final', values: NDT_REQUIREMENT_VALUES, get: j => upper(j.ndtFinal) },
  { key: 'rtFinal', label: 'RT Final', values: RT_DEGREES, get: j => j.rtFinal },
  { key: 'fitDeferTack', label: 'Fit: Defer Tack (once Fit is signed)', values: ['Yes', 'No'], stepAnswer: true,
    get: signedAnswer('fit', 'deferTack', true) },
  { key: 'inspReleaseToWelding', label: 'Fit-Up Insp: Release to welding (once Fit-Up Insp is signed)', values: ['Yes', 'No'], stepAnswer: true,
    get: signedAnswer('fitup-insp', 'releaseToWelding', false) },
];

export const conditionField = (key: string) => STEP_CONDITION_FIELDS.find(f => f.key === key);

const RT_TAKEN = ['10', '100', '360', '60', '75'];
const utrtRule = (ndtKey: string, rtKey?: string): ConditionRule[] => [
  [{ field: ndtKey, op: 'is', values: ['UT'] }],
  ...(rtKey ? [[{ field: rtKey, op: 'is' as const, values: RT_TAKEN }]] : []),
];
const mtptRule = (ndtKey: string): ConditionRule[] => [[{ field: ndtKey, op: 'is', values: ['MT', 'PT', 'MT/PT'] }]];

/* the rules the app was built with; Admin > Routing can change any of them */
export const DEFAULT_STEP_CONDITIONS: Record<string, ConditionRule[]> = {
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
  'layer-ndt-mtpt': mtptRule('ndtEach'),
  'layer-ndt-utrt': utrtRule('ndtEach'),
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

/* a rejected step's own answer: its Type, or a field (checkbox unticked = '') */
function selfValue(self: StageAnswers | undefined, key: string): string {
  if (!self) return '';
  if (key === 'inspectionType') return self.inspectionType ?? '';
  return self.inputs[key] ?? self.signoffInputs[key] ?? '';
}

function clauseMatches(c: ConditionClause, job: Job, stages: StageAnswers[], self?: StageAnswers): boolean {
  let value: string;
  if (c.field.startsWith('self.')) value = selfValue(self, c.field.slice(5));
  else {
    const f = conditionField(c.field);
    if (!f) return false;
    value = f.get(job, stages);
  }
  if (c.op === 'contains') {
    const text = (c.values[0] ?? '').trim().toLowerCase();
    return !!text && value.toLowerCase().includes(text);
  }
  const hit = c.values.includes(value);
  return c.op === 'isNot' ? !hit : hit;
}

/* no rules = always included */
export function conditionsMatch(rules: ConditionRule[] | undefined, job: Job, stages: StageAnswers[] = []): boolean {
  if (!rules?.length) return true;
  return rules.some(rule => rule.every(c => clauseMatches(c, job, stages)));
}

/* the first reject rule matching the rejected step `self`, if any */
export function matchingRejectRule(rules: RejectRule[] | undefined, job: Job, stages: StageAnswers[], self: StageAnswers): RejectRule | undefined {
  return rules?.find(r => r.when.length > 0 && r.when.every(c => clauseMatches(c, job, stages, self)));
}

/* the shape of a stage template stageConditionFields() reads */
interface StageShape {
  fields: { key: string; label: string; type: string; options?: { label: string; value: string }[] }[];
  signoffFields?: { key: string; label: string; type: string; options?: { label: string; value: string }[] }[];
  routingOptions?: { label: string; value: string }[];
}

/* a step's own answers a reject rule can test: its Type, and every droplist/checkbox/radio field */
export function stageConditionFields(stage: StageShape): StepConditionField[] {
  const out: StepConditionField[] = [];
  const add = (key: string, label: string, opts: { label: string; value: string }[]) => {
    if (out.some(f => f.key === `self.${key}`)) return;
    const labels = new Map(opts.map(o => [o.value, o.label]));
    out.push({ key: `self.${key}`, label: `This step: ${label}`, values: opts.map(o => o.value),
      valueLabel: v => labels.get(v) ?? v, get: () => '' });
  };
  if ((stage.routingOptions?.length ?? 0) > 1) add('inspectionType', 'Type', stage.routingOptions!);
  for (const f of [...stage.fields, ...(stage.signoffFields ?? [])]) {
    if (f.type === 'checkbox') add(f.key, f.label, [{ label: 'Yes', value: 'yes' }, { label: 'No', value: '' }]);
    else if ((f.type === 'select' || f.type === 'radio') && f.options?.length) add(f.key, f.label, f.options);
  }
  return out;
}

export function usesStepAnswers(rules: ConditionRule[] | undefined): boolean {
  return !!rules?.some(rule => rule.some(c => conditionField(c.field)?.stepAnswer));
}

function describeClause(c: ConditionClause, extra: StepConditionField[]): string {
  const f = extra.find(x => x.key === c.field) ?? conditionField(c.field);
  const label = f?.label.replace(/ \(once .*\)$/, '') ?? c.field;
  if (c.op === 'contains') return `${label} contains "${(c.values[0] ?? '').trim()}"`;
  const vals = c.values.length ? c.values.map(v => f?.valueLabel?.(v) ?? v).join(' or ') : '(nothing)';
  return `${label} ${c.op === 'isNot' ? 'is not' : 'is'} ${vals}`;
}

/* plain words for the Routing table, e.g. "N Ind. is 1 or 2; or Joint Design needs Backing Ring is Yes";
   `extra` is the step's own fields (stageConditionFields) for reject rules */
export function describeConditions(rules: ConditionRule[] | undefined, extra: StepConditionField[] = []): string {
  if (!rules?.length) return 'Always';
  return rules.map(rule => rule.map(c => describeClause(c, extra)).join(' and ')).join('; or ');
}
