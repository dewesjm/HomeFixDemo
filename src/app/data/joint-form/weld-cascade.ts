/* What else changes on a welding step when one of its values changes: GWP clears what it drove, and a
   WTN clears a filler choice its WPS doesn't allow. Weld Process, PH/IP and NC actuals follow by
   their Prepopulated from rules (field-fill.ts, applied after the change); a field prepopulated right
   now is left alone here. */
import { StageField, WorkflowStage, SHOW_WELD_OVERRIDES, isFilledByRule } from '../workflow';
import {
  getProcedureByGwpWtn, hasOverride as procedureHasOverride, fillerMetalTypeOptionsForProcedure, fillerMetalSizeOptionsForProcedure
} from '../procedures';

export interface FieldChange { field: StageField; value: string }

/* A select's new value plus everything it drives. `matchedProc` is true when a WTN pick resolved
   to a procedure (its Weld Process is then filled in). */
export function selectChangeCascade(stage: WorkflowStage, field: StageField, value: string, offListUnlocked: boolean):
    { changes: FieldChange[]; matchedProc: boolean } {
  const changes: FieldChange[] = [{ field, value }];
  const setIfPresent = (key: string, val: string) => {
    const f = stage.fields.find(ff => ff.key === key);
    if (f && !isFilledByRule(stage, key)) changes.push({ field: f, value: val });
  };
  let matchedProc = false;
  if (field.key === 'weldProcedure') {
    /* GWP drives which WTNs are selectable; clear WTN and everything WTN drives */
    setIfPresent('wtn', '');
    setIfPresent('overridePhMin', ''); setIfPresent('overridePhMax', '');
    setIfPresent('overrideIpMin', ''); setIfPresent('overrideIpMax', ''); setIfPresent('overrideNote', '');
    setIfPresent('fillerMetalType', ''); setIfPresent('fillerMetalSize', '');
  }
  if (field.key === 'wtn') {
    /* GWP+WTN identifies one Weld Engineering WPS document; it sets the override values -- never
       typed directly. Filler Metal Type/Size options narrow to this WPS too, but stay user-selected,
       so only a choice no longer valid is cleared. */
    const proc = getProcedureByGwpWtn(stage.inputs?.['weldProcedure'] ?? '', value);
    matchedProc = !!proc;
    const hasOv = SHOW_WELD_OVERRIDES && !!proc && procedureHasOverride(proc);
    setIfPresent('overridePhMin', hasOv ? proc!.overridePhMin : '');
    setIfPresent('overridePhMax', hasOv ? proc!.overridePhMax : '');
    setIfPresent('overrideIpMin', hasOv ? proc!.overrideIpMin : '');
    setIfPresent('overrideIpMax', hasOv ? proc!.overrideIpMax : '');
    setIfPresent('overrideNote', hasOv ? proc!.overrideNote : '');
    if (!offListUnlocked) {
      const currentType = stage.inputs['fillerMetalType'] ?? '';
      const currentSize = stage.inputs['fillerMetalSize'] ?? '';
      if (currentType && !fillerMetalTypeOptionsForProcedure(proc).some(o => o.value === currentType)) {
        setIfPresent('fillerMetalType', '');
      }
      if (currentSize && !fillerMetalSizeOptionsForProcedure(proc).some(o => o.value === currentSize)) {
        setIfPresent('fillerMetalSize', '');
      }
    }
  }
  return { changes, matchedProc };
}

/* A typed PH/IP requirement (engineering override), NC normalized; its actuals follow by their fill
   rule. Empty when unchanged. */
export function typedRequirementChanges(stage: WorkflowStage, field: StageField, raw: string): FieldChange[] {
  const value = raw.trim().toUpperCase() === 'NC' ? 'NC' : raw.trim();
  return value === (stage.inputs[field.key] ?? '') ? [] : [{ field, value }];
}
