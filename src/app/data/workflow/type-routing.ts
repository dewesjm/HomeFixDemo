/* Where a signoff goes because of its Type (Admin > Signoff Type Availability): a repeatable Type
   on a step its NDT follows (Interim Layer) brings up that NDT and then comes back to the step, and
   a Type that loads a later step's definition (Layer's Final Weld) is that step's signoff. */
import { WorkflowStage } from './types';
import { typeDefinition, typeRepeatable } from './signoff-types';
import { baseStepId, isEngineeringHoldId, isExcavationNdtStageId, isRepairStageId } from './step-ids';

const isNdtId = (id: string) => /^(root|layer|final)-ndt-/.test(baseStepId(id));
/* the NDT steps inspecting a step, with any Repair, Excavation NDT or Engineering Hold they added */
const inspects = (s: WorkflowStage) => isNdtId(s.id) || isRepairStageId(s.id) || isExcavationNdtStageId(s.id) || isEngineeringHoldId(s.id);

/* the stages right after the one at `idx` that inspect it */
function inspectionsOf(stages: WorkflowStage[], idx: number): WorkflowStage[] {
  const out: WorkflowStage[] = [];
  for (let i = idx + 1; i < stages.length && inspects(stages[i]); i++) out.push(stages[i]);
  return out;
}

/* a repeatable Type on a step with required NDT right after it: signing completes the step so the
   NDT comes up, and the joint comes back afterward (repeatReturnStep). Without NDT the step stays
   current. */
export function repeatsThroughNdt(stages: WorkflowStage[], stageId: string): boolean {
  const idx = stages.findIndex(s => s.id === stageId);
  return idx >= 0 && inspectionsOf(stages, idx).some(s => s.required && isNdtId(s.id));
}

/* after a signoff on an inspecting stage: the step the joint goes back to now that everything
   inspecting its repeatable signoff is signed, or '' */
export function repeatReturnStep(stages: WorkflowStage[], signedId: string): string {
  let owner = stages.findIndex(s => s.id === signedId);
  if (owner < 0 || !inspects(stages[owner])) return '';
  while (owner >= 0 && inspects(stages[owner])) owner--;
  const step = stages[owner];
  if (!step?.signed || !typeRepeatable(step.id, step.signoffType)) return '';
  return inspectionsOf(stages, owner).some(s => s.required && !s.signed) ? '' : step.id;
}

/* the later step a stage's Type signs (its Type loads that step's definition), or '' */
export function signedAsStep(stages: WorkflowStage[], stage: WorkflowStage): string {
  const loaded = typeDefinition(stage.id, stage.signoffType);
  if (!loaded) return '';
  const idx = stages.findIndex(s => s.id === stage.id);
  return stages.find((s, i) => i > idx && baseStepId(s.id) === loaded)?.id ?? '';
}

/* sign `stageId` as the later step `targetId`: the target takes the values and is signed, and the
   steps between are passed. The step itself shows signed when it had an earlier repeatable signoff,
   else it's passed too (left off the routing bar). */
export function signAsStep(stages: WorkflowStage[], stageId: string, targetId: string, signedAt: string): WorkflowStage[] {
  const from = stages.findIndex(s => s.id === stageId);
  const to = stages.findIndex(s => s.id === targetId);
  const st = stages[from];
  const ownDefault = st.typeOptions?.find(o => o.default)?.value ?? st.signoffType;
  return stages.map((s, i) => {
    if (i === from) return st.repeats
      ? { ...s, inputs: {}, signoffInputs: {}, signoffType: ownDefault, result: s.result ?? 'sat', signed: true, signedAt }
      : { ...s, inputs: {}, signoffInputs: {}, signoffType: ownDefault, required: false };
    if (i > from && i < to) return s.signed ? s : { ...s, required: false };
    if (i === to) return { ...s, inputs: { ...st.inputs }, signoffInputs: { ...st.signoffInputs }, engineeringEntry: st.engineeringEntry, result: 'sat', signed: true, signedAt };
    return s;
  });
}
