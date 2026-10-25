import { RejectRule, StepConditionField, describeClauses } from '../../routing/step-conditions';

/** Describe the condition separately from the destination in Routing Settings. */
export function thenRuleSummary(rule: RejectRule, fields: StepConditionField[], destination: string): string {
  const summaryFields = fields.map(field => ({
    ...field,
    label: field.label.replace(/ - Volumetric inspection \(UT\/RT\) is required$/, ''),
  }));
  if (!rule.when.length) return `Always → Then go to ${destination}`;
  return `If ${describeClauses(rule.when, summaryFields).join(' and ')} → Then go to ${destination}`;
}
