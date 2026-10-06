/* Step conditions (Admin > Routing Settings, "Included when"): which routing steps a joint gets. A step's
   conditions are a list of rules; the step is included when any rule matches, and a rule matches
   when every one of its clauses does. No rules = always included.
   Joint Details clauses are decided once, when the joint's routing is built; a step whose rules
   leave it out isn't on the joint at all. Step-answer clauses (any step's own fields, e.g. Fit's
   Defer Tack or an NDT step's Weld Color) are blank until that step is signed, so a step that uses
   one is always on the joint and turns required on or off as those steps are signed
   (workflow/route-changes.ts applySignedFlags). */
import { Job, MCL_POOL, N_IND_POOL, NDT_REQUIREMENT_VALUES, PIPE_SIZES, WALL_THICKNESSES, WELD_TYPES } from './jobs';
import { getJointDesign } from './joint-designs';
import { jointDetailsUt, jointDetailsVt } from './joint-form/joint-details';
import { requiresTraceability } from './mcl-traceability';

export interface ConditionClause {
  field: string;          /* STEP_CONDITION_FIELDS key */
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

/* the part of a workflow stage a step-answer clause reads (kept structural to avoid importing the workflow fils) */
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
  values: string[];       /* none = a typed value (is / is not compare whole text, any case) */
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

/* a Joint Details text field, as shown there */
const text = (key: keyof Job, label: string, values: string[] = []): StepConditionField =>
  ({ key, label, values, get: j => String(j[key] ?? '') });

/* Joint Details as shown on the weld record (Routing left out: it's what these rules decide).
   UT/VT read the same X / 5X / - the Joint Details panel shows. */
const JOINT_DETAILS_TEXT: StepConditionField[] = [
  text('xrefid', 'XREFID'), text('ship', 'Ship'), text('hull', 'Hull'), text('drawing', 'Drawing'),
  text('drawingRev', 'Drawing Rev'), text('joint', 'Joint'), text('jointDesign', 'Joint Design'),
  text('pipeSize', 'Pipe Size', PIPE_SIZES), text('wallThickness', 'Wall Thickness', WALL_THICKNESSES),
  text('sequenceNumber', 'Sequence #'), text('engineeringNotes', 'Engineering Notes'),
  text('mcl1', 'MCL 1', MCL_POOL), text('materialType1', 'Material Type 1'), text('joiningItem', 'Joining Item'),
  text('mcl2', 'MCL 2', MCL_POOL), text('materialType2', 'Material Type 2'), text('joinToItem', 'Join To Item'),
  { key: 'ut', label: 'UT', values: ['X', '-'], get: jointDetailsUt },
  { key: 'vt', label: 'VT', values: ['X', '5X', '-'], get: jointDetailsVt },
  text('order', 'Order'), text('workPackage', 'Work Package'), text('workPermit', 'Work Permit'), text('waff', 'WAFF'),
  text('serialNumber', 'Serial Number'), text('refitNumber', 'Refit #'), text('repairNumber', 'Repair #'),
  text('er1', 'ER1'), text('er2', 'ER2'), text('er3', 'ER3'), text('er4', 'ER4'),
  text('attributeCode1', 'Attribute Code 1'), text('attributeCode2', 'Attribute Code 2'),
  text('attributeCode3', 'Attribute Code 3'), text('attributeCode4', 'Attribute Code 4'),
];

/* Joint Details fields (the built-in rules' fields first), then Fit's Defer Tack and Fit-Up Insp's
   Release to welding; every other step's fields come from stepAnswerFields() */
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
  ...JOINT_DETAILS_TEXT,
  { key: 'fitDeferTack', label: 'Fit: Defer Tack (once Fit is signed)', values: ['Yes', 'No'], stepAnswer: true,
    get: signedAnswer('fit', 'deferTack', true) },
  { key: 'inspReleaseToWelding', label: 'Fit-Up Insp: Release to welding (once Fit-Up Insp is signed)', values: ['Yes', 'No'], stepAnswer: true,
    get: signedAnswer('fitup-insp', 'releaseToWelding', false) },
];

/* ── Step answers: every step's own fields, keyed 'step.<stageId>.<fieldKey>' ── */

/* the part of a stage template these read (structural, so the workflow files aren't imported here) */
export interface StepTemplateShape extends StageShape { id: string; label: string }

/* workflow/stage-templates.ts registers its templates at load (it imports this file, so it can't be imported back) */
let stepTemplates: () => Record<string, StepTemplateShape[]> = () => ({});
export function registerStepTemplates(fn: () => Record<string, StepTemplateShape[]>) { stepTemplates = fn; }

/* covered by the fixed fields above (the built-in rules use those keys) */
const FIXED_STEP_ANSWERS = new Set(['fit.deferTack', 'fitup-insp.releaseToWelding']);

/* one step's answers as condition fields; blank until that step is signed (the latest signed copy,
   so a repeated Layer reads its last round) */
function answersOf(t: StepTemplateShape): StepConditionField[] {
  const out: StepConditionField[] = [];
  const add = (key: string, label: string, type: string, opts?: { label: string; value: string }[], signoff = false) => {
    if (FIXED_STEP_ANSWERS.has(`${t.id}.${key}`) || out.some(f => f.key === `step.${t.id}.${key}`)) return;
    const labels = new Map((opts ?? []).map(o => [o.value, o.label]));
    const checkbox = type === 'checkbox';
    out.push({
      key: `step.${t.id}.${key}`, label: `${t.label}: ${label}`, stepAnswer: true,
      values: checkbox ? ['Yes', 'No'] : (opts ?? []).map(o => o.value),
      valueLabel: checkbox ? undefined : v => labels.get(v) ?? v,
      get: (_: Job, stages: StageAnswers[]) => {
        const s = [...stages].reverse().find(st => st.signed && (st.id === t.id || st.id.startsWith(`${t.id}-r`)));
        if (!s) return '';
        if (key === 'inspectionType') return s.inspectionType ?? '';
        const v = (signoff ? s.signoffInputs : s.inputs)[key] ?? (signoff ? s.inputs : s.signoffInputs)[key] ?? '';
        return checkbox ? yesNo(v === 'yes') : v;
      },
    });
  };
  if ((t.routingOptions?.length ?? 0) > 1) add('inspectionType', 'Type', 'select', t.routingOptions);
  for (const f of t.fields) add(f.key, f.label, f.type, f.type === 'checkbox' ? undefined : f.options);
  for (const f of t.signoffFields ?? []) add(f.key, f.label, f.type, f.type === 'checkbox' ? undefined : f.options, true);
  return out;
}

const stepsOf = (trade: string): StepTemplateShape[] => stepTemplates()[trade] ?? [];

/* a trade's steps (id, label, fields), in routing order (Admin > Qualifications builds its sign-off fields from these) */
export const tradeSteps = (trade: string): StepTemplateShape[] => stepsOf(trade);

/* the answers of a trade's steps before `stageId`, in routing order (what a rule on that step can use) */
export function stepAnswerFieldsBefore(trade: string, stageId: string): StepConditionField[] {
  const list = stepsOf(trade);
  const at = list.findIndex(t => t.id === stageId);
  return (at < 0 ? list : list.slice(0, at)).flatMap(answersOf);
}

/* every step's answers for a trade, in routing order, with Fit's and Fit-Up Insp's fixed ones under
   their own step (Advanced Search) */
export function allStepAnswerFields(trade: string): StepConditionField[] {
  const fixed = STEP_CONDITION_FIELDS.filter(f => f.stepAnswer);
  const fixedOf = (stageId: string) => fixed.filter(f => FIXED_STEP_ANSWERS.has(`${stageId}.${FIXED_KEY[f.key]}`));
  return stepsOf(trade).flatMap(t => [...fixedOf(t.id), ...answersOf(t)]);
}
/* fixed step-answer field -> the step field it reads */
const FIXED_KEY: Record<string, string> = { fitDeferTack: 'deferTack', inspReleaseToWelding: 'releaseToWelding' };

/* every trade's step answers, for looking a saved clause's field up by key */
let cache: { src: Record<string, StepTemplateShape[]>; fields: Map<string, StepConditionField> } | null = null;
function stepAnswerField(key: string): StepConditionField | undefined {
  const src = stepTemplates();
  if (cache?.src !== src) {
    const fields = new Map<string, StepConditionField>();
    for (const f of Object.values(src).flat().flatMap(answersOf)) if (!fields.has(f.key)) fields.set(f.key, f);
    cache = { src, fields };
  }
  return cache.fields.get(key);
}

const conditionField = (key: string) =>
  STEP_CONDITION_FIELDS.find(f => f.key === key) ?? (key.startsWith('step.') ? stepAnswerField(key) : undefined);

const RT_TAKEN = ['10', '100', '360', '60', '75'];
const utrtRule = (ndtKey: string, rtKey?: string): ConditionRule[] => [
  [{ field: ndtKey, op: 'is', values: ['UT'] }],
  ...(rtKey ? [[{ field: rtKey, op: 'is' as const, values: RT_TAKEN }]] : []),
];
const mtptRule = (ndtKey: string): ConditionRule[] => [[{ field: ndtKey, op: 'is', values: ['MT', 'PT', 'MT/PT'] }]];

/* the rules the app was built with; Admin > Routing Settings can change any of them */
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

/* reject target that puts the joint on Engineering Hold instead (workflow/added-steps.ts insertEngineeringHold) */
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
export const DEFAULT_REJECT_RULES: Record<string, RejectRule[]> = {
  'root-ndt-mtpt': gtawPtHold('root-weld'),
  'layer-ndt-mtpt': gtawPtHold('root-layer'),
  'final-ndt-mtpt': gtawPtHold('final-weld'),
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
  const norm = (v: string) => v.trim().toLowerCase();
  const hit = c.values.some(v => norm(v) === norm(value));
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
export interface StageShape {
  fields: { key: string; label: string; type: string; options?: { label: string; value: string }[] }[];
  signoffFields?: { key: string; label: string; type: string; options?: { label: string; value: string }[] }[];
  routingOptions?: { label: string; value: string }[];
}

/* a step's own answers a reject rule can test: its Type, and every field */
export function stageConditionFields(stage: StageShape): StepConditionField[] {
  const out: StepConditionField[] = [];
  const add = (key: string, label: string, opts: { label: string; value: string }[]) => {
    if (out.some(f => f.key === `self.${key}`)) return;
    const labels = new Map(opts.map(o => [o.value, o.label]));
    out.push({ key: `self.${key}`, label: `This step: ${label}`, values: opts.map(o => o.value),
      valueLabel: v => labels.get(v) ?? v, get: () => '' });
  };
  if (stage.routingOptions?.length) add('inspectionType', 'Type', stage.routingOptions);
  for (const f of [...stage.fields, ...(stage.signoffFields ?? [])]) {
    if (f.type === 'checkbox') add(f.key, f.label, [{ label: 'Yes', value: 'yes' }, { label: 'No', value: '' }]);
    else add(f.key, f.label, f.options ?? []);   /* no options = a typed value */
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

/* each clause in plain words, e.g. "Type is PT" (the rejected step's own fields lose their "This step: ") */
export function describeClauses(rule: ConditionRule, extra: StepConditionField[] = []): string[] {
  return rule.map(c => describeClause(c, extra).replace(/^This step: /, ''));
}

/* plain words for the Routing table, e.g. "N Ind. is 1 or 2; or Joint Design needs Backing Ring is Yes";
   `extra` is the step's own fields (stageConditionFields) for reject rules */
export function describeConditions(rules: ConditionRule[] | undefined, extra: StepConditionField[] = []): string {
  if (!rules?.length) return 'Always';
  return rules.map(rule => rule.map(c => describeClause(c, extra)).join(' and ')).join('; or ');
}
