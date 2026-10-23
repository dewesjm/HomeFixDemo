/* Picking a Type updates both stored Type values and clears the form's entered values.
   Repair-round origin and inspection exception bookkeeping survives the change. */
import { isRepairStageId, isExcavationNdtStageId } from '../../routing/step-ids';
import { Job } from '../../../data/jobs';
import { WorkflowStage } from '../../model/workflow-types';
import { typeValues } from '../../signoff-definition/stage-rules';

export function typeChange(_trade: Job['trade'], stage: WorkflowStage, value: string): Partial<WorkflowStage> {
  return {
    ...typeValues(value),
    inputs: isRepairStageId(stage.id) || isExcavationNdtStageId(stage.id)
      ? Object.fromEntries(['originPhase', 'originStageId', 'originInspectionType', 'typeChangedFromPtTo5x'].filter(k => k in stage.inputs).map(k => [k, stage.inputs[k]])) : {},
    signoffInputs: {},
  };
}
