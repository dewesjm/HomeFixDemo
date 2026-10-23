/* A Type can sign a later routing. */
import { WorkflowStage } from '../model/workflow-types';
import { typeSignsStep } from '../signoff-definition/signoff-types';
import { typeValues } from '../signoff-definition/stage-rules';
import { baseStepId } from './step-ids';

/* the later step a stage's Type signs (the Type's Signs step), or '' */
export function signedAsStep(stages: WorkflowStage[], stage: WorkflowStage): string {
  const target = typeSignsStep(stage.id, stage.signoffType);
  if (!target) return '';
  const idx = stages.findIndex(s => s.id === stage.id);
  return stages.find((s, i) => i > idx && baseStepId(s.id) === target)?.id ?? '';
}

/* sign `stageId` as the later step `targetId`: the target takes the values and is signed, and the
   steps between are passed. The step itself shows signed when it had an earlier signoff,
   else it's passed too (left off the routing bar). */
export function signAsStep(stages: WorkflowStage[], stageId: string, targetId: string, signedAt: string, hadSignoff = false): WorkflowStage[] {
  const from = stages.findIndex(s => s.id === stageId);
  const to = stages.findIndex(s => s.id === targetId);
  const st = stages[from];
  const ownDefault = typeValues(st.typeOptions?.find(o => o.default)?.value ?? st.inspectionType);
  return stages.map((s, i) => {
    if (i === from) return hadSignoff
      ? { ...s, inputs: {}, signoffInputs: {}, ...ownDefault, result: s.result ?? 'sat', signed: true, signedAt }
      : { ...s, inputs: {}, signoffInputs: {}, ...ownDefault, required: false };
    if (i > from && i < to) return s.signed ? s : { ...s, required: false };
    if (i === to) return { ...s, inputs: { ...st.inputs }, signoffInputs: { ...st.signoffInputs }, engineeringEntry: st.engineeringEntry, result: 'sat', signed: true, signedAt };
    return s;
  });
}
