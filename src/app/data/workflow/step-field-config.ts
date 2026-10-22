/* Per-step field activation: which catalog fields are active on each step type and under what
   conditions. The defaults mirror the current hardcoded behavior. Live overrides are stored in
   localStorage (welding:step-field-config:v1) and take effect immediately. */
import { STORAGE } from '../storage-keys';
import { FieldCondition } from './field-conditions';

/* One activated field within a step; absent conditions fall back to the catalog defaults */
export interface FieldActivation {
  key: string;
  showIf?: FieldCondition;
  disabledIf?: FieldCondition;
  required?: boolean;
}

export interface StepFieldActivation {
  stepId: string;
  fields: FieldActivation[];
  signoffFields: FieldActivation[];
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

/* Insert and ring fields: show when the joint design requires each (renderer interprets
   via jointDesignRequiresInsert / jointDesignRequiresBackingRing; catalog defaults have no showIf) */
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
    { stepId: `${phase}-ndt-${kind}`, fields, signoffFields: [] },
    { stepId: `nqc-${phase}-ndt-${kind}`, fields, signoffFields: [] },
  ];
}

/* Welding steps are not NQC-split (only fitup-insp and NDT steps are), so each gets one entry */
function weldStep(id: string, extra: FieldActivation[] = []): StepFieldActivation {
  return { stepId: id, fields: [...WELD_FIELDS, ...extra], signoffFields: [] };
}

const FITUP_INSP_FIELDS: FieldActivation[] = [
  { key: 'verifyMic1' }, { key: 'verifyMic2' }, { key: 'verifyDrawingRev' },
  { key: 'verifyActualThickness' }, { key: 'verifyRevisedJointDesign' },
];

export const DEFAULT_STEP_FIELD_ACTIVATIONS: StepFieldActivation[] = [
  { stepId: 'pre-fit', fields: [],
    signoffFields: [...INSERT_FIELDS, ...RING_FIELDS] },
  { stepId: 'fit', fields: [],
    signoffFields: [...INSERT_FIELDS, ...RING_FIELDS, { key: 'deferTack' }] },
  weldStep('tack'),
  { stepId: 'fitup-insp', fields: FITUP_INSP_FIELDS, signoffFields: [{ key: 'releaseToWelding' }] },
  { stepId: 'nqc-fitup-insp', fields: FITUP_INSP_FIELDS, signoffFields: [{ key: 'releaseToWelding' }] },
  { stepId: 'fitup-release', fields: [], signoffFields: [] },
  weldStep('deferred-tack'),
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
  { stepId: 'review-o63', fields: RECORDS_REVIEW_FIELDS, signoffFields: [] },
  { stepId: 'review-o04', fields: RECORDS_REVIEW_FIELDS, signoffFields: [] },
  { stepId: 'sold', fields: [], signoffFields: [] },
];

/* ── Storage ── */

let _cache: StepFieldActivation[] | null = null;

export function getStepFieldConfig(): StepFieldActivation[] {
  if (_cache) return _cache;
  try {
    const saved = localStorage.getItem(STORAGE.stepFieldConfig);
    _cache = saved ? JSON.parse(saved) : DEFAULT_STEP_FIELD_ACTIVATIONS;
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

/* Returns the activation for a step, falling back to defaults if not in the stored config */
export function getActivationForStep(stepId: string): StepFieldActivation {
  const config = getStepFieldConfig();
  return config.find(a => a.stepId === stepId)
    ?? DEFAULT_STEP_FIELD_ACTIVATIONS.find(a => a.stepId === stepId)
    ?? { stepId, fields: [], signoffFields: [] };
}
