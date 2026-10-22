/* Condition model for field visibility, disabled state, and required state.
   Used by the field catalog, per-step activations, and the stage renderer. */

/* A single condition clause. For "one of" several values within one clause, use anyOf. */
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

/* A group of clauses and nested groups: every one must pass (all, AND) or at least one (any, OR),
   e.g. Type is VT and (Weld Color is Straw or Weld Color is Light Blue). An empty group = always. */
export type FieldCondition = { all: ConditionTerm[] } | { any: ConditionTerm[] };
export type ConditionTerm = ConditionClause | FieldCondition;

export const isConditionGroup = (t: ConditionTerm): t is FieldCondition => !('source' in t);

export const conditionOp = (c: FieldCondition): 'all' | 'any' => 'any' in c ? 'any' : 'all';

export const conditionTerms = (c: FieldCondition): ConditionTerm[] => 'any' in c ? c.any : c.all;

export const conditionGroup = (op: 'all' | 'any', terms: ConditionTerm[]): FieldCondition =>
  op === 'any' ? { any: terms } : { all: terms };

/* whether a condition has any clause (an empty one means always) */
export function hasClauses(c: FieldCondition | undefined): c is FieldCondition {
  return !!c && conditionTerms(c).some(t => !isConditionGroup(t) || hasClauses(t));
}

/* every clause in the condition, nested groups included */
export function conditionClauses(c: FieldCondition): ConditionClause[] {
  return conditionTerms(c).flatMap(t => isConditionGroup(t) ? conditionClauses(t) : [t]);
}

/* both conditions must hold */
export function andConditions(a: FieldCondition, b: FieldCondition): FieldCondition {
  const terms = (c: FieldCondition) => conditionOp(c) === 'all' ? conditionTerms(c) : [c];
  return { all: [...terms(a), ...terms(b)] };
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

/* an empty group passes (always), whether it is all or any */
export function evaluateCondition(condition: FieldCondition, ctx: ConditionContext): boolean {
  const passes = (t: ConditionTerm) => isConditionGroup(t) ? evaluateCondition(t, ctx) : clausePasses(t, ctx);
  const terms = conditionTerms(condition);
  if (!terms.length) return true;
  return conditionOp(condition) === 'all' ? terms.every(passes) : terms.some(passes);
}
