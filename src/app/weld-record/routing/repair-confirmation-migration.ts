/* Saved single-limit conditions map to the applicable indicator-specific confirmation. */
import type { ConditionRule, RejectRule } from './step-conditions';

export function migrateRepairConfirmationRules(rules: RejectRule[] | undefined): RejectRule[] | undefined {
  return rules?.flatMap(rule => {
    if (!rule.when.some(c => c.field === 'self.allowableThicknessExceeded')) return [rule];
    return [
      { suffix: 'N1', indicators: ['1'] },
      { suffix: 'N23', indicators: ['2', '3'] },
    ].map(({ suffix, indicators }) => ({ ...rule, when: [
      ...rule.when.map(c => c.field === 'self.allowableThicknessExceeded' ? { ...c, field: `${c.field}${suffix}` } : c),
      { field: 'nInd', op: 'is', values: indicators },
    ] as ConditionRule }));
  });
}
