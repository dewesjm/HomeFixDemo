/* Repair choices use the existing destination rules; new labels never acquire Cut semantics. */
import { Job } from '../../../data/jobs';
import { getRepairCodes } from '../../../data/repair-codes';
import { WorkflowStage } from '../../model/workflow-types';
import { StageTemplate } from '../../model/stage-template';
import { firstMatchingRule } from '../route-to-rules';

/* a Repair coded Cut starts the joint over from this step (when the joint has it) */
export const CUT_RESTARTS_AT = 'fit';

export function isCustomRepairCode(code: string): boolean {
  return !!code && !['grind', 'weld-repair', 'cut'].includes(code);
}

export function repairCodeRoutingError(stage: WorkflowStage, job: Job, stages: WorkflowStage[], template?: StageTemplate, fab?: Record<string, string>): string {
  const code = stage.inputs['repairType'];
  if (!code) return '';
  const entry = getRepairCodes().find(r => r.code === code);
  if (!entry?.active) return `Repair Code ${entry?.name ?? code} is inactive or unavailable. Select an active Repair Code.`;
  if (isCustomRepairCode(code) && !firstMatchingRule(template?.thenRules, job, stages, stage, fab))
    return `Repair Code ${entry.name} has no matching Repair destination rule. Configure Then go to in Routing Settings.`;
  return '';
}
