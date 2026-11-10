/* Which routings own the joint's Fabrication values: Fit records them, and Fit and Fit-Up Insp check
   them. Fixed to those steps, so they aren't offered in Admin. */
import { WorkflowStage } from '../model/workflow-types';
import { isFitupInspId } from '../../data/welding-step-ids';

const FIT = 'fit';

/* Fit and Fit-Up Insp can't be signed while the Fabrication panel has errors (a required value blank) */
export const checksFabrication = (stageId: string) => stageId === FIT || isFitupInspId(stageId);

/* once Fit is signed the Fabrication values are its record: leaving the page doesn't undo them */
export const fabricationSigned = (stages: WorkflowStage[]) => stages.find(s => s.id === FIT)?.signed ?? false;

/* going back to Fit or earlier blanks the Fabrication values */
export function goesBackPastFabrication(stages: WorkflowStage[], idx: number): boolean {
  const fitIdx = stages.findIndex(s => s.id === FIT);
  return fitIdx >= 0 && idx <= fitIdx;
}
