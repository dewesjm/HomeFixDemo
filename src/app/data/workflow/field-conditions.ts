/* Condition model for field visibility, disabled state, and required state.
   Used by the field catalog, per-step activations, and the stage renderer. */

/* A single condition clause; all clauses in a FieldCondition must pass (AND logic).
   For OR within one clause, use anyOf. */
export type ConditionClause =
  /* A field in this step's inputs, e.g. hasProbationary === 'yes' */
  | { source: 'field'; key: string; equals?: string; anyOf?: string[] }
  /* A property on the Job (joint details), e.g. nInd === '1' or materialType1 === 'Titanium' */
  | { source: 'jointDetail'; key: string; equals?: string; anyOf?: string[] }
  /* The stage's id matches a regex, e.g. matches: '^root-weld$' for root weld only */
  | { source: 'stepId'; matches: string }
  /* A stage-level boolean flag, serialized as 'yes'/''; e.g. engineeringEntry */
  | { source: 'stageProperty'; key: string; equals?: string; anyOf?: string[] }
  /* A field in a prior step's inputs, e.g. consumableInsertOnly on root-weld */
  | { source: 'priorStep'; stepId: string; fieldKey: string; equals?: string; anyOf?: string[] };

/* AND of all clauses; empty all = always passes */
export interface FieldCondition {
  all: ConditionClause[];
}

export interface ConditionContext {
  stageId: string;
  inputs: Record<string, string>;
  /* returns the value of a Job property as a string; boolean flags return 'yes' or '' */
  jointDetail: (key: string) => string;
  /* returns 'yes' or '' for boolean stage flags (engineeringEntry, etc.) */
  stageProperty: (key: string) => string;
  /* returns a prior step's recorded input value, or '' if the step or field is absent */
  priorInput: (stepId: string, fieldKey: string) => string;
}

function clausePasses(clause: ConditionClause, ctx: ConditionContext): boolean {
  if (clause.source === 'stepId') return new RegExp(clause.matches).test(ctx.stageId);

  let val: string;
  if (clause.source === 'field') val = ctx.inputs[clause.key] ?? '';
  else if (clause.source === 'jointDetail') val = ctx.jointDetail(clause.key);
  else if (clause.source === 'stageProperty') val = ctx.stageProperty(clause.key);
  else val = ctx.priorInput(clause.stepId, clause.fieldKey);

  if (clause.equals !== undefined) return val === clause.equals;
  if (clause.anyOf !== undefined) return clause.anyOf.includes(val);
  return !!val;
}

export function evaluateCondition(condition: FieldCondition, ctx: ConditionContext): boolean {
  return condition.all.every(c => clausePasses(c, ctx));
}
