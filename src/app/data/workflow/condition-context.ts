/* The values a step's field conditions are checked against. Virtual Joint Details keys
   (joint-facts.ts) are resolved here; 'inspectionType' is merged into inputs so field-source
   conditions can reach it. */
import { Job } from '../jobs';
import { WorkflowStage } from './types';
import { ConditionContext } from './field-conditions';
import { VIRTUAL_JOINT_DETAILS } from './joint-facts';

export function buildConditionContext(stage: WorkflowStage, job: Job | undefined, allStages: WorkflowStage[],
    fab: Record<string, string> = {}): ConditionContext {
  return {
    stageId: stage.id,
    inputs: { ...stage.inputs, inspectionType: stage.inspectionType },
    jointDetail: (key: string): string => {
      const virtual = VIRTUAL_JOINT_DETAILS[key];
      if (virtual) return virtual.value(job, fab) ? 'yes' : '';
      const v = (job as Record<string, unknown> | undefined)?.[key];
      if (v === undefined || v === null) return '';
      if (typeof v === 'boolean') return v ? 'yes' : '';
      return String(v);
    },
    stageProperty: (key: string): string => {
      if (key === 'engineeringEntry') return stage.engineeringEntry ? 'yes' : '';
      return '';
    },
    priorInput: (stepId: string, fieldKey: string): string =>
      allStages.find(s => s.id === stepId)?.inputs[fieldKey] ?? '',
  };
}
