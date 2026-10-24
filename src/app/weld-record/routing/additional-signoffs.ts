/* Additional routings signed by the same signoff, without skipping intervening work. */
import { Job } from '../../data/jobs';
import { WorkflowStage } from '../model/workflow-types';
import { routingSignoffType } from '../signoff-definition/routing-signoff-types';
import { evaluateCondition } from '../signoff-definition/field-conditions';
import { buildConditionContext } from '../signoff-definition/condition-context';
import { signoffTypeOptions } from '../signoff-definition/signoff-types';
import { stepOnJoint } from './step-ids';

export function additionalSignoffs(source: WorkflowStage, stages: WorkflowStage[], job: Job, fab: Record<string, string>): { stage: WorkflowStage; type: string }[] {
  if (source.result === 'unsat') return [];
  const context = buildConditionContext(source, job, stages, fab);
  const found = new Map<string, { stage: WorkflowStage; type: string }>();
  for (const rule of routingSignoffType(source.signoffType)?.alsoSigns ?? []) {
    if (!evaluateCondition(rule.when, context)) continue;
    const target = stepOnJoint(stages, rule.stepId);
    if (!target || target.signed || !target.required || stages.indexOf(target) <= stages.findIndex(s => s.id === source.id)) continue;
    if (!(signoffTypeOptions(target.id, job) ?? []).some(o => o.value === rule.type)) continue;
    if (!found.has(target.id)) found.set(target.id, { stage: target, type: rule.type });
  }
  return [...found.values()];
}
