/* The Degree of RT Performed an RT signoff needs: the highest of its Signoff Type Form's minimum rule
   (the joint's RT Degree Root or Final, by the routing's phase) and any Attribute Code Exceptions
   minimum on the routing. NA or blank counts as none. */
import { Job } from '../../data/jobs';
import { WorkflowStage } from '../model/workflow-types';
import { baseStepId } from '../routing/step-ids';
import { rtDegrees } from '../routing/ndt';
import { fieldActivation } from './step-field-config';

function jointRtDegree(job: Job | undefined, stageId: string): string {
  const phase = /^(root|final)-ndt-/.exec(baseStepId(stageId))?.[1];
  return phase === 'root' ? job?.rtRoot ?? '' : phase === 'final' ? job?.rtFinal ?? '' : '';
}

/* '' when nothing is required */
export function rtDegreeRequired(job: Job | undefined, stage: WorkflowStage): string {
  const fromForm = fieldActivation(stage, 'degreeRt').minimum === 'jointRtDegree' ? rtDegrees(jointRtDegree(job, stage.id)) : 0;
  const required = Math.max(fromForm, stage.attributeRules?.minRt ?? 0);
  return required ? String(required) : '';
}
