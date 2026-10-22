/* Which fields on a step the user can't type into: a field filled by a rule (field-fill.ts), such as
   Weld Process from the WTN or an actual set to NC by its requirement, is locked */
import { WorkflowStage } from './types';
import { ACTUAL_REQUIREMENT } from './weld-fields';
import { isFilledByRule } from './field-fill';

export function isFieldLocked(stage: WorkflowStage, f: { key: string }): boolean {
  return isFilledByRule(stage, f.key);
}

/* the override values (switched off, see SHOW_WELD_OVERRIDES) come from the WTN and are never typed */
const OVERRIDE_KEYS = new Set(['overridePhMin', 'overridePhMax', 'overrideIpMin', 'overrideIpMax', 'overrideNote']);
const LIMIT_KEYS = new Set(Object.values(ACTUAL_REQUIREMENT));

/* PH/IP limits shown as plain text: the overrides, and a requirement while it's filled (from the WTN;
   an engineering override types them instead) */
export function isReadonlyLimit(stage: WorkflowStage, key: string): boolean {
  return OVERRIDE_KEYS.has(key) || (LIMIT_KEYS.has(key) && isFilledByRule(stage, key));
}

/* true when the user can actually type or choose a value for this field */
export function isUserEditable(stage: WorkflowStage, f: { key: string; disabled?: boolean }): boolean {
  return !f.disabled && f.key !== 'qualificationCheck' && !isReadonlyLimit(stage, f.key) && !isFieldLocked(stage, f);
}
