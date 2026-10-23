/* Relative rule targets resolve against this repair round, never another round. */
import { WorkflowStage } from '../model/workflow-types';
import { isRepairStageId, isExcavationNdtStageId, repairIdForExcavation } from './step-ids';
export const RULE_TARGETS = [
  { id: 'repair', label: 'Add Repair' },
  { id: 'add-excavation-ndt', label: 'Add Excavation NDT' },
  { id: 'engineering-hold', label: 'Add Engineering Hold' },
  { id: 'rejecting-ndt', label: 'Rejecting NDT' },
  { id: 'rejecting-utrt', label: "Rejecting phase’s UT/RT" },
  { id: 'rejecting-vt5x', label: "Rejecting phase’s VT/5X" },
  { id: 'own-repair', label: 'Own Repair' },
];
export const isAddTarget = (id: string) => ['repair', 'add-excavation-ndt', 'engineering-hold'].includes(id);
export function originRepair(stages: WorkflowStage[], stage: WorkflowStage): WorkflowStage | undefined {
  return isExcavationNdtStageId(stage.id) ? stages.find(s => s.id === repairIdForExcavation(stage.id)) : stage;
}
export function resolveRuleTarget(stages: WorkflowStage[], stage: WorkflowStage, target: string): string {
  const repair = originRepair(stages, stage);
  switch (target) {
    case 'own-repair': return isExcavationNdtStageId(stage.id) ? repair?.id ?? '' : '';
    case 'rejecting-ndt': return repair?.inputs['originStageId'] ?? '';
    case 'rejecting-utrt': case 'rejecting-vt5x': {
      const phase = repair?.inputs['originPhase'];
      return phase ? `${phase}-ndt-${target === 'rejecting-utrt' ? 'utrt' : 'vt5x'}` : '';
    }
    default: return target;
  }
}

/* Only offer relative targets when the signing routing has a repair-round context. */
export function availableRuleTargets(stageId: string): typeof RULE_TARGETS {
  const repair = isRepairStageId(stageId);
  const excavation = isExcavationNdtStageId(stageId);
  return RULE_TARGETS.filter(t => {
    if (t.id === 'add-excavation-ndt') return repair;
    if (t.id === 'own-repair') return excavation;
    if (t.id.startsWith('rejecting-')) return repair || excavation;
    return true;
  });
}
