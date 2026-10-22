/* Per-step field activation: which catalog fields are active on each step type, under what
   conditions, and how the form lays them out (order, fields sharing a line, widths, headings, where
   Inspection Results goes; used while the
   Layout from Signoff Type Definition toggle is on, see definition-layout.ts). The defaults mirror
   the current hardcoded behavior. Live overrides are stored in localStorage
   (welding:step-field-config:v7) and take effect immediately. */
import { STORAGE } from '../storage-keys';
import { ConditionClause, FieldCondition } from './field-conditions';
import { ENGINEERING_OVERRIDE_OFF, type FieldFill } from './field-catalog';
import { defaultDisabledIf, disabledIfToStore } from './field-rules';
import { ENGINEERING_OVERRIDE_KEY } from './condition-context';
import type { WorkflowStage } from './types';
import { FILLER_KEYS } from './weld-fields';
import { signoffTypeRowId, typeDefinition } from './signoff-types';
import { WELD_BUILDUP_DEFINITION } from './step-ids';

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
  /* drawn on the same line as the field before it */
  sameLine?: boolean;
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

/* the Layout list's place for Inspection Results (the SAT/UNSAT decision), drawn only on a step with
   a reject target */
export const DECISION_KEY = 'decision';

/* a Layout list item that isn't a field: a heading, or Inspection Results */
export function isLayoutOnlyItem(a: FieldActivation): boolean {
  return isHeadingItem(a) || a.key === DECISION_KEY;
}

/* the definition's fields, without its headings and Inspection Results */
export function definitionFields(items: FieldActivation[]): FieldActivation[] {
  return items.filter(a => !isLayoutOnlyItem(a));
}

/* the Layout list: a definition that doesn't place Inspection Results has it after its fields */
export function layoutItems(items: FieldActivation[]): FieldActivation[] {
  return items.some(a => a.key === DECISION_KEY) ? items : [...items, { key: DECISION_KEY }];
}

export interface StepFieldActivation {
  stepId: string;
  fields: FieldActivation[];
}

/* ── Condition shorthands ── */
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

/* layout shorthands: a field on the same line as the one before (and its width), a heading, a heading
   that starts a box, Inspection Results */
const same = (key: string, width?: number): FieldActivation => ({ key, sameLine: true, ...(width ? { width } : {}) });
const heading = (id: string, text: string): FieldActivation => ({ key: HEADING_KEY_PREFIX + id, heading: text });
const box = (id: string, text = ''): FieldActivation => ({ key: HEADING_KEY_PREFIX + id, heading: text, newBox: true });
const DECISION: FieldActivation = { key: DECISION_KEY };

/* Insert and ring fields: shown when the joint design requires each (catalog defaults) */
const INSERT_FIELDS: FieldActivation[] = [
  { key: 'consumableInsertType' }, same('consumableInsertSize'), same('consumableInsertId'),
];
const RING_FIELDS: FieldActivation[] = [
  { key: 'backingRingType' }, same('backingRingId'),
];

/* the welding steps' boxes as the weld form draws them; Root's Only Consumable Insert goes between
   Qualification Check and the filler */
function weldFields(beforeFiller: FieldActivation[] = []): FieldActivation[] {
  return [
    box('weld'), { key: 'weldProcedure', width: 320 }, same('wtn', 320), same('weldProcess', 200),
    { key: 'qualificationCheck' },
    ...beforeFiller,
    { key: 'fillerMetalType', width: 160 }, same('fillerMetalSize', 160), same('fillerMetalMic', 240),
    box('preheat', 'Preheat/Interpass'),
    heading('requirements', 'Requirements'), { key: 'phMin', width: 150 }, same('phMax', 150), same('ipMin', 150), same('ipMax', 150),
    heading('actuals', 'Actuals'), { key: 'actualPhMin', width: 150 }, same('actualPhMax', 150), same('actualIpMin', 150), same('actualIpMax', 150),
    box('position'), { key: 'weldPosition', width: 200 },
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

/* weldColor condition adds the titanium check to the catalog's inspectionType=vt default */
const NDT_VT5X_FIELDS: FieldActivation[] = [
  ...NDT_COMMON_FIELDS,
  { key: 'weldColor', showIf: titaniumVt }, DECISION,
];

/* Excavation NDT repeats whichever inspection rejected the joint, so it carries every NDT field and
   each shows only for its own Type */
const showIfMtPt: FieldCondition = { all: [{ source: 'field', key: 'inspectionType', anyOf: ['mt', 'pt'] }] };
const EXCAVATION_NDT_FIELDS: FieldActivation[] = [
  ...NDT_COMMON_FIELDS,
  { key: 'degreeRt' }, same('rtFileNumber'),
  { key: 'idAccessible', showIf: showIfMtPt }, { key: 'penetrantManufacturer' }, same('penetrantType'),
  { key: 'weldColor', showIf: titaniumVt },
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
    { stepId: `${phase}-ndt-${kind}`, fields },
    { stepId: `nqc-${phase}-ndt-${kind}`, fields },
  ];
}

/* Welding steps are not NQC-split (only fitup-insp and NDT steps are), so each gets one entry */
function weldStep(id: string, fields = WELD_FIELDS): StepFieldActivation {
  return { stepId: id, fields };
}

function tackStep(id: string): StepFieldActivation {
  const fields = WELD_FIELDS.map(f => FILLER_KEYS.has(f.key) ? { ...f, showIf: tackFiller } : f);
  return { stepId: id, fields };
}

const FITUP_INSP_FIELDS: FieldActivation[] = [
  { key: 'verifyMic1' }, { key: 'verifyMic2' }, { key: 'verifyDrawingRev' },
  { key: 'verifyActualThickness' }, { key: 'verifyRevisedJointDesign' },
];

/* Affected Item and its two MIC verified rows, drawn together by the affected-item component */
const AFFECTED_ITEM_FIELDS: FieldActivation[] = [{ key: 'affectedItem' }, { key: 'affectedMicVerified1' }, { key: 'affectedMicVerified2' }];

export const DEFAULT_STEP_FIELD_ACTIVATIONS: StepFieldActivation[] = [
  { stepId: 'pre-fit', fields: [...INSERT_FIELDS, ...RING_FIELDS] },
  { stepId: 'fit', fields: [...INSERT_FIELDS, ...RING_FIELDS, { key: 'deferTack' }] },
  { stepId: WELD_BUILDUP_DEFINITION, fields: [...AFFECTED_ITEM_FIELDS, ...WELD_FIELDS] },
  tackStep('tack'),
  { stepId: 'fitup-insp', fields: [...FITUP_INSP_FIELDS, { key: 'releaseToWelding' }] },
  { stepId: 'nqc-fitup-insp', fields: [...FITUP_INSP_FIELDS, { key: 'releaseToWelding' }] },
  { stepId: 'fitup-release', fields: [] },
  tackStep('deferred-tack'),
  weldStep('root-weld', weldFields([{ key: 'consumableInsertOnly', showIf: rootWeldOnly }])),
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
  { stepId: 'repair', fields: [{ key: 'repairType' }, { key: 'allowableThicknessExceeded' }, { key: 'references' }] },
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

/* definitions saved before References was a field (v2) get it wherever it's on by default */
const PRE_REFERENCES_KEY = 'welding:step-field-config:v2';
function withReferences(a: StepFieldActivation): StepFieldActivation {
  const byDefault = DEFAULT_STEP_FIELD_ACTIVATIONS.find(d => d.stepId === a.stepId)?.fields.some(f => f.key === 'references');
  return byDefault && !a.fields.some(f => f.key === 'references') ? { ...a, fields: [...a.fields, { key: 'references' }] } : a;
}

/* definitions saved before the layout settings (v3) get the default layout: fields the default lists
   in its order with its same-line settings, widths, headings and Inspection Results, the others after
   them as saved */
const PRE_LAYOUT_KEY = 'welding:step-field-config:v3';
export function withDefaultLayout(a: StepFieldActivation): StepFieldActivation {
  const def = DEFAULT_STEP_FIELD_ACTIVATIONS.find(d => d.stepId === a.stepId)?.fields;
  if (!def) return a;
  const saved = new Map(a.fields.map(f => [f.key, f]));
  const ordered: FieldActivation[] = [];
  let headings: FieldActivation[] = [];
  for (const d of def) {
    if (isLayoutOnlyItem(d)) { headings.push(d); continue; }
    const f = saved.get(d.key);
    if (!f) continue;
    ordered.push(...headings, { ...f, ...(d.sameLine && { sameLine: true }), ...(d.width ? { width: d.width } : {}) });
    headings = [];
  }
  const extra = a.fields.filter(f => !def.some(d => d.key === f.key));
  return { ...a, fields: [...ordered, ...extra] };
}

/* definitions saved before widths and Inspection Results were in the Layout list (v4) get the
   default's widths on fields that have one, and Inspection Results where the default has it: before
   Defect Code, else after the fields */
const PRE_WIDTH_KEY = 'welding:step-field-config:v4';
export function withDefaultWidths(a: StepFieldActivation): StepFieldActivation {
  const def = DEFAULT_STEP_FIELD_ACTIVATIONS.find(d => d.stepId === a.stepId)?.fields;
  if (!def) return a;
  const fields = a.fields.map(f => {
    const width = def.find(d => d.key === f.key)?.width;
    return width ? { ...f, width } : f;
  });
  if (!def.some(d => d.key === DECISION_KEY)) return { ...a, fields };
  const at = fields.findIndex(f => f.key === 'defectCode');
  return { ...a, fields: at < 0 ? [...fields, DECISION] : [...fields.slice(0, at), DECISION, ...fields.slice(at)] };
}

/* Definitions saved before Prepopulated from and Disabled when were separate rules (v5), when a fill
   also locked its field and the WTN's fills were skipped under an engineering override in code: a
   WTN fill gets "Engineering override is off", and a field its fill locked gets that fill's
   condition as its Disabled when. A field with its own Disabled when keeps it as it is. */
const PRE_SPLIT_KEY = 'welding:step-field-config:v5';
export function withSplitFill(a: StepFieldActivation): StepFieldActivation {
  return { ...a, fields: a.fields.map(splitFill) };
}

const isEngineeringClause = (c: ConditionClause) => c.source === 'stageProperty' && c.key === ENGINEERING_OVERRIDE_KEY;

function splitFill(f: FieldActivation): FieldActivation {
  if (isLayoutOnlyItem(f)) return f;
  const { disabledIf, ...rest } = f;
  const fill = f.fill?.from === 'wtn' && !f.fill.when.all.some(isEngineeringClause)
    ? { ...f.fill, when: { all: [...ENGINEERING_OVERRIDE_OFF.all, ...f.fill.when.all] } } : f.fill;
  const out: FieldActivation = fill === undefined ? rest : { ...rest, fill };
  if (disabledIf?.all.length) return { ...out, disabledIf };
  /* never prepopulated: never locked before, so never disabled now */
  if (fill === null) return defaultDisabledIf(f.key) ? { ...out, disabledIf: { all: [] } } : out;
  /* the catalog's fill: its default Disabled when is the same condition */
  if (fill === undefined) return out;
  const stored = disabledIfToStore(f.key, fill.when.all);
  return stored ? { ...out, disabledIf: stored } : out;
}

/* definitions saved before Affected Item's MIC verified rows were fields (v6) get them after
   Affected Item wherever it's listed */
const PRE_AFFECTED_MIC_KEY = 'welding:step-field-config:v6';
export function withAffectedItemMics(a: StepFieldActivation): StepFieldActivation {
  const at = a.fields.findIndex(f => f.key === 'affectedItem');
  if (at < 0 || a.fields.some(f => f.key === 'affectedMicVerified1')) return a;
  return { ...a, fields: [...a.fields.slice(0, at + 1), ...AFFECTED_ITEM_FIELDS.slice(1), ...a.fields.slice(at + 1)] };
}

const parse = (raw: string) => (JSON.parse(raw) as SavedActivation[]).map(oneList);

export function getStepFieldConfig(): StepFieldActivation[] {
  if (_cache) return _cache;
  try {
    const saved = localStorage.getItem(STORAGE.stepFieldConfig);
    const preMic = saved ? null : localStorage.getItem(PRE_AFFECTED_MIC_KEY);
    const preSplit = saved || preMic ? null : localStorage.getItem(PRE_SPLIT_KEY);
    const preWidth = saved || preMic || preSplit ? null : localStorage.getItem(PRE_WIDTH_KEY);
    const preLayout = saved || preMic || preSplit || preWidth ? null : localStorage.getItem(PRE_LAYOUT_KEY);
    const preReferences = saved || preMic || preSplit || preWidth || preLayout ? null : localStorage.getItem(PRE_REFERENCES_KEY);
    const old = preMic ? parse(preMic)
      : preSplit ? parse(preSplit).map(withSplitFill)
      : preWidth ? parse(preWidth).map(withDefaultWidths).map(withSplitFill)
      : preLayout ? parse(preLayout).map(withDefaultLayout).map(withSplitFill)
      : preReferences ? parse(preReferences).map(withReferences).map(withDefaultLayout).map(withSplitFill)
      : null;
    _cache = saved ? parse(saved) : old ? old.map(withAffectedItemMics) : DEFAULT_STEP_FIELD_ACTIVATIONS;
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
  localStorage.removeItem(PRE_AFFECTED_MIC_KEY);
  localStorage.removeItem(PRE_SPLIT_KEY);
  localStorage.removeItem(PRE_WIDTH_KEY);
  localStorage.removeItem(PRE_LAYOUT_KEY);
  localStorage.removeItem(PRE_REFERENCES_KEY);
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
