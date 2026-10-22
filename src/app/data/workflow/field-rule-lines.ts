/* A field's rules on a step as Condition | Behaviors lines, for the expanded step rows on
   Admin > Signoff Type Definition. Rules with the same condition share a line; a field with no
   conditions reads "Always | Show". Never-required, never-disabled and not-prepopulated add no line. */
import { FieldActivation } from './step-field-config';
import { lookupCatalogField } from './field-catalog';
import { FieldCondition } from './field-conditions';
import {
  builtInShowCondition, conditionText, effectiveShowIf, effectiveFill, effectiveDisabledIf, effectiveRequired,
  effectiveRequiredIf, hasFixedRules, isAlwaysReadOnly, fillSourceText,
} from './field-rules';

export interface FieldRuleLine {
  condition: string;
  behaviors: string[];
}

/* the behavior for fields whose required rule is fixed in code (sign-validation.ts) */
const FIXED_REQUIRED_BEHAVIOR: Record<string, string> = {
  affectedItem: 'Required (at least one must be picked)',
};

const ALWAYS = 'Always';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const whenText = (cond: FieldCondition | undefined) => cond?.all.length ? capitalize(conditionText(cond)) : ALWAYS;

export function fieldRuleLines(act: FieldActivation, stepLabel: (stepId: string) => string): FieldRuleLine[] {
  const rules: [string, string][] = [];

  const builtIn = builtInShowCondition(act.key);
  rules.push([builtIn !== undefined ? (builtIn ? capitalize(builtIn) : ALWAYS) : whenText(effectiveShowIf(act)), 'Show']);

  if (hasFixedRules(act.key)) {
    const required = FIXED_REQUIRED_BEHAVIOR[act.key];
    if (required) rules.push([ALWAYS, required]);
  } else {
    const fill = isAlwaysReadOnly(act.key) ? undefined : effectiveFill(act);
    if (fill) rules.push([whenText(fill.when), `Prepopulated from ${fillSourceText(fill, stepLabel)}`]);
    if (lookupCatalogField(act.key)?.disabled) rules.push([ALWAYS, 'Disabled']);
    else {
      const disabled = effectiveDisabledIf(act);
      if (disabled) rules.push([whenText(disabled), 'Disabled']);
    }
    if (effectiveRequired(act)) rules.push([whenText(effectiveRequiredIf(act)), 'Required']);
  }

  const lines: FieldRuleLine[] = [];
  for (const [condition, behavior] of rules) {
    const line = lines.find(l => l.condition === condition);
    if (line) line.behaviors.push(behavior);
    else lines.push({ condition, behaviors: [behavior] });
  }
  return lines;
}
