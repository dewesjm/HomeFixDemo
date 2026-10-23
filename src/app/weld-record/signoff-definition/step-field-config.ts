/* Per-step field activation: which catalog fields are active on each step type, under what
   conditions, and how the form lays them out (line numbers, widths, headings, where
   Inspection Results goes, see definition-layout.ts). Live overrides are stored in localStorage
   (welding:step-field-config:v11) and take effect immediately. */
import { STORAGE } from '../../data/storage-keys';
import { FieldCondition } from './field-conditions';
import { type FieldFill } from './field-catalog';
import type { WorkflowStage } from '../model/workflow-types';
import { FILLER_KEYS } from './weld-fields';
import { signoffTypeRowId, typeDefinition } from './signoff-types';
import { WELD_BUILDUP_DEFINITION } from '../routing/step-ids';

/* One activated field within a step; absent conditions fall back to the catalog defaults */
export interface FieldActivation {
  key: string;
  showIf?: FieldCondition;
  disabledIf?: FieldCondition;
  /* Prepopulated from; null = not prepopulated, overriding a catalog default */
  fill?: FieldFill | null;
  required?: boolean;
  /* required only while this holds; an empty condition = always, overriding a catalog default */
  requiredIf?: FieldCondition;
  /* the error shown when it's required and left empty (or unchecked); unset = the standard wording */
  requiredMessage?: string;
  /* the form line it's drawn on: items with the same number sit side by side, in list order. The
     list is kept sorted by it (one count for the whole form, headings included) */
  line?: number;
  /* the most it's drawn wide, in pixels (narrow screens shrink it); unset = it shares its line's width */
  width?: number;
  /* a heading item, not a field: its text (may be blank for a box), and whether it starts a new box */
  heading?: string;
  newBox?: boolean;
}

/* heading items' keys start with this, so they never match a catalog field */
export const HEADING_KEY_PREFIX = 'heading:';

export function isHeadingItem(a: FieldActivation): boolean {
  return a.heading !== undefined;
}

/* the signoff section's fields, drawn by the sign-off panel: Type above the form, Inspection Results
   (SAT/UNSAT) where the Layout list places it, Comments below the form */
export const TYPE_KEY = 'type';
export const DECISION_KEY = 'decision';
export const COMMENTS_KEY = 'comments';

/* a Layout list item that isn't a field: a heading */
export function isLayoutOnlyItem(a: FieldActivation): boolean {
  return isHeadingItem(a);
}

/* the definition's fields, without its headings */
export function definitionFields(items: FieldActivation[]): FieldActivation[] {
  return items.filter(a => !isLayoutOnlyItem(a));
}

/* what a step's verify-grid rows are checked against: the joint's Fabrication values (Fit-Up Insp)
   or its record (Records Review) */
export type VerifyAgainst = 'fabrication' | 'record';

export interface StepFieldActivation {
  stepId: string;
  fields: FieldActivation[];
  /* unset = the default definition's, else the record */
  verifyAgainst?: VerifyAgainst;
}

/* ── Condition shorthands ── */
const ndtRoot5x: FieldCondition = { all: [{ source: 'jointDetail', key: 'ndtRoot', equals: '5X' }] };
/* Tack's filler is hidden when a consumable insert is used, and when neither part requires
   material traceability (virtual keys in joint-facts.ts) */
const tackFiller: FieldCondition = {
  all: [
    { source: 'jointDetail', key: 'consumableInsertRequired', equals: '' },
    { source: 'jointDetail', key: 'materialTraceability', equals: 'yes' },
  ]
};

/* an item that shares the line of the item before it; written by the seed shorthand `same` below and
   by saves from before line numbers, and turned into line numbers by numberLines() */
type SameLineItem = FieldActivation & { sameLine?: boolean };

/* every item without a line number gets one: the line of the item before when it's marked to share
   it, else the next number */
export function numberLines(items: SameLineItem[]): FieldActivation[] {
  let last = 0, max = 0;
  return items.map(({ sameLine, ...a }) => {
    const line = a.line ?? (sameLine && last ? last : max + 1);
    last = line;
    max = Math.max(max, line);
    return { ...a, line };
  });
}

/* layout shorthands: a field on the same line as the one before (and its width), a heading, a heading
   that starts a box, Inspection Results */
const same = (key: string, width?: number): SameLineItem => ({ key, sameLine: true, ...(width ? { width } : {}) });
const heading = (id: string, text: string): FieldActivation => ({ key: HEADING_KEY_PREFIX + id, heading: text });
const box = (id: string, text = ''): FieldActivation => ({ key: HEADING_KEY_PREFIX + id, heading: text, newBox: true });
const DECISION: FieldActivation = { key: DECISION_KEY };
/* the signer's quals checked against the joint's condition quals (Admin > Qualifications) */
const QUAL_CHECK: FieldActivation = { key: 'qualificationCheck' };
const TYPE: FieldActivation = { key: TYPE_KEY };
const COMMENTS: FieldActivation = { key: COMMENTS_KEY };
const SIGNOFF_HISTORY: FieldActivation = { key: 'signoffHistory' };

/* Insert and ring fields: shown when the joint design requires each (catalog defaults) */
const INSERT_FIELDS: FieldActivation[] = [
  { key: 'consumableInsertType' }, same('consumableInsertSize'), same('consumableInsertId'),
];
const RING_FIELDS: FieldActivation[] = [
  { key: 'backingRingType' }, same('backingRingId'),
];

/* the welding steps' boxes; Root's Only Consumable Insert goes between
   Qualification Check and the filler, its 5X question at the end */
function weldFields(beforeFiller: FieldActivation[] = [], atEnd: FieldActivation[] = []): FieldActivation[] {
  return [
    box('weld'), { key: 'weldProcedure', width: 320 }, same('wtn', 320), same('weldProcess', 200),
    { key: 'qualificationCheck' },
    ...beforeFiller,
    { key: 'fillerMetalType', width: 160 }, same('fillerMetalSize', 160), same('fillerMetalMic', 240),
    box('preheat', 'Preheat/Interpass'),
    heading('requirements', 'Requirements'), { key: 'phMin', width: 150 }, same('phMax', 150), same('ipMin', 150), same('ipMax', 150),
    heading('actuals', 'Actuals'), { key: 'actualPhMin', width: 150 }, same('actualPhMax', 150), same('actualIpMin', 150), same('actualIpMax', 150),
    box('position'), { key: 'weldPosition', width: 200 },
    ...atEnd,
  ];
}
const WELD_FIELDS = weldFields();

const NDT_COMMON_FIELDS: FieldActivation[] = [
  { key: 'procedureUsed' },
  { key: 'hasProbationary' }, same('probationaryInspector'), same('oversightInspector'),
  { key: 'partial' }, same('portionInspected'),
];

const NDT_UTRT_FIELDS: FieldActivation[] = [
  ...NDT_COMMON_FIELDS,
  { key: 'degreeRt' }, same('rtFileNumber'), DECISION, { key: 'defectCode', width: 320 }, { key: 'references' },
];

const NDT_MTPT_FIELDS: FieldActivation[] = [
  ...NDT_COMMON_FIELDS,
  { key: 'idAccessible' }, { key: 'penetrantManufacturer' }, same('penetrantType'), DECISION,
];

const NDT_VT5X_FIELDS: FieldActivation[] = [
  ...NDT_COMMON_FIELDS,
  { key: 'weldColor' }, DECISION,
];

/* Excavation NDT repeats whichever inspection rejected the joint, so it carries every NDT field and
   each shows only for its own Type */
const showIfMtPt: FieldCondition = { all: [{ source: 'field', key: 'inspectionType', anyOf: ['mt', 'pt'] }] };
const EXCAVATION_NDT_FIELDS: FieldActivation[] = [
  ...NDT_COMMON_FIELDS,
  { key: 'degreeRt' }, same('rtFileNumber'),
  { key: 'idAccessible', showIf: showIfMtPt }, { key: 'penetrantManufacturer' }, same('penetrantType'),
  { key: 'weldColor' },
  DECISION, { key: 'defectCode', width: 320 },
];

const RECORDS_REVIEW_FIELDS: FieldActivation[] = [
  'verifyDrawing', 'verifyDrawingRev', 'verifyJoint', 'verifyJointDesign', 'verifyWeldType',
  'verifyPipeSize', 'verifyWallThickness', 'verifyMaterial1', 'verifyMaterial2',
  'verifyMcl1', 'verifyMcl2', 'verifyNdt', 'verifyPwht', 'verifyNInd',
  'verifyWps', 'verifyOrder', 'verifyWorkPackage',
/* Drawing Rev is also a Fit-Up Insp row, required there; here no row is required */
].map(key => key === 'verifyDrawingRev' ? { key, required: false } : { key });

/* NQC copies of NDT steps (nqc- prefix, matching nqcStepId() in step-ids.ts) share the same
   field activation as the base step */
function ndtNqcPair(phase: string, kind: string, fields: FieldActivation[]): StepFieldActivation[] {
  return [
    { stepId: `${phase}-ndt-${kind}`, fields: [TYPE, QUAL_CHECK, ...fields, COMMENTS] },
    { stepId: `nqc-${phase}-ndt-${kind}`, fields: [TYPE, QUAL_CHECK, ...fields, COMMENTS] },
  ];
}

/* Welding steps are not NQC-split (only fitup-insp and NDT steps are), so each gets one entry */
function weldStep(id: string, fields = WELD_FIELDS): StepFieldActivation {
  return { stepId: id, fields: [TYPE, ...fields, COMMENTS] };
}

function tackStep(id: string): StepFieldActivation {
  return weldStep(id, WELD_FIELDS.map(f => FILLER_KEYS.has(f.key) ? { ...f, showIf: tackFiller } : f));
}

const FITUP_INSP_FIELDS: FieldActivation[] = [
  QUAL_CHECK, { key: 'verifyMic1' }, { key: 'verifyMic2' }, { key: 'verifyDrawingRev' },
  { key: 'verifyActualThickness' }, { key: 'verifyRevisedJointDesign' },
  { key: 'releaseToWelding' }, DECISION, COMMENTS,
];

/* Affected Item and its two MIC verified rows, drawn together by the affected-item component */
const AFFECTED_ITEM_FIELDS: FieldActivation[] = [{ key: 'affectedItem' }, { key: 'affectedMicVerified1' }, { key: 'affectedMicVerified2' }];

export const DEFAULT_STEP_FIELD_ACTIVATIONS: StepFieldActivation[] = ([
  { stepId: 'pre-fit', fields: [QUAL_CHECK, ...INSERT_FIELDS, ...RING_FIELDS, COMMENTS] },
  { stepId: 'fit', fields: [TYPE, ...INSERT_FIELDS, ...RING_FIELDS, { key: 'deferTack' }, COMMENTS] },
  /* Fit signed as Weld Build-Up shows Type as Fit's own definition says, so it isn't listed here */
  { stepId: WELD_BUILDUP_DEFINITION, fields: [...AFFECTED_ITEM_FIELDS, ...WELD_FIELDS, COMMENTS] },
  tackStep('tack'),
  { stepId: 'fitup-insp', fields: FITUP_INSP_FIELDS, verifyAgainst: 'fabrication' },
  { stepId: 'nqc-fitup-insp', fields: FITUP_INSP_FIELDS, verifyAgainst: 'fabrication' },
  { stepId: 'fitup-release', fields: [COMMENTS] },
  tackStep('deferred-tack'),
  weldStep('root-weld', weldFields([{ key: 'consumableInsertOnly' }], [box('performed5x'), { key: 'performed5x', showIf: ndtRoot5x, width: 400 }])),
  ...ndtNqcPair('root', 'vt5x', NDT_VT5X_FIELDS),
  ...ndtNqcPair('root', 'mtpt', NDT_MTPT_FIELDS),
  ...ndtNqcPair('root', 'utrt', NDT_UTRT_FIELDS),
  weldStep('root-layer'),
  ...ndtNqcPair('layer', 'vt5x', NDT_VT5X_FIELDS),
  ...ndtNqcPair('layer', 'mtpt', NDT_MTPT_FIELDS),
  ...ndtNqcPair('layer', 'utrt', NDT_UTRT_FIELDS),
  weldStep('final-weld'),
  ...ndtNqcPair('final', 'vt5x', NDT_VT5X_FIELDS),
  ...ndtNqcPair('final', 'mtpt', NDT_MTPT_FIELDS),
  ...ndtNqcPair('final', 'utrt', NDT_UTRT_FIELDS),
  /* every Repair / Excavation NDT round reads these rows (activationStepId) */
  { stepId: 'repair', fields: [TYPE, { key: 'repairType' }, { key: 'allowableThicknessExceeded' }, { key: 'references' }, COMMENTS] },
  { stepId: 'excavation-ndt', fields: [TYPE, QUAL_CHECK, ...EXCAVATION_NDT_FIELDS, COMMENTS] },
  { stepId: 'review-o63', fields: [...RECORDS_REVIEW_FIELDS, SIGNOFF_HISTORY, DECISION, COMMENTS], verifyAgainst: 'record' },
  { stepId: 'review-o04', fields: [...RECORDS_REVIEW_FIELDS, SIGNOFF_HISTORY, DECISION, COMMENTS], verifyAgainst: 'record' },
  { stepId: 'sold', fields: [] },
] satisfies StepFieldActivation[]).map(a => ({ ...a, fields: numberLines(a.fields) }));

/* ── Storage ── */

let _cache: StepFieldActivation[] | null = null;

export function getStepFieldConfig(): StepFieldActivation[] {
  if (_cache) return _cache;
  try {
    const saved = localStorage.getItem(STORAGE.stepFieldConfig);
    _cache = saved
      ? (JSON.parse(saved) as StepFieldActivation[]).map(a => ({ ...a, fields: numberLines(a.fields) }))
      : DEFAULT_STEP_FIELD_ACTIVATIONS;
  } catch {
    _cache = DEFAULT_STEP_FIELD_ACTIVATIONS;
  }
  return _cache!;
}

export function setStepFieldConfig(config: StepFieldActivation[]): void {
  _cache = config;
  localStorage.setItem(STORAGE.stepFieldConfig, JSON.stringify(config));
}

export function resetStepFieldConfig(): void {
  _cache = null;
  localStorage.removeItem(STORAGE.stepFieldConfig);
}

/* a step by id, or the step itself, whose Type can pick a different definition */
export type StepRef = string | Pick<WorkflowStage, 'id' | 'signoffType'>;

/* the definition a step reads: the one its Type loads (Admin > Signoff Type Availability, e.g. Weld
   Build-Up's for Fit signed as Weld Build-Up, Final Weld's for Layer signed as Final Weld), the shared
   Repair / Excavation NDT one for any round, otherwise its own */
export function activationStepId(step: StepRef): string {
  if (typeof step !== 'string') {
    const loaded = typeDefinition(step.id, step.signoffType);
    if (loaded) return loaded;
  }
  return signoffTypeRowId(typeof step === 'string' ? step : step.id);
}

/* whether a step's fields come from its definition (otherwise from its template) */
export function hasStepActivation(step: StepRef): boolean {
  const id = activationStepId(step);
  return DEFAULT_STEP_FIELD_ACTIVATIONS.some(a => a.stepId === id) || getStepFieldConfig().some(a => a.stepId === id);
}

/* a field's settings on a step: its definition's entry, else the catalog defaults (a step with no
   definition, or a field its definition doesn't list) */
export function fieldActivation(step: StepRef, key: string): FieldActivation {
  const listed = hasStepActivation(step) ? getActivationForStep(step).fields.find(a => a.key === key) : undefined;
  return listed ?? { key };
}

/* whether the step's definition lists the field; used for fields its own form draws (Release to
   welding, Affected Item), which show only when listed */
export function definitionHas(step: StepRef, key: string): boolean {
  return hasStepActivation(step) && getActivationForStep(step).fields.some(a => a.key === key);
}

/* Returns the activation for a step, falling back to defaults if not in the stored config */
export function getActivationForStep(step: StepRef): StepFieldActivation {
  const stepId = activationStepId(step);
  const config = getStepFieldConfig();
  return config.find(a => a.stepId === stepId)
    ?? DEFAULT_STEP_FIELD_ACTIVATIONS.find(a => a.stepId === stepId)
    ?? { stepId, fields: [] };
}

/* what the step's verify-grid rows are checked against */
export function verifyAgainst(step: StepRef): VerifyAgainst {
  const stepId = activationStepId(step);
  return getActivationForStep(step).verifyAgainst
    ?? DEFAULT_STEP_FIELD_ACTIVATIONS.find(a => a.stepId === stepId)?.verifyAgainst ?? 'record';
}
