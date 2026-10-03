/* The fields every welding step (Tack, Root, Layer, Final Weld) records, and which of them the user
   can't type into */
import { StageField, WorkflowStage } from './types';
import { getWeldPositions } from '../weld-positions';

export const WELD_STAGE_FIELDS: StageField[] = [
  /* GWP and WTN cascade from Weld Engineering's procedures data at render time (see
     data/joint-form/stage-form.ts stageFieldOptions) -- a GWP groups several WPS documents, one
     per WTN. weldProcess is then read-only, driven by the matching Procedure's own weldProcess. */
  { key: 'weldProcedure', label: 'GWP', type: 'select', required: true },
  { key: 'wtn', label: 'WTN', type: 'select', required: true },
  { key: 'weldProcess', label: 'Weld Process', type: 'select', required: true, disabled: true,
    options: [{ label: 'SMAW', value: 'smaw' }, { label: 'GMAW', value: 'gmaw' },
      { label: 'GTAW', value: 'gtaw' }, { label: 'FCAW', value: 'fcaw' }] },
  { key: 'qualificationCheck', label: 'Qualification Check', type: 'text' },
  { key: 'phMin', label: 'PH Min', type: 'number' },
  { key: 'phMax', label: 'PH Max', type: 'number' },
  { key: 'ipMin', label: 'IP Min', type: 'number' },
  { key: 'ipMax', label: 'IP Max', type: 'number' },
  /* each actual must fall within its requirement pair; NC in its own requirement makes it NC and locked (ACTUAL_REQUIREMENT) */
  { key: 'actualPhMin', label: 'Actual PH Min', type: 'number', required: true, minField: 'phMin', maxField: 'phMax' },
  { key: 'actualPhMax', label: 'Actual PH Max', type: 'number', required: true, minField: 'phMin', maxField: 'phMax' },
  { key: 'actualIpMin', label: 'Actual IP Min', type: 'number', required: true, minField: 'ipMin', maxField: 'ipMax' },
  { key: 'actualIpMax', label: 'Actual IP Max', type: 'number', required: true, minField: 'ipMin', maxField: 'ipMax' },
  { key: 'weldPosition', label: 'Weld Position', type: 'select', required: true,
    options: getWeldPositions().map(p => ({ label: `${p.code} - ${p.description}`, value: p.code.toLowerCase() })) },
  /* options cascade from the resolved GWP+WTN Procedure at render time (see data/joint-form/stage-form.ts
     stageFieldOptions), same pattern as weldProcedure/wtn above */
  { key: 'fillerMetalType', label: 'Filler Metal Type', type: 'select', required: true },
  { key: 'fillerMetalSize', label: 'Filler Metal Size', type: 'select', required: true },
  { key: 'fillerMetalMic', label: 'Filler Metal MIC', type: 'text', required: true },
  { key: 'comments', label: 'Comments', type: 'text', fullWidth: true },
];

/* Override Requirements fields, appended to every welding stage (shown for matching WTNs).
   SWITCHED OFF: hidden and not filled in from the WTN while SHOW_WELD_OVERRIDES is false, since how an
   override applies is unsettled (likely it replaces the requirement shown). This could be turned back
   on one day, so the code is kept working rather than removed, to avoid a rewrite. */
export const SHOW_WELD_OVERRIDES = false;
/* Foreman Override button on welding steps. SWITCHED OFF: blank values come in as an engineering
   override instead. This could be turned back on one day, so the code is kept working rather than
   removed, to avoid a rewrite. */
export const FOREMAN_OVERRIDE_ENABLED = false;
export const WELD_OVERRIDE_FIELDS: StageField[] = [
  { key: 'overridePhMin', label: 'Override PH Min', type: 'number' },
  { key: 'overridePhMax', label: 'Override PH Max', type: 'number' },
  { key: 'overrideIpMin', label: 'Override IP Min', type: 'number' },
  { key: 'overrideIpMax', label: 'Override IP Max', type: 'number' },
  { key: 'overrideNote', label: 'Override Note', type: 'text' },
];

/* ── Which weld fields the user cannot type into ── */

/* PH/IP limits and overrides are set from the WTN, never typed */
export const READONLY_LIMIT_KEYS = new Set([
  'phMin', 'phMax', 'ipMin', 'ipMax',
  'overridePhMin', 'overridePhMax', 'overrideIpMin', 'overrideIpMax', 'overrideNote',
]);
export const FILLER_KEYS = new Set(['fillerMetalType', 'fillerMetalSize', 'fillerMetalMic']);
/* typed by hand on an engineeringEntry step. Weld Process too, since there's no WTN on file for it to follow */
export const ENGINEERING_ENTRY_KEYS = new Set([
  'weldProcedure', 'wtn', 'weldProcess', 'phMin', 'phMax', 'ipMin', 'ipMax', 'fillerMetalType', 'fillerMetalSize',
]);

/* PH/IP limits and overrides shown as plain text; an engineeringEntry step's PH/IP are typed instead */
export function isReadonlyLimit(stage: WorkflowStage, key: string): boolean {
  return READONLY_LIMIT_KEYS.has(key) && !(stage.engineeringEntry && ENGINEERING_ENTRY_KEYS.has(key));
}

/* each actual and the requirement it follows: NC there sets the actual to NC and locks it */
export const ACTUAL_REQUIREMENT: Record<string, string> = {
  actualPhMin: 'phMin', actualPhMax: 'phMax', actualIpMin: 'ipMin', actualIpMax: 'ipMax',
};

/* the lowest reading can't be above the highest: an error for the Max field, or '' */
export const ACTUAL_MIN_MAX: { min: string; max: string; minLabel: string; maxLabel: string }[] = [
  { min: 'actualPhMin', max: 'actualPhMax', minLabel: 'Actual PH Min', maxLabel: 'Actual PH Max' },
  { min: 'actualIpMin', max: 'actualIpMax', minLabel: 'Actual IP Min', maxLabel: 'Actual IP Max' },
];
export function actualOrderError(inputs: Record<string, string>, pair: typeof ACTUAL_MIN_MAX[number]): string {
  const lo = Number(inputs[pair.min]), hi = Number(inputs[pair.max]);
  if (!inputs[pair.min] || !inputs[pair.max] || isNaN(lo) || isNaN(hi)) return '';
  return lo > hi ? `${pair.maxLabel} is below ${pair.minLabel}` : '';
}

/* Weld Process follows the WTN (unless typed, engineeringEntry); filler fields follow the Consumable Insert checkbox; an actual
   follows an NC requirement */
export function isFieldLocked(stage: WorkflowStage, f: { key: string }): boolean {
  return (f.key === 'weldProcess' && !stage.engineeringEntry)
    || (FILLER_KEYS.has(f.key) && stage.inputs['consumableInsertOnly'] === 'yes')
    || (f.key in ACTUAL_REQUIREMENT && stage.inputs[ACTUAL_REQUIREMENT[f.key]] === 'NC');
}

/* true when the user can actually type or choose a value for this field */
export function isUserEditable(stage: WorkflowStage, f: { key: string; disabled?: boolean }): boolean {
  return !f.disabled && f.key !== 'qualificationCheck' && !isReadonlyLimit(stage, f.key) && !isFieldLocked(stage, f);
}
