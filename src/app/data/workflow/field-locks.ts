/* Which fields on a step the user can't type into: Weld Process follows the WTN, an actual follows
   an NC requirement, and a field filled from another step (field-fill.ts) is locked */
import { WorkflowStage } from './types';
import { ACTUAL_REQUIREMENT, isReadonlyLimit } from './weld-fields';
import { isFilledByRule } from './field-fill';

export function isFieldLocked(stage: WorkflowStage, f: { key: string }): boolean {
  return (f.key === 'weldProcess' && !stage.engineeringEntry)
    || isFilledByRule(stage, f.key)
    || (f.key in ACTUAL_REQUIREMENT && stage.inputs[ACTUAL_REQUIREMENT[f.key]] === 'NC');
}

/* true when the user can actually type or choose a value for this field */
export function isUserEditable(stage: WorkflowStage, f: { key: string; disabled?: boolean }): boolean {
  return !f.disabled && f.key !== 'qualificationCheck' && !isReadonlyLimit(stage, f.key) && !isFieldLocked(stage, f);
}
