/* The complete catalog of fields that can appear on any step's reading section (CatalogField)
   or sign-off section (CatalogSignoffField). Per-step activations (step-field-config.ts) pick
   from this list; they cannot define fields outside it. */
import { FieldCondition } from './field-conditions';
import { getWeldPositions } from '../weld-positions';
import { FILLER_METAL_SIZE_OPTIONS, FILLER_METAL_TYPE_OPTIONS } from '../procedures';
import { inspectionProcedureOptions } from '../inspection-procedures';
import { defectCodeOptions } from '../defect-codes';
import { penetrantManufacturerOptions, penetrantTypeOptions } from '../penetrants';
import { RT_DEGREE_OPTIONS } from './ndt';

export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'radio';

/* A field that appears in a step's reading/input section */
export interface CatalogField {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  placeholder?: string;
  options?: { label: string; value: string; detail?: string }[];
  defaultShowIf?: FieldCondition;
  /* conditionally disabled (e.g. filler fields when consumableInsertOnly is set) */
  defaultDisabledIf?: FieldCondition;
  /* always read-only (e.g. weldProcess driven by WTN) */
  disabled?: boolean;
  defaultRequired?: boolean;
  minField?: string;
  maxField?: string;
  fullWidth?: boolean;
  description?: string;
}

/* A field that appears in a step's sign-off section */
export interface CatalogSignoffField {
  key: string;
  label: string;
  type: FieldType;
  defaultRequired?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultShowIf?: FieldCondition;
  fullWidth?: boolean;
}

const showIfHasProbationary: FieldCondition = { all: [{ source: 'field', key: 'hasProbationary', equals: 'yes' }] };
const showIfPartial: FieldCondition = { all: [{ source: 'field', key: 'partial', equals: 'yes' }] };
const showIfRt: FieldCondition = { all: [{ source: 'field', key: 'inspectionType', equals: 'rt' }] };
const showIfPt: FieldCondition = { all: [{ source: 'field', key: 'inspectionType', equals: 'pt' }] };
const showIfVt: FieldCondition = { all: [{ source: 'field', key: 'inspectionType', equals: 'vt' }] };
const showIfRtUnsat: FieldCondition = {
  all: [
    { source: 'field', key: 'inspectionType', equals: 'rt' },
    { source: 'field', key: 'result', equals: 'unsat' },
  ]
};
const disabledIfConsumableInsert: FieldCondition = { all: [{ source: 'field', key: 'consumableInsertOnly', equals: 'yes' }] };

export const FIELD_CATALOG: CatalogField[] = [
  /* ── Welding ── */
  { key: 'weldProcedure', label: 'GWP', type: 'select', defaultRequired: true },
  { key: 'wtn', label: 'WTN', type: 'select', defaultRequired: true },
  /* driven by the matched WTN; engineeringEntry steps unlock it (renderer-level override) */
  { key: 'weldProcess', label: 'Weld Process', type: 'select', defaultRequired: true, disabled: true,
    options: [{ label: 'SMAW', value: 'smaw' }, { label: 'GMAW', value: 'gmaw' },
      { label: 'GTAW', value: 'gtaw' }, { label: 'FCAW', value: 'fcaw' }] },
  { key: 'qualificationCheck', label: 'Qualification Check', type: 'text' },
  { key: 'phMin', label: 'PH Min', type: 'number' },
  { key: 'phMax', label: 'PH Max', type: 'number' },
  { key: 'ipMin', label: 'IP Min', type: 'number' },
  { key: 'ipMax', label: 'IP Max', type: 'number' },
  { key: 'actualPhMin', label: 'Actual PH Min', type: 'number', defaultRequired: true,
    minField: 'phMin', maxField: 'phMax',
    defaultDisabledIf: { all: [{ source: 'field', key: 'phMin', equals: 'NC' }] } },
  { key: 'actualPhMax', label: 'Actual PH Max', type: 'number', defaultRequired: true,
    minField: 'phMin', maxField: 'phMax',
    defaultDisabledIf: { all: [{ source: 'field', key: 'phMin', equals: 'NC' }] } },
  { key: 'actualIpMin', label: 'Actual IP Min', type: 'number', defaultRequired: true,
    minField: 'ipMin', maxField: 'ipMax',
    defaultDisabledIf: { all: [{ source: 'field', key: 'ipMin', equals: 'NC' }] } },
  { key: 'actualIpMax', label: 'Actual IP Max', type: 'number', defaultRequired: true,
    minField: 'ipMin', maxField: 'ipMax',
    defaultDisabledIf: { all: [{ source: 'field', key: 'ipMin', equals: 'NC' }] } },
  { key: 'weldPosition', label: 'Weld Position', type: 'select', defaultRequired: true,
    options: getWeldPositions().map(p => ({ label: `${p.code} - ${p.description}`, value: p.code.toLowerCase() })) },
  { key: 'fillerMetalType', label: 'Filler Metal Type', type: 'select', defaultRequired: true,
    defaultDisabledIf: disabledIfConsumableInsert },
  { key: 'fillerMetalSize', label: 'Filler Metal Size', type: 'select', defaultRequired: true,
    defaultDisabledIf: disabledIfConsumableInsert },
  { key: 'fillerMetalMic', label: 'Filler Metal MIC', type: 'text', defaultRequired: true,
    defaultDisabledIf: disabledIfConsumableInsert },
  /* root-weld only; controlled by per-step activation showIf */
  { key: 'consumableInsertOnly', label: 'Only Consumable Insert used as filler', type: 'checkbox' },
  /* SWITCHED OFF: weld override fields. Kept in catalog so they can be re-enabled without a rewrite. */
  { key: 'overridePhMin', label: 'Override PH Min', type: 'number' },
  { key: 'overridePhMax', label: 'Override PH Max', type: 'number' },
  { key: 'overrideIpMin', label: 'Override IP Min', type: 'number' },
  { key: 'overrideIpMax', label: 'Override IP Max', type: 'number' },
  { key: 'overrideNote', label: 'Override Note', type: 'text' },

  /* ── NDT (common) ── */
  { key: 'procedureUsed', label: 'Procedure Used for Inspection', type: 'select', defaultRequired: true,
    options: inspectionProcedureOptions() },
  { key: 'hasProbationary', label: 'Has Probationary Inspector', type: 'checkbox' },
  { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text', defaultRequired: true,
    defaultShowIf: showIfHasProbationary },
  { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text', defaultRequired: true,
    defaultShowIf: showIfHasProbationary },
  { key: 'partial', label: 'Partial', type: 'checkbox' },
  { key: 'portionInspected', label: 'Portion of Weld Inspected', type: 'text', defaultRequired: true,
    defaultShowIf: showIfPartial },

  /* ── NDT RT/UT ── */
  { key: 'degreeRt', label: 'Degree of RT Performed', type: 'select', defaultRequired: true,
    defaultShowIf: showIfRt, options: RT_DEGREE_OPTIONS },
  { key: 'rtFileNumber', label: 'RT File Number', type: 'text', defaultShowIf: showIfRt },
  { key: 'defectCode', label: 'Defect Code', type: 'select', defaultRequired: true,
    defaultShowIf: showIfRtUnsat, options: defectCodeOptions() },

  /* ── NDT MT/PT ── */
  { key: 'idAccessible', label: 'Inner surface of the weld / ID is accessible', type: 'select',
    options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
  { key: 'penetrantManufacturer', label: 'Penetrant Manufacturer', type: 'select',
    defaultShowIf: showIfPt, options: penetrantManufacturerOptions() },
  { key: 'penetrantType', label: 'Penetrant Type', type: 'select',
    defaultShowIf: showIfPt, options: penetrantTypeOptions() },

  /* ── NDT 5X/VT ── */
  /* also hidden unless the joint is titanium; activation adds a jointDetail condition per step */
  { key: 'weldColor', label: 'Weld Color', type: 'select', defaultRequired: true,
    defaultShowIf: showIfVt,
    options: [
      { label: 'Shiny Silver', value: 'shiny-silver' }, { label: 'Straw', value: 'straw' },
      { label: 'Light Blue', value: 'light-blue' }, { label: 'Dark Blue', value: 'dark-blue' },
      { label: 'Gray Powder', value: 'gray-powder' }, { label: 'Yellow Powder', value: 'yellow-powder' },
    ] },

  /* ── Repair ── */
  { key: 'repairType', label: 'Repair Code', type: 'select', defaultRequired: true,
    options: [{ label: 'Grind Only', value: 'grind' }, { label: 'Weld Repair', value: 'weld-repair' }, { label: 'Cut', value: 'cut' }] },
  /* also only shown when the rejected phase has an RT/UT step (built-in rule, field-rules.ts) */
  { key: 'allowableThicknessExceeded', label: 'Allowable thickness exceeded - Volumetric inspection (UT/RT) is required', type: 'checkbox' },

  /* ── Fit-Up Insp ── */
  { key: 'verifyMic1', label: 'MIC 1 verified', type: 'checkbox' },
  { key: 'verifyMic2', label: 'MIC 2 verified', type: 'checkbox' },
  { key: 'verifyDrawingRev', label: 'Drawing Rev (Execution) verified', type: 'checkbox' },
  { key: 'verifyActualThickness', label: 'Actual Thickness verified', type: 'checkbox' },
  { key: 'verifyRevisedJointDesign', label: 'Revised Joint Design verified', type: 'checkbox' },

  /* ── Records Review ── */
  { key: 'verifyDrawing', label: 'Drawing', type: 'checkbox' },
  { key: 'verifyJoint', label: 'Joint Reference', type: 'checkbox' },
  { key: 'verifyJointDesign', label: 'Joint Design', type: 'checkbox' },
  { key: 'verifyWeldType', label: 'Weld Type', type: 'checkbox' },
  { key: 'verifyPipeSize', label: 'Pipe Size', type: 'checkbox' },
  { key: 'verifyWallThickness', label: 'Wall Thickness', type: 'checkbox' },
  { key: 'verifyMaterial1', label: 'Material Type 1', type: 'checkbox' },
  { key: 'verifyMaterial2', label: 'Material Type 2', type: 'checkbox' },
  { key: 'verifyMcl1', label: 'MIC 1', type: 'checkbox' },
  { key: 'verifyMcl2', label: 'MIC 2', type: 'checkbox' },
  { key: 'verifyNdt', label: 'NDT Requirement', type: 'checkbox' },
  { key: 'verifyPwht', label: 'PWHT', type: 'checkbox' },
  { key: 'verifyNInd', label: 'Nuclear Indicator', type: 'checkbox' },
  { key: 'verifyWps', label: 'WPS', type: 'checkbox' },
  { key: 'verifyOrder', label: 'Order', type: 'checkbox' },
  { key: 'verifyWorkPackage', label: 'Work Package', type: 'checkbox' },
];

const BACKING_RING_OPTIONS = [
  { label: 'Standard', value: 'standard' }, { label: 'Heavy', value: 'heavy' },
  { label: 'Copper', value: 'copper' }, { label: 'Ceramic', value: 'ceramic' },
];

export const SIGNOFF_FIELD_CATALOG: CatalogSignoffField[] = [
  /* ── Fit / Pre-Fit ── */
  { key: 'consumableInsertType', label: 'Consumable Insert Type', type: 'select', defaultRequired: true,
    options: FILLER_METAL_TYPE_OPTIONS },
  { key: 'consumableInsertSize', label: 'Consumable Insert Size', type: 'select', defaultRequired: true,
    options: FILLER_METAL_SIZE_OPTIONS },
  { key: 'consumableInsertId', label: 'Consumable Insert MIC', type: 'text' },
  { key: 'backingRingType', label: 'Backing Ring Type', type: 'select', defaultRequired: true,
    options: BACKING_RING_OPTIONS },
  { key: 'backingRingId', label: 'Backing Ring MIC', type: 'text' },
  { key: 'deferTack', label: 'Defer Tack', type: 'text' },
  /* ── Fit-Up Insp ── */
  { key: 'releaseToWelding', label: 'Release to welding upon inspection', type: 'checkbox' },
];

export function lookupCatalogField(key: string): CatalogField | undefined {
  return FIELD_CATALOG.find(f => f.key === key);
}

export function lookupCatalogSignoffField(key: string): CatalogSignoffField | undefined {
  return SIGNOFF_FIELD_CATALOG.find(f => f.key === key);
}
