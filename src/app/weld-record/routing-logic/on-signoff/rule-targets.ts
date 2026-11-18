/* Destinations a routing rule can name besides a routing (Add Repair, Rejecting NDT, Own Repair, ...)
   and which routing each resolves to. Relative targets resolve against this repair round, never another round. */
import { insertionDefinitionId } from '../inserted-routing/instance-identity';
import { WorkflowStage } from '../../model/workflow-types';
import { isRepairStageId, isExcavationNdtStageId, nqcStepId, repairIdForExcavation } from '../../../data/welding-step-ids';
/* the target that puts the joint on Engineering Hold (routing-logic/inserted-routing/added-routings.ts insertEngineeringHold) */
export const ENGINEERING_HOLD_TARGET = 'engineering-hold';
export const RULE_TARGETS = [
  { id: 'repair', label: 'Add Repair' },
  { id: 'add-excavation-ndt', label: 'Add Excavation NDT' },
  { id: ENGINEERING_HOLD_TARGET, label: 'Add Engineering Hold' },
  { id: 'rejecting-ndt', label: 'Rejecting NDT' },
  { id: 'rejecting-utrt', label: "Rejecting phase’s UT/RT" },
  { id: 'rejecting-nqc-utrt', label: "Rejecting phase’s NQC UT/RT" },
  { id: 'rejecting-vt5x', label: "Rejecting phase’s VT/5X" },
  { id: 'rejecting-nqc-vt5x', label: "Rejecting phase’s NQC VT/5X" },
  { id: 'own-repair', label: 'Own Repair' },
];
export const isAddTarget = (id: string) => !!insertionDefinitionId(id) || ['repair', 'add-excavation-ndt', ENGINEERING_HOLD_TARGET].includes(id);
function originRepair(stages: WorkflowStage[], stage: WorkflowStage): WorkflowStage | undefined {
  return isExcavationNdtStageId(stage.id) ? stages.find(s => s.id === repairIdForExcavation(stage.id)) : stage;
}
/* each "Rejecting phase's ..." target names one exact routing of the rejecting phase: its regular or its NQC row */
const PHASE_TARGETS: Record<string, string> = {
  'rejecting-utrt': 'ndt-utrt', 'rejecting-nqc-utrt': 'ndt-utrt', 'rejecting-vt5x': 'ndt-vt5x', 'rejecting-nqc-vt5x': 'ndt-vt5x',
};
function phaseRouting(phase: string | undefined, target: string): string {
  if (!phase) return '';
  const id = `${phase}-${PHASE_TARGETS[target]}`;
  return target.startsWith('rejecting-nqc-') ? nqcStepId(id) : id;
}
export function resolveRuleTarget(stages: WorkflowStage[], stage: WorkflowStage, target: string): string {
  const repair = originRepair(stages, stage);
  if (target === 'insertion-source') return stage.insertion?.sourceId ?? '';
  if (target === 'continue') return stage.insertion?.continueAt ?? '';
  if (stage.insertion) {
    if (target === 'own-repair') return stage.insertion.parentRepairId ?? '';
    if (target === 'rejecting-ndt') return stage.insertion.originStageId ?? '';
    if (PHASE_TARGETS[target]) return phaseRouting(stage.insertion.originPhase, target);
  }
  switch (target) {
    case 'own-repair': return isExcavationNdtStageId(stage.id) ? repair?.id ?? '' : '';
    case 'rejecting-ndt': return repair?.inputs['originStageId'] ?? '';
    default: return PHASE_TARGETS[target] ? phaseRouting(repair?.inputs['originPhase'], target) : target;
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
