/* The values a step's field conditions are checked against. Joint Details and Fabrication read
   through the field catalog (catalogs/field-choices.ts); 'inspectionType' and 'result' (SAT/UNSAT) are merged into inputs
   so field-source conditions can reach them. */
import { Job } from '../../data/jobs';
import { WorkflowStage } from '../model/workflow-types';
import { ConditionContext } from '../conditions-logic/form-conditions';
import { jointOrFabricationField } from '../catalogs/field-choices';
import { stepOnJoint } from '../../data/welding-step-ids';
import { ENGINEERING_OVERRIDE_KEY, REJECTED_PHASE_UTRT_KEY } from './stage-property-keys';

/* the step's own fields, its id and whether an engineering override has it, without the joint or
   other steps (they read as blank): what a fill's "when" may read */
export function stepOnlyContext(stage: WorkflowStage): ConditionContext {
  return { ...buildConditionContext(stage, undefined, []), jointDetail: () => '' };
}

export function buildConditionContext(stage: WorkflowStage, job: Job | undefined, allStages: WorkflowStage[],
    fab: Record<string, string> = {}): ConditionContext {
  return {
    stageId: stage.id,
    inputs: { ...stage.inputs, inspectionType: stage.inspectionType, result: stage.result ?? '' },
    jointDetail: (key: string): string => {
      /* a catalog field reads as Routing Settings shows it (e.g. SS Yes/No, NDT values upper case);
         with no joint, a Yes/No field counts as No */
      const listed = jointOrFabricationField(key);
      if (listed) return job ? listed.get(job, allStages, fab) : listed.values.includes('No') ? 'No' : '';
      const v = (job as Record<string, unknown> | undefined)?.[key];
      if (v === undefined || v === null) return '';
      if (typeof v === 'boolean') return v ? 'yes' : '';
      return String(v);
    },
    stageProperty: (key: string): string => {
      if (key === ENGINEERING_OVERRIDE_KEY) return stage.engineeringEntry ? 'yes' : '';
      if (key === REJECTED_PHASE_UTRT_KEY) return stepOnJoint(allStages, `${stage.inputs['originPhase'] ?? ''}-ndt-utrt`) ? 'yes' : '';
      return '';
    },
    priorInput: (stepId: string, fieldKey: string): string =>
      allStages.find(s => s.id === stepId)?.inputs[fieldKey] ?? '',
  };
}
