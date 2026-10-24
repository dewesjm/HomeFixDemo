/* Readable insertion sources link back to the routing rule that owns each condition. */
import { StageTemplate } from '../../model/workflow-types';
import { describeConditions, stageConditionFields } from '../../routing/step-conditions';
import { insertionDefinitionId } from '../../routing/instance-identity';

export interface InsertionTrigger {
  sourceId?: string;
  mode?: 'then' | 'reject';
  label: string;
}

export function insertionTriggers(templates: StageTemplate[], definitionId: string): InsertionTrigger[] {
  const matches = (to: string) => insertionDefinitionId(to) === definitionId
    || to === ({ repair: 'repair', 'excavation-ndt': 'add-excavation-ndt', 'engineering-hold': 'engineering-hold' } as Record<string, string>)[definitionId];
  const triggers: InsertionTrigger[] = [];
  for (const source of templates) {
    for (const mode of ['then', 'reject'] as const) {
      const rules = mode === 'then' ? source.thenRules : source.rejectRules;
      for (const rule of rules ?? []) {
        if (matches(rule.to)) triggers.push({ sourceId: source.id, mode,
          label: `${source.label}: ${mode === 'then' ? 'Accepted signoff' : 'UNSAT'} — ${describeConditions([rule.when], stageConditionFields(source))}` });
        if (!rule.when.length) break;
      }
    }
    if (source.rejectToStage && matches(source.rejectToStage) && !source.rejectRules?.some(r => !r.when.length)) {
      triggers.push({ sourceId: source.id, mode: 'reject', label: `${source.label}: UNSAT${source.rejectRules?.length ? ' — otherwise' : ''}` });
    }
  }
  if (definitionId === 'engineering-hold') triggers.push({ label: 'Accepted deviation at signoff (automatic)' });
  return triggers;
}
