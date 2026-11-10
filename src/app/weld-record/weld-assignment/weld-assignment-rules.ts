/* Which fields and steps the external system's weld assignment covers. The values themselves come
   from the system (weld-assignment-mock.ts stands in for it); the person can't change them. */
import { formInputFields } from '../signoff-forms/form-fields';
import { WorkflowStage } from '../model/workflow-types';

/* the fields the external system sets */
export const ASSIGNED_KEYS = new Set(['weldProcedure', 'wtn', 'fillerMetalType', 'fillerMetalSize']);

/* welding steps (and Fit as a Weld Build-Up) are the ones with a GWP field */
export function isAssignedStage(stage: WorkflowStage): boolean {
  return formInputFields(stage).some(f => f.key === 'weldProcedure');
}
