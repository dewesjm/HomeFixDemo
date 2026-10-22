/* A field's effective rules on a step (its own setting, else the catalog default) and their
   plain-language text for Admin > Signoff Type Definition */
import { FieldCondition, ConditionClause } from './field-conditions';
import { FieldActivation } from './step-field-config';
import { lookupCatalogField, lookupCatalogSignoffField } from './field-catalog';
import { VIRTUAL_JOINT_DETAILS } from './joint-facts';

export type FieldSection = 'f' | 'sf';

/* Sign-off fields whose visibility is decided in code (fit-signoff.ts), not by a condition */
const BUILT_IN_SHOW_TEXT: Record<string, string> = {
  consumableInsertType: 'Shown when the joint design needs a consumable insert',
  consumableInsertSize: 'Shown when the joint design needs a consumable insert',
  consumableInsertId: 'Shown when the joint design needs a consumable insert',
  backingRingType: 'Shown when the joint design needs a backing ring',
  backingRingId: 'Shown when the joint design needs a backing ring',
};

/* condition keys that aren't catalog fields */
const EXTRA_LABELS: Record<string, string> = {
  inspectionType: 'Type', result: 'Result', nInd: 'N Ind.',
};

function catalogEntry(key: string, section: FieldSection) {
  return section === 'f' ? lookupCatalogField(key) : lookupCatalogSignoffField(key);
}

export function defaultShowIf(key: string, section: FieldSection): FieldCondition | undefined {
  return catalogEntry(key, section)?.defaultShowIf;
}

/* An empty showIf ({ all: [] }) is an explicit "always", overriding a catalog default */
export function effectiveShowIf(act: FieldActivation, section: FieldSection): FieldCondition | undefined {
  const cond = act.showIf ?? defaultShowIf(act.key, section);
  return cond?.all.length ? cond : undefined;
}

export function effectiveDisabledIf(act: FieldActivation): FieldCondition | undefined {
  return act.disabledIf ?? lookupCatalogField(act.key)?.defaultDisabledIf;
}

export function effectiveRequired(act: FieldActivation, section: FieldSection): boolean {
  return act.required ?? catalogEntry(act.key, section)?.defaultRequired ?? false;
}

/* The showIf to store for edited clauses: none when they match the default, an explicit empty
   condition when cleared over a default, otherwise the clauses */
export function showIfToStore(key: string, section: FieldSection, clauses: ConditionClause[]): FieldCondition | undefined {
  const def = defaultShowIf(key, section);
  if (def && JSON.stringify(def.all) === JSON.stringify(clauses)) return undefined;
  if (!clauses.length) return def ? { all: [] } : undefined;
  return { all: clauses };
}

function labelOf(key: string): string {
  return lookupCatalogField(key)?.label ?? lookupCatalogSignoffField(key)?.label ?? EXTRA_LABELS[key] ?? key;
}

function clauseText(c: ConditionClause): string {
  if (c.source === 'stepId') return `step ID matches ${c.matches}`;
  const key = c.source === 'priorStep' ? c.fieldKey : c.key;
  const subject = c.source === 'jointDetail' ? `joint ${labelOf(key)}` : labelOf(key);
  const isCheckbox = (lookupCatalogField(key) ?? lookupCatalogSignoffField(key))?.type === 'checkbox';
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
export function showRuleText(act: FieldActivation, section: FieldSection): string {
  if (section === 'sf' && BUILT_IN_SHOW_TEXT[act.key]) return BUILT_IN_SHOW_TEXT[act.key];
  const cond = effectiveShowIf(act, section);
  return cond ? `Shown when ${conditionText(cond)}` : 'Always shown';
}

export function hasBuiltInShowRule(key: string, section: FieldSection): boolean {
  return section === 'sf' && !!BUILT_IN_SHOW_TEXT[key];
}

/* e.g. "Greyed out when PH Min is NC"; '' when the field is never greyed out */
export function disabledRuleText(act: FieldActivation, section: FieldSection): string {
  if (section !== 'f') return '';
  if (lookupCatalogField(act.key)?.disabled) return 'Always read-only';
  const cond = effectiveDisabledIf(act);
  return cond?.all.length ? `Greyed out when ${conditionText(cond)}` : '';
}
