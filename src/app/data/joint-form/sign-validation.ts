/* What stops a step from being signed: the reasons list (sign blockers) and the per-field errors
   highlighted after a sign attempt or on blur. Errors are keyed `${stageId}:${fieldKey}`; Decision,
   Type and Routing Type use synthetic keys (__decision, __inspectionType, __routingType). */
import { Job } from '../jobs';
import { StageField, WorkflowStage, ACTUAL_MIN_MAX, actualOrderError, hasDecision, inspectionTypeRequired, rtDegrees } from '../workflow';
import { requiresTraceability } from '../mcl-traceability';
import { missingFitFabrication } from './fabrication-form';
import { requiredSignoffFields } from './fit-signoff';
import { rtDegreeRequired, typedRequirementError } from './stage-form';

export interface SignContext {
  job: Job | undefined;
  fab: Record<string, string>;
  fabErrors: Record<string, string>;
  visibleFields: StageField[];
}

/* RT NDT: Degree of RT Performed must be at least the job's required degree (rtRoot/rtFinal), compared
   as plain numbers of degrees; NA or blank counts as none. '' when it is enough. */
function rtDegreeError(job: Job | undefined, stage: WorkflowStage): string {
  if (stage.inspectionType !== 'rt') return '';
  const required = rtDegreeRequired(job, stage);
  return required && rtDegrees(stage.inputs['degreeRt']) < rtDegrees(required)
    ? `Degree of RT Performed must be at least ${required}` : '';
}

function missingSignoffFields(stage: WorkflowStage, ctx: SignContext) {
  return requiredSignoffFields(stage, ctx.job, ctx.fab).filter(f => (stage.signoffInputs[f.key] ?? '').trim().length === 0);
}

/* Everything on the step itself preventing it from being signed, in reader-friendly wording (holds
   and locked earlier steps are the caller's to check first) */
export function signProblems(stage: WorkflowStage, ctx: SignContext): string[] {
  const reasons: string[] = [];
  if (hasDecision(stage) && !stage.result) reasons.push('Choose SAT or UNSAT');
  if (inspectionTypeRequired(stage) && !stage.inspectionType) reasons.push('Select the inspection performed');
  if (stage.repeatable && !stage.routingType) reasons.push('Choose the routing type');
  if (stage.id === 'fit') {
    const missing = missingFitFabrication(ctx.job, ctx.fab);
    if (missing.length) reasons.push(`Fabrication: ${missing.join(', ')}`);
  }
  if (stage.id === 'fitup-insp') {
    if (!stage.fields.every(f => f.type === 'checkbox' && stage.inputs[f.key] === 'yes')) reasons.push('Verify every fitting value');
    if (Object.keys(ctx.fabErrors).length > 0) reasons.push('Fix the fabrication errors');
  }
  const rt = rtDegreeError(ctx.job, stage);
  if (rt) reasons.push(rt);
  const missingSignoff = missingSignoffFields(stage, ctx).map(f => f.label);
  if (missingSignoff.length) reasons.push(`Fill in ${missingSignoff.join(', ')}`);
  return reasons;
}

/* every field error on the step, for highlighting after a sign attempt; empty = can be signed */
export function stageFieldErrors(stage: WorkflowStage, ctx: SignContext): Record<string, string> {
  const errors: Record<string, string> = {};
  const key = (k: string) => `${stage.id}:${k}`;
  const visibleKeys = new Set(ctx.visibleFields.map(f => f.key));
  for (const f of stage.fields ?? []) {
    if (f.key === 'comments' || !visibleKeys.has(f.key)) continue;
    const val = stage.inputs?.[f.key];
    if (f.required && (val === undefined || val === null || val === '')) errors[key(f.key)] = `${f.label} is required`;
    const typed = typedRequirementError(stage, f);
    if (typed) errors[key(f.key)] = typed;
    /* Actual PH/IP out of range isn't an error: it's a deviation (fieldWarning, detectDeviations) */
  }
  for (const pair of ACTUAL_MIN_MAX) {
    const err = visibleKeys.has(pair.max) ? actualOrderError(stage.inputs ?? {}, pair) : '';
    if (err && !errors[key(pair.max)]) errors[key(pair.max)] = err;
  }
  /* Fit-Up Insp: each unchecked verification row gets its own error (the blockers give one summary reason) */
  if (stage.id === 'fitup-insp') {
    for (const f of ctx.visibleFields) {
      if (stage.inputs?.[f.key] !== 'yes') errors[key(f.key)] = `${f.label} must be verified`;
    }
  }
  /* Weld Build-Up: at least one Affected Item, and its MIC verified when its MCL requires traceability
     (the same condition signoff-panel.component.ts uses to render the checkbox) */
  if (stage.id === 'fit' && stage.routingType === 'weld-buildup') {
    const raw = stage.inputs?.['affectedItems'] ?? '';
    const items = raw ? raw.split(',') : [];
    const job = ctx.job;
    if (!items.length) errors[key('affectedItem')] = 'Select at least one Affected Item';
    if (items.includes('joiningItem') && requiresTraceability(job?.mcl1 ?? '') && stage.inputs?.['micVerified1'] !== 'yes') {
      errors[key('affectedItem')] = 'Please verify MIC for ' + (job?.joiningItem || 'item');
    }
    if (items.includes('joinToItem') && requiresTraceability(job?.mcl2 ?? '') && stage.inputs?.['micVerified2'] !== 'yes') {
      errors[key('affectedItem')] = 'Please verify MIC for ' + (job?.joinToItem || 'item');
    }
  }
  if (stage.rejectToStage && !stage.result) errors[key('__decision')] = 'Choose SAT or UNSAT';
  if (inspectionTypeRequired(stage) && !stage.inspectionType) errors[key('__inspectionType')] = 'Select the inspection performed';
  if (stage.repeatable && !stage.routingType) errors[key('__routingType')] = 'Choose the routing type';
  /* Fit's fabrication values are highlighted on the Fabrication panel itself (always live); this only blocks signing */
  if (stage.id === 'fit' && Object.keys(ctx.fabErrors).length > 0) errors[key('__fabrication')] = 'Fix the fabrication errors';
  for (const f of missingSignoffFields(stage, ctx)) errors[key(f.key)] = `${f.label} is required`;
  const rt = rtDegreeError(ctx.job, stage);
  if (rt) errors[key('degreeRt')] = rt;
  return errors;
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
export function errorsAfterBlur(errors: Record<string, string>, stage: WorkflowStage | undefined, stageId: string, field: StageField): Record<string, string> {
  const key = `${stageId}:${field.key}`;
  const val = stage?.inputs?.[field.key];
  const next = { ...errors };
  delete next[key];
  if (field.required && (val === undefined || val === null || val === '')) next[key] = `${field.label} is required`;
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
