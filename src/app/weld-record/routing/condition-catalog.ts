/* The one list of fields a condition can test, each with one name, one group, its values and how to
   read it. Every admin condition editor offers a part of this list:
   - Routing Settings: Joint Details, Fabrication, earlier routings' answers (ROUTING_CONDITION_FIELDS,
     stepAnswerFieldsBefore), plus This routing on Reject routes to and Then go to (stageConditionFields)
   - Signoff Type Forms: Joint Details and Fabrication (JOINT_AND_FABRICATION_FIELDS); its own form's
     fields use formFieldValues
   - Qualifications: Joint Details and Fabrication, with Sign-off fields from Qualification Check forms
   - Attribute Code Exceptions: exceptionConditionFields
   - Signoff Type to Routing and personas: Joint Details only (JOINT_DETAIL_FIELDS), because they are
     decided as a routing is built, before Fabrication values exist */
import { Job, MCL_POOL, N_IND_POOL, NDT_EACH_VALUES, NDT_REQUIREMENT_VALUES, PIPE_SIZES, WALL_THICKNESSES, WELD_TYPES } from '../../data/jobs';
import { PROGRESSION_ATTRIBUTE_CODES } from '../../data/attribute-codes';
import { getJointDesign, jointDesignOptions } from '../../data/joint-designs';
import { hasMaterialFlag, MaterialFlag } from '../../data/material-classification';
import { requiresTraceability } from '../../data/mcl-traceability';
import { NDT_LABELS } from '../../data/ndt-labels';
import { isShipboardLocation, shopOptions } from '../../data/shops';
import { jointAttributeCodes } from '../attribute-codes/attribute-context';
import { FABRICATION_FIELDS } from '../fabrication/fabrication-fields';
import { jointDetailsUt, jointDetailsVt } from '../joint-details/joint-details-values';
import { WorkflowStage } from '../model/workflow-types';
import { jointDesignRequiresBackingRing, jointDesignRequiresInsert, jointRequiresTraceability } from '../signoff-definition/joint-facts';
import { getRoutingSignoffTypes } from '../signoff-definition/routing-signoff-types';
import { fabricationSigned } from './built-in-step-rules';
import { isExcavationNdtStageId, isRepairStageId, nqcStepId } from './step-ids';

/* the part of a workflow stage a routing-answer field reads (kept structural to avoid importing the workflow files) */
export interface StageAnswers {
  id: string;
  signed: boolean;
  inputs: Record<string, string>;
  signoffInputs: Record<string, string>;
  inspectionType?: string;
  insertion?: { originInspectionType?: string };
}

export type Fabrication = Record<string, string>;
export type ConditionFieldGroup = 'Joint Details' | 'Fabrication' | 'Routing answers' | 'This routing';

export interface ConditionCatalogField {
  key: string;
  label: string;
  group: ConditionFieldGroup;
  values: string[];       /* none = a typed value (is / is not compare whole text, any case) */
  /* only has a value once a routing is signed or Fabrication is filled in, so it is re-checked as the joint moves */
  stepAnswer?: boolean;
  get: (job: Job, stages: StageAnswers[], fab?: Fabrication) => string;
  /* shown instead of the stored value (a routing's own option values, e.g. straw -> Straw) */
  valueLabel?: (v: string) => string;
  /* a Yes/No field's sentence in a Signoff Type Form's rule text */
  yesText?: string;
  noText?: string;
}

const YES_NO = ['Yes', 'No'];
const yesNo = (b: boolean) => b ? 'Yes' : 'No';
const upper = (v: string) => (v || '').trim().toUpperCase();
const RT_DEGREES = ['NA', '10', '100', '360', '60', '75'];

/* Yes/No from a signed routing's checkbox, blank until that routing is signed */
const signedAnswer = (stageIds: string[], key: string, signoff: boolean) => (_: Job, stages: StageAnswers[]) => {
  const s = stages.find(st => stageIds.includes(st.id));
  if (!s?.signed) return '';
  return yesNo((signoff ? s.signoffInputs : s.inputs)[key] === 'yes');
};

type JointEntry = Omit<ConditionCatalogField, 'group'>;

/* a Joint Details text field, as shown there */
const text = (key: keyof Job, label: string, values: string[] = []): JointEntry =>
  ({ key, label, values, get: j => String(j[key] ?? '') });

const JOINT_DETAILS_TEXT: JointEntry[] = [
  text('xrefid', 'XREFID'), text('ship', 'Ship'), text('hull', 'Hull'), text('drawing', 'Drawing'),
  text('drawingRev', 'Drawing Rev'), text('joint', 'Joint'), text('jointDesign', 'Joint Design'),
  text('pipeSize', 'Pipe Size', PIPE_SIZES), text('wallThickness', 'Wall Thickness', WALL_THICKNESSES),
  text('sequenceNumber', 'Sequence #'), text('engineeringNotes', 'Engineering Notes'),
  text('mcl1', 'MCL 1', MCL_POOL), text('materialType1', 'Material Type 1'), text('joiningItem', 'Joining Item'),
  text('mcl2', 'MCL 2', MCL_POOL), text('materialType2', 'Material Type 2'), text('joinToItem', 'Join To Item'),
  { key: 'ut', label: NDT_LABELS.ut, values: ['X', '-'], get: jointDetailsUt },
  { key: 'vt', label: NDT_LABELS.vt, values: ['X'], get: jointDetailsVt },
  text('order', 'Order'), text('workPackage', 'Work Package'), text('workPermit', 'Work Permit'), text('waff', 'WAFF'),
  text('serialNumber', 'Serial Number'), text('refitNumber', 'Refit #'), text('repairNumber', 'Repair #'),
  text('er1', 'ER1'), text('er2', 'ER2'), text('er3', 'ER3'), text('er4', 'ER4'),
  text('attributeCode1', 'Attribute Code 1'), text('attributeCode2', 'Attribute Code 2'),
  text('attributeCode3', 'Attribute Code 3'), text('attributeCode4', 'Attribute Code 4'),
];

/* Joint Details as shown on the weld record (Routing left out: it's what these rules decide), the
   built-in rules' fields first. UT/VT read the same values the Joint Details panel shows (UT X or -, VT X or blank). */
export const JOINT_DETAIL_FIELDS: ConditionCatalogField[] = ([
  { key: 'attributeCodes', label: 'Has attribute code (any slot)', values: PROGRESSION_ATTRIBUTE_CODES.map(a => a.code),
    get: j => jointAttributeCodes(j).join(', ') },
  ...(['nonFerrous', 'austenitic', 'titanium'] as MaterialFlag[]).map((flag): JointEntry => ({
    key: `material.${flag}`, label: `Either material is ${flag === 'nonFerrous' ? 'non-ferrous' : flag}`,
    values: YES_NO, get: job => yesNo(hasMaterialFlag(job, flag)),
    ...(flag === 'titanium' ? { yesText: 'the joint is titanium', noText: 'the joint is not titanium' } : {}),
  })),
  { key: 'nInd', label: 'N Ind.', values: N_IND_POOL, get: j => j.nInd },
  { key: 'jdInsert', label: 'Joint Design needs Consumable Insert', values: YES_NO,
    get: j => yesNo(!!getJointDesign(j.jointDesign)?.requiresConsumableInsert) },
  { key: 'jdRing', label: 'Joint Design needs Backing Ring', values: YES_NO,
    get: j => yesNo(!!getJointDesign(j.jointDesign)?.requiresBackingRing) },
  { key: 'ss', label: 'SS', values: YES_NO, get: j => yesNo(!!j.ss) },
  { key: 'sfff', label: 'SFFF', values: YES_NO, get: j => yesNo(!!j.sfff) },
  { key: 'dssAaa', label: 'DSS-AAA', values: YES_NO, get: j => yesNo(!!j.dssAaa) },
  { key: 'controlledMaterial', label: 'Controlled Material', values: YES_NO, get: j => yesNo(jointRequiresTraceability(j)),
    yesText: 'either part requires material traceability', noText: 'neither part requires material traceability' },
  { key: 'part1Traceability', label: 'Part 1 requires material traceability', values: YES_NO, get: j => yesNo(requiresTraceability(j.mcl1)),
    yesText: 'part 1 requires material traceability', noText: 'part 1 does not require material traceability' },
  { key: 'part2Traceability', label: 'Part 2 requires material traceability', values: YES_NO, get: j => yesNo(requiresTraceability(j.mcl2)),
    yesText: 'part 2 requires material traceability', noText: 'part 2 does not require material traceability' },
  { key: 'weldType', label: 'Weld Type', values: WELD_TYPES, get: j => j.weldType },
  { key: 'ndtRoot', label: NDT_LABELS.ndtRoot, values: NDT_REQUIREMENT_VALUES, get: j => upper(j.ndtRoot) },
  { key: 'rtRoot', label: NDT_LABELS.rtRoot, values: RT_DEGREES, get: j => j.rtRoot },
  { key: 'ndtEach', label: NDT_LABELS.ndtEach, values: ['', ...NDT_EACH_VALUES], valueLabel: v => v || 'Blank', get: j => upper(j.ndtEach) },
  { key: 'ndtFinal', label: NDT_LABELS.ndtFinal, values: NDT_REQUIREMENT_VALUES, get: j => upper(j.ndtFinal) },
  { key: 'rtFinal', label: NDT_LABELS.rtFinal, values: RT_DEGREES, get: j => j.rtFinal },
  ...JOINT_DETAILS_TEXT,
] as JointEntry[]).map(f => ({ ...f, group: 'Joint Details' as const }));

export const SHIPBOARD_FIELD = 'fabricationShipboard';

/* Location and Revised Joint Design read their admin-edited lists each time they're asked */
function fabricationOptions(key: string, own?: { label: string; value: string }[]): { label: string; value: string }[] {
  if (key === 'location') return shopOptions();
  if (key === 'revisedJointDesign') return jointDesignOptions();
  return own ?? [];
}

const fact = (key: string, label: string, get: (job: Job, fab: Fabrication) => boolean, yesText: string, noText: string): ConditionCatalogField =>
  ({ key, label, group: 'Fabrication', values: YES_NO, stepAnswer: true, get: (job, _stages, fab) => yesNo(get(job, fab ?? {})), yesText, noText });

/* every Fabrication value (blank until entered), then what follows from them */
export const FABRICATION_CONDITION_FIELDS: ConditionCatalogField[] = [
  ...FABRICATION_FIELDS.map((f): ConditionCatalogField => ({
    key: `fab.${f.key}`, label: `Fabrication: ${f.label}`, group: 'Fabrication', stepAnswer: true,
    get values() { return fabricationOptions(f.key, f.options).map(o => o.value); },
    valueLabel: v => fabricationOptions(f.key, f.options).find(o => o.value === v)?.label ?? v,
    get: (_job, _stages, fab) => fab?.[f.key] ?? '',
  })),
  { key: SHIPBOARD_FIELD, label: 'Fabrication Location is shipboard (once Fit is signed)', group: 'Fabrication', values: YES_NO, stepAnswer: true,
    get: (_job, stages, fab) => fabricationSigned(stages as WorkflowStage[]) ? yesNo(isShipboardLocation(fab?.['location'])) : '' },
  fact('consumableInsertRequired', 'Current Joint Design needs Consumable Insert', jointDesignRequiresInsert,
    'the joint design needs a consumable insert', 'the joint design doesn\'t need a consumable insert'),
  fact('backingRingRequired', 'Current Joint Design needs Backing Ring', jointDesignRequiresBackingRing,
    'the joint design needs a backing ring', 'the joint design doesn\'t need a backing ring'),
  fact('revisedJointDesignEntered', 'Revised Joint Design entered', (_job, fab) => !!(fab['revisedJointDesign'] ?? '').trim(),
    'a Revised Joint Design is entered', 'no Revised Joint Design is entered'),
];

export const JOINT_AND_FABRICATION_FIELDS = [...JOINT_DETAIL_FIELDS, ...FABRICATION_CONDITION_FIELDS];
export const jointOrFabricationField = (key: string) => JOINT_AND_FABRICATION_FIELDS.find(f => f.key === key);

/* Fit's Defer Tack and Fit-Up Insp's Release to welding; every other routing's fields come from stepAnswerFields below */
const FIXED_ANSWER_FIELDS: ConditionCatalogField[] = [
  { key: 'fitDeferTack', label: 'Fit: Defer Tack (once Fit is signed)', group: 'Routing answers', values: YES_NO, stepAnswer: true,
    get: signedAnswer(['fit'], 'deferTack', true) },
  { key: 'inspReleaseToWelding', label: 'Fit-Up Insp: Release to welding (once Fit-Up Insp is signed)', group: 'Routing answers', values: YES_NO, stepAnswer: true,
    get: signedAnswer(['fitup-insp', nqcStepId('fitup-insp')], 'releaseToWelding', false) },
];

/* everything a Routing Settings rule can test apart from routing answers' own per-routing fields */
export const ROUTING_CONDITION_FIELDS = [...JOINT_AND_FABRICATION_FIELDS, ...FIXED_ANSWER_FIELDS];

/* a checkbox on a form stores 'yes' or blank, and reads Yes / No in every condition */
export const CHECKBOX_VALUES = [{ label: 'Yes', value: 'yes' }, { label: 'No', value: '' }];
export function formFieldValues(f: { type: string; options?: { label: string; value: string }[] }): { label: string; value: string }[] {
  return f.type === 'checkbox' ? CHECKBOX_VALUES : (f.options ?? []).map(o => ({ value: o.value, label: o.label }));
}

/* ── Routing answers: every routing's own fields, keyed 'step.<stageId>.<fieldKey>' ── */

/* the shape of a stage template these read */
export interface StageShape {
  id?: string;
  classification?: 'numbered' | 'added';
  lifecycle?: string;
  insertion?: { originInspectionType?: string };
  typeOptions?: { label: string; value: string }[];
}
export interface StepTemplateShape extends StageShape { id: string; label: string }

/* Registered with templates to keep condition evaluation independent of form initialization. */
interface RoutingField { key: string; label: string; type: string; options?: { label: string; value: string }[]; ownFormSteps?: string[]; }
let routingFields: (stageId: string, options?: StageShape['typeOptions']) => RoutingField[] = () => [];
let fieldsVersion: () => number = () => 0;
export function registerRoutingFields(fn: typeof routingFields, version: () => number) { routingFields = fn; fieldsVersion = version; }
export const routingAnswerFields = (stage: StageShape) => routingFields(stage.id ?? '', stage.typeOptions);

/* stage-templates.ts registers its templates at load (it imports this file, so it can't be imported back) */
let stepTemplates: () => Record<string, StepTemplateShape[]> = () => ({});
export function registerStepTemplates(fn: () => Record<string, StepTemplateShape[]>) { stepTemplates = fn; }

/* covered by the fixed fields above (the built-in rules use those keys) */
const FIXED_STEP_ANSWERS = new Set(['fit.deferTack', 'fitup-insp.releaseToWelding', `${nqcStepId('fitup-insp')}.releaseToWelding`]);
/* fixed routing-answer field -> the routing field it reads */
const FIXED_KEY: Record<string, string> = { fitDeferTack: 'deferTack', inspReleaseToWelding: 'releaseToWelding' };

/* one routing's answers as condition fields; blank until that routing is signed */
function answersOf(t: StepTemplateShape): ConditionCatalogField[] {
  const out: ConditionCatalogField[] = [];
  const add = (key: string, label: string, type: string, opts?: { label: string; value: string }[], signoff = false) => {
    if (FIXED_STEP_ANSWERS.has(`${t.id}.${key}`) || out.some(f => f.key === `step.${t.id}.${key}`)) return;
    const labels = new Map((opts ?? []).map(o => [o.value, o.label]));
    const checkbox = type === 'checkbox';
    out.push({
      key: `step.${t.id}.${key}`, label: `${t.label}: ${label}`, group: 'Routing answers', stepAnswer: true,
      values: checkbox ? YES_NO : (opts ?? []).map(o => o.value),
      valueLabel: checkbox ? undefined : v => labels.get(v) ?? v,
      get: (_: Job, stages: StageAnswers[]) => {
        const s = stages.find(st => st.signed && st.id === t.id);
        if (!s) return '';
        if (key === 'inspectionType') return s.inspectionType ?? '';
        const v = (signoff ? s.signoffInputs : s.inputs)[key] ?? (signoff ? s.inputs : s.signoffInputs)[key] ?? '';
        return checkbox ? yesNo(v === 'yes') : v;
      },
    });
  };
  if ((t.typeOptions?.length ?? 0) > 1) add('inspectionType', 'Type', 'select', t.typeOptions);
  for (const f of routingAnswerFields(t)) add(f.key, f.label, f.type, f.options, !!f.ownFormSteps?.includes(t.id));
  return out;
}

const stepsOf = (trade: string): StepTemplateShape[] => stepTemplates()[trade] ?? [];

/* a trade's routings (id, label, fields), in routing order (Admin > Qualifications builds its sign-off fields from these) */
export const tradeSteps = (trade: string): StepTemplateShape[] => stepsOf(trade);

/* the answers of a trade's routings before `stageId`, in routing order (what a rule on that routing can use) */
export function stepAnswerFieldsBefore(trade: string, stageId: string): ConditionCatalogField[] {
  const list = stepsOf(trade);
  const at = list.findIndex(t => t.id === stageId);
  return (at < 0 ? list : list.slice(0, at)).flatMap(answersOf);
}

/* every routing's answers for a trade, in routing order, with Fit's and Fit-Up Insp's fixed ones under
   their own routing (Advanced Search) */
export function allStepAnswerFields(trade: string): ConditionCatalogField[] {
  const fixedOf = (stageId: string) => FIXED_ANSWER_FIELDS.filter(f => FIXED_STEP_ANSWERS.has(`${stageId}.${FIXED_KEY[f.key]}`));
  return stepsOf(trade).flatMap(t => [...fixedOf(t.id), ...answersOf(t)]);
}

/* every trade's routing answers, for looking a saved clause's field up by key */
let cache: { src: Record<string, StepTemplateShape[]>; fields: Map<string, ConditionCatalogField>; version: number } | null = null;
function stepAnswerField(key: string): ConditionCatalogField | undefined {
  const src = stepTemplates();
  if (cache?.src !== src || cache?.version !== fieldsVersion()) {
    const fields = new Map<string, ConditionCatalogField>();
    for (const f of Object.values(src).flat().flatMap(answersOf)) if (!fields.has(f.key)) fields.set(f.key, f);
    cache = { src, fields, version: fieldsVersion() };
  }
  return cache.fields.get(key);
}

/* a saved clause's field, wherever in the catalog it lives */
export const catalogField = (key: string) =>
  ROUTING_CONDITION_FIELDS.find(f => f.key === key) ?? (key.startsWith('step.') ? stepAnswerField(key) : undefined);

/* a routing's own answers a Reject routes to or Then go to rule can test: its Type, and every field */
export function stageConditionFields(stage: StageShape): ConditionCatalogField[] {
  const out: ConditionCatalogField[] = [];
  const add = (key: string, label: string, opts: { label: string; value: string }[]) => {
    if (out.some(f => f.key === `self.${key}`)) return;
    const labels = new Map(opts.map(o => [o.value, o.label]));
    out.push({ key: `self.${key}`, label: `This routing: ${label}`, group: 'This routing', values: opts.map(o => o.value),
      valueLabel: v => labels.get(v) ?? v, get: () => '' });
  };
  if (stage.typeOptions?.length) add('inspectionType', 'Type', stage.typeOptions);
  for (const f of routingAnswerFields(stage)) add(f.key, f.label, formFieldValues(f));   /* no options = a typed value */
  const repair = isRepairStageId(stage.id ?? '');
  if (repair || isExcavationNdtStageId(stage.id ?? '') || stage.insertion || (stage.classification === 'added' && stage.lifecycle === 'ordinary')) {
    const types = [{ label: 'Blank', value: '' }, ...getRoutingSignoffTypes().map(t => ({ label: t.label, value: t.value }))];
    add('originalInspectionType', 'Original rejecting inspection Type', types);
    if (!repair) add('performedInspectionType', 'Performed inspection Type', types);
  }
  return out;
}
