/* Translate saved boolean exception conditions into ordinary inspection facts, preserving AND/OR semantics. */
import type { ConditionClause, RejectRule } from './step-conditions';

function accepts(clause: ConditionClause, value: string): boolean {
  if (clause.op === 'contains') {
    const text = (clause.values[0] ?? '').trim().toLowerCase();
    return !!text && value.includes(text);
  }
  const hit = clause.values.some(v => v.trim().toLowerCase() === value);
  return clause.op === 'isNot' ? !hit : hit;
}

export function migrateInspectionContextRules(rules: RejectRule[] | undefined): RejectRule[] | undefined {
  return rules?.flatMap(rule => {
    let alternatives: ConditionClause[][] = [[]];
    for (const clause of rule.when) {
      let replacements: ConditionClause[][] = [[clause]];
      if (clause.field === 'self.typeChangedFromPtTo5x') {
        const yes = accepts(clause, 'yes'), no = accepts(clause, '');
        replacements = yes && no ? [[]] : yes ? [[
          { field: 'self.originalInspectionType', op: 'is', values: ['pt'] },
          { field: 'self.performedInspectionType', op: 'is', values: ['5x'] },
        ]] : no ? [
          [{ field: 'self.originalInspectionType', op: 'isNot', values: ['pt'] }],
          [{ field: 'self.performedInspectionType', op: 'isNot', values: ['5x'] }],
        ] : [];
      }
      alternatives = alternatives.flatMap(prefix => replacements.map(clauses => [...prefix, ...clauses]));
    }
    return alternatives.map(when => ({ ...rule, when }));
  });
}
