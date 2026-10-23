/* What picking a Type on the joint page does to the step: both stored Type values change, the form
   clears and the step loads that Type's Signoff Type Definition. The step's own Types keep its
   template's field list; another Type (Fit's Weld Build-Up, Layer's Final Weld) carries its
   definition's. */
import { Job } from '../../../data/jobs';
import { WorkflowStage } from '../../model/workflow-types';
import { getTemplates } from '../../routing/stage-templates';
import { isOwnType } from '../../signoff-definition/signoff-types';
import { typeValues } from '../../signoff-definition/stage-rules';
import { definitionStageFields } from '../../signoff-definition/shown-fields';

export function typeChange(trade: Job['trade'], stage: WorkflowStage, value: string): Partial<WorkflowStage> {
  const own = isOwnType(stage.id, value) ? (getTemplates()[trade] ?? []).find(t => t.id === stage.id) : undefined;
  return {
    ...typeValues(value),
    inputs: {},
    signoffInputs: {},
    fields: own ? own.fields.map(f => ({ ...f })) : definitionStageFields({ id: stage.id, signoffType: value }),
    signoffFields: own ? (own.signoffFields ?? []).map(f => ({ ...f })) : [],
  };
}
