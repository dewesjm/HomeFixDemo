/* Rules that belong to one built-in step by its id rather than to a setting. Each is fixed: it
   doesn't change per joint or per site, so it isn't offered in Admin. What the ids look like (NQC
   twins, repair rounds) is step-ids.ts.

   Future enhancement, not built: attribute code exceptions (a list from the user). Whether they are
   hard-coded here or become a setting is to be decided once the list is in. */
import { Job } from '../../data/jobs';
import { WorkflowStage } from '../model/workflow-types';
import { baseStepId, isEngineeringHoldId, isExcavationNdtStageId, isFitupInspId } from './step-ids';

/* ── Fit: owns the joint's Fabrication values ── */

const FIT = 'fit';

/* Fit can't be signed until the required Fabrication values are filled in and free of errors */
export const needsFabricationComplete = (stageId: string) => stageId === FIT;

/* once Fit is signed the Fabrication values are its record: leaving the page doesn't undo them */
export const fabricationSigned = (stages: WorkflowStage[]) => stages.find(s => s.id === FIT)?.signed ?? false;

/* going back to Fit or earlier blanks the Fabrication values */
export function goesBackPastFabrication(stages: WorkflowStage[], idx: number): boolean {
  const fitIdx = stages.findIndex(s => s.id === FIT);
  return fitIdx >= 0 && idx <= fitIdx;
}

/* a Repair coded Cut starts the joint over from this step (when the joint has it) */
export const CUT_RESTARTS_AT = FIT;

/* ── Fit-Up Insp (either row) ── */

/* can't be signed while the Fabrication values have errors (blanks don't block it) */
export const blocksOnFabricationErrors = isFitupInspId;

/* Fabrication stays editable up to and including this step, and is locked once it's signed */
export const lastFabricationEditStep = isFitupInspId;

/* starts with Release to welding = Yes; routing reads that field only here */
export const startsReleasedToWelding = isFitupInspId;

/* ── Fit-Up Release ── */

/* signed by the Release to Welding button, not a sign-off form */
export const FITUP_RELEASE = 'fitup-release';

/* ── Layer ── */

/* History names Layer's signoff after its Type (Interim Layer / Final Weld) rather than "Layer" */
export const namedAfterType = (stageId: string) => stageId === 'root-layer';

/* ── NDT ── */

/* a Root / Layer / Final NDT step (either row) */
export const isPhaseNdtId = (stageId: string) => /^(root|layer|final)-ndt-/.test(baseStepId(stageId));

/* UNSAT adds a new Repair right after the step. Excavation NDT's UNSAT goes back to its own
   round's Repair instead. */
export const unsatAddsRepair = (stageId: string) => stageId.includes('ndt') && !isExcavationNdtStageId(stageId);

/* the Degree of RT the joint requires on an RT/UT step: Root's is Joint Details RT Root, Final's is
   RT Final; Layer has no requirement, so nothing is enforced there */
export function rtDegreeRequired(job: Job | undefined, stage: WorkflowStage): string {
  if (baseStepId(stage.id) === 'root-ndt-utrt') return job?.rtRoot ?? '';
  if (baseStepId(stage.id) === 'final-ndt-utrt') return job?.rtFinal ?? '';
  return '';
}

/* Inspecting on an inspection step: what's being inspected (Fit on Fit-Up Insp; Root, Layer, Final,
   or the Excavation of a Weld Repair on NDT); '' for any other step */
export function inspectingLabel(stageId: string): string {
  if (isFitupInspId(stageId)) return 'Fit';
  if (isExcavationNdtStageId(stageId)) return 'Excavation';
  const phase = /^(root|layer|final)-ndt-/.exec(baseStepId(stageId))?.[1];
  return phase ? `${phase[0].toUpperCase()}${phase.slice(1)}` : '';
}

/* ── Sold ── */

/* the end of the path: nobody signs it (no sign-off form, Comments box or route preview), and the
   joint is closed once it gets there */
export const closesJoint = (stageId: string) => stageId === 'sold';

/* its role follows whichever Records Review the joint got */
export const closingRole = (hasO63Review: boolean) => hasO63Review ? 'O63 Records' : 'O04 Records';

/* ── Engineering Hold ── */

/* no Comments box below the form: Engineering Hold's release form has its own required Comments,
   and nobody signs Sold */
export const noCommentsBox = (stageId: string) => isEngineeringHoldId(stageId) || closesJoint(stageId);
