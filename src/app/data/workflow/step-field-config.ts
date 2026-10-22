/* Per-step field activation: which catalog fields are active on each step type and under what
   conditions. The defaults mirror the current hardcoded behavior. Live overrides are stored in
   localStorage (welding:step-field-config:v2) and take effect immediately. */
import { STORAGE } from '../storage-keys';
import { FieldCondition } from './field-conditions';
import type { FieldFill } from './field-catalog';
import { FILLER_KEYS } from './weld-fields';
import { signoffTypeRowId } from './signoff-types';

/* One activated field within a step; absent conditions fall back to the catalog defaults */
export interface FieldActivation {
  key: string;
  showIf?: FieldCondition;
  disabledIf?: FieldCondition;
  /* null = never filled, overriding a catalog default */
  fill?: FieldFill | null;
  required?: boolean;
}

export interface StepFieldActivation {
  stepId: string;
  fields: FieldActivation[];
}

/* ── Condition shorthands ── */
const nuclearOnly: FieldCondition = { all: [{ source: 'jointDetail', key: 'nInd', equals: '1' }] };
const titaniumVt: FieldCondition = {
  all: [
    { source: 'field', key: 'inspectionType', equals: 'vt' },
    /* 'titanium' is a virtual key resolved in buildConditionContext() via isTitaniumJoint() */
    { source: 'jointDetail', key: 'titanium', equals: 'yes' },
  ]
};
const rootWeldOnly: FieldCondition = { all: [{ source: 'stepId', matches: '^root-weld$' }] };
/* Tack's filler is hidden when a consumable insert is used, and when neither part requires
   material traceability (virtual keys in joint-facts.ts) */
const tackFiller: FieldCondition = {
  all: [
    { source: 'jointDetail', key: 'consumableInsertRequired', equals: '' },
    { source: 'jointDetail', key: 'materialTraceability', equals: 'yes' },
  ]
};

/* Insert and ring fields: shown when the joint design requires each (fit-signoff.ts) */
const INSERT_FIELDS: FieldActivation[] = [
  { key: 'consumableInsertType' }, { key: 'consumableInsertSize' }, { key: 'consumableInsertId' },
];
const RING_FIELDS: FieldActivation[] = [
  { key: 'backingRingType' }, { key: 'backingRingId' },
];

const WELD_FIELDS: FieldActivation[] = [
  { key: 'weldProcedure' }, { key: 'wtn' }, { key: 'weldProcess' },
  { key: 'qualificationCheck' },
  { key: 'fillerMetalType' }, { key: 'fillerMetalSize' }, { key: 'fillerMetalMic' },
  { key: 'phMin' }, { key: 'phMax' }, { key: 'ipMin' }, { key: 'ipMax' },
  { key: 'actualPhMin' }, { key: 'actualPhMax' }, { key: 'actualIpMin' }, { key: 'actualIpMax' },
  { key: 'weldPosition', showIf: nuclearOnly },
];

const NDT_COMMON_FIELDS: FieldActivation[] = [
  { key: 'procedureUsed' },
  { key: 'hasProbationary' }, { key: 'probationaryInspector' }, { key: 'oversightInspector' },
  { key: 'partial' }, { key: 'portionInspected' },
];

const NDT_UTRT_FIELDS: FieldActivation[] = [
  ...NDT_COMMON_FIELDS,
  { key: 'degreeRt' }, { key: 'rtFileNumber' }, { key: 'defectCode' },
];

const NDT_MTPT_FIELDS: FieldActivation[] = [
  ...NDT_COMMON_FIELDS,
  { key: 'idAccessible' }, { key: 'penetrantManufacturer' }, { key: 'penetrantType' },
];

/* weldColor condition adds the titanium check to the catalog's inspectionType=vt default */
const NDT_VT5X_FIELDS: FieldActivation[] = [
  ...NDT_COMMON_FIELDS,
  { key: 'weldColor', showIf: titaniumVt },
];

/* Excavation NDT repeats whichever inspection rejected the joint, so it carries every NDT field and
   each shows only for its own Type */
const showIfMtPt: FieldCondition = { all: [{ source: 'field', key: 'inspectionType', anyOf: ['mt', 'pt'] }] };
const EXCAVATION_NDT_FIELDS: FieldActivation[] = [
  ...NDT_COMMON_FIELDS,
  { key: 'degreeRt' }, { key: 'rtFileNumber' }, { key: 'defectCode' },
  { key: 'idAccessible', showIf: showIfMtPt }, { key: 'penetrantManufacturer' }, { key: 'penetrantType' },
  { key: 'weldColor', showIf: titaniumVt },
];

const RECORDS_REVIEW_FIELDS: FieldActivation[] = [
  'verifyDrawing', 'verifyDrawingRev', 'verifyJoint', 'verifyJointDesign', 'verifyWeldType',
  'verifyPipeSize', 'verifyWallThickness', 'verifyMaterial1', 'verifyMaterial2',
  'verifyMcl1', 'verifyMcl2', 'verifyNdt', 'verifyPwht', 'verifyNInd',
  'verifyWps', 'verifyOrder', 'verifyWorkPackage',
].map(key => ({ key }));

/* NQC copies of NDT steps (nqc- prefix, matching nqcStepId() in step-ids.ts) share the same
   field activation as the base step */
function ndtNqcPair(phase: string, kind: string, fields: FieldActivation[]): StepFieldActivation[] {
  return [
    { stepId: `${phase}-ndt-${kind}`, fields },
    { stepId: `nqc-${phase}-ndt-${kind}`, fields },
  ];
}

/* Welding steps are not NQC-split (only fitup-insp and NDT steps are), so each gets one entry */
function weldStep(id: string, extra: FieldActivation[] = []): StepFieldActivation {
  return { stepId: id, fields: [...WELD_FIELDS, ...extra] };
}

function tackStep(id: string): StepFieldActivation {
  const fields = WELD_FIELDS.map(f => FILLER_KEYS.has(f.key) ? { ...f, showIf: tackFiller } : f);
  return { stepId: id, fields };
}

const FITUP_INSP_FIELDS: FieldActivation[] = [
  { key: 'verifyMic1' }, { key: 'verifyMic2' }, { key: 'verifyDrawingRev' },
  { key: 'verifyActualThickness' }, { key: 'verifyRevisedJointDesign' },
];

export const DEFAULT_STEP_FIELD_ACTIVATIONS: StepFieldActivation[] = [
  { stepId: 'pre-fit', fields: [...INSERT_FIELDS, ...RING_FIELDS] },
  { stepId: 'fit', fields: [...INSERT_FIELDS, ...RING_FIELDS, { key: 'deferTack' }] },
  tackStep('tack'),
  { stepId: 'fitup-insp', fields: [...FITUP_INSP_FIELDS, { key: 'releaseToWelding' }] },
  { stepId: 'nqc-fitup-insp', fields: [...FITUP_INSP_FIELDS, { key: 'releaseToWelding' }] },
  { stepId: 'fitup-release', fields: [] },
  tackStep('deferred-tack'),
  weldStep('root-weld', [{ key: 'consumableInsertOnly', showIf: rootWeldOnly }]),
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
  { stepId: 'repair', fields: [{ key: 'repairType' }, { key: 'allowableThicknessExceeded' }] },
  { stepId: 'excavation-ndt', fields: EXCAVATION_NDT_FIELDS },
  { stepId: 'review-o63', fields: RECORDS_REVIEW_FIELDS },
  { stepId: 'review-o04', fields: RECORDS_REVIEW_FIELDS },
  { stepId: 'sold', fields: [] },
];

/* ── Storage ── */

let _cache: StepFieldActivation[] | null = null;

/* a saved definition may hold some fields under signoffFields; they're read into the one list */
type SavedActivation = StepFieldActivation & { signoffFields?: FieldActivation[] };
const oneList = ({ signoffFields, ...a }: SavedActivation): StepFieldActivation =>
  ({ ...a, fields: [...a.fields, ...(signoffFields ?? [])] });

export function getStepFieldConfig(): StepFieldActivation[] {
  if (_cache) return _cache;
  try {
    const saved = localStorage.getItem(STORAGE.stepFieldConfig);
    _cache = saved ? (JSON.parse(saved) as SavedActivation[]).map(oneList) : DEFAULT_STEP_FIELD_ACTIVATIONS;
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

/* the definition a step reads: its own, or the shared Repair / Excavation NDT one for any round */
export const activationStepId = (stageId: string) => signoffTypeRowId(stageId);

/* whether a step's fields come from its definition (otherwise from its template) */
export function hasStepActivation(stageId: string): boolean {
  const id = activationStepId(stageId);
  return DEFAULT_STEP_FIELD_ACTIVATIONS.some(a => a.stepId === id) || getStepFieldConfig().some(a => a.stepId === id);
}

/* Returns the activation for a step, falling back to defaults if not in the stored config */
export function getActivationForStep(stageId: string): StepFieldActivation {
  const stepId = activationStepId(stageId);
  const config = getStepFieldConfig();
  return config.find(a => a.stepId === stepId)
    ?? DEFAULT_STEP_FIELD_ACTIVATIONS.find(a => a.stepId === stepId)
    ?? { stepId, fields: [] };
}
