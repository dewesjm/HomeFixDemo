/* The one list of everything available for configuration. Each entry says what the field is and where
   its value comes from, its Source: Joint Details, Calculated, Fabrication or Signoff Form.
   The catalog says what a field is; other code decides when it is used. Which fields each admin screen
   offers, and the per-routing fields generated from these rows, are in field-choices.ts. The Fabrication
   form builds its fields from fabrication/fabrication-fields.ts; this list only maps them in. */
import { PROGRESSION_ATTRIBUTE_CODES } from '../../data/attribute-codes';
import { defectCodeOptions } from '../../data/defect-codes';
import { inspectionProcedureOptions } from '../../data/inspection-procedures';
import { getJointDesign, jointDesignOptions } from '../../data/joint-designs';
import { Job, MCL_POOL, N_IND_POOL, NDT_EACH_VALUES, NDT_REQUIREMENT_VALUES, PIPE_SIZES, RT_DEGREE_OPTIONS, WALL_THICKNESSES, WELD_TYPES } from '../../data/jobs';
import { hasMaterialFlag, MaterialFlag } from '../../data/material-classification';
import { requiresTraceability } from '../../data/mcl-traceability';
import { NDT_LABELS } from '../../data/ndt-labels';
import { penetrantManufacturerOptions, penetrantTypeOptions } from '../../data/penetrants';
import { FILLER_METAL_SIZE_OPTIONS, FILLER_METAL_TYPE_OPTIONS } from '../../data/procedures';
import { isShipboardLocation, locationOptions } from '../../data/locations';
import { weldColorOptions } from '../../data/weld-colors';
import { weldPositionOptions } from '../../data/weld-positions';
import { jointAttributeCodes } from '../attribute-codes/attribute-context';
import { FABRICATION_FIELDS } from '../fabrication/rules/fabrication-fields';
import { jointDetailsUt, jointDetailsVt } from '../joint-details/rules/joint-details-values';
import { WorkflowStage } from '../model/workflow-types';
import { fabricationSigned } from '../fabrication/rules/fabrication-steps';
import { nqcStepId } from '../routing/routing-ids';
import { FieldCondition } from '../signoff-definition/field-conditions';
import { repairCodeOptions } from '../signoff-definition/repair-code-options';
import { ENGINEERING_OVERRIDE_KEY, REJECTED_PHASE_UTRT_KEY } from '../signoff-definition/stage-property-keys';

/* ── What an entry is ── */

export type FieldSource = 'Joint Details' | 'Calculated' | 'Fabrication' | 'Signoff Form';

/* the part of a workflow stage a condition reads (kept structural to avoid importing the workflow files) */
export interface StageAnswers {
  id: string;
  signed: boolean;
  inputs: Record<string, string>;
  signoffInputs: Record<string, string>;
  inspectionType?: string;
  insertion?: { originInspectionType?: string };
}

export type Fabrication = Record<string, string>;

/* a field a condition can test: a catalog row, or one field-choices.ts generates for a routing */
export interface ConditionCatalogField {
  key: string;
  label: string;
  source: Exclude<FieldSource, 'Signoff Form'> | 'Routing answers' | 'This routing';
  values: string[];       /* none = a typed value (is / is not compare whole text, any case) */
  /* only has a value once a routing is signed or Fabrication is filled in, so it is re-checked as the joint moves */
  stepAnswer?: boolean;
  get: (job: Job, stages: StageAnswers[], fab?: Fabrication) => string;
  /* shown instead of the stored value (a routing's own option values, e.g. straw -> Straw) */
  valueLabel?: (v: string) => string;
  /* a Yes/No field's sentence in a Signoff Type Form's rule text */
  yesText?: string;
  noText?: string;
}

const FIELD_TYPE_LABELS = { text: 'Text', number: 'Number', select: 'Droplist', checkbox: 'Checkbox', radio: 'Radio' } as const;

type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'radio';

/* "Prepopulated from ... when": when `when` starts holding (checked against this step's own fields
   and whether an engineering override has it), or its source changes while it holds, the field
   copies the source's value; it's blanked when `when` stops holding. Whether it can be typed into
   is its separate Disabled when rule. The source is another step's recorded value, a field on this
   same step, or the WTN's WPS. */
export type FieldFill = { fieldKey: string; when: FieldCondition }
  & ({ from?: 'step'; stepId: string } | { from: 'thisStep' } | { from: 'wtn' });

/* an input a signoff form can show */
interface CatalogField {
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
  /* saved with the sign-off on whichever step lists it (Comments) */
  signoffValue?: boolean;
  /* drawn by its own component on whichever step lists it, never as an ordinary field */
  ownComponent?: boolean;
  /* typed with the person search (a name from People) */
  personSearch?: boolean;
  /* the Type shown in admin when it isn't a plain input (References, Signoff History, Affected Item: 'Special') */
  typeLabel?: string;
}

/* A catalog field with the form's rules evaluated for this signoff. Never stored on a routing. */
export interface FormField extends CatalogField {
  required?: boolean;
  requiredMessage?: string;
}

/* a Signoff Form field the built-in rules read by a fixed key, once its routing is signed */
export interface FixedAnswer {
  key: string;
  stageIds: string[];
  label: string;
}

type SignoffFormRow = CatalogField & { fixedAnswer?: FixedAnswer };

export type RuleEntry = ConditionCatalogField & { source: Exclude<FieldSource, 'Signoff Form'> };
export type SignoffFormEntry = SignoffFormRow & { source: 'Signoff Form' };
export type CatalogEntry = RuleEntry | SignoffFormEntry;

/* sets the Source on the rows themselves: copying them would freeze rows whose options are live getters */
function inSection<S extends FieldSource, R extends object>(source: S, rows: R[]): (R & { source: S })[] {
  for (const row of rows) (row as R & { source: S }).source = source;
  return rows as (R & { source: S })[];
}

type RuleRow = Omit<ConditionCatalogField, 'source'>;

const YES_NO = ['Yes', 'No'];
const yesNo = (b: boolean) => b ? 'Yes' : 'No';
const upper = (v: string) => (v || '').trim().toUpperCase();
const RT_DEGREES = ['NA', '10', '100', '360', '60', '75'];

/* ── Joint Details: what the Joint Details panel shows (Routing left out: it's what these rules decide).
   UT/VT read the same values the panel shows (UT X or -, VT X or blank). ── */

const text = (key: keyof Job, label: string, values: string[] = []): RuleRow =>
  ({ key, label, values, get: j => String(j[key] ?? '') });

const JOINT_DETAILS: RuleEntry[] = inSection('Joint Details', [
  { key: 'nInd', label: 'N Ind.', values: N_IND_POOL, get: j => j.nInd },
  { key: 'ss', label: 'SS', values: YES_NO, get: j => yesNo(!!j.ss) },
  { key: 'sfff', label: 'SFFF', values: YES_NO, get: j => yesNo(!!j.sfff) },
  { key: 'dssAaa', label: 'DSS-AAA', values: YES_NO, get: j => yesNo(!!j.dssAaa) },
  { key: 'weldType', label: 'Weld Type', values: WELD_TYPES, get: j => j.weldType },
  { key: 'ndtRoot', label: NDT_LABELS.ndtRoot, values: NDT_REQUIREMENT_VALUES, get: j => upper(j.ndtRoot) },
  { key: 'rtRoot', label: NDT_LABELS.rtRoot, values: RT_DEGREES, get: j => j.rtRoot },
  { key: 'ndtEach', label: NDT_LABELS.ndtEach, values: ['', ...NDT_EACH_VALUES], valueLabel: v => v || 'Blank', get: j => upper(j.ndtEach) },
  { key: 'ndtFinal', label: NDT_LABELS.ndtFinal, values: NDT_REQUIREMENT_VALUES, get: j => upper(j.ndtFinal) },
  { key: 'rtFinal', label: NDT_LABELS.rtFinal, values: RT_DEGREES, get: j => j.rtFinal },
  text('xrefid', 'XREFID'), text('ship', 'Ship'), text('hull', 'Hull'), text('drawing', 'Drawing'),
  text('drawingRev', 'Drawing Rev'), text('joint', 'Joint'), text('jointDesign', 'Joint Design'),
  text('pipeSize', 'Pipe Size', PIPE_SIZES), text('wallThickness', 'Wall Thickness', WALL_THICKNESSES),
  text('sequenceNumber', 'Sequence #'), text('engineeringNotes', 'Engineering Notes'),
  text('mcl1', 'MCL 1', MCL_POOL), text('materialType1', 'Material Type 1'), text('joiningItem', 'Joining Item'),
  text('mcl2', 'MCL 2', MCL_POOL), text('materialType2', 'Material Type 2'), text('joinToItem', 'Join To Item'),
  { key: 'ut', label: NDT_LABELS.ut, values: ['X', '-'], get: jointDetailsUt },
  { key: 'vt', label: NDT_LABELS.vt, values: ['X'], get: jointDetailsVt },
  text('order', 'Order'), text('workPackage', 'Work Package'), text('workPermit', 'Work Permit'), text('waff', 'WAFF'),
  text('serialNumber', 'Serial Number'), text('refitNumber', 'Refit #'), text('repairNumber', 'Repair #'),
  text('er1', 'ER1'), text('er2', 'ER2'), text('er3', 'ER3'), text('er4', 'ER4'),
  text('attributeCode1', 'Attribute Code 1'), text('attributeCode2', 'Attribute Code 2'),
  text('attributeCode3', 'Attribute Code 3'), text('attributeCode4', 'Attribute Code 4'),
] as RuleRow[]);

/* ── Calculated: worked out from the joint, then (stepAnswer) from what Fabrication and signoffs add ── */

/* Revised Joint Design takes priority; falls back to the Joint Details joint design */
function effectiveJointDesign(job: Job, fab: Fabrication): string {
  return (fab['revisedJointDesign'] ?? '').trim() || job.jointDesign;
}

export function jointDesignRequiresInsert(job: Job, fab: Fabrication): boolean {
  const code = effectiveJointDesign(job, fab);
  return !!code && !!getJointDesign(code)?.requiresConsumableInsert;
}

export function jointDesignRequiresBackingRing(job: Job, fab: Fabrication): boolean {
  const code = effectiveJointDesign(job, fab);
  return !!code && !!getJointDesign(code)?.requiresBackingRing;
}

/* either joint member's MCL requires material traceability (Admin > Material Traceability) */
function jointRequiresTraceability(job: Job): boolean {
  return requiresTraceability(job.mcl1) || requiresTraceability(job.mcl2);
}

export const SHIPBOARD_FIELD = 'fabricationShipboard';

const fact = (key: string, label: string, get: (job: Job, fab: Fabrication) => boolean, yesText: string, noText: string): RuleRow =>
  ({ key, label, values: YES_NO, stepAnswer: true, get: (job, _stages, fab) => yesNo(get(job, fab ?? {})), yesText, noText });

const CALCULATED: RuleEntry[] = inSection('Calculated', [
  { key: 'attributeCodes', label: 'Has attribute code (any slot)', values: PROGRESSION_ATTRIBUTE_CODES.map(a => a.code),
    get: j => jointAttributeCodes(j).join(', ') },
  ...(['nonFerrous', 'austenitic', 'titanium'] as MaterialFlag[]).map((flag): RuleRow => ({
    key: `material.${flag}`, label: `Either material is ${flag === 'nonFerrous' ? 'non-ferrous' : flag}`,
    values: YES_NO, get: job => yesNo(hasMaterialFlag(job, flag)),
    ...(flag === 'titanium' ? { yesText: 'the joint is titanium', noText: 'the joint is not titanium' } : {}),
  })),
  { key: 'jdInsert', label: 'Joint Design needs Consumable Insert', values: YES_NO,
    get: j => yesNo(!!getJointDesign(j.jointDesign)?.requiresConsumableInsert) },
  { key: 'jdRing', label: 'Joint Design needs Backing Ring', values: YES_NO,
    get: j => yesNo(!!getJointDesign(j.jointDesign)?.requiresBackingRing) },
  { key: 'controlledMaterial', label: 'Controlled Material', values: YES_NO, get: j => yesNo(jointRequiresTraceability(j)),
    yesText: 'either part requires material traceability', noText: 'neither part requires material traceability' },
  { key: 'part1Traceability', label: 'Part 1 requires material traceability', values: YES_NO, get: j => yesNo(requiresTraceability(j.mcl1)),
    yesText: 'part 1 requires material traceability', noText: 'part 1 does not require material traceability' },
  { key: 'part2Traceability', label: 'Part 2 requires material traceability', values: YES_NO, get: j => yesNo(requiresTraceability(j.mcl2)),
    yesText: 'part 2 requires material traceability', noText: 'part 2 does not require material traceability' },
  { key: SHIPBOARD_FIELD, label: 'Fabrication Location is shipboard (once Fit is signed)', values: YES_NO, stepAnswer: true,
    get: (_job, stages, fab) => fabricationSigned(stages as WorkflowStage[]) ? yesNo(isShipboardLocation(fab?.['location'])) : '' },
  fact('consumableInsertRequired', 'Current Joint Design needs Consumable Insert', jointDesignRequiresInsert,
    'the joint design needs a consumable insert', 'the joint design doesn\'t need a consumable insert'),
  fact('backingRingRequired', 'Current Joint Design needs Backing Ring', jointDesignRequiresBackingRing,
    'the joint design needs a backing ring', 'the joint design doesn\'t need a backing ring'),
  fact('revisedJointDesignEntered', 'Revised Joint Design entered', (_job, fab) => !!(fab['revisedJointDesign'] ?? '').trim(),
    'a Revised Joint Design is entered', 'no Revised Joint Design is entered'),
] as RuleRow[]);

/* ── Fabrication: every Fabrication value, blank until entered ── */

/* Location and Revised Joint Design read their admin-edited lists each time they're asked */
function fabricationOptions(key: string, own?: { label: string; value: string }[]): { label: string; value: string }[] {
  if (key === 'location') return locationOptions();
  if (key === 'revisedJointDesign') return jointDesignOptions();
  return own ?? [];
}

const FABRICATION: RuleEntry[] = inSection('Fabrication', FABRICATION_FIELDS.map((f): RuleRow => ({
  key: `fab.${f.key}`, label: `Fabrication: ${f.label}`, stepAnswer: true,
  get values() { return fabricationOptions(f.key, f.options).map(o => o.value); },
  valueLabel: v => fabricationOptions(f.key, f.options).find(o => o.value === v)?.label ?? v,
  get: (_job, _stages, fab) => fab?.[f.key] ?? '',
})));

/* ── Signoff Form: every input a signoff form can show. Signoff Type Forms picks from these; it cannot
   define fields outside them. ── */

const showIfHasProbationary: FieldCondition = { all: [{ source: 'field', key: 'hasProbationary', equals: 'yes' }] };
const showIfPartial: FieldCondition = { all: [{ source: 'field', key: 'partial', equals: 'yes' }] };
const showIfTitanium: FieldCondition = { all: [{ source: 'jointDetail', key: 'material.titanium', equals: 'Yes' }] };
const showIfUnsat: FieldCondition = { all: [{ source: 'field', key: 'result', equals: 'unsat' }] };
/* Root's filler follows Fit's Consumable Insert while "Only Consumable Insert used as filler" is checked
   (the checkbox is only on Root, so the rule never holds on other steps) */
const insertOnly: FieldCondition = { all: [{ source: 'field', key: 'consumableInsertOnly', equals: 'yes' }] };
const fillFromFit = (fieldKey: string): FieldFill => ({ stepId: 'fit', fieldKey, when: insertOnly });
/* Weld Process and the PH/IP requirements come from the WTN's WPS, except under an engineering
   override (no WTN on file, the values are typed) */
const ENGINEERING_OVERRIDE_OFF: FieldCondition = { all: [{ source: 'stageProperty', key: ENGINEERING_OVERRIDE_KEY, equals: '' }] };
const fillFromWtn = (fieldKey: string): FieldFill => ({ from: 'wtn', fieldKey, when: ENGINEERING_OVERRIDE_OFF });
/* an actual is NC while its requirement is NC */
const ifNc = (requirement: string): FieldCondition => ({ all: [{ source: 'field', key: requirement, equals: 'NC' }] });
const ncFrom = (requirement: string): FieldFill => ({ from: 'thisStep', fieldKey: requirement, when: ifNc(requirement) });

const showIfNuclear: FieldCondition = { all: [{ source: 'jointDetail', key: 'nInd', equals: '1' }] };
/* Yes/No fields from the Calculated section */
const showIfInsert: FieldCondition = { all: [{ source: 'jointDetail', key: 'consumableInsertRequired', equals: 'Yes' }] };
const showIfRing: FieldCondition = { all: [{ source: 'jointDetail', key: 'backingRingRequired', equals: 'Yes' }] };
const ifTraceability: FieldCondition = { all: [{ source: 'jointDetail', key: 'controlledMaterial', equals: 'Yes' }] };
const ifPart1Traceability: FieldCondition = { all: [{ source: 'jointDetail', key: 'part1Traceability', equals: 'Yes' }] };
const ifPart2Traceability: FieldCondition = { all: [{ source: 'jointDetail', key: 'part2Traceability', equals: 'Yes' }] };
const ifRevisedJointDesign: FieldCondition = { all: [{ source: 'jointDetail', key: 'revisedJointDesignEntered', equals: 'Yes' }] };

/* Pre-Fit and Fit hold the insert and ring fields as sign-off fields (welding-steps.ts) */
const FIT_STEPS = ['pre-fit', 'fit'];

const BACKING_RING_OPTIONS = [
  { label: 'Standard', value: 'standard' }, { label: 'Heavy', value: 'heavy' },
  { label: 'Copper', value: 'copper' }, { label: 'Ceramic', value: 'ceramic' },
];

const SIGNOFF_FORM_ROWS: SignoffFormRow[] = [
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
    get options() { return weldPositionOptions(true); } },
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
    defaultShowIf: showIfUnsat, get options() { return defectCodeOptions('', true); } },

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
  { key: 'deferTack', label: 'Defer Tack', type: 'checkbox', ownFormSteps: ['fit'],
    fixedAnswer: { key: 'fitDeferTack', stageIds: ['fit'], label: 'Fit: Defer Tack (once Fit is signed)' } },

  /* ── Weld Build-Up ── */
  /* the joint members the build-up affects (affected-item.component); at least one must be picked on
     any step that lists it */
  { key: 'affectedItem', label: 'Affected Item', type: 'checkbox', typeLabel: 'Special', ownComponent: true, defaultRequired: true },
  /* drawn under Affected Item, beside its joint member while that one is picked */
  { key: 'affectedMicVerified1', label: 'Affected Item: Joining Item MIC verified', type: 'checkbox', typeLabel: 'Special', ownComponent: true,
    defaultRequired: true, defaultShowIf: ifPart1Traceability },
  { key: 'affectedMicVerified2', label: 'Affected Item: Join To Item MIC verified', type: 'checkbox', typeLabel: 'Special', ownComponent: true,
    defaultRequired: true, defaultShowIf: ifPart2Traceability },

  /* ── Repair ── */
  { key: 'repairType', label: 'Repair Code', type: 'select', defaultRequired: true,
    get options() { return repairCodeOptions(true); } },
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
  { key: 'references', label: 'References', type: 'checkbox', typeLabel: 'Special', ownComponent: true },

  /* ── Signoff section ── (placed in the form by the Layout list on whichever step lists them) */
  /* the Type droplist; its options and default are on Admin > Signoff Type to Routing */
  { key: 'type', label: 'Type', type: 'select', ownComponent: true },
  /* SAT/UNSAT, placed in the form by the Layout list; UNSAT needs a reject target to be signed */
  { key: 'decision', label: 'Inspection Results (SAT/UNSAT)', type: 'radio', ownComponent: true, defaultRequired: true },
  /* the Comments box, saved in the step's signoffInputs */
  { key: 'comments', label: 'Comments', type: 'text', signoffValue: true },

  /* ── Fit-Up Insp ── */
  { key: 'releaseToWelding', label: 'Release to welding upon inspection', type: 'checkbox',
    fixedAnswer: { key: 'inspReleaseToWelding', stageIds: ['fitup-insp', nqcStepId('fitup-insp')], label: 'Fit-Up Insp: Release to welding (once Fit-Up Insp is signed)' } },
  /* verify-grid rows: shown when the Fabrication value they check applies; Required = must be checked */
  { key: 'verifyMic1', label: 'Joining Item MIC verified', type: 'checkbox', defaultRequired: true, defaultShowIf: ifPart1Traceability },
  { key: 'verifyMic2', label: 'Join To Item MIC verified', type: 'checkbox', defaultRequired: true, defaultShowIf: ifPart2Traceability },
  { key: 'verifyDrawingRev', label: 'Drawing Rev Execution verified', type: 'checkbox', defaultRequired: true },
  { key: 'verifyActualThickness', label: 'Actual Thickness verified', type: 'checkbox', defaultRequired: true },
  { key: 'verifyRevisedJointDesign', label: 'Revised Joint Design verified', type: 'checkbox', defaultRequired: true,
    defaultShowIf: ifRevisedJointDesign },

  /* ── Records Review ── (verify-grid rows; none required by default) */
  /* the joint's History table, so the reviewer can check the signoffs alongside the record */
  { key: 'signoffHistory', label: 'Signoff History', type: 'checkbox', typeLabel: 'Special', ownComponent: true },
  { key: 'verifyDrawing', label: 'Drawing', type: 'checkbox' },
  { key: 'verifyJoint', label: 'Joint Reference', type: 'checkbox' },
  { key: 'verifyJointDesign', label: 'Joint Design', type: 'checkbox' },
  { key: 'verifyWeldType', label: 'Weld Type', type: 'checkbox' },
  { key: 'verifyPipeSize', label: 'Pipe Size', type: 'checkbox' },
  { key: 'verifyWallThickness', label: 'Wall Thickness', type: 'checkbox' },
  { key: 'verifyMaterial1', label: 'Material Type 1', type: 'checkbox' },
  { key: 'verifyMaterial2', label: 'Material Type 2', type: 'checkbox' },
  { key: 'verifyMcl1', label: 'Joining Item MIC', type: 'checkbox' },
  { key: 'verifyMcl2', label: 'Join To Item MIC', type: 'checkbox' },
  { key: 'verifyNInd', label: 'Nuclear Indicator', type: 'checkbox' },
  { key: 'verifyOrder', label: 'Order', type: 'checkbox' },
  { key: 'verifyWorkPackage', label: 'Work Package', type: 'checkbox' },
];

export const FORM_FIELDS: SignoffFormEntry[] = inSection('Signoff Form', SIGNOFF_FORM_ROWS);

/* ── The list ── */

export const FIELD_CATALOG: CatalogEntry[] = [...JOINT_DETAILS, ...CALCULATED, ...FABRICATION, ...FORM_FIELDS];

/* a Signoff Form field by key */
export function lookupCatalogField(key: string): SignoffFormEntry | undefined {
  return FORM_FIELDS.find(f => f.key === key);
}

/* Admin describes the allowed value as well as the numeric control. */
export function catalogFieldTypeLabel(field: Pick<CatalogField, 'type' | 'allowsNc' | 'typeLabel'>): string {
  if (field.typeLabel) return field.typeLabel;
  return field.type === 'number' && field.allowsNc ? 'Number or NC' : FIELD_TYPE_LABELS[field.type];
}

/* a verify-grid row (keys start with "verify"): a checkbox ticked against a value its step's
   definition says where to read (verifyAgainst); a step's rows are drawn together as one grid */
export function isVerifyRow(key: string): boolean {
  return key.startsWith('verify');
}

export function isPersonField(key: string): boolean {
  return !!lookupCatalogField(key)?.personSearch;
}
