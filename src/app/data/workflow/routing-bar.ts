/* Which steps the routing bar on the joint page shows, and their labels */
import { WorkflowStage } from './types';
import { activeStageId } from './current-routing';
import { excavationIdForRepair, isExcavationNdtStageId, isRepairStageId, repairIdForExcavation } from './step-ids';

export interface RoutingBarStep {
  stageIndex: number;
  label: string;
}

const isOpen = (s: WorkflowStage | undefined) => !!s && s.required && !s.signed;

/* A repair (its Repair step, plus Excavation NDT after a Weld Repair) is shown only while it is open,
   until Excavation NDT passes or the Repair is signed some other way, and always as plain "Repair" /
   "Excavation NDT". Every other step shows when it's signed, required or current. */
export function routingBarSteps(stages: WorkflowStage[]): RoutingBarStep[] {
  const activeId = activeStageId(stages);
  const byId = new Map(stages.map(s => [s.id, s]));
  const repairOpen = (repair: WorkflowStage | undefined) =>
    isOpen(repair) || (!!repair && isOpen(byId.get(excavationIdForRepair(repair.id))));
  const shown = (s: WorkflowStage): boolean => {
    if (isRepairStageId(s.id)) return repairOpen(s);
    if (isExcavationNdtStageId(s.id)) return s.required && repairOpen(byId.get(repairIdForExcavation(s.id)));
    return s.signed || s.required || s.id === activeId;
  };
  return stages.flatMap((s, i) => shown(s) ? [{ stageIndex: i, label: barLabel(s) }] : []);
}

/* a repair round's number is left off the bar (History keeps it) */
function barLabel(s: WorkflowStage): string {
  if (isRepairStageId(s.id) || isExcavationNdtStageId(s.id)) return s.label.replace(/ \d+$/, '');
  return s.displayName || s.label;
}
