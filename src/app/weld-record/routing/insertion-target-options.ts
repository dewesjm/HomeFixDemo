/* Relative destinations are offered only when every configured insertion source supplies context. */
import { StageTemplate } from '../model/workflow-types';
import { insertionDefinitionId } from './instance-identity';
import { baseStepId, isRepairStageId, isExcavationNdtStageId } from './step-ids';
import { RULE_TARGETS } from './rule-targets';

export function insertionRelativeTargets(id: string, templates: StageTemplate[]): { id: string; label: string }[] {
  function hasContext(id: string, parentRepair: boolean, seen = new Set<string>()): boolean {
    if (seen.has(id)) return false;
    const next = new Set([...seen, id]);
    const sources = templates.filter(t => [...(t.thenRules ?? []), ...(t.rejectRules ?? []), { to: t.rejectToStage ?? '' }]
      .some(r => insertionDefinitionId(r.to) === id));
    return sources.length > 0 && sources.every(t => isRepairStageId(t.id) || isExcavationNdtStageId(t.id)
      || (!parentRepair && /^(root|layer|final)-ndt-/.test(baseStepId(t.id)))
      || (t.classification === 'added' && t.lifecycle === 'ordinary' && hasContext(t.id, parentRepair, next)));
  }
  return [{ id: 'continue', label: 'Continue after inserted work' }, { id: 'insertion-source', label: 'Insertion source routing' },
    ...RULE_TARGETS.filter(t => (t.id.startsWith('rejecting-') && hasContext(id, false)) || (t.id === 'own-repair' && hasContext(id, true)))];
}
