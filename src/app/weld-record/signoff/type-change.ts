/* Picking a Type updates both stored Type values and clears the form's entered values.
   Repair-round origin survives the change; inspection facts use the selected Type. "ID is accessible",
   asked above the Type when Attribute Code Exceptions has accessible rules, is kept too. */
import { isRepairStageId, isExcavationNdtStageId } from '../../data/welding-step-ids';
import { WorkflowStage } from '../model/workflow-types';
import { typeValues } from '../signoff-definition/stage-rules';

export function typeChange(stage: WorkflowStage, value: string): Partial<WorkflowStage> {
  const kept = isRepairStageId(stage.id) || isExcavationNdtStageId(stage.id)
    ? ['originPhase', 'originStageId', 'originInspectionType']
    : ['returningInspectionType', ...(stage.attributeRules?.accessible.length ? ['idAccessible'] : [])];
  return {
    ...typeValues(value),
    inputs: Object.fromEntries(kept.filter(k => k in stage.inputs).map(k => [k, stage.inputs[k]])),
    signoffInputs: {},
  };
}
