/* Inspecting on an inspection step: what's being inspected (Fit on Fit-Up Insp; Root, Layer, Final,
   or the Excavation of a Weld Repair on NDT); '' for any other step */
import { baseStepId, isExcavationNdtStageId, isFitupInspId } from '../routing/routing-ids';

export function inspectingLabel(stageId: string): string {
  if (isFitupInspId(stageId)) return 'Fit';
  if (isExcavationNdtStageId(stageId)) return 'Excavation';
  const phase = /^(root|layer|final)-ndt-/.exec(baseStepId(stageId))?.[1];
  return phase ? `${phase[0].toUpperCase()}${phase.slice(1)}` : '';
}
