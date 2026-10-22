/* A field's effective rules on a step (its own setting, else the catalog default) and their
   plain-language text for Admin > Signoff Type Definition */
import { FieldCondition, ConditionClause } from './field-conditions';
import { FieldActivation } from './step-field-config';
import { lookupCatalogField } from './field-catalog';
import { VIRTUAL_JOINT_DETAILS } from './joint-facts';

/* Fields whose visibility is decided in code, not by a condition: Repair's "exceeded" checkbox
   (stage-form.ts), the insert/ring fields (fit-signoff.ts), and the two checkboxes routing reads */
const BUILT_IN_SHOW_TEXT: Record<string, string> = {
  allowableThicknessExceeded: 'Shown when the rejected phase has an RT/UT step',
  consumableInsertType: 'Shown when the joint design needs a consumable insert',
  consumableInsertSize: 'Shown when the joint design needs a consumable insert',
  consumableInsertId: 'Shown when the joint design needs a consumable insert',
  backingRingType: 'Shown when the joint design needs a backing ring',
  backingRingId: 'Shown when the joint design needs a backing ring',
  deferTack: 'Always shown',
  releaseToWelding: 'Always shown',
};

/* checkboxes routing reads when the step is signed: never greyed out or required */
const FIXED_RULE_KEYS = new Set(['deferTack', 'releaseToWelding']);

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
  return cond?.all.length ? cond : undefined;
}

export function defaultDisabledIf(key: string): FieldCondition | undefined {
  return lookupCatalogField(key)?.defaultDisabledIf;
}

/* An empty disabledIf ({ all: [] }) is an explicit "never greyed out", overriding a catalog default */
export function effectiveDisabledIf(act: FieldActivation): FieldCondition | undefined {
  const cond = act.disabledIf ?? defaultDisabledIf(act.key);
  return cond?.all.length ? cond : undefined;
}

export function effectiveRequired(act: FieldActivation): boolean {
  return act.required ?? lookupCatalogField(act.key)?.defaultRequired ?? false;
}

/* The condition to store for edited clauses: none when they match the default, an explicit empty
   condition when cleared over a default, otherwise the clauses */
function conditionToStore(def: FieldCondition | undefined, clauses: ConditionClause[]): FieldCondition | undefined {
  if (def && JSON.stringify(def.all) === JSON.stringify(clauses)) return undefined;
  if (!clauses.length) return def ? { all: [] } : undefined;
  return { all: clauses };
}

export function showIfToStore(key: string, clauses: ConditionClause[]): FieldCondition | undefined {
  return conditionToStore(defaultShowIf(key), clauses);
}

export function disabledIfToStore(key: string, clauses: ConditionClause[]): FieldCondition | undefined {
  return conditionToStore(defaultDisabledIf(key), clauses);
}

/* the required flag to store: none when it matches the catalog default */
export function requiredToStore(key: string, required: boolean): boolean | undefined {
  return required === (lookupCatalogField(key)?.defaultRequired ?? false) ? undefined : required;
}

/* fields whose greyed-out rule can't be edited: always read-only ones */
export function isAlwaysReadOnly(key: string): boolean {
  return !!lookupCatalogField(key)?.disabled;
}

/* fields whose greyed-out and required settings can't be edited (FIXED_RULE_KEYS) */
export function hasFixedRules(key: string): boolean {
  return FIXED_RULE_KEYS.has(key);
}

function labelOf(key: string): string {
  return lookupCatalogField(key)?.label ?? EXTRA_LABELS[key] ?? key;
}

function clauseText(c: ConditionClause): string {
  if (c.source === 'stepId') return `step ID matches ${c.matches}`;
  const key = c.source === 'priorStep' ? c.fieldKey : c.key;
  const subject = c.source === 'jointDetail' ? `joint ${labelOf(key)}` : labelOf(key);
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

export function conditionText(cond: FieldCondition): string {
  return cond.all.map(clauseText).join(' and ');
}

/* e.g. "Shown when Has Probationary Inspector is checked" or "Always shown" */
export function showRuleText(act: FieldActivation): string {
  const builtIn = BUILT_IN_SHOW_TEXT[act.key];
  if (builtIn) return builtIn;
  const cond = effectiveShowIf(act);
  return cond ? `Shown when ${conditionText(cond)}` : 'Always shown';
}

export function hasBuiltInShowRule(key: string): boolean {
  return !!BUILT_IN_SHOW_TEXT[key];
}

/* e.g. "Greyed out when PH Min is NC"; '' when the field is never greyed out */
export function disabledRuleText(act: FieldActivation): string {
  if (lookupCatalogField(act.key)?.disabled) return 'Always read-only';
  const cond = effectiveDisabledIf(act);
  return cond?.all.length ? `Greyed out when ${conditionText(cond)}` : '';
}
