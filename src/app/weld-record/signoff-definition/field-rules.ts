/* A field's effective rules on a step (its own setting, else the catalog default) and their
   plain-language text for Admin > Signoff Type Definition */
import { FieldCondition, ConditionClause, ConditionContext, conditionOp, conditionTerms, evaluateCondition, hasClauses, isConditionGroup } from './field-conditions';
import { jointDetailField } from '../routing/step-conditions';
import { FieldActivation } from './step-field-config';
import { FieldFill, lookupCatalogField } from './field-catalog';
import { ENGINEERING_OVERRIDE_KEY, REJECTED_PHASE_UTRT_KEY } from './condition-context';
import { VIRTUAL_JOINT_DETAILS } from './joint-facts';

/* Fields whose visibility is decided in code, not by a condition: the two checkboxes routing reads,
   Weld Build-Up's Affected Item, References and the signoff section's Type, Inspection Results and
   Comments ('' = always shown) */
const BUILT_IN_SHOW_CONDITION: Record<string, string> = {
  deferTack: '',
  releaseToWelding: '',
  affectedItem: '',
  references: '',
  type: '',
  decision: '',
  comments: '',
};

/* never disabled, and required as fixed in code: the checkboxes routing reads when the step is
   signed (never required), Affected Item (at least one must be picked, sign-validation.ts),
   References, Type (required when it has no default), Inspection Results (always required) and
   Comments (never required) */
const FIXED_RULE_KEYS = new Set(['deferTack', 'releaseToWelding', 'affectedItem', 'references', 'type', 'decision', 'comments']);

/* condition keys that aren't catalog fields */
const EXTRA_LABELS: Record<string, string> = {
  inspectionType: 'Type', result: 'Result', nInd: 'N Ind.',
};

export function defaultShowIf(key: string): FieldCondition | undefined {
  return lookupCatalogField(key)?.defaultShowIf;
}

/* An empty showIf ({ all: [] }) is an explicit "always", overriding a catalog default */
export function effectiveShowIf(act: FieldActivation): FieldCondition | undefined {
  const cond = act.showIf ?? defaultShowIf(act.key);
  return hasClauses(cond) ? cond : undefined;
}

export function defaultDisabledIf(key: string): FieldCondition | undefined {
  return lookupCatalogField(key)?.defaultDisabledIf;
}

/* An empty disabledIf ({ all: [] }) is an explicit "never disabled", overriding a catalog default */
export function effectiveDisabledIf(act: FieldActivation): FieldCondition | undefined {
  const cond = act.disabledIf ?? defaultDisabledIf(act.key);
  return hasClauses(cond) ? cond : undefined;
}

export function defaultFill(key: string): FieldFill | undefined {
  return lookupCatalogField(key)?.defaultFill;
}

/* A null fill is an explicit "not prepopulated", overriding a catalog default */
export function effectiveFill(act: FieldActivation): FieldFill | undefined {
  return act.fill === null ? undefined : act.fill ?? defaultFill(act.key);
}

export function effectiveRequired(act: FieldActivation): boolean {
  return act.required ?? lookupCatalogField(act.key)?.defaultRequired ?? false;
}

export function defaultRequiredIf(key: string): FieldCondition | undefined {
  return lookupCatalogField(key)?.defaultRequiredIf;
}

/* An empty requiredIf ({ all: [] }) is an explicit "always required", overriding a catalog default */
export function effectiveRequiredIf(act: FieldActivation): FieldCondition | undefined {
  const cond = act.requiredIf ?? defaultRequiredIf(act.key);
  return hasClauses(cond) ? cond : undefined;
}

/* required on this step right now: Required is on and its "only when" condition holds */
export function isRequiredNow(act: FieldActivation, ctx: ConditionContext): boolean {
  const cond = effectiveRequiredIf(act);
  return effectiveRequired(act) && (!cond || evaluateCondition(cond, ctx));
}

/* The condition to store for an edited one: none when it matches the default, an explicit empty
   condition when cleared over a default, otherwise the condition */
function conditionToStore(def: FieldCondition | undefined, cond: FieldCondition): FieldCondition | undefined {
  if (def && JSON.stringify(def) === JSON.stringify(cond)) return undefined;
  if (!hasClauses(cond)) return def ? { all: [] } : undefined;
  return cond;
}

export function showIfToStore(key: string, cond: FieldCondition): FieldCondition | undefined {
  return conditionToStore(defaultShowIf(key), cond);
}

export function disabledIfToStore(key: string, cond: FieldCondition): FieldCondition | undefined {
  return conditionToStore(defaultDisabledIf(key), cond);
}

export function requiredIfToStore(key: string, cond: FieldCondition): FieldCondition | undefined {
  return conditionToStore(defaultRequiredIf(key), cond);
}

/* the fill to store: none when it matches the default, null when cleared over a default */
export function fillToStore(key: string, fill: FieldFill | undefined): FieldFill | null | undefined {
  const def = defaultFill(key);
  if (JSON.stringify(fill) === JSON.stringify(def)) return undefined;
  return fill ?? (def ? null : undefined);
}

/* the required flag to store: none when it matches the catalog default */
export function requiredToStore(key: string, required: boolean): boolean | undefined {
  return required === (lookupCatalogField(key)?.defaultRequired ?? false) ? undefined : required;
}

/* the Required droplist: Never, Always, or When a condition holds */
export type RequiredMode = 'never' | 'always' | 'when';

export function requiredMode(act: FieldActivation): RequiredMode {
  if (!effectiveRequired(act)) return 'never';
  return effectiveRequiredIf(act) ? 'when' : 'always';
}

/* the activation with Required set to a mode; When keeps the current condition, or the catalog
   default when there is none, and the condition editor sets the rest */
export function withRequiredMode(act: FieldActivation, mode: RequiredMode): FieldActivation {
  const { required: _r, requiredIf: _ri, ...rest } = act;
  const required = requiredToStore(act.key, mode !== 'never');
  const requiredIf = mode === 'always' ? requiredIfToStore(act.key, { all: [] })
    : mode === 'when' && effectiveRequiredIf(act) ? act.requiredIf : undefined;
  return {
    ...rest,
    ...(required === undefined ? {} : { required }),
    ...(requiredIf === undefined ? {} : { requiredIf }),
  };
}

/* fields whose Disabled when rule can't be edited: always read-only ones */
export function isAlwaysReadOnly(key: string): boolean {
  return !!lookupCatalogField(key)?.disabled;
}

/* fields whose Disabled when and required settings can't be edited (FIXED_RULE_KEYS) */
export function hasFixedRules(key: string): boolean {
  return FIXED_RULE_KEYS.has(key);
}

function labelOf(key: string): string {
  return lookupCatalogField(key)?.label ?? EXTRA_LABELS[key] ?? key;
}

function clauseText(c: ConditionClause): string {
  if (c.source === 'stepId') return `step ID matches ${c.matches}`;
  if (c.source === 'stageProperty' && c.key === ENGINEERING_OVERRIDE_KEY) return `Engineering override is ${c.equals ? 'on' : 'off'}`;
  if (c.source === 'stageProperty' && c.key === REJECTED_PHASE_UTRT_KEY) return c.equals ? 'the rejected phase has an RT/UT step' : 'the rejected phase has no RT/UT step';
  const key = c.source === 'priorStep' ? c.fieldKey : c.key;
  const subject = c.source === 'jointDetail' ? `joint ${jointDetailField(key)?.label ?? labelOf(key)}` : labelOf(key);
  const isCheckbox = lookupCatalogField(key)?.type === 'checkbox';
  const show = (v: string) => key === 'inspectionType' ? v.toUpperCase() : v;
  if (c.equals !== undefined) {
    const virtual = c.source === 'jointDetail' ? VIRTUAL_JOINT_DETAILS[key] : undefined;
    if (virtual) return c.equals === 'yes' ? virtual.yesText : virtual.noText;
    if (c.equals === 'yes' && isCheckbox) return `${subject} is checked`;
    return `${subject} is ${show(c.equals)}`;
  }
  if (c.anyOf !== undefined) return `${subject} is ${c.anyOf.map(show).join(' or ')}`;
  return `${subject} is filled in`;
}

/* e.g. "Type is VT and (Weld Color is Straw or Weld Color is Light Blue)"; a nested group of two or
   more gets parentheses */
export function conditionText(cond: FieldCondition, nested = false): string {
  const parts = conditionTerms(cond).map(t => isConditionGroup(t) ? conditionText(t, true) : clauseText(t)).filter(Boolean);
  const text = parts.join(conditionOp(cond) === 'all' ? ' and ' : ' or ');
  return nested && parts.length > 1 ? `(${text})` : text;
}

/* e.g. "Shown when Has Probationary Inspector is checked" or "Always shown" */
export function showRuleText(act: FieldActivation): string {
  const builtIn = builtInShowCondition(act.key);
  if (builtIn !== undefined) return builtIn ? `Shown when ${builtIn}` : 'Always shown';
  const cond = effectiveShowIf(act);
  return cond ? `Shown when ${conditionText(cond)}` : 'Always shown';
}

export function hasBuiltInShowRule(key: string): boolean {
  return builtInShowCondition(key) !== undefined;
}

/* the condition text of a visibility rule decided in code ('' = always shown), undefined for other fields */
export function builtInShowCondition(key: string): string | undefined {
  return BUILT_IN_SHOW_CONDITION[key];
}

/* e.g. "Fit's Consumable Insert Type", "the WTN's PH Min" */
export function fillSourceText(fill: FieldFill, stepLabel: (stepId: string) => string): string {
  const source = fill.from === 'wtn' ? 'the WTN' : fill.from === 'thisStep' ? 'this step' : stepLabel(fill.stepId);
  return `${source}'s ${labelOf(fill.fieldKey)}`;
}

/* e.g. "Prepopulated from Fit's Consumable Insert Type when Only Consumable Insert used as filler
   is checked", "Prepopulated from the WTN's PH Min when Engineering override is off"; "Not
   prepopulated" when it never is */
export function fillRuleText(act: FieldActivation, stepLabel: (stepId: string) => string): string {
  const fill = effectiveFill(act);
  if (!fill) return 'Not prepopulated';
  const from = fillSourceText(fill, stepLabel);
  return hasClauses(fill.when) ? `Prepopulated from ${from} when ${conditionText(fill.when)}` : `Always prepopulated from ${from}`;
}

/* e.g. "Required when either part requires material traceability", "Always required", "Never required" */
export function requiredRuleText(act: FieldActivation): string {
  if (!effectiveRequired(act)) return 'Never required';
  const cond = effectiveRequiredIf(act);
  return cond ? `Required when ${conditionText(cond)}` : 'Always required';
}

/* e.g. "Disabled when PH Min is NC", or "Never disabled" */
export function disabledRuleText(act: FieldActivation): string {
  if (lookupCatalogField(act.key)?.disabled) return 'Always disabled';
  const cond = effectiveDisabledIf(act);
  return cond ? `Disabled when ${conditionText(cond)}` : 'Never disabled';
}
