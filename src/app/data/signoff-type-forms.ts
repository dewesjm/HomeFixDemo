/* Admin > Signoff Type Forms rows: one definition per Type (Admin > Signoff Types), matched by the
   Type's value. Each says which catalog fields the Type's form has, under what conditions, and how the
   form lays them out (line numbers, widths, headings, where Inspection Results goes, see
   weld-record/signoff-forms/definition-layout.ts). The model, the starting definitions, load and
   save (localStorage). The rules that read them are in
   weld-record/signoff-forms/signoff-type-form-rules.ts. */
import { repairCodesVersion } from './repair-codes';
import { STORAGE } from './storage-keys';
import { WELD_BUILDUP_TYPE } from './signoff-types';
import { FieldCondition } from '../weld-record/conditions/form-conditions';
import { type FieldFill } from '../weld-record/catalogs/field-catalog';
import { FILLER_KEYS } from '../weld-record/signoff-forms/weld-fields';

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
  /* Degree of RT Performed: at least the joint's RT Degree for the routing's phase (Root or Final);
     unset = no minimum from the form (Attribute Code Exceptions can still set one) */
  minimum?: 'jointRtDegree';
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

/* the signoff section's fields, placed in the form by the Layout list like any field: Type,
   Inspection Results (SAT/UNSAT) and Comments */
export const TYPE_KEY = 'type';
export const DECISION_KEY = 'decision';
export const COMMENTS_KEY = 'comments';


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
   material traceability (Yes/No fields in catalogs/field-catalog.ts) */
const tackFiller: FieldCondition = {
  all: [
    { source: 'jointDetail', key: 'consumableInsertRequired', equals: 'No' },
    { source: 'jointDetail', key: 'controlledMaterial', equals: 'Yes' },
  ]
};

/* an item that shares the line of the item before it; written by the seed shorthand `same` below and
   turned into line numbers by numberLines() */
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
   the GWP line and the filler, its 5X question at the end */
function weldFields(beforeFiller: FieldActivation[] = [], atEnd: FieldActivation[] = []): FieldActivation[] {
  return [
    box('weld'), { key: 'weldProcedure', width: 320 }, same('wtn', 320), same('weldProcess', 200),
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
  ndtType('rt', [{ key: 'degreeRt', minimum: 'jointRtDegree' }, same('rtFileNumber'), DECISION, { key: 'defectCode', width: 320 }, { key: 'references' }]),
];

const RECORDS_REVIEW_FIELDS: FieldActivation[] = [
  'verifyDrawing', 'verifyDrawingRev', 'verifyJoint', 'verifyJointDesign', 'verifyWeldType',
  'verifyPipeSize', 'verifyWallThickness', 'verifyMaterial1', 'verifyMaterial2',
  'verifyMcl1', 'verifyMcl2', 'verifyNInd', 'verifyOrder', 'verifyWorkPackage',
/* Drawing Rev is also a Fit-Up Insp row, required there; here no row is required */
].map(key => key === 'verifyDrawingRev' ? { key, required: false } : { key });

function weldType(typeId: string, fields = WELD_FIELDS): TypeDefinition {
  return { typeId, fields: [TYPE, ...fields, ...BOXED_COMMENTS] };
}

/* Tack and Deferred Tack: the same fields, the filler hidden as tackFiller says */
const TACK_FIELDS = WELD_FIELDS.map(f => FILLER_KEYS.has(f.key) ? { ...f, showIf: tackFiller } : f);

const FITUP_INSP_FIELDS: FieldActivation[] = [
  { key: 'verifyMic1' }, { key: 'verifyMic2' }, { key: 'verifyDrawingRev' },
  { key: 'verifyActualThickness' }, { key: 'verifyRevisedJointDesign' },
  { key: 'releaseToWelding' }, DECISION, COMMENTS,
];

/* Affected Item and its two MIC verified rows, drawn together by the affected-item component */
const AFFECTED_ITEM_FIELDS: FieldActivation[] = [{ key: 'affectedItem' }, { key: 'affectedMicVerified1' }, { key: 'affectedMicVerified2' }];

export const DEFAULT_TYPE_DEFINITIONS: TypeDefinition[] = ([
  { typeId: 'pre-fit', fields: [...INSERT_FIELDS, ...RING_FIELDS, COMMENTS] },
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

/* ── Storage ── */

let version = 0;
export const stepFieldConfigVersion = () => version + repairCodesVersion() * 1_000_000;

let _cache: TypeDefinition[] | null = null;

export function getStepFieldConfig(): TypeDefinition[] {
  if (_cache) return _cache;
  try {
    const saved = localStorage.getItem(STORAGE.stepFieldConfig);
    _cache = saved ? JSON.parse(saved) as TypeDefinition[] : DEFAULT_TYPE_DEFINITIONS;
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
