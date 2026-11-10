/* Where a joint is in its routing: the current step, and which steps are locked */
import { WorkflowStage } from '../model/workflow-types';
import { getTemplates } from './routing-settings-rules';

/* index the current routing is counted from: the routingFrom stage, else the first stage */
function routingStart(stages: WorkflowStage[]): number {
  return Math.max(0, stages.findIndex(s => s.routingFrom));
}

/* the current routing starts at `stageId` (see WorkflowStage.routingFrom) */
export function setRoutingFrom(stages: WorkflowStage[], stageId: string): WorkflowStage[] {
  return stages.map(s => {
    const on = s.id === stageId;
    if (on === !!s.routingFrom) return s;
    const { routingFrom: _r, ...rest } = s;
    return on ? { ...rest, routingFrom: true } : rest;
  });
}

/* locked until prior required stages signed; stages before where the current routing was set are locked */
export function isStageLocked(stages: WorkflowStage[], index: number): boolean {
  const start = routingStart(stages);
  if (index < start) return true;
  for (let i = start; i < index; i++) {
    const s = stages[i];
    if (s.required && !s.signed) return true;
  }
  return false;
}

/* the current routing: the first unsigned required stage, counted from where the routing was last set */
export function activeStage(stages: WorkflowStage[]): WorkflowStage | undefined {
  return stages.slice(routingStart(stages)).find(s => s.required && !s.signed);
}

/* Sold is the end of the path: nobody signs it (no sign-off form, Comments box or route preview), and
   the joint is closed once it gets there */
export const closesJoint = (stageId: string) => stageId === 'sold';

export function currentRoutingLabel(stages: WorkflowStage[]): string {
  return activeStage(stages)?.label ?? stages[stages.length - 1]?.label ?? 'Complete';
}

/* id of stage awaiting sign-off, null when done */
export function activeStageId(stages: WorkflowStage[]): string | null {
  return activeStage(stages)?.id ?? null;
}

export function allRequiredSigned(stages: WorkflowStage[]): boolean {
  return activeStage(stages) === undefined;
}

/* Fabrication fields can be changed while the current step has Fabrication editable (Admin > Routing Settings,
   read live so a change applies to joints in progress). Repair,
   Excavation NDT and a finished joint lock them. */
export function fabricationEditable(stages: WorkflowStage[]): boolean {
  const id = activeStageId(stages);
  return !!id && !!getTemplates().find(t => t.id === id)?.fabricationEditable;
}
