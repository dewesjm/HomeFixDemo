/* What else changes on a welding step when one of its values changes: GWP clears what it drove, WTN
   fills in the procedure's values, a typed PH/IP requirement of NC locks its actuals, and "Only
   Consumable Insert used as filler" copies Fit's insert into the filler fields */
import { StageField, WorkflowStage, ACTUAL_REQUIREMENT, SHOW_WELD_OVERRIDES } from '../workflow';
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
    if (f) changes.push({ field: f, value: val });
  };
  let matchedProc = false;
  /* Filler Metal Type/Size belong to the Consumable Insert copy while it's checked */
  const fillerFieldsLocked = stage.inputs['consumableInsertOnly'] === 'yes';
  if (field.key === 'weldProcedure') {
    /* GWP drives which WTNs are selectable; clear WTN and everything WTN drives */
    setIfPresent('wtn', '');
    setIfPresent('weldProcess', '');
    setIfPresent('phMin', ''); setIfPresent('phMax', ''); setIfPresent('ipMin', ''); setIfPresent('ipMax', '');
    setIfPresent('overridePhMin', ''); setIfPresent('overridePhMax', '');
    setIfPresent('overrideIpMin', ''); setIfPresent('overrideIpMax', ''); setIfPresent('overrideNote', '');
    /* an NC actual only existed because of the old requirement */
    for (const a of Object.keys(ACTUAL_REQUIREMENT)) if (stage.inputs[a] === 'NC') setIfPresent(a, '');
    if (!fillerFieldsLocked) { setIfPresent('fillerMetalType', ''); setIfPresent('fillerMetalSize', ''); }
  }
  if (field.key === 'wtn') {
    /* GWP+WTN identifies one Weld Engineering WPS document; it drives Weld Process, the PH/IP
       requirements and the override values -- never typed directly. Filler Metal Type/Size options
       narrow to this WPS too, but stay user-selected, so only a choice no longer valid is cleared. */
    const proc = getProcedureByGwpWtn(stage.inputs?.['weldProcedure'] ?? '', value);
    matchedProc = !!proc;
    setIfPresent('weldProcess', proc ? proc.weldProcess.toLowerCase() : '');
    setIfPresent('phMin', proc?.phMin ?? '');
    setIfPresent('phMax', proc?.phMax ?? '');
    setIfPresent('ipMin', proc?.ipMin ?? '');
    setIfPresent('ipMax', proc?.ipMax ?? '');
    /* NC requirement: actual is NC and locked; otherwise an NC left from the previous WTN is cleared */
    for (const [a, req] of Object.entries(ACTUAL_REQUIREMENT)) {
      if (proc?.[req as 'phMin'] === 'NC') setIfPresent(a, 'NC');
      else if (stage.inputs[a] === 'NC') setIfPresent(a, '');
    }
    const hasOv = SHOW_WELD_OVERRIDES && !!proc && procedureHasOverride(proc);
    setIfPresent('overridePhMin', hasOv ? proc!.overridePhMin : '');
    setIfPresent('overridePhMax', hasOv ? proc!.overridePhMax : '');
    setIfPresent('overrideIpMin', hasOv ? proc!.overrideIpMin : '');
    setIfPresent('overrideIpMax', hasOv ? proc!.overrideIpMax : '');
    setIfPresent('overrideNote', hasOv ? proc!.overrideNote : '');
    if (!fillerFieldsLocked && !offListUnlocked) {
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

/* A typed PH/IP requirement (engineering override), NC normalized: NC makes its actuals NC and
   locked, same as an NC from the WTN; anything else frees an actual left at NC. Empty when unchanged. */
export function typedRequirementChanges(stage: WorkflowStage, field: StageField, raw: string): FieldChange[] {
  const value = raw.trim().toUpperCase() === 'NC' ? 'NC' : raw.trim();
  if (value === (stage.inputs[field.key] ?? '')) return [];
  const changes: FieldChange[] = [{ field, value }];
  for (const [a, req] of Object.entries(ACTUAL_REQUIREMENT)) {
    const af = stage.fields.find(f => f.key === a);
    if (req !== field.key || !af) continue;
    if (value === 'NC') changes.push({ field: af, value: 'NC' });
    else if (stage.inputs[a] === 'NC') changes.push({ field: af, value: '' });
  }
  return changes;
}

/* filler values copied from Fit's Consumable Insert sign-off (only the ones Fit has) */
export function consumableInsertFill(stage: WorkflowStage, fit: WorkflowStage | undefined): FieldChange[] {
  if (!fit) return [];
  const pairs: [string, string][] = [
    ['fillerMetalType', 'consumableInsertType'], ['fillerMetalSize', 'consumableInsertSize'], ['fillerMetalMic', 'consumableInsertId'],
  ];
  return pairs.flatMap(([fillerKey, insertKey]) => {
    const field = stage.fields.find(f => f.key === fillerKey);
    const value = fit.signoffInputs[insertKey] ?? '';
    return field && value ? [{ field, value }] : [];
  });
}
