/* What picking a Type on the joint page does to the step: both stored Type values change, and a Type
   that loads another step's Signoff Type Definition (Fit's Weld Build-Up, Layer's Final Weld; Admin >
   Signoff Type Availability) swaps the step's fields for that definition's, or back to its own */
import { Job } from '../../../data/jobs';
import { WorkflowStage } from '../../model/workflow-types';
import { getTemplates } from '../../routing/stage-templates';
import { typeDefinition } from '../../signoff-definition/signoff-types';
import { typeValues } from '../../signoff-definition/stage-rules';
import { definitionStageFields } from '../../signoff-definition/shown-fields';

export interface TypeChange {
  patch: Partial<WorkflowStage>;
  /* the step's fields changed with it (recorded in History, and a welding form gets its assignment) */
  swapsDefinition: boolean;
}

export function typeChange(trade: Job['trade'], stage: WorkflowStage, value: string): TypeChange {
  const loaded = typeDefinition(stage.id, value);
  if (loaded === typeDefinition(stage.id, stage.signoffType)) return { patch: typeValues(value), swapsDefinition: false };
  const own = (getTemplates()[trade] ?? []).find(t => t.id === stage.id);
  return {
    patch: {
      ...typeValues(value),
      fields: loaded ? definitionStageFields({ id: stage.id, signoffType: value }) : (own?.fields ?? []).map(f => ({ ...f })),
      signoffInputs: {},
      signoffFields: loaded ? [] : (own?.signoffFields ?? []).map(f => ({ ...f })),
    },
    swapsDefinition: true,
  };
}
