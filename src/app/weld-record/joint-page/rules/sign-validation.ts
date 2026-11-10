/* What stops a step from being signed. Every problem shows somewhere: a red message on a field of the
   sign-off form (after a sign attempt or on blur), or, with no field, a line beside Signoff. Field
   errors are keyed `${stageId}:${fieldKey}`; Decision and Type use synthetic keys (__decision,
   __inspectionType). */
import { FormField } from '../../catalogs/field-catalog';
import { attributeAccessError } from '../../attribute-codes/attribute-validation';
import { Job } from '../../../data/jobs';
import { WorkflowStage } from '../../model/workflow-types';
import { checksFabrication } from '../../routing/built-in-routing-rules';
import { rtDegreeRequired } from '../../signoff-definition/rt-degree-minimum';
import { ACTUAL_MIN_MAX, actualOrderError } from '../../signoff-definition/weld-fields';
import { unsatWithoutRejectTarget, inspectionTypeRequired } from '../../signoff-definition/stage-rules';
import { rtDegrees } from '../../signoff-definition/rt-degree-minimum';
import { DECISION_KEY } from '../../../data/signoff-type-forms';
import { isVerifyRow } from '../../catalogs/field-catalog';
import { standardRequiredMessage } from '../../signoff-definition/field-rules';
import { DrawnFieldRule, drawnFieldRule, visibleSignoffFields } from '../../signoff-definition/shown-fields';
import { buildConditionContext } from '../../signoff-definition/condition-context';
import { typedRequirementError } from './stage-form';

export interface SignContext {
  job: Job | undefined;
  fab: Record<string, string>;
  fabErrors: Record<string, string>;
  visibleFields: FormField[];
  /* the joint's steps, for conditions that read another step */
  stages?: WorkflowStage[];
  /* how many References the joint has */
  referenceCount?: number;
}

/* a field drawn by its own component, as its form's rules have it right now */
const drawnRule = (stage: WorkflowStage, ctx: SignContext, key: string): DrawnFieldRule =>
  drawnFieldRule(stage, buildConditionContext(stage, ctx.job, ctx.stages ?? [], ctx.fab), key);

const UNSAT_NO_TARGET = 'UNSAT needs a Reject routes to target in Admin > Routing Settings';

/* RT NDT: Degree of RT Performed must be at least the required degree (rt-degree-minimum.ts), compared
   as plain numbers of degrees; NA or blank counts as none. '' when it is enough. */
function rtDegreeError(job: Job | undefined, stage: WorkflowStage): string {
  if (stage.inspectionType !== 'rt') return '';
  const required = rtDegreeRequired(job, stage);
  return required && rtDegrees(stage.inputs['degreeRt']) < rtDegrees(required)
    ? `Degree of RT Performed must be at least ${required}` : '';
}

/* the error for a required field left empty (a verify-grid row left unchecked): its definition's
   message, or the standard wording */
export function requiredError(f: FormField): string {
  return f.requiredMessage || standardRequiredMessage(f.key, f.label);
}

/* a verify grid's shown rows that are required and not checked */
function unverifiedRows(stage: WorkflowStage, ctx: SignContext): FormField[] {
  return ctx.visibleFields.filter(f => isVerifyRow(f.key) && f.required && stage.inputs?.[f.key] !== 'yes');
}

/* required fields stored with the sign-off (visibleSignoffFields) that are left empty */
function missingSignoffFields(stage: WorkflowStage, ctx: SignContext) {
  return visibleSignoffFields(stage, ctx.job, ctx.fab).filter(f => f.required
    && (f.type === 'checkbox' ? stage.signoffInputs[f.key] !== 'yes' : (stage.signoffInputs[f.key] ?? '').trim().length === 0));
}

/* the line beside Signoff while the Fabrication panel has errors on a step that checks it */
export const FABRICATION_PROBLEM = 'Fix the Fabrication fields marked in red';

/* One thing stopping a signoff: a red message on a drawn field of the sign-off form (`field`, the key
   after `${stageId}:`), or with no `field`, a line beside Signoff */
export interface SignProblem { field?: string; message: string }

/* Every check on the step itself, run once; stageFieldErrors() and generalSignProblems() each read
   their part. Holds and locked earlier steps are the caller's to check first. On a field, a later
   problem replaces an earlier one. */
export function signProblems(stage: WorkflowStage, ctx: SignContext): SignProblem[] {
  const out: SignProblem[] = [];
  const onField = (field: string, message: string) => out.push({ field, message });

  const accessError = attributeAccessError(stage);
  if (accessError) onField('idAccessible', accessError);
  const decision = drawnRule(stage, ctx, DECISION_KEY);
  if (decision.required && !stage.result) onField('__decision', decision.requiredMessage || 'Choose SAT or UNSAT');
  if (decision.shown && unsatWithoutRejectTarget(stage)) onField('__decision', UNSAT_NO_TARGET);
  if (inspectionTypeRequired(stage) && !stage.inspectionType) onField('__inspectionType', 'Select the inspection performed');

  /* Fabrication: its fields are red on the Fabrication panel all the time; a step that checks it
     stops on any of them, with a line beside Signoff */
  if (checksFabrication(stage.id) && Object.keys(ctx.fabErrors).length) out.push({ message: FABRICATION_PROBLEM });
  const unverified = unverifiedRows(stage, ctx);

  /* the shown fields, required as their rules say now (a definition's field need not be in the template).
     Actual PH/IP out of range isn't an error: it's a deviation (fieldWarning, detectDeviations) */
  for (const f of ctx.visibleFields) {
    const val = stage.inputs?.[f.key];
    if (f.required && (f.type === 'checkbox' ? val !== 'yes' : val === undefined || val === null || val === '')) onField(f.key, requiredError(f));
    const typed = typedRequirementError(stage, f);
    if (typed) onField(f.key, typed);
  }
  const visibleKeys = new Set(ctx.visibleFields.map(f => f.key));
  for (const pair of ACTUAL_MIN_MAX) {
    const err = visibleKeys.has(pair.max) ? actualOrderError(stage.inputs ?? {}, pair) : '';
    if (err && !out.some(p => p.field === pair.max)) onField(pair.max, err);
  }
  for (const f of unverified) onField(f.key, requiredError(f));

  /* Weld Build-Up's Affected Item, while it's shown: at least one while required, and each picked
     member's MIC verified row checked while its rule makes it required */
  const affected = drawnRule(stage, ctx, 'affectedItem');
  if (affected.shown) {
    const raw = stage.inputs?.['affectedItems'] ?? '';
    const items = raw ? raw.split(',') : [];
    const job = ctx.job;
    const condCtx = buildConditionContext(stage, job, ctx.stages ?? [], ctx.fab);
    if (affected.required && !items.length) onField('affectedItem', affected.requiredMessage || 'Select at least one Affected Item');
    const mic1 = drawnFieldRule(stage, condCtx, 'affectedMicVerified1');
    if (items.includes('joiningItem') && mic1.required && stage.inputs?.['micVerified1'] !== 'yes') {
      onField('affectedItem', mic1.requiredMessage || 'Please verify MIC for ' + (job?.joiningItem || 'item'));
    }
    const mic2 = drawnFieldRule(stage, condCtx, 'affectedMicVerified2');
    if (items.includes('joinToItem') && mic2.required && stage.inputs?.['micVerified2'] !== 'yes') {
      onField('affectedItem', mic2.requiredMessage || 'Please verify MIC for ' + (job?.joinToItem || 'item'));
    }
  }
  const references = drawnRule(stage, ctx, 'references');
  if (references.required && !ctx.referenceCount) onField('references', references.requiredMessage || standardRequiredMessage('references', 'References'));

  const rt = rtDegreeError(ctx.job, stage);
  if (rt) onField('degreeRt', rt);
  for (const f of missingSignoffFields(stage, ctx)) onField(f.key, requiredError(f));
  return out;
}

/* every field error on the step, for highlighting after a sign attempt; empty = no field errors */
export function stageFieldErrors(stage: WorkflowStage, ctx: SignContext): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const p of signProblems(stage, ctx)) if (p.field) errors[`${stage.id}:${p.field}`] = p.message;
  return errors;
}

/* the problems with no field on the sign-off form, for the lines beside Signoff */
export function generalSignProblems(stage: WorkflowStage, ctx: SignContext): string[] {
  return signProblems(stage, ctx).filter(p => !p.field).map(p => p.message);
}

/* `errors` after a select field changes: its error is cleared, except a Degree of RT Performed that
   is less than the job's required degree, which is flagged right away. `stage` is the live stage. */
export function errorsAfterSelect(errors: Record<string, string>, stage: WorkflowStage | undefined, job: Job | undefined, stageId: string, fieldKey: string): Record<string, string> {
  const key = `${stageId}:${fieldKey}`;
  const next = { ...errors };
  delete next[key];
  const rt = fieldKey === 'degreeRt' && stage?.inputs['degreeRt'] ? rtDegreeError(job, stage) : '';
  if (rt) next[key] = rt;
  return next;
}

/* `errors` after one field loses focus: its required / typed-requirement check is redone, and an
   Actual Min above Max is flagged on the Max field (rechecked when either one changes). `stage` is
   the live stage, not a possibly stale copy from the click handler. */
export function errorsAfterBlur(errors: Record<string, string>, stage: WorkflowStage | undefined, stageId: string, field: FormField): Record<string, string> {
  const key = `${stageId}:${field.key}`;
  const val = stage?.inputs?.[field.key];
  const next = { ...errors };
  delete next[key];
  if (field.required && (val === undefined || val === null || val === '')) next[key] = requiredError(field);
  if (stage && typedRequirementError(stage, field)) next[key] = typedRequirementError(stage, field);
  const pair = ACTUAL_MIN_MAX.find(p => p.min === field.key || p.max === field.key);
  if (pair) {
    const maxKey = `${stageId}:${pair.max}`;
    const err = actualOrderError(stage?.inputs ?? {}, pair);
    if (err && !next[maxKey]) next[maxKey] = err;
    if (!err && next[maxKey] === `${pair.maxLabel} is below ${pair.minLabel}`) delete next[maxKey];
  }
  return next;
}
