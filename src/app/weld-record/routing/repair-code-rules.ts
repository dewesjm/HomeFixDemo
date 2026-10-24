/* Repair choices use the existing destination rules; new labels never acquire Cut semantics. */
import { Job } from '../../data/jobs';
import { getRepairCodes } from '../../data/repair-codes';
import { WorkflowStage, StageTemplate } from '../model/workflow-types';
import { matchingThenRule } from './step-conditions';

export function isCustomRepairCode(code: string): boolean {
  return !!code && !['grind', 'weld-repair', 'cut'].includes(code);
}

export function repairCodeRoutingError(stage: WorkflowStage, job: Job, stages: WorkflowStage[], template?: StageTemplate): string {
  const code = stage.inputs['repairType'];
  if (!code) return '';
  const entry = getRepairCodes().find(r => r.code === code);
  if (!entry?.active) return `Repair Code ${entry?.name ?? code} is inactive or unavailable. Select an active Repair Code.`;
  if (isCustomRepairCode(code) && !matchingThenRule(template?.thenRules, job, stages, stage))
    return `Repair Code ${entry.name} has no matching Repair destination rule. Configure Then go to in Routing Settings.`;
  return '';
}
