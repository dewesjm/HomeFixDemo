/* Rules that belong to one built-in step by its id rather than to a setting. Each is fixed: it
   doesn't change per joint or per site, so it isn't offered in Admin. What the ids look like (NQC
   twins, repair rounds) is step-ids.ts. */
import { baseStepId, isExcavationNdtStageId, isFitupInspId } from './step-ids';

/* Inspecting on an inspection step: what's being inspected (Fit on Fit-Up Insp; Root, Layer, Final,
   or the Excavation of a Weld Repair on NDT); '' for any other step */
export function inspectingLabel(stageId: string): string {
  if (isFitupInspId(stageId)) return 'Fit';
  if (isExcavationNdtStageId(stageId)) return 'Excavation';
  const phase = /^(root|layer|final)-ndt-/.exec(baseStepId(stageId))?.[1];
  return phase ? `${phase[0].toUpperCase()}${phase.slice(1)}` : '';
}
