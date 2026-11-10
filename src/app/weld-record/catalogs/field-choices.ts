/* What each admin screen offers from the field catalog (field-catalog.ts), and the fields generated
   per routing from its Signoff Form rows:
   - Signoff Type to Routing and personas: JOINT_DETAIL_FIELDS, because they are decided as a routing is
     built, before Fabrication values exist
   - Signoff Type Forms clauses: JOINT_AND_FABRICATION_FIELDS; its field picker uses FORM_FIELDS and its
     own form's fields use formFieldValues
   - Routing Settings: ROUTING_CONDITION_FIELDS, stepAnswerFieldsBefore, and This routing on Reject routes
     to and Then go to (stageConditionFields)
   - Qualifications and Advanced Search: allStepAnswerFields
   - Attribute Code Exceptions: exceptionConditionFields, built from these */
import { Job } from '../../data/jobs';
import { getSignoffTypes } from '../../data/signoff-types';
import { isExcavationNdtStageId, isRepairStageId } from '../routing/routing-ids';
import { ConditionCatalogField, FIELD_CATALOG, FORM_FIELDS, RuleEntry, StageAnswers } from './field-catalog';

const YES_NO = ['Yes', 'No'];
const yesNo = (b: boolean) => b ? 'Yes' : 'No';

const RULE_ROWS = FIELD_CATALOG.filter((f): f is RuleEntry => f.source !== 'Signoff Form');

/* a field's name in a droplist, Source first; Fabrication rows, routing answers and This routing already
   start with theirs. Rule text keeps the plain label. */
export function fieldChoiceLabel(f: { label: string; source?: string }): string {
  return f.source === 'Joint Details' || f.source === 'Calculated' ? `${f.source}: ${f.label}` : f.label;
}

/* a Calculated row without stepAnswer is worked out from the joint alone */
export const readsFabrication = (f: ConditionCatalogField | undefined): boolean =>
  f?.source === 'Fabrication' || (f?.source === 'Calculated' && !!f.stepAnswer);

export const JOINT_DETAIL_FIELDS: ConditionCatalogField[] = RULE_ROWS.filter(f => f.source === 'Joint Details' || (f.source === 'Calculated' && !f.stepAnswer));
export const FABRICATION_DEPENDENT_FIELDS: ConditionCatalogField[] = RULE_ROWS.filter(readsFabrication);
export const JOINT_AND_FABRICATION_FIELDS: ConditionCatalogField[] = RULE_ROWS;
export const jointOrFabricationField = (key: string) => JOINT_AND_FABRICATION_FIELDS.find(f => f.key === key);

/* Yes/No from a signed routing's checkbox, blank until that routing is signed */
const signedAnswer = (stageIds: string[], key: string, signoff: boolean) => (_: Job, stages: StageAnswers[]) => {
  const s = stages.find(st => stageIds.includes(st.id));
  if (!s?.signed) return '';
  return yesNo((signoff ? s.signoffInputs : s.inputs)[key] === 'yes');
};

/* the Signoff Form rows built-in rules read by a fixed key (Fit's Defer Tack, Fit-Up Insp's Release to welding) */
const FIXED_ANSWERS = FORM_FIELDS.flatMap(row => row.fixedAnswer ? [{ row, answer: row.fixedAnswer }] : []);
const FIXED_ANSWER_FIELDS = FIXED_ANSWERS.map(({ row, answer }): ConditionCatalogField => ({
  key: answer.key, label: answer.label, source: 'Routing answers', values: YES_NO, stepAnswer: true,
  get: signedAnswer(answer.stageIds, row.key, !!row.ownFormSteps?.includes(answer.stageIds[0])),
}));

/* everything a Routing Settings rule can test apart from routing answers' own per-routing fields */
export const ROUTING_CONDITION_FIELDS = [...JOINT_AND_FABRICATION_FIELDS, ...FIXED_ANSWER_FIELDS];

/* a checkbox on a form stores 'yes' or blank, and reads Yes / No in every condition */
const CHECKBOX_VALUES = [{ label: 'Yes', value: 'yes' }, { label: 'No', value: '' }];
export function formFieldValues(f: { type: string; options?: { label: string; value: string }[] }): { label: string; value: string }[] {
  return f.type === 'checkbox' ? CHECKBOX_VALUES : (f.options ?? []).map(o => ({ value: o.value, label: o.label }));
}

/* ── Routing answers: every routing's own fields, keyed 'step.<stageId>.<fieldKey>' ── */

/* the shape of a stage template these read */
interface StageShape {
  id?: string;
  classification?: 'numbered' | 'added';
  lifecycle?: string;
  insertion?: { originInspectionType?: string };
  typeOptions?: { label: string; value: string }[];
}
interface StepTemplateShape extends StageShape { id: string; label: string }

/* Registered with templates to keep condition evaluation independent of form initialization. */
interface RoutingField { key: string; label: string; type: string; options?: { label: string; value: string }[]; ownFormSteps?: string[]; }
let routingFields: (stageId: string, options?: StageShape['typeOptions']) => RoutingField[] = () => [];
let fieldsVersion: () => number = () => 0;
export function registerRoutingFields(fn: typeof routingFields, version: () => number) { routingFields = fn; fieldsVersion = version; }
export const routingAnswerFields = (stage: StageShape) => routingFields(stage.id ?? '', stage.typeOptions);

/* routing-settings-rules.ts registers its templates at load (it imports this file, so it can't be imported back) */
let stepTemplates: () => Record<string, StepTemplateShape[]> = () => ({});
export function registerStepTemplates(fn: () => Record<string, StepTemplateShape[]>) { stepTemplates = fn; }

/* covered by the fixed fields above (the built-in rules use those keys) */
const isFixedAnswer = (stageId: string, key: string) => FIXED_ANSWERS.some(({ row, answer }) => row.key === key && answer.stageIds.includes(stageId));

/* one routing's answers as condition fields; blank until that routing is signed */
function answersOf(t: StepTemplateShape): ConditionCatalogField[] {
  const out: ConditionCatalogField[] = [];
  const add = (key: string, label: string, type: string, opts?: { label: string; value: string }[], signoff = false) => {
    if (isFixedAnswer(t.id, key) || out.some(f => f.key === `step.${t.id}.${key}`)) return;
    const labels = new Map((opts ?? []).map(o => [o.value, o.label]));
    const checkbox = type === 'checkbox';
    out.push({
      key: `step.${t.id}.${key}`, label: `${t.label}: ${label}`, source: 'Routing answers', stepAnswer: true,
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
  const fixedOf = (stageId: string) => FIXED_ANSWER_FIELDS.filter((_, i) => FIXED_ANSWERS[i].answer.stageIds.includes(stageId));
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
    out.push({ key: `self.${key}`, label: `This routing: ${label}`, source: 'This routing', values: opts.map(o => o.value),
      valueLabel: v => labels.get(v) ?? v, get: () => '' });
  };
  if (stage.typeOptions?.length) add('inspectionType', 'Type', stage.typeOptions);
  for (const f of routingAnswerFields(stage)) add(f.key, f.label, formFieldValues(f));   /* no options = a typed value */
  const repair = isRepairStageId(stage.id ?? '');
  if (repair || isExcavationNdtStageId(stage.id ?? '') || stage.insertion || (stage.classification === 'added' && stage.lifecycle === 'ordinary')) {
    const types = [{ label: 'Blank', value: '' }, ...getSignoffTypes().map(t => ({ label: t.label, value: t.value }))];
    add('originalInspectionType', 'Original rejecting inspection Type', types);
    if (!repair) add('performedInspectionType', 'Performed inspection Type', types);
  }
  return out;
}
