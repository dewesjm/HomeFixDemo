/* The complete catalog of fields that can appear on any step. Per-step activations
   (step-field-config.ts) pick from this list; they cannot define fields outside it. */
import { weldColorOptions } from '../../data/weld-colors';
import { FieldCondition } from './field-conditions';
import { ENGINEERING_OVERRIDE_KEY, REJECTED_PHASE_UTRT_KEY } from './condition-context';
import { getWeldPositions } from '../../data/weld-positions';
import { FILLER_METAL_SIZE_OPTIONS, FILLER_METAL_TYPE_OPTIONS } from '../../data/procedures';
import { inspectionProcedureOptions } from '../../data/inspection-procedures';
import { defectCodeOptions } from '../../data/defect-codes';
import { penetrantManufacturerOptions, penetrantTypeOptions } from '../../data/penetrants';
import { RT_DEGREE_OPTIONS } from '../routing/ndt';

export const FIELD_TYPE_LABELS = { text: 'Text', number: 'Number', select: 'Droplist', checkbox: 'Checkbox', radio: 'Radio' } as const;

export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'radio';

/* "Prepopulated from ... when": when `when` starts holding (checked against this step's own fields
   and whether an engineering override has it), or its source changes while it holds, the field
   copies the source's value; it's blanked when `when` stops holding. Whether it can be typed into
   is its separate Disabled when rule. The source is another step's recorded value, a field on this
   same step, or the WTN's WPS. */
export type FieldFill = { fieldKey: string; when: FieldCondition }
  & ({ from?: 'step'; stepId: string } | { from: 'thisStep' } | { from: 'wtn' });

export interface CatalogField {
  key: string;
  label: string;
  type: FieldType;
  /* Numeric values may also hold the procedure's NC (no control) value. */
  allowsNc?: boolean;
  unit?: string;
  placeholder?: string;
  options?: { label: string; value: string; detail?: string }[];
  defaultShowIf?: FieldCondition;
  /* conditionally disabled (e.g. Actual PH Min when PH Min is NC) */
  defaultDisabledIf?: FieldCondition;
  defaultFill?: FieldFill;
  /* always read-only */
  disabled?: boolean;
  defaultRequired?: boolean;
  /* a required field is required only while this holds (e.g. an MIC only when traceability applies) */
  defaultRequiredIf?: FieldCondition;
  minField?: string;
  maxField?: string;
  fullWidth?: boolean;
  description?: string;
  /* the steps where it's a sign-off field, saved with the sign-off (Pre-Fit/Fit's insert, ring and
     Defer Tack); on any other step it's an ordinary field of that step */
  ownFormSteps?: string[];
  /* drawn by its own component on whichever step lists it, never as an ordinary field */
  ownComponent?: boolean;
  /* typed with the person search (a name from People) */
  personSearch?: boolean;
}

/* A catalog field with the form's rules evaluated for this signoff. Never stored on a routing. */
export interface FormField extends CatalogField {
  required?: boolean;
  requiredMessage?: string;
}

/* Admin describes the allowed value as well as the numeric control. */
export function catalogFieldTypeLabel(field: Pick<CatalogField, 'type' | 'allowsNc'>): string {
  return field.type === 'number' && field.allowsNc ? 'Number or NC' : FIELD_TYPE_LABELS[field.type];
}

const showIfHasProbationary: FieldCondition = { all: [{ source: 'field', key: 'hasProbationary', equals: 'yes' }] };
const showIfPartial: FieldCondition = { all: [{ source: 'field', key: 'partial', equals: 'yes' }] };
/* 'titanium' is a virtual Joint Details key (joint-facts.ts) */
const showIfTitanium: FieldCondition = { all: [{ source: 'jointDetail', key: 'titanium', equals: 'yes' }] };
const showIfUnsat: FieldCondition = { all: [{ source: 'field', key: 'result', equals: 'unsat' }] };
/* Root's filler follows Fit's Consumable Insert while "Only Consumable Insert used as filler" is checked
   (the checkbox is only on Root, so the rule never holds on other steps) */
const insertOnly: FieldCondition = { all: [{ source: 'field', key: 'consumableInsertOnly', equals: 'yes' }] };
const fillFromFit = (fieldKey: string): FieldFill => ({ stepId: 'fit', fieldKey, when: insertOnly });
/* Weld Process and the PH/IP requirements come from the WTN's WPS, except under an engineering
   override (no WTN on file, the values are typed) */
export const ENGINEERING_OVERRIDE_OFF: FieldCondition = { all: [{ source: 'stageProperty', key: ENGINEERING_OVERRIDE_KEY, equals: '' }] };
const fillFromWtn = (fieldKey: string): FieldFill => ({ from: 'wtn', fieldKey, when: ENGINEERING_OVERRIDE_OFF });
/* an actual is NC while its requirement is NC */
const ifNc = (requirement: string): FieldCondition => ({ all: [{ source: 'field', key: requirement, equals: 'NC' }] });
const ncFrom = (requirement: string): FieldFill => ({ from: 'thisStep', fieldKey: requirement, when: ifNc(requirement) });

const showIfNuclear: FieldCondition = { all: [{ source: 'jointDetail', key: 'nInd', equals: '1' }] };
/* virtual Joint Details keys (joint-facts.ts) */
const showIfInsert: FieldCondition = { all: [{ source: 'jointDetail', key: 'consumableInsertRequired', equals: 'yes' }] };
const showIfRing: FieldCondition = { all: [{ source: 'jointDetail', key: 'backingRingRequired', equals: 'yes' }] };
const ifTraceability: FieldCondition = { all: [{ source: 'jointDetail', key: 'materialTraceability', equals: 'yes' }] };
const ifPart1Traceability: FieldCondition = { all: [{ source: 'jointDetail', key: 'part1Traceability', equals: 'yes' }] };
const ifPart2Traceability: FieldCondition = { all: [{ source: 'jointDetail', key: 'part2Traceability', equals: 'yes' }] };
const ifRevisedJointDesign: FieldCondition = { all: [{ source: 'jointDetail', key: 'revisedJointDesignEntered', equals: 'yes' }] };

/* Pre-Fit and Fit hold the insert and ring fields as sign-off fields (welding-steps.ts) */
const FIT_STEPS = ['pre-fit', 'fit'];

const BACKING_RING_OPTIONS = [
  { label: 'Standard', value: 'standard' }, { label: 'Heavy', value: 'heavy' },
  { label: 'Copper', value: 'copper' }, { label: 'Ceramic', value: 'ceramic' },
];

export const FIELD_CATALOG: CatalogField[] = [
  /* ── Welding ── */
  { key: 'weldProcedure', label: 'GWP', type: 'select', defaultRequired: true },
  { key: 'wtn', label: 'WTN', type: 'select', defaultRequired: true },
  { key: 'weldProcess', label: 'Weld Process', type: 'select', defaultRequired: true, defaultFill: fillFromWtn('weldProcess'),
    defaultDisabledIf: ENGINEERING_OVERRIDE_OFF,
    options: [{ label: 'SMAW', value: 'smaw' }, { label: 'GMAW', value: 'gmaw' },
      { label: 'GTAW', value: 'gtaw' }, { label: 'FCAW', value: 'fcaw' }] },
  { key: 'qualificationCheck', label: 'Qualification Check', type: 'text' },
  { key: 'phMin', label: 'PH Min', type: 'number', allowsNc: true, defaultFill: fillFromWtn('phMin'),
    defaultDisabledIf: ENGINEERING_OVERRIDE_OFF },
  { key: 'phMax', label: 'PH Max', type: 'number', allowsNc: true, defaultFill: fillFromWtn('phMax'),
    defaultDisabledIf: ENGINEERING_OVERRIDE_OFF },
  { key: 'ipMin', label: 'IP Min', type: 'number', allowsNc: true, defaultFill: fillFromWtn('ipMin'),
    defaultDisabledIf: ENGINEERING_OVERRIDE_OFF },
  { key: 'ipMax', label: 'IP Max', type: 'number', allowsNc: true, defaultFill: fillFromWtn('ipMax'),
    defaultDisabledIf: ENGINEERING_OVERRIDE_OFF },
  { key: 'actualPhMin', label: 'Actual PH Min', type: 'number', allowsNc: true, defaultRequired: true,
    minField: 'phMin', maxField: 'phMax', defaultFill: ncFrom('phMin'), defaultDisabledIf: ifNc('phMin') },
  { key: 'actualPhMax', label: 'Actual PH Max', type: 'number', allowsNc: true, defaultRequired: true,
    minField: 'phMin', maxField: 'phMax', defaultFill: ncFrom('phMax'), defaultDisabledIf: ifNc('phMax') },
  { key: 'actualIpMin', label: 'Actual IP Min', type: 'number', allowsNc: true, defaultRequired: true,
    minField: 'ipMin', maxField: 'ipMax', defaultFill: ncFrom('ipMin'), defaultDisabledIf: ifNc('ipMin') },
  { key: 'actualIpMax', label: 'Actual IP Max', type: 'number', allowsNc: true, defaultRequired: true,
    minField: 'ipMin', maxField: 'ipMax', defaultFill: ncFrom('ipMax'), defaultDisabledIf: ifNc('ipMax') },
  { key: 'weldPosition', label: 'Weld Position', type: 'select', defaultRequired: true, defaultShowIf: showIfNuclear,
    options: getWeldPositions().map(p => ({ label: `${p.code} - ${p.description}`, value: p.code.toLowerCase() })) },
  { key: 'fillerMetalType', label: 'Filler Metal Type', type: 'select', defaultRequired: true,
    defaultFill: fillFromFit('consumableInsertType'), defaultDisabledIf: insertOnly },
  { key: 'fillerMetalSize', label: 'Filler Metal Size', type: 'select', defaultRequired: true,
    defaultFill: fillFromFit('consumableInsertSize'), defaultDisabledIf: insertOnly },
  { key: 'fillerMetalMic', label: 'Filler Metal MIC', type: 'text', defaultRequired: true,
    defaultFill: fillFromFit('consumableInsertId'), defaultDisabledIf: insertOnly },
  { key: 'consumableInsertOnly', label: 'Only Consumable Insert used as filler', type: 'checkbox' },
  /* The stored key is shared by the Root VT/5X question; wording follows NDT Root. */
  { key: 'performed5x', label: 'Did you perform the required Root inspection and was it successful?', type: 'select',
    options: [{ label: 'No', value: 'no' }, { label: 'Yes', value: 'yes' }] },
  /* SWITCHED OFF: weld override fields. Kept in catalog so they can be re-enabled without a rewrite. */
  { key: 'overridePhMin', label: 'Override PH Min', type: 'number', allowsNc: true },
  { key: 'overridePhMax', label: 'Override PH Max', type: 'number', allowsNc: true },
  { key: 'overrideIpMin', label: 'Override IP Min', type: 'number', allowsNc: true },
  { key: 'overrideIpMax', label: 'Override IP Max', type: 'number', allowsNc: true },
  { key: 'overrideNote', label: 'Override Note', type: 'text' },

  /* ── NDT (common) ── */
  { key: 'procedureUsed', label: 'Procedure Used for Inspection', type: 'select', defaultRequired: true,
    options: inspectionProcedureOptions() },
  { key: 'hasProbationary', label: 'Has Probationary Inspector', type: 'checkbox' },
  { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text', defaultRequired: true,
    defaultShowIf: showIfHasProbationary, personSearch: true },
  { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text', defaultRequired: true,
    defaultShowIf: showIfHasProbationary, personSearch: true },
  { key: 'partial', label: 'Partial', type: 'checkbox' },
  { key: 'portionInspected', label: 'Portion of Weld Inspected', type: 'text', defaultRequired: true,
    defaultShowIf: showIfPartial },

  /* ── NDT RT/UT ── */
  { key: 'degreeRt', label: 'Degree of RT Performed', type: 'select', defaultRequired: true,
    options: RT_DEGREE_OPTIONS },
  { key: 'rtFileNumber', label: 'RT File Number', type: 'text' },
  { key: 'defectCode', label: 'Defect Code', type: 'select', defaultRequired: true,
    defaultShowIf: showIfUnsat, options: defectCodeOptions() },

  /* ── NDT MT/PT ── */
  { key: 'idAccessible', label: 'Inner surface of the weld / ID is accessible', type: 'select',
    options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
  { key: 'penetrantManufacturer', label: 'Penetrant Manufacturer', type: 'select',
    options: penetrantManufacturerOptions() },
  { key: 'penetrantType', label: 'Penetrant Type', type: 'select',
    options: penetrantTypeOptions() },

  /* ── NDT 5X/VT ── */
  { key: 'weldColor', label: 'Weld Color', type: 'select', defaultRequired: true,
    defaultShowIf: showIfTitanium,
    get options() { return weldColorOptions(); } },

  /* ── Fit / Pre-Fit ── */
  { key: 'consumableInsertType', label: 'Consumable Insert Type', type: 'select', defaultRequired: true,
    defaultShowIf: showIfInsert, options: FILLER_METAL_TYPE_OPTIONS, ownFormSteps: FIT_STEPS },
  { key: 'consumableInsertSize', label: 'Consumable Insert Size', type: 'select', defaultRequired: true,
    defaultShowIf: showIfInsert, options: FILLER_METAL_SIZE_OPTIONS, ownFormSteps: FIT_STEPS },
  { key: 'consumableInsertId', label: 'Consumable Insert MIC', type: 'text', defaultRequired: true,
    defaultRequiredIf: ifTraceability, defaultShowIf: showIfInsert, ownFormSteps: FIT_STEPS },
  { key: 'backingRingType', label: 'Backing Ring Type', type: 'select', defaultRequired: true,
    defaultShowIf: showIfRing, options: BACKING_RING_OPTIONS, ownFormSteps: FIT_STEPS },
  { key: 'backingRingId', label: 'Backing Ring MIC', type: 'text', defaultRequired: true,
    defaultRequiredIf: ifTraceability, defaultShowIf: showIfRing, ownFormSteps: FIT_STEPS },
  { key: 'deferTack', label: 'Defer Tack', type: 'checkbox', ownFormSteps: ['fit'] },

  /* ── Weld Build-Up ── */
  /* the joint members the build-up affects (affected-item.component); at least one must be picked on
     any step that lists it */
  { key: 'affectedItem', label: 'Affected Item', type: 'checkbox', ownComponent: true },
  /* drawn under Affected Item, beside its joint member while that one is picked */
  { key: 'affectedMicVerified1', label: 'Affected Item MIC 1 verified', type: 'checkbox', ownComponent: true,
    defaultRequired: true, defaultShowIf: ifPart1Traceability },
  { key: 'affectedMicVerified2', label: 'Affected Item MIC 2 verified', type: 'checkbox', ownComponent: true,
    defaultRequired: true, defaultShowIf: ifPart2Traceability },

  /* ── Repair ── */
  { key: 'repairType', label: 'Repair Code', type: 'select', defaultRequired: true,
    options: [{ label: 'Grind Only', value: 'grind' }, { label: 'Weld Repair', value: 'weld-repair' }, { label: 'Cut', value: 'cut' }] },
  /* "exceeded" sends the joint to that phase's RT/UT, so by default it shows only when there is one */
  { key: 'allowableThicknessExceededN1', label: 'Allowable thickness of 3/8 inch or 20% of material thickness, whichever is less, has been exceeded (Nuclear Indicator 1) - Volumetric inspection (UT/RT) is required', type: 'checkbox',
    defaultShowIf: { all: [
      { source: 'jointDetail', key: 'nInd', equals: '1' },
      { source: 'stageProperty', key: REJECTED_PHASE_UTRT_KEY, equals: 'yes' },
    ] } },
  { key: 'allowableThicknessExceededN23', label: 'Allowable thickness of 3/16 inch or 20% of material thickness, whichever is less, has been exceeded (Nuclear Indicators 2/3) - Volumetric inspection (UT/RT) is required', type: 'checkbox',
    defaultShowIf: { all: [
      { source: 'jointDetail', key: 'nInd', anyOf: ['2', '3'] },
      { source: 'stageProperty', key: REJECTED_PHASE_UTRT_KEY, equals: 'yes' },
    ] } },

  /* ── Joint page ── */
  /* the joint's References (file names), the width of the form (Correct shows it on every step regardless) */
  { key: 'references', label: 'References', type: 'checkbox', ownComponent: true },

  /* ── Signoff section ── (placed in the form by the Layout list on whichever step lists them) */
  /* the Type droplist; its options and default are on Admin > Signoff Types By Routing */
  { key: 'type', label: 'Type', type: 'select', ownComponent: true },
  /* SAT/UNSAT, placed in the form by the Layout list; UNSAT needs a reject target to be signed */
  { key: 'decision', label: 'Inspection Results (SAT/UNSAT)', type: 'radio', ownComponent: true },
  /* the Comments box, saved in the step's signoffInputs */
  { key: 'comments', label: 'Comments', type: 'text', ownComponent: true },

  /* ── Fit-Up Insp ── */
  { key: 'releaseToWelding', label: 'Release to welding upon inspection', type: 'checkbox' },
  /* verify-grid rows: shown when the Fabrication value they check applies; Required = must be checked */
  { key: 'verifyMic1', label: 'MIC 1 verified', type: 'checkbox', defaultRequired: true, defaultShowIf: ifPart1Traceability },
  { key: 'verifyMic2', label: 'MIC 2 verified', type: 'checkbox', defaultRequired: true, defaultShowIf: ifPart2Traceability },
  { key: 'verifyDrawingRev', label: 'Drawing Rev (Execution) verified', type: 'checkbox', defaultRequired: true },
  { key: 'verifyActualThickness', label: 'Actual Thickness verified', type: 'checkbox', defaultRequired: true },
  { key: 'verifyRevisedJointDesign', label: 'Revised Joint Design verified', type: 'checkbox', defaultRequired: true,
    defaultShowIf: ifRevisedJointDesign },

  /* ── Records Review ── (verify-grid rows; none required by default) */
  /* the joint's History table, so the reviewer can check the signoffs alongside the record */
  { key: 'signoffHistory', label: 'Signoff History', type: 'checkbox', ownComponent: true },
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

export function lookupCatalogField(key: string): CatalogField | undefined {
  return FIELD_CATALOG.find(f => f.key === key);
}

/* a verify-grid row (keys start with "verify"): a checkbox ticked against a value its step's
   definition says where to read (verifyAgainst); a step's rows are drawn together as one grid */
export function isVerifyRow(key: string): boolean {
  return key.startsWith('verify');
}

export function isPersonField(key: string): boolean {
  return !!lookupCatalogField(key)?.personSearch;
}
