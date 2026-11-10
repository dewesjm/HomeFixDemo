/* Additional routings signed by the same signoff, without skipping intervening work. */
import { Job } from '../../data/jobs';
import { WorkflowStage } from '../model/workflow-types';
import { findSignoffType } from '../../data/signoff-types';
import { evaluateCondition } from './field-conditions';
import { buildConditionContext } from './condition-context';
import { signoffTypeOptions } from './signoff-type-routing-rules';
import { stepOnJoint } from '../routing/routing-ids';

export function additionalSignoffs(source: WorkflowStage, stages: WorkflowStage[], job: Job, fab: Record<string, string>): { stage: WorkflowStage; type: string }[] {
  if (source.result === 'unsat') return [];
  const context = buildConditionContext(source, job, stages, fab);
  const found = new Map<string, { stage: WorkflowStage; type: string }>();
  for (const rule of findSignoffType(source.signoffType)?.alsoSigns ?? []) {
    if (!evaluateCondition(rule.when, context)) continue;
    const target = stepOnJoint(stages, rule.stepId);
    if (!target || target.signed || !target.required || stages.indexOf(target) <= stages.findIndex(s => s.id === source.id)) continue;
    if (!(target.typeOptions ?? signoffTypeOptions(target.id, job) ?? []).some(o => o.value === rule.type)) continue;
    if (!found.has(target.id)) found.set(target.id, { stage: target, type: rule.type });
  }
  return [...found.values()];
}
