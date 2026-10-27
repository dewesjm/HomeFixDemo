/* What Admin > Attribute Code Exceptions does to one joint's routings. A row counts when its code is
   in any of the joint's four attribute code slots and its Applies when conditions match. Rows whose
   conditions read a later answer (a weld's Weld Process, Fabrication Location once Fit is signed)
   are re-checked as the joint is signed (route-changes.ts applySignedFlags). */
import { Job } from '../../data/jobs';
import { isShipboardLocation } from '../../data/shops';
import { StageOption, StageTemplate, WorkflowStage } from '../model/workflow-types';
import { ConditionClause, ConditionRule, conditionsMatch, usesStepAnswers } from '../routing/step-conditions';
import { NQC_SPLIT_STEP_IDS, baseStepId } from '../routing/step-ids';
import { fabricationSigned } from '../routing/built-in-step-rules';
import { getRoutingSignoffTypes } from '../signoff-definition/routing-signoff-types';
import { signoffTypeOptions } from '../signoff-definition/signoff-types';
import { jointCodeSlots } from './attribute-context';
import { AttributeCodeException, AttributeStageRules, SHIPBOARD_FIELD, getAttributeCodeExceptions, rowCoversRouting } from './attribute-code-exceptions';

export interface RoutingEffect {
  codes: string[];
  add: boolean;
  drop: boolean;
  only?: string[];
  added: string[];
  accessible: AttributeStageRules['accessible'];
  minRt?: number;
}

/* Fabrication Location's Shipboard flag (Admin > Locations), blank until Fit is signed */
function shipboardValue(stages: WorkflowStage[], fab: Record<string, string> | undefined): string {
  if (!fabricationSigned(stages)) return '';
  return isShipboardLocation(fab?.['location']) ? 'Yes' : 'No';
}

function clauseHolds(c: ConditionClause, job: Job, stages: WorkflowStage[], fab?: Record<string, string>): boolean {
  if (c.field !== SHIPBOARD_FIELD) return conditionsMatch([[c]], job, stages);
  const value = shipboardValue(stages, fab).toLowerCase();
  const hit = c.values.some(v => v.trim().toLowerCase() === value);
  return c.op === 'isNot' ? !hit : hit;
}

/* the row's own conditions; rowsFor() has already matched its code */
function applies(row: AttributeCodeException, job: Job, stages: WorkflowStage[], fab?: Record<string, string>): boolean {
  return !row.when?.length || row.when.some(rule => rule.every(c => clauseHolds(c, job, stages, fab)));
}

/* conditions known only once something on the joint is signed */
export function readsLaterAnswers(rules: ConditionRule[] | undefined): boolean {
  return usesStepAnswers(rules) || !!rules?.some(rule => rule.some(c => c.field === SHIPBOARD_FIELD));
}

const rowsFor = (routingId: string, job: Job) => {
  const codes = jointCodeSlots(job);
  return getAttributeCodeExceptions().filter(r => rowCoversRouting(r, routingId) && codes.includes(r.code.trim().toUpperCase()));
};

/* whether any of the joint's codes has a row for this routing that waits on a later answer */
export function hasLaterAnswerRows(routingId: string, job: Job): boolean {
  return rowsFor(routingId, job).some(r => readsLaterAnswers(r.when));
}

/* a later-answer row that may add this routing, so it is on the joint (not required) from the start */
export function mayBeAddedLater(routingId: string, job: Job): boolean {
  return rowsFor(routingId, job).some(r => r.routingChange === 'add' && readsLaterAnswers(r.when));
}

/* every matching row for one routing, combined; null when none matches */
export function routingEffect(routingId: string, job: Job, stages: WorkflowStage[] = [], fab?: Record<string, string>): RoutingEffect | null {
  const rows = rowsFor(routingId, job).filter(r => applies(r, job, stages, fab));
  if (!rows.length) return null;
  const only = rows.filter(r => r.typesMode === 'only').flatMap(r => r.types ?? []);
  const accessible: RoutingEffect['accessible'] = [];
  for (const rule of rows.flatMap(r => r.accessible ?? [])) if (!accessible.some(a => a.type === rule.type)) accessible.push(rule);
  const minRt = Math.max(0, ...rows.map(r => r.minRt ?? 0));
  return {
    codes: [...new Set(rows.map(r => r.code.trim().toUpperCase()))],
    add: rows.some(r => r.routingChange === 'add'),
    drop: rows.some(r => r.routingChange === 'drop'),
    ...(only.length ? { only: [...new Set(only)] } : {}),
    added: [...new Set(rows.filter(r => r.typesMode === 'add').flatMap(r => r.types ?? []))],
    accessible,
    ...(minRt ? { minRt } : {}),
  };
}

/* An added NQC-split routing goes on as the row the joint's N Ind. picks: the twin whose Included when
   N Ind. clauses match, the regular row when neither does. */
export function isJointsTwin(t: Pick<StageTemplate, 'id' | 'includeWhen'>, job: Job, templates: Pick<StageTemplate, 'id' | 'includeWhen'>[]): boolean {
  const base = baseStepId(t.id);
  if (!NQC_SPLIT_STEP_IDS.includes(base)) return true;
  const nIndMatches = (id: string) => {
    const rules = templates.find(x => x.id === id)?.includeWhen?.map(r => r.filter(c => c.field === 'nInd')).filter(r => r.length);
    return !!rules?.length && conditionsMatch(rules, job);
  };
  const twin = t.id === base ? `nqc-${base}` : base;
  return nIndMatches(t.id) || (t.id === base && !nIndMatches(twin));
}

/* the routing's Types after the matching rows: only = just those, add = those as well */
export function withExceptionTypes(options: StageOption[] | undefined, effect: RoutingEffect | null): StageOption[] | undefined {
  if (!effect || (!effect.only && !effect.added.length)) return options;
  const catalog = getRoutingSignoffTypes();
  const option = (value: string): StageOption[] => {
    const own = options?.find(o => o.value === value);
    if (own) return [own];
    const type = catalog.find(t => t.value === value);
    return type ? [{ value: type.value, label: type.label }] : [];
  };
  const result = effect.only ? effect.only.flatMap(option) : [...(options ?? [])];
  for (const value of effect.added) if (!result.some(o => o.value === value)) result.push(...option(value));
  return result;
}

export function stageRules(effect: RoutingEffect | null): AttributeStageRules | undefined {
  return effect ? { codes: effect.codes, accessible: effect.accessible, ...(effect.minRt ? { minRt: effect.minRt } : {}) } : undefined;
}

/* a routing's Types and frozen rules for this joint, from Signoff Types By Routing then the exceptions */
export function attributeTypeSettings(stageId: string, job: Job, stages: WorkflowStage[] = [], fab?: Record<string, string>,
  inputs: Record<string, string> = {}): { typeOptions: StageOption[] | undefined; attributeRules: AttributeStageRules | undefined } {
  const effect = routingEffect(stageId, job, stages, fab);
  return { typeOptions: withExceptionTypes(signoffTypeOptions(stageId, job, inputs), effect), attributeRules: stageRules(effect) };
}

/* the Types left to pick once "ID is accessible" is answered on the signoff */
export function typesForAccessibleAnswer(stage: Pick<WorkflowStage, 'typeOptions' | 'inputs' | 'attributeRules'>): StageOption[] {
  const answer = stage.inputs['idAccessible'];
  const rules = stage.attributeRules?.accessible ?? [];
  return (stage.typeOptions ?? []).filter(o => !answer || !rules.some(r => r.type === o.value && r.answer !== answer));
}
