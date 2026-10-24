/* Signoff Type Forms: one per Type (Admin > Signoff Types), matched by the Type's value.
   Each says which catalog fields the Type's form has, under what conditions, and how the form lays them
   out (line numbers, widths, headings, where Inspection Results goes, see definition-layout.ts). A routing
   reads the definition of the Type it is being signed as, including Excavation NDT. Live overrides are stored in
   localStorage and take effect immediately. */
import { STORAGE } from '../../data/storage-keys';
import { migrateRepairConfirmationForm } from './repair-confirmation-migration';
import { FieldCondition } from './field-conditions';
import { type FieldFill } from './field-catalog';
import type { WorkflowStage } from '../model/workflow-types';
import { FILLER_KEYS } from './weld-fields';
import { signoffTypeOptions } from './signoff-types';
import { WELD_BUILDUP_TYPE } from './routing-signoff-types';
import { isExcavationNdtStageId } from '../routing/step-ids';

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

/* the signoff section's fields, placed in the form by the Layout list like any field: Type,
   Inspection Results (SAT/UNSAT) and Comments */
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

export interface TypeDefinition {
  /* the Type's value (Signoff Types),  */
  typeId: string;
  fields: FieldActivation[];
  /* unset = the default definition's, else the record */
  verifyAgainst?: VerifyAgainst;
}



/* ── Condition shorthands ── */
const ndtRootInspection: FieldCondition = { all: [{ source: 'jointDetail', key: 'ndtRoot', anyOf: ['5X', 'VT'] }] };
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
/* Comments under forms that end in a box: a box of its own, so it isn't drawn inside the last one */
const BOXED_COMMENTS: FieldActivation[] = [box('comments'), COMMENTS];

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
    ...['overridePhMin', 'overridePhMax', 'overrideIpMin', 'overrideIpMax', 'overrideNote'].map(key => ({ key })),
    ...atEnd,
  ];
}
const WELD_FIELDS = weldFields();

const NDT_COMMON_FIELDS: FieldActivation[] = [
  { key: 'procedureUsed' },
  { key: 'hasProbationary' }, same('probationaryInspector'), same('oversightInspector'),
  { key: 'partial' }, same('portionInspected'),
];

/* the NDT Types' fields; Root, Layer and Final NDT (and their NQC rows) share each one */
function ndtType(typeId: string, fields: FieldActivation[]): TypeDefinition {
  return { typeId, fields: [TYPE, QUAL_CHECK, ...NDT_COMMON_FIELDS, ...fields, COMMENTS] };
}
const NDT_TYPES: TypeDefinition[] = [
  ndtType('vt', [{ key: 'weldColor' }, DECISION]),
  ndtType('5x', [DECISION]),
  ndtType('mt', [{ key: 'idAccessible' }, DECISION]),
  ndtType('pt', [{ key: 'idAccessible' }, { key: 'penetrantManufacturer' }, same('penetrantType'), DECISION]),
  ndtType('ut', [DECISION, { key: 'references' }]),
  ndtType('rt', [{ key: 'degreeRt' }, same('rtFileNumber'), DECISION, { key: 'defectCode', width: 320 }, { key: 'references' }]),
];

const RECORDS_REVIEW_FIELDS: FieldActivation[] = [
  'verifyDrawing', 'verifyDrawingRev', 'verifyJoint', 'verifyJointDesign', 'verifyWeldType',
  'verifyPipeSize', 'verifyWallThickness', 'verifyMaterial1', 'verifyMaterial2',
  'verifyMcl1', 'verifyMcl2', 'verifyNdt', 'verifyPwht', 'verifyNInd',
  'verifyWps', 'verifyOrder', 'verifyWorkPackage',
/* Drawing Rev is also a Fit-Up Insp row, required there; here no row is required */
].map(key => key === 'verifyDrawingRev' ? { key, required: false } : { key });

function weldType(typeId: string, fields = WELD_FIELDS): TypeDefinition {
  return { typeId, fields: [TYPE, ...fields, ...BOXED_COMMENTS] };
}

/* Tack and Deferred Tack: the same fields, the filler hidden as tackFiller says */
const TACK_FIELDS = WELD_FIELDS.map(f => FILLER_KEYS.has(f.key) ? { ...f, showIf: tackFiller } : f);

const FITUP_INSP_FIELDS: FieldActivation[] = [
  QUAL_CHECK, { key: 'verifyMic1' }, { key: 'verifyMic2' }, { key: 'verifyDrawingRev' },
  { key: 'verifyActualThickness' }, { key: 'verifyRevisedJointDesign' },
  { key: 'releaseToWelding' }, DECISION, COMMENTS,
];

/* Affected Item and its two MIC verified rows, drawn together by the affected-item component */
const AFFECTED_ITEM_FIELDS: FieldActivation[] = [{ key: 'affectedItem' }, { key: 'affectedMicVerified1' }, { key: 'affectedMicVerified2' }];

export const DEFAULT_TYPE_DEFINITIONS: TypeDefinition[] = ([
  { typeId: 'pre-fit', fields: [QUAL_CHECK, ...INSERT_FIELDS, ...RING_FIELDS, COMMENTS] },
  { typeId: 'fit', fields: [TYPE, ...INSERT_FIELDS, ...RING_FIELDS, { key: 'deferTack' }, COMMENTS] },
  weldType(WELD_BUILDUP_TYPE, [...AFFECTED_ITEM_FIELDS, ...WELD_FIELDS]),
  weldType('tack', TACK_FIELDS),
  weldType('deferred-tack', TACK_FIELDS),
  { typeId: 'fitup-insp', fields: FITUP_INSP_FIELDS, verifyAgainst: 'fabrication' },
  { typeId: 'fitup-release', fields: [COMMENTS] },
  weldType('root', weldFields([{ key: 'consumableInsertOnly' }], [box('performed5x'), { key: 'performed5x', showIf: ndtRootInspection, width: 400 }])),
  ...NDT_TYPES,
  weldType('interim'),
  weldType('final-weld'),
  { typeId: 'repair', fields: [TYPE, { key: 'repairType' }, { key: 'allowableThicknessExceededN1' }, { key: 'allowableThicknessExceededN23' }, { key: 'references' }, COMMENTS] },
  { typeId: 'review-o63', fields: [...RECORDS_REVIEW_FIELDS, SIGNOFF_HISTORY, DECISION, COMMENTS], verifyAgainst: 'record' },
  { typeId: 'review-o04', fields: [...RECORDS_REVIEW_FIELDS, SIGNOFF_HISTORY, DECISION, COMMENTS], verifyAgainst: 'record' },
  { typeId: 'sold', fields: [] },
] satisfies TypeDefinition[]).map(a => ({ ...a, fields: numberLines(a.fields) }));

/* what a step whose Type hasn't been picked yet shows: only the Type droplist */
const TYPE_ONLY: TypeDefinition = { typeId: '', fields: [{ ...TYPE, line: 1 }] };

/* ── Storage ── */

let version = 0;
export const stepFieldConfigVersion = () => version;

let _cache: TypeDefinition[] | null = null;

/* Upgrade only the previous default visibility rule; retain customized conditions. */
function migrateRootInspectionQuestion(definition: TypeDefinition): TypeDefinition {
  const oldRule = { all: [{ source: 'jointDetail', key: 'ndtRoot', equals: '5X' }] };
  const fields = definition.fields.map(field =>
    definition.typeId === 'root' && field.key === 'performed5x'
      && JSON.stringify(field.showIf) === JSON.stringify(oldRule)
      ? { ...field, showIf: ndtRootInspection } : field);
  return { ...definition, fields: numberLines(fields) };
}
export function getStepFieldConfig(): TypeDefinition[] {
  if (_cache) return _cache;
  try {
    const saved = localStorage.getItem(STORAGE.stepFieldConfig);
    _cache = saved ? (JSON.parse(saved) as TypeDefinition[]).map(migrateRepairConfirmationForm).map(migrateRootInspectionQuestion) : DEFAULT_TYPE_DEFINITIONS;
  } catch {
    _cache = DEFAULT_TYPE_DEFINITIONS;
  }
  return _cache!;
}

export function setStepFieldConfig(config: TypeDefinition[]): void {
  version++;
  _cache = config;
  localStorage.setItem(STORAGE.stepFieldConfig, JSON.stringify(config));
}

export function resetStepFieldConfig(): void {
  version++;
  _cache = null;
  localStorage.removeItem(STORAGE.stepFieldConfig);
}

/* a definition by its id (a Type's value), or a step, which reads the definition of its Type */
export type StepRef = string | Pick<WorkflowStage, 'id' | 'signoffType'> & Partial<Pick<WorkflowStage, 'insertion' | 'typeOptions'>>;

/* the definition a step reads: its Type's, including Excavation NDT; '' while
   the step has Types but none is picked yet; undefined for a step with no Types (Engineering Hold, a
   routing without a Signoff Types By Routing row), which has no form */
export function definitionId(step: StepRef): string | undefined {
  if (typeof step === 'string') return step;
  if (isExcavationNdtStageId(step.id)) return step.signoffType === 'standard' ? '' : step.signoffType;
  const options = step.insertion ? step.typeOptions : signoffTypeOptions(step.id);
  if (!options) return undefined;
  return options.some(o => o.value === step.signoffType) ? step.signoffType : '';
}

function findDefinition(step: StepRef): TypeDefinition | undefined {
  const id = definitionId(step);
  if (id === undefined) return undefined;
  if (!id) return TYPE_ONLY;
  return getStepFieldConfig().find(a => a.typeId === id) ?? DEFAULT_TYPE_DEFINITIONS.find(a => a.typeId === id);
}

/* whether a step's fields come from a definition (otherwise from its template): its Type has one */
export function hasStepActivation(step: StepRef): boolean {
  return !!findDefinition(step);
}

/* a field's settings on a step: its definition's entry, else the catalog defaults (a step with no
   definition, or a field its definition doesn't list) */
export function fieldActivation(step: StepRef, key: string): FieldActivation {
  return findDefinition(step)?.fields.find(a => a.key === key) ?? { key };
}

/* whether the step's definition lists the field; used for fields its own form draws (Release to
   welding, Affected Item), which show only when listed */
export function definitionHas(step: StepRef, key: string): boolean {
  return !!findDefinition(step)?.fields.some(a => a.key === key);
}

/* the definition a step reads, or an empty one when it has none */
export function getActivationForStep(step: StepRef): TypeDefinition {
  return findDefinition(step) ?? { typeId: definitionId(step) ?? '', fields: [] };
}

/* what the step's verify-grid rows are checked against */
export function verifyAgainst(step: StepRef): VerifyAgainst {
  const id = definitionId(step);
  return getActivationForStep(step).verifyAgainst
    ?? DEFAULT_TYPE_DEFINITIONS.find(a => a.typeId === id)?.verifyAgainst ?? 'record';
}
