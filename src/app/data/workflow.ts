/* workflow model + stage helpers, no UI */
import { SEEDED_INSPECTOR_NAMES, stampWho } from './people';
import { STORAGE } from './storage-keys';
import { Job } from './jobs';

import { getJointDesign, jointDesignOptions } from './joint-designs';

/* ── Role-based queue routing ── */
export const ROLES = ['Fitting', 'Welding', 'Foreman', 'Inspector', 'NQC Inspector', 'O63 Records', 'O04 Records', 'View'] as const;
export type Role = typeof ROLES[number];
export const DEFAULT_ROLE: Role = 'View';

/* accept/reject, required to sign */
export type StageResult = 'sat' | 'unsat';

export const STAGE_RESULT_OPTIONS: { label: string; value: StageResult }[] = [
  { label: 'SAT', value: 'sat' },
  { label: 'UNSAT', value: 'unsat' }
];

/* one field a tech records on a stage */
export interface StageField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio';
  unit?: string;          /* shown by the label, e.g. PSI */
  placeholder?: string;
  /* detail: extra text shown only in the open droplist, never in the closed field (GWP/WTN descriptions) */
  options?: { label: string; value: string; detail?: string }[];
  showIf?: { key: string; equals?: string; anyOf?: string[]; and?: { key: string; equals: string }[] };   // ← declarative dependency, serializable
  fullWidth?: boolean;   /* spans full grid width */
  required?: boolean;    /* must be filled before signoff */
  disabled?: boolean;    /* read-only / information only */
  minField?: string;     /* cross-field: value must be >= this field's value */
  maxField?: string;     /* cross-field: value must be <= this field's value */
  description?: string;  /* runtime only: plain text shown under the control, e.g. the selected GWP/WTN's description */
}

/* configurable field on the per-stage sign-off panel */
export interface SignoffField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  showIf?: { key: string; equals?: string; anyOf?: string[] };
  fullWidth?: boolean;   // spans full grid width (3 columns)
}

/* sequential stages, each its own sign-off */
export interface SignoffRecord {
  stageLabel: string;
  fields: { key: string; label: string; value: string }[];
  result: StageResult | null;
  who: string;
  when: string;         /* ISO */
  action: 'signed' | 'reopened' | 'corrected';
  reason?: string;                                              /* 'corrected' only */
  changes?: { key: string; label: string; from: string; to: string }[];  /* 'corrected' only */
}

export interface WorkflowStage {
  id: string;
  label: string;
  displayName?: string;  /* override label shown on routing table */
  decisionLabel?: string; /* override 'Decision' label */
  required: boolean;
  fields: StageField[];           /* input defs copied from template */
  inputs: Record<string, string>; /* recorded values, keyed by StageField.key */
  /* configurable sign-off fields (inspector, license, notes, etc.) */
  signoffFields: SignoffField[];
  signoffInputs: Record<string, string>;
  // --- per-stage sign-off ---
  result: StageResult | null;     /* required before signing, kept special */
  rejectToStage: string;          /* stage id to route back to on reject (empty = no routing) */
  repeatable: boolean;            /* signing with routingType='repeat' inserts another copy */
  routingType: string;               /* 'standard' | 'repeat' | 'final' — chosen at signoff */
  swapStageId: string;            /* which stage template to use for fields (empty = own) */
  inspectionType: string;         /* admin-managed sub-type (e.g. MT/PT on NDT MT/PT stage) */
  routingOptions?: StageOption[];    /* admin-managed options for this stage */
  signed: boolean;
  signedAt: string | null;        /* ISO string, set when signed */
  signoffRecords: SignoffRecord[];
  role: string;                   /* role this stage routes to (e.g. 'Fitting', 'Welding') */
}

export interface Attachment {
  id: string;
  name: string;           /* filename, files not actually uploaded here */
  addedBy: string;
  addedAt: string;        /* ISO string */
}

/* one editable field as it stood at sign-off; an empty value means it was left blank */
export interface SignoffInput { label: string; value: string }

export interface HistoryEntry {
  when: string;          /* ISO string */
  who: string;           /* person's full name */
  whoId?: string;        /* their identifier */
  whoTitle?: string;     /* title held at the time of the event */
  section: 'Stages' | 'Sign-off' | 'Attachments' | 'Fabrication' | 'Release' | 'Refit';
  action: string;        /* what was changed/done — field name or event */
  from?: string;         /* previous value, when the action changed one */
  to?: string;           /* new value, when the action changed one */
  routing: string;       /* routing label at time of change */
  inputs?: SignoffInput[];   /* sign-off entries only: every editable field and its value at that moment */
  fabInputs?: SignoffInput[];  /* fabrication data as it stood at that moment: every sign-off entry, and a Cut's Refit entry (the data it reset) */
  stageId?: string;      /* sign-off entries only: which live stage this recorded, so Correct can find it again */
  changes?: { key: string; label: string; from: string; to: string }[];  /* 'corrected' entries only: just the fields that actually changed */
  reason?: string;       /* 'corrected' entries only */
}

export interface JobWorkflow {
  jobId: string;
  technician: string;
  stages: WorkflowStage[];
  attachments: Attachment[];
  conditionCode: string;     /* see conditions.ts, '' if none */
  conditionCount: number;    /* pairs with conditionCode */
  history: HistoryEntry[];
  fabricationData: Record<string, string>; /* cross-stage fields (Welding fabrication section) */
  refitNumber?: string;      /* set by each Cut; job records aren't saved, so WorkflowStore copies it onto the job on load */
  repairNumber?: string;     /* set by each new Repair round; copied onto the job on load the same way */
}

interface StageOption {
  label: string;
  value: string;
  default?: boolean;
}

interface StageTemplate {
  id: string;
  label: string;
  displayName?: string;  /* override label shown on routing table (e.g. 'Tack' for both 'tack' and 'deferred-tack') */
  decisionLabel?: string; /* override 'Decision' label (e.g. 'Inspection Results') */
  /* bool or predicate keyed off the job */
  required: boolean | ((job: Job) => boolean);
  /* fields a tech records on this stage */
  fields: StageField[];
  /* configurable sign-off fields for this stage */
  signoffFields?: SignoffField[];
  /* stage id to route back to when this stage is rejected (empty = no routing) */
  rejectToStage?: string;
  /* signing inserts another copy of this stage after itself */
  repeatable?: boolean;
  /* role that this stage routes to */
  role?: string;
  /* admin-managed routing options (e.g. Fit/Weld Build up, MT/PT) */
  routingOptions?: StageOption[];
}

/* ── Default sign-off fields (pre-populated for admin) ── */
const DEFAULT_SIGNOFF_FIELDS: SignoffField[] = [
  { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
  { key: 'licenseNo',     label: 'License #',      type: 'text', required: false },
  { key: 'permitVerified', label: 'Permit verified', type: 'select', required: false,
    options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'N/A', value: 'na' }] },
  { key: 'testMethod',    label: 'Test method',    type: 'select', required: false,
    options: [
      { label: 'Visual + functional', value: 'visual-functional' },
      { label: 'Pressure test', value: 'pressure' },
      { label: 'Meter reading', value: 'meter' },
      { label: 'Load test', value: 'load' }
    ] },
  { key: 'crewSize',      label: 'Crew size',      type: 'number', required: false, placeholder: 'e.g. 2' },
  { key: 'safetyCheck',   label: 'Safety check',   type: 'select', required: false,
    options: [{ label: 'Passed', value: 'passed' }, { label: 'Passed w/ notes', value: 'passed-notes' }, { label: 'N/A', value: 'na' }] },
  { key: 'reworkNeeded',  label: 'Rework needed',  type: 'select', required: false,
    options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
  { key: 'customerSignature', label: 'Customer signature', type: 'select', required: false,
    options: [{ label: 'On file', value: 'on-file' }, { label: 'Verbal', value: 'verbal' }, { label: 'Pending', value: 'pending' }] },
  { key: 'notes',         label: 'Notes',          type: 'text', required: false, placeholder: 'Additional notes…' },
];

export function defaultSignoffFields(): SignoffField[] {
  return DEFAULT_SIGNOFF_FIELDS.map(f => ({ ...f }));
}

/* ordered stage pipelines per trade, some conditional */
// Shared stages every trade gets: a safety/prep stage first and a handover stage last.
const PREP_STAGE: StageTemplate = {
  id: 'prep', label: 'Prep', required: true,
  fields: [{ key: 'ppe', label: 'PPE / safety', type: 'text', placeholder: 'e.g. gloves, eyewear' }],
  signoffFields: [
    { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
    { key: 'safetyCheck', label: 'Safety check', type: 'select', required: true,
      options: [{ label: 'Passed', value: 'passed' }, { label: 'Passed w/ notes', value: 'passed-notes' }, { label: 'Failed', value: 'failed' }] },
    { key: 'notes', label: 'Notes', type: 'text', required: false, placeholder: 'Prep notes…' },
  ]
};
const HANDOVER_STAGE: StageTemplate = {
  id: 'handover', label: 'Handover', required: true,
  fields: [
    { key: 'walkthrough', label: 'Customer walkthrough', type: 'text', placeholder: 'e.g. confirmed operation' },
    { key: 'issueReported', label: 'Customer reported an issue?', type: 'select',
      options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
    // these three appear only when issueReported === 'yes'
    { key: 'issueDescription', label: 'Issue description', type: 'text', placeholder: 'What did the customer report?',
      showIf: { key: 'issueReported', equals: 'yes' } },
    { key: 'issueSeverity', label: 'Severity', type: 'select',
      options: [{ label: 'Minor', value: 'minor' }, { label: 'Major', value: 'major' }],
      showIf: { key: 'issueReported', equals: 'yes' } },
    { key: 'followUpDate', label: 'Follow-up date', type: 'text', placeholder: 'e.g. 2026-07-01',
      showIf: { key: 'issueReported', equals: 'yes' } },
  ],
  signoffFields: [
    { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
    { key: 'customerSignature', label: 'Customer signature', type: 'select', required: true,
      options: [{ label: 'On file', value: 'on-file' }, { label: 'Verbal', value: 'verbal' }, { label: 'Pending', value: 'pending' }] },
    { key: 'notes', label: 'Notes', type: 'text', required: false, placeholder: 'Handover notes…' },
  ]
};

/* ── Shop locations (admin-configurable via localStorage) ── */
const SHOPS_LS_KEY = STORAGE.shops;
const DEFAULT_SHOPS = ['North Yard Fabrication', 'South Bay Welding', 'Pipe Shop — Building 4', 'Field — Onsite', 'Ship'];

export function getShops(): string[] {
  try {
    const raw = localStorage.getItem(SHOPS_LS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SHOPS;
  } catch { return DEFAULT_SHOPS; }
}

export function setShops(shops: string[]) {
  localStorage.setItem(SHOPS_LS_KEY, JSON.stringify(shops));
}

/* Location dropdown options; the value is the slugged shop name (Ship = 'ship') */
export const shopValue = (shop: string) => shop.toLowerCase().replace(/\s+/g, '-');
export const shopOptions = () => getShops().map(s => ({ label: s, value: shopValue(s) }));

/* ── Weld Positions (admin-configurable via localStorage) ── */
export interface WeldPosition {
  code: string;
  description: string;
}

const WELD_POSITIONS_LS_KEY = STORAGE.weldPositions;
const DEFAULT_WELD_POSITIONS: WeldPosition[] = [
  { code: 'O', description: 'Overhead' },
  { code: 'V', description: 'Vertical' },
  { code: 'F', description: 'Flat' },
];

export function getWeldPositions(): WeldPosition[] {
  try {
    const raw = localStorage.getItem(WELD_POSITIONS_LS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_WELD_POSITIONS;
  } catch { return DEFAULT_WELD_POSITIONS; }
}

export function setWeldPositions(positions: WeldPosition[]) {
  localStorage.setItem(WELD_POSITIONS_LS_KEY, JSON.stringify(positions));
}

/* ── Routing options per stage (admin-configurable via localStorage) ── */
export type { StageOption };

const ROUTING_OPTIONS_LS_KEY = STORAGE.routingOptions;

export function setStageRoutingOptions(trade: string, stageId: string, options: StageOption[]) {
  const raw = localStorage.getItem(ROUTING_OPTIONS_LS_KEY);
  const all: Record<string, StageOption[]> = raw ? JSON.parse(raw) : {};
  all[`${trade}:${stageId}`] = options;
  localStorage.setItem(ROUTING_OPTIONS_LS_KEY, JSON.stringify(all));
}

/* ── Penetrant entries (admin-configurable via localStorage) ── */
export interface PenetrantEntry {
  type: string;
  manufacturer: string;
}

const PENETRANT_LS_KEY = STORAGE.penetrants;
const DEFAULT_PENETRANTS: PenetrantEntry[] = [
  { type: 'Type I - Fluorescent', manufacturer: 'Magnaflux' },
  { type: 'Type II - Visible', manufacturer: 'Sherwin-Williams' },
  { type: 'Type III - Water Washable', manufacturer: 'NDT Systems' },
  { type: 'Type IV - Post Emulsifiable', manufacturer: 'Research Institute' },
  { type: 'Type I - Fluorescent', manufacturer: 'NDT Systems' },
  { type: 'Type II - Visible', manufacturer: 'Magnaflux' },
];

export function getPenetrants(): PenetrantEntry[] {
  try {
    const raw = localStorage.getItem(PENETRANT_LS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PENETRANTS;
  } catch { return DEFAULT_PENETRANTS; }
}

export function setPenetrants(entries: PenetrantEntry[]) {
  localStorage.setItem(PENETRANT_LS_KEY, JSON.stringify(entries));
}

const toOption = (v: string) => ({ label: v, value: v });
export function penetrantManufacturerOptions(): { label: string; value: string }[] {
  return Array.from(new Set(getPenetrants().map(p => p.manufacturer))).map(toOption);
}
export function penetrantTypeOptions(): { label: string; value: string }[] {
  return Array.from(new Set(getPenetrants().map(p => p.type))).map(toOption);
}

/* Consumable insert and filler metal share these choices: "Only Consumable Insert used as filler" copies the
   Fit stage's insert type/size into the filler fields, so a value missing from either list shows up blank.
   MIL-spec designations, same convention as Weld Engineering's FILLER_METAL_TYPES (data/procedures.ts) --
   duplicated here rather than imported to avoid a circular import (procedures.ts already imports this file). */
const METAL_TYPE_OPTIONS = [
  { label: 'MIL-70S-3', value: 'mil-70s-3' }, { label: 'MIL-70S-6', value: 'mil-70s-6' },
  { label: 'MIL-80S-50', value: 'mil-80s-50' }, { label: 'MIL-80S-D2', value: 'mil-80s-d2' },
  { label: 'MIL-90S-B3', value: 'mil-90s-b3' }, { label: 'MIL-100S-1', value: 'mil-100s-1' },
];
const METAL_SIZE_OPTIONS = [
  { label: '1/16"', value: '1/16' }, { label: '3/32"', value: '3/32' }, { label: '1/8"', value: '1/8' },
  { label: '5/32"', value: '5/32' }, { label: '3/16"', value: '3/16' }, { label: '1/4"', value: '1/4' },
];

/* ── Shared weld stage fields (Tack, Root, Final Weld) ── */
const WELD_STAGE_FIELDS: StageField[] = [
  /* GWP and WTN cascade from Weld Engineering's procedures data at render time (see
     joint-page.component.ts withStageRuntimeOptions) -- a GWP groups several WPS documents, one
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
  /* options cascade from the resolved GWP+WTN Procedure at render time (see joint-page.component.ts
     withStageRuntimeOptions), same pattern as weldProcedure/wtn above */
  { key: 'fillerMetalType', label: 'Filler Metal Type', type: 'select', required: true },
  { key: 'fillerMetalSize', label: 'Filler Metal Size', type: 'select', required: true },
  { key: 'fillerMetalMic', label: 'Filler Metal MIC', type: 'text', required: true },
  { key: 'comments', label: 'Comments', type: 'text', fullWidth: true },
];

/* Override Requirements fields, appended to every welding stage (shown for matching WTNs) */
export const WELD_OVERRIDE_FIELDS: StageField[] = [
  { key: 'overridePhMin', label: 'Override PH Min', type: 'number' },
  { key: 'overridePhMax', label: 'Override PH Max', type: 'number' },
  { key: 'overrideIpMin', label: 'Override IP Min', type: 'number' },
  { key: 'overrideIpMax', label: 'Override IP Max', type: 'number' },
  { key: 'overrideNote', label: 'Override Note', type: 'text' },
];


/* ── Which weld fields the user cannot type into, and what a sign-off records ── */

/* PH/IP limits and overrides are set from the WTN, never typed */
export const READONLY_LIMIT_KEYS = new Set([
  'phMin', 'phMax', 'ipMin', 'ipMax',
  'overridePhMin', 'overridePhMax', 'overrideIpMin', 'overrideIpMax', 'overrideNote',
]);
export const FILLER_KEYS = new Set(['fillerMetalType', 'fillerMetalSize', 'fillerMetalMic']);

/* each actual and the requirement it follows: NC there sets the actual to NC and locks it */
export const ACTUAL_REQUIREMENT: Record<string, string> = {
  actualPhMin: 'phMin', actualPhMax: 'phMax', actualIpMin: 'ipMin', actualIpMax: 'ipMax',
};

/* Weld Process follows the WTN; filler fields follow the Consumable Insert checkbox; an actual
   follows an NC requirement */
export function isFieldLocked(stage: WorkflowStage, f: { key: string }): boolean {
  return f.key === 'weldProcess'
    || (FILLER_KEYS.has(f.key) && stage.inputs['consumableInsertOnly'] === 'yes')
    || (f.key in ACTUAL_REQUIREMENT && stage.inputs[ACTUAL_REQUIREMENT[f.key]] === 'NC');
}

/* true when the user can actually type or choose a value for this field */
export function isUserEditable(stage: WorkflowStage, f: { key: string; disabled?: boolean }): boolean {
  return !f.disabled && f.key !== 'qualificationCheck' && !READONLY_LIMIT_KEYS.has(f.key) && !isFieldLocked(stage, f);
}

export function displayValue(f: { type: string; options?: { label: string; value: string }[]; unit?: string }, raw: string | undefined): string {
  const v = raw ?? '';
  if (f.type === 'checkbox') return v === 'yes' ? 'Yes' : 'No';
  if (!v) return '';
  const opt = f.options?.find(o => o.value === v);
  if (opt) return opt.label;
  return f.unit ? `${v} ${f.unit}` : v;
}

/* value as shown in the history Old/New columns; em dash when empty */
export const show = (v: string | null | undefined) => (v && v.length ? v : '—');

/* display label for a raw stage input key, falling back to the key itself if undefined */
export function labelFor(stage: WorkflowStage, key: string): string {
  return stage.fields.find(f => f.key === key)?.label
    ?? stage.signoffFields.find(f => f.key === key)?.label
    ?? key;
}

/* Fields whose showIf is met; a simple stand-in for the job page's visibleFields, used only for seeded and mock data. */
export function fieldsShown(stage: WorkflowStage): StageField[] {
  return stage.fields.filter(f => {
    if (!f.showIf) return true;
    const cur = f.showIf.key === 'inspectionType' ? stage.inspectionType
      : f.showIf.key === 'result' ? stage.result
      : stage.inputs[f.showIf.key];
    if (f.showIf.anyOf ? !f.showIf.anyOf.includes(cur ?? '') : cur !== f.showIf.equals) return false;
    return (f.showIf.and ?? []).every(c => (c.key === 'result' ? stage.result : stage.inputs[c.key]) === c.equals);
  });
}

/* true when the user picks SAT/UNSAT on this stage (the Decision radios render on the same
   condition); other stages are accepted on signoff with no choice, so their SAT isn't shown or recorded */
export function hasDecision(stage: { rejectToStage?: string }): boolean {
  return !!stage.rejectToStage;
}

/* Every editable field the user was shown, with its value, plus Type and the decision. Blanks are kept:
   what was left empty is part of the record. The caller passes the fields that were visible. */
export function snapshotInputs(stage: WorkflowStage, fields: StageField[], signoffFields: SignoffField[]): SignoffInput[] {
  const out: SignoffInput[] = [];
  const typeOpts = stage.routingOptions ?? [];
  if (typeOpts.length) {
    const cur = stage.id === 'fit' ? stage.routingType : stage.inspectionType;
    out.push({ label: 'Type', value: typeOpts.find(o => o.value === cur)?.label ?? '' });
  }
  for (const f of fields) {
    if (isUserEditable(stage, f)) out.push({ label: f.label, value: displayValue(f, stage.inputs[f.key]) });
  }
  for (const f of signoffFields) out.push({ label: f.label, value: displayValue(f, stage.signoffInputs[f.key]) });
  if (stage.result && hasDecision(stage)) out.push({ label: stage.decisionLabel || 'Decision', value: stage.result.toUpperCase() });
  return out;
}
/* ── NDT inspection stages: one template per phase (root/layer/final) x method ── */
type NdtPhase = 'root' | 'layer' | 'final';
type NdtKind = 'utrt' | 'mtpt' | 'vt5x';

const NDT_COMMON_FIELDS: StageField[] = [
  { key: 'procedureUsed', label: 'Procedure Used for Inspection', type: 'select', required: true,
    options: [{ label: 'SNT-TC-1A', value: 'snt-tc-1a' }, { label: 'ASTM E165', value: 'astm-e165' },
      { label: 'AWS D1.1', value: 'aws-d1-1' }, { label: 'ASME Sec V', value: 'asme-sec-v' }] },
  { key: 'hasProbationary', label: 'Has Probationary Inspector', type: 'checkbox' },
  { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text', required: true, showIf: { key: 'hasProbationary', equals: 'yes' } },
  { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text', required: true, showIf: { key: 'hasProbationary', equals: 'yes' } },
  { key: 'partial', label: 'Partial', type: 'checkbox' },
  { key: 'portionInspected', label: 'Portion of Weld Inspected', type: 'text', required: true, showIf: { key: 'partial', equals: 'yes' } },
];

/* Degree of RT required/performed -- NA, or an angular/percentage coverage value. Shared by the
   Degree of RT Performed signoff field and Job.rtRoot/rtFinal (the requirement each one must match
   before its RT NDT stage can be signed off -- see JointPageComponent.signBlockers()). */
export const RT_DEGREE_OPTIONS: { label: string; value: string }[] =
  ['NA', '10', '100', '360', '60', '75'].map(v => ({ label: v, value: v }));

const NDT_KINDS: Record<NdtKind, { label: string; fields: StageField[]; options: StageOption[] }> = {
  utrt: {
    label: 'UT/RT',
    options: [{ label: 'UT', value: 'ut' }, { label: 'RT', value: 'rt' }],
    fields: [
      /* must equal the job's required degree (rtRoot/rtFinal) before this stage can be signed off
         -- see JointPageComponent.signBlockers() -- so it's a droplist (blank or the value), not a
         fixed radio choice */
      { key: 'degreeRt', label: 'Degree of RT Performed', type: 'select', required: true, showIf: { key: 'inspectionType', equals: 'rt' },
        options: RT_DEGREE_OPTIONS },
      { key: 'rtFileNumber', label: 'RT File Number', type: 'text', showIf: { key: 'inspectionType', equals: 'rt' } },
      { key: 'defectCode', label: 'Defect Code', type: 'select', required: true,
        showIf: { key: 'inspectionType', equals: 'rt', and: [{ key: 'result', equals: 'unsat' }] },
        options: [{ label: 'Porosity', value: 'porosity' }, { label: 'Slag Inclusion', value: 'slag-inclusion' },
          { label: 'Lack of Fusion', value: 'lack-of-fusion' }, { label: 'Incomplete Penetration', value: 'incomplete-penetration' },
          { label: 'Crack', value: 'crack' }, { label: 'Undercut', value: 'undercut' }] },
    ],
  },
  mtpt: {
    label: 'MT/PT',
    options: [{ label: 'MT', value: 'mt' }, { label: 'PT', value: 'pt' }],
    fields: [
      { key: 'idAccessible', label: 'Inner surface of the weld / ID is accessible', type: 'select',
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      /* Manufacturer and Type both cascade from the admin-managed Penetrant table (getPenetrants(),
         Admin > Penetrant) -- distinct manufacturers and distinct types across all entries, e.g.
         "Magnaflux" vs "Type I - Fluorescent", so the two droplists actually mean different things
         instead of listing the same companies twice under different labels. */
      { key: 'penetrantManufacturer', label: 'Penetrant Manufacturer', type: 'select', showIf: { key: 'inspectionType', equals: 'pt' },
        options: penetrantManufacturerOptions() },
      { key: 'penetrantType', label: 'Penetrant Type', type: 'select', showIf: { key: 'inspectionType', equals: 'pt' },
        options: penetrantTypeOptions() },
    ],
  },
  vt5x: {
    label: 'VT/5X',
    options: [{ label: 'VT', value: 'vt' }, { label: '5X', value: '5x' }],
    fields: [
      { key: 'weldColor', label: 'Weld Color', type: 'select', showIf: { key: 'inspectionType', equals: 'vt' },
        options: [
          { label: 'Shiny Silver', value: 'shiny-silver' }, { label: 'Straw', value: 'straw' },
          { label: 'Light Blue', value: 'light-blue' }, { label: 'Dark Blue', value: 'dark-blue' },
          { label: 'Gray Powder', value: 'gray-powder' }, { label: 'Yellow Powder', value: 'yellow-powder' },
        ] },
    ],
  },
};

/* Each phase's NDT steps come from its Joint Details values (NDT Root + RT Root, NDT Each for
   Layer, NDT Final + RT Final), in VT/5X, MT/PT, UT/RT order:
     - VT always, or 5X instead when the NDT value is 5X
     - MT, PT or UT adds that step with its Type locked to it; MT/PT adds the MT/PT step with a choice
     - an RT degree (anything but blank or NA) adds the UT/RT step locked to RT
   UT and an RT degree never come together in real data; if they did, that step would offer both. */
export interface NdtStep { kind: NdtKind; methods: string[] }

export function phaseNdtSteps(ndtValue: string, rtDegree = ''): NdtStep[] {
  const v = (ndtValue || '').trim().toUpperCase();
  const steps: NdtStep[] = [{ kind: 'vt5x', methods: [v === '5X' ? '5x' : 'vt'] }];
  if (v === 'MT') steps.push({ kind: 'mtpt', methods: ['mt'] });
  if (v === 'PT') steps.push({ kind: 'mtpt', methods: ['pt'] });
  if (v === 'MT/PT') steps.push({ kind: 'mtpt', methods: ['mt', 'pt'] });
  const rt = !!rtDegree && rtDegree !== 'NA';
  if (v === 'UT' || rt) steps.push({ kind: 'utrt', methods: [...(v === 'UT' ? ['ut'] : []), ...(rt ? ['rt'] : [])] });
  return steps;
}

export function jobNdtSteps(job: Job): Record<NdtPhase, NdtStep[]> {
  return {
    root: phaseNdtSteps(job.ndtRoot, job.rtRoot),
    layer: phaseNdtSteps(job.ndtEach),
    final: phaseNdtSteps(job.ndtFinal, job.rtFinal),
  };
}

/* every Type option a kind of NDT stage can offer, before any Joint Details lock */
export function ndtKindOptions(kind: NdtKind): StageOption[] {
  return NDT_KINDS[kind].options.map(o => ({ ...o }));
}

function ndtStage(phase: NdtPhase, kind: NdtKind): StageTemplate {
  const k = NDT_KINDS[kind];
  return {
    id: `${phase}-ndt-${kind}`,
    label: `${phase[0].toUpperCase()}${phase.slice(1)} NDT ${k.label}`,
    required: true,
    role: 'Inspector',
    fields: [...NDT_COMMON_FIELDS, ...k.fields].map(f => ({ ...f })),
    signoffFields: [{ key: 'comments', label: 'Comments', type: 'text', required: false, fullWidth: true }],
    rejectToStage: 'repair',
    decisionLabel: 'Inspection Results',
    routingOptions: k.options.map(o => ({ ...o })),
  };
}

/* ── Fabrication cross-stage fields (Welding) ── */
export interface FabricationField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  placeholder?: string;
  options?: { label: string; value: string }[];
  unit?: string;
  fullWidth?: boolean;
  row: 1 | 2 | 3 | 4 | 5;
  requiredWhen?: { key: string; notEmpty: boolean };
  showIf?: { key: string; equals: string };
  required?: boolean;
}

export const FABRICATION_FIELDS: FabricationField[] = [
  // Line 1: Location and Specific Location
  { key: 'location', label: 'Location', type: 'select', row: 1, required: true, options: shopOptions() },
  { key: 'specificLocation', label: 'Specific Location', type: 'text', placeholder: 'e.g. Bay 3, Rack 12', row: 1 },
  // Line 2: Deck, Frame, P/S/CL, and Usage (shown when Location = Ship)
  { key: 'deck', label: 'Deck', type: 'text', row: 2, showIf: { key: 'location', equals: 'ship' }, required: true },
  { key: 'frame', label: 'Frame', type: 'text', row: 2, showIf: { key: 'location', equals: 'ship' }, required: true },
  { key: 'pscl', label: 'P/S/CL', type: 'select', row: 2, showIf: { key: 'location', equals: 'ship' }, required: true,
    options: [{ label: 'P', value: 'P' }, { label: 'S', value: 'S' }, { label: 'CL', value: 'CL' }] },
  { key: 'usage', label: 'Usage', type: 'select', row: 2, showIf: { key: 'location', equals: 'ship' }, required: true,
    options: [
      { label: 'Galley', value: 'galley' },
      { label: 'Living', value: 'living' },
      { label: 'Habitability', value: 'habitability' },
      { label: 'Engine', value: 'engine' },
      { label: 'Cargo', value: 'cargo' },
      { label: 'Deck', value: 'deck' },
      { label: 'Tank', value: 'tank' },
      { label: 'Machinery', value: 'machinery' },
      { label: 'Other', value: 'other' },
    ] },
  // Line 3: MIC 1 and MIC 2 -- only present in the fields list (see joint-page.component.ts
  // fabFields()) when that joint member's MCL requires traceability, so required is unconditional here
  { key: 'id1', label: 'MIC 1', type: 'text', row: 3, required: true },
  { key: 'id2', label: 'MIC 2', type: 'text', row: 3, required: true },
  // Line 4: Drawing Rev (Execution) and Actual Thickness
  { key: 'drawingRev', label: 'Drawing Rev (Execution)', type: 'text', row: 4, required: true },
  { key: 'actualThickness', label: 'Actual Thickness', type: 'text', unit: 'in', row: 4, required: true },
  // Line 5: W.E. Memo, Revised Joint Design, and Change Number
  { key: 'weldMemo', label: 'W.E. Memo', type: 'text', row: 5 },
  { key: 'revisedJointDesign', label: 'Revised Joint Design', type: 'select', row: 5,
    options: [] },
  { key: 'changeNumber', label: 'ER/IR Number', type: 'text', row: 5,
    requiredWhen: { key: 'revisedJointDesign', notEmpty: true } },
];

/* fabrication data as it stood at some moment (e.g. a sign-off) — every field, blanks included, with
   Location/Revised Joint Design resolved to their display label the same way the live form does */
export function fabricationSnapshot(fab: Record<string, string>): SignoffInput[] {
  return FABRICATION_FIELDS
    .filter(f => !f.showIf || fab[f.showIf.key] === f.showIf.equals)
    .map(f => {
      const options = f.key === 'location' ? shopOptions()
        : f.key === 'revisedJointDesign' ? jointDesignOptions()
        : f.options;
      const raw = fab[f.key] ?? '';
      const value = options?.find(o => o.value === raw)?.label ?? raw;
      return { label: f.label, value };
    });
}

const TRADE_STAGES: Record<Job['trade'], StageTemplate[]> = {
  Welding: [
    /* Same Consumable Insert/Backing Ring rules as Fit (joint-design-gated visibility, MIC required
       only when traceability also applies -- see SignoffPanelComponent.micSignoffRequired()), minus
       Defer Tack -- there's no Tack yet to defer at Pre-Fit. As signoffFields (not fields) so it
       renders through the same signoff-fit-row layout as Fit, gated by joint-page's
       jointDesignRequiresInsert()/jointDesignRequiresBackingRing() (see signBlockers). */
    { id: 'pre-fit', label: 'Pre-Fit', required: true, role: 'NQC Inspector', fields: [], signoffFields: [
      { key: 'consumableInsertType', label: 'Consumable Insert Type', type: 'select', required: true,
        options: METAL_TYPE_OPTIONS },
      { key: 'consumableInsertSize', label: 'Consumable Insert Size', type: 'select', required: true,
        options: METAL_SIZE_OPTIONS },
      { key: 'consumableInsertId', label: 'Consumable Insert MIC', type: 'text', required: false },
      { key: 'backingRingType', label: 'Backing Ring Type', type: 'select', required: true,
        options: [{ label: 'Standard', value: 'standard' }, { label: 'Heavy', value: 'heavy' },
          { label: 'Copper', value: 'copper' }, { label: 'Ceramic', value: 'ceramic' }] },
      { key: 'backingRingId', label: 'Backing Ring MIC', type: 'text', required: false },
      { key: 'comments', label: 'Comments', type: 'text', required: false, fullWidth: true },
    ] },
    { id: 'fit', label: 'Fit', required: true, role: 'Fitting', fields: [], signoffFields: [
      { key: 'consumableInsertType', label: 'Consumable Insert Type', type: 'select', required: true,
        options: METAL_TYPE_OPTIONS },
      { key: 'consumableInsertSize', label: 'Consumable Insert Size', type: 'select', required: true,
        options: METAL_SIZE_OPTIONS },
      /* Consumable Insert MIC/Backing Ring MIC are only required when either joint member's MCL
         requires traceability -- see SignoffPanelComponent.micSignoffRequired() */
      { key: 'consumableInsertId', label: 'Consumable Insert MIC', type: 'text', required: false },
      { key: 'backingRingType', label: 'Backing Ring Type', type: 'select', required: true,
        options: [{ label: 'Standard', value: 'standard' }, { label: 'Heavy', value: 'heavy' },
          { label: 'Copper', value: 'copper' }, { label: 'Ceramic', value: 'ceramic' }] },
      { key: 'backingRingId', label: 'Backing Ring MIC', type: 'text', required: false },
      { key: 'comments', label: 'Comments', type: 'text', required: false, fullWidth: true },
      { key: 'deferTack', label: 'Defer Tack', type: 'text', required: false },
    ], routingOptions: [
      { label: 'Fit', value: 'fit', default: true },
      { label: 'Weld Build up', value: 'weld-buildup' },
    ] },
    { id: 'tack', label: 'Tack', displayName: 'Tack', required: true, role: 'Welding', fields: WELD_STAGE_FIELDS, signoffFields: [], routingOptions: [
      { label: 'Tack', value: 'standard', default: true },
    ] },
    { id: 'fitup-insp', label: 'Fit-Up Insp', required: true, role: 'Foreman|Inspector', fields: [
      { key: 'verifyMic1', label: 'MIC 1 verified', type: 'checkbox' },
      { key: 'verifyMic2', label: 'MIC 2 verified', type: 'checkbox' },
      { key: 'verifyDrawingRev', label: 'Drawing Rev verified', type: 'checkbox' },
      { key: 'verifyActualThickness', label: 'Actual Thickness verified', type: 'checkbox' },
      { key: 'verifyRevisedJointDesign', label: 'Revised Joint Design verified', type: 'checkbox' },
    ],
      signoffFields: [], decisionLabel: 'Inspection Results', rejectToStage: 'tack' },
    { id: 'fitup-release', label: 'Fit-Up Release', displayName: 'Fit-Up Release', required: false, role: 'Foreman', fields: [], signoffFields: [] },
    /* same form as Tack; only its position differs (after Fit-Up Insp) */
    { id: 'deferred-tack', label: 'Deferred Tack', displayName: 'Tack', required: false, role: 'Welding', fields: WELD_STAGE_FIELDS, signoffFields: [], routingOptions: [
      { label: 'Tack', value: 'standard', default: true },
    ] },
    { id: 'root-weld', label: 'Root', required: true, role: 'Welding', fields: [...WELD_STAGE_FIELDS,
        { key: 'consumableInsertOnly', label: 'Only Consumable Insert used as filler', type: 'checkbox' },
      ], signoffFields: [], routingOptions: [
      { label: 'Root', value: 'standard', default: true },
    ] },
    ndtStage('root', 'vt5x'),
    ndtStage('root', 'mtpt'),
    ndtStage('root', 'utrt'),
    { id: 'root-layer', label: 'Layer', required: true, role: 'Welding',
      fields: WELD_STAGE_FIELDS,
      signoffFields: [], routingOptions: [
        { label: 'Interim Layer', value: 'interim', default: true },
        { label: 'Final Layer', value: 'final' },
      ] },
    ndtStage('layer', 'vt5x'),
    ndtStage('layer', 'mtpt'),
    ndtStage('layer', 'utrt'),
    { id: 'final-weld', label: 'Final Weld', required: true, role: 'Welding', fields: WELD_STAGE_FIELDS, signoffFields: [], routingOptions: [
      { label: 'Final Weld', value: 'standard', default: true },
    ] },
    ndtStage('final', 'vt5x'),
    ndtStage('final', 'mtpt'),
    ndtStage('final', 'utrt'),
    /* split into O63/O04 2026-09-22: O63 when the job has any SFFF/DSS-AAA/SS data, O04 otherwise
       (see buildStages() Welding filter — exactly one of the two is included per job) */
    { id: 'review-o63', label: 'O63 Records Review', required: true, role: 'O63 Records', fields: [
      { key: 'verifyDrawing', label: 'Drawing', type: 'checkbox' },
      { key: 'verifyDrawingRev', label: 'Drawing Rev', type: 'checkbox' },
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
      { key: 'comments', label: 'Comments', type: 'text', fullWidth: true },
    ], signoffFields: [], rejectToStage: 'final-ndt-vt5x', decisionLabel: 'Inspection Results' },
    { id: 'review-o04', label: 'O04 Records Review', required: true, role: 'O04 Records', fields: [
      { key: 'verifyDrawing', label: 'Drawing', type: 'checkbox' },
      { key: 'verifyDrawingRev', label: 'Drawing Rev', type: 'checkbox' },
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
      { key: 'comments', label: 'Comments', type: 'text', fullWidth: true },
    ], signoffFields: [], rejectToStage: 'final-ndt-vt5x', decisionLabel: 'Inspection Results' },
    { id: 'sold', label: 'Sold', required: true, role: 'O63 Records', fields: [], signoffFields: [] }
  ]
};

/* Repair stage template — inserted dynamically when NDT is UNSAT. Its own routing on signoff
   (SignoffService.signStage()): Allowable thickness exceeded -> back to that phase's NDT UT/RT;
   else Grind Only -> that phase's NDT VT/5X; Weld Repair -> inserts Excavation NDT next (see
   excavationNdtStage() below); Cut -> back to Fit. Single-option Type
   droplist (routingOptions),
   same convention every other stage with a Type dropdown follows -- Foreman isn't an Inspector
   role so inspectionTypeRequired() leaves it pre-filled rather than a required blank choice. */
export const REPAIR_STAGE: StageTemplate = {
  id: 'repair', label: 'Repair', required: true, role: 'Foreman', fields: [
    { key: 'repairType', label: 'Repair Code', type: 'select', required: true,
      options: [{ label: 'Grind Only', value: 'grind' }, { label: 'Weld Repair', value: 'weld-repair' }, { label: 'Cut', value: 'cut' }] },
    { key: 'allowableThickness', label: 'Allowable Thickness', type: 'text', disabled: true },
    { key: 'allowableThicknessExceeded', label: 'Allowable thickness exceeded - Volumetric inspection (UT/RT) is required', type: 'checkbox' },
  ], signoffFields: [], decisionLabel: 'Inspection Results',
  routingOptions: [{ label: 'Repair', value: 'repair', default: true }],
};

/* Every NDT UNSAT adds a new Repair, with no limit. Round 1 is 'repair' / 'excavation-ndt', later
   rounds are 'repair-2' / 'excavation-ndt-2' and so on; a round's Excavation NDT shares its Repair's
   number. */
export const isRepairStageId = (id: string) => /^repair(-\d+)?$/.test(id);
export const isExcavationNdtStageId = (id: string) => /^excavation-ndt(-\d+)?$/.test(id);
const roundSuffix = (id: string) => /-(\d+)$/.exec(id)?.[0] ?? '';
export const excavationIdForRepair = (repairId: string) => `excavation-ndt${roundSuffix(repairId)}`;
export const repairIdForExcavation = (excavationId: string) => `repair${roundSuffix(excavationId)}`;
/* round number after the first, e.g. "Repair 2" */
export const roundLabel = (label: string, id: string) => roundSuffix(id) ? `${label} ${roundSuffix(id).slice(1)}` : label;

export function nextRepairStage(stages: { id: string }[]): StageTemplate {
  const n = stages.filter(s => isRepairStageId(s.id)).length + 1;
  const id = n === 1 ? 'repair' : `repair-${n}`;
  return { ...REPAIR_STAGE, id, label: roundLabel(REPAIR_STAGE.label, id) };
}

/* Fields the "Correct" action (Work History — edit a signed stage's recorded values in place,
   distinct from Deprogress) must never touch: SignoffService.signStage() reads these once, at the
   moment a stage is signed, to decide what to insert/reopen. Changing the stored value afterward
   doesn't re-run that decision, so the record and the actual stage list would silently diverge --
   see [[project-correction-feature-fields]]. Keyed by stage id since these are only special on the
   stage that actually branches on them; the same key elsewhere (there isn't one, today) would be
   an ordinary field. Decision/Type/Routing Type aren't in here because Correct never touches
   `result`/`inspectionType`/`routingType` at all -- only `inputs`/`signoffInputs`. */
export const ROUTING_LOCKED_FIELD_KEYS: Record<string, string[]> = {
  repair: ['repairType', 'allowableThicknessExceeded'],
  'fitup-insp': ['releaseToWelding'],
  fit: ['deferTack'],
};

export function isRoutingLockedField(stageId: string, key: string): boolean {
  return (ROUTING_LOCKED_FIELD_KEYS[isRepairStageId(stageId) ? 'repair' : stageId] ?? []).includes(key);
}

export const EXCAVATION_NDT_LABEL = 'Excavation NDT';

/* Excavation NDT -- inserted after Repair when Repair Code = Weld Repair. The excavation is the
   removal of the rejected material; this stage is effectively signing off that it was cleaned out
   correctly, so it "requires the same inspection that was noted as reject" -- same fields and the
   same single-option Type as whatever method (UT/RT/MT/PT/VT/5X) originally rejected the joint,
   not a fresh generic NDT check. `inspectionType` is the resolved single value the caller
   (SignoffService) passes in -- normally the origin's own inspectionType, except PT on
   non-ferrous/austenitic material requires 5X instead (the caller decides that, since it needs the
   job's material classification; this function just builds whichever kind the value resolves to).
   UNSAT routes back to its own round's Repair via rejectToStage. */
export function excavationNdtStage(inspectionType: string, repairId = 'repair'): StageTemplate {
  const kind: NdtKind = (inspectionType === 'ut' || inspectionType === 'rt') ? 'utrt'
    : (inspectionType === 'mt' || inspectionType === 'pt') ? 'mtpt'
    : 'vt5x';
  const k = NDT_KINDS[kind];
  const opt = k.options.find(o => o.value === inspectionType) ?? k.options[0];
  return {
    id: excavationIdForRepair(repairId), label: roundLabel(EXCAVATION_NDT_LABEL, repairId), required: true, role: 'Inspector',
    fields: [...NDT_COMMON_FIELDS, ...k.fields].map(f => ({ ...f })),
    signoffFields: [{ key: 'comments', label: 'Comments', type: 'text', required: false, fullWidth: true }],
    rejectToStage: repairId, decisionLabel: 'Inspection Results',
    routingOptions: [{ label: opt.label, value: opt.value, default: true }],
  };
}

/* Build a live WorkflowStage from a template for a stage inserted at runtime (Repair, Excavation
   NDT) -- same shape toStage() builds from TRADE_STAGES, minus the parts only a job's real
   routing needs (role remap, override fields, etc.), since these are always the same regardless
   of job. `inspectionType` pre-fills the Type droplist (e.g. Excavation NDT's single resolved
   method) so an Inspector-role stage with exactly one real option doesn't force a redundant click
   on something that isn't really a choice -- see inspectionTypeRequired(). */
export function stageFromTemplate(t: StageTemplate, inputs: Record<string, string> = {}, inspectionType = ''): WorkflowStage {
  return {
    id: t.id,
    label: t.label,
    required: true,
    role: t.role ?? '',
    fields: t.fields.map(f => ({ ...f })),
    inputs,
    signoffFields: (t.signoffFields ?? []).map(f => ({ ...f })),
    signoffInputs: {},
    signoffRecords: [],
    result: null,
    rejectToStage: t.rejectToStage ?? '',
    repeatable: false,
    routingType: 'standard',
    swapStageId: '',
    inspectionType,
    routingOptions: t.routingOptions ?? [],
    signed: false,
    signedAt: null,
    decisionLabel: t.decisionLabel,
  };
}

/* prep stage, trade stages, then handover */
const STATIC_TEMPLATES: Record<Job['trade'], StageTemplate[]> = Object.fromEntries(
  (Object.keys(TRADE_STAGES) as Job['trade'][]).map(t => [t, [PREP_STAGE, ...TRADE_STAGES[t], HANDOVER_STAGE]])
) as Record<Job['trade'], StageTemplate[]>;

/* ── localStorage persistence for stage templates ── */
const TEMPLATES_LS_KEY = STORAGE.stageTemplates;

/* serialized form — required is always a plain boolean (no functions) */
interface SerializedStage {
  id: string;
  label: string;
  displayName?: string;
  required: boolean;
  fields: StageField[];
  signoffFields: SignoffField[];
  rejectToStage: string;
  repeatable?: boolean;
  role?: string;
  routingOptions?: StageOption[];
}

function serializeStage(t: StageTemplate): SerializedStage {
  return {
    id: t.id,
    label: t.label,
    displayName: t.displayName,
    required: typeof t.required === 'function' ? true : t.required,
    fields: t.fields,
    signoffFields: t.signoffFields ?? DEFAULT_SIGNOFF_FIELDS,
    rejectToStage: t.rejectToStage ?? '',
    repeatable: t.repeatable ?? false,
    role: t.role ?? '',
    routingOptions: t.routingOptions,
  };
}

function deserializeStage(s: SerializedStage): StageTemplate {
  return { ...s, signoffFields: s.signoffFields, rejectToStage: s.rejectToStage, repeatable: s.repeatable ?? false, role: s.role ?? '', routingOptions: s.routingOptions };
}

function loadSavedOverrides(): Record<string, SerializedStage[]> {
  try {
    const raw = localStorage.getItem(TEMPLATES_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveOverrides(overrides: Record<string, SerializedStage[]>) {
  try { localStorage.setItem(TEMPLATES_LS_KEY, JSON.stringify(overrides)); } catch { /* */ }
}

/* merged view: static defaults + admin overrides (saved to localStorage) */
let _merged: Record<Job['trade'], StageTemplate[]> | null = null;

export function getTemplates(): Record<Job['trade'], StageTemplate[]> {
  if (_merged) return _merged;
  const saved = loadSavedOverrides();
  const routingOptsRaw = localStorage.getItem(ROUTING_OPTIONS_LS_KEY);
  const routingOptsAll: Record<string, StageOption[]> = routingOptsRaw ? JSON.parse(routingOptsRaw) : {};
  _merged = {} as Record<Job['trade'], StageTemplate[]>;
  // Start with static defaults, merge admin overrides by stage ID
  for (const [trade, statics] of Object.entries(STATIC_TEMPLATES) as [Job['trade'], StageTemplate[]][]) {
    const overridden = saved[trade];
    if (overridden) {
      const savedMap = new Map(overridden.map(s => [s.id, s]));
      const merged = statics.map(s => savedMap.has(s.id) ? deserializeStage(savedMap.get(s.id)!) : s);
      for (const s of overridden) {
        if (!statics.some(st => st.id === s.id)) merged.push(deserializeStage(s));
      }
      _merged[trade] = merged;
    } else {
      _merged[trade] = statics;
    }
    // Merge routingOptions from separate localStorage key
    for (const s of _merged[trade]) {
      const key = `${trade}:${s.id}`;
      if (routingOptsAll[key]) s.routingOptions = routingOptsAll[key];
    }
  }
  // Include trades that exist only in localStorage (added via admin)
  for (const [trade, stages] of Object.entries(saved)) {
    if (!_merged[trade as Job['trade']]) {
      _merged[trade as Job['trade']] = stages.map(deserializeStage);
    }
  }
  // Remove fabrication — it's a cross-stage data section, not a routing stage
  for (const trade of Object.keys(_merged) as Job['trade'][]) {
    _merged[trade] = _merged[trade].filter(s => s.id !== 'fabrication');
  }
  return _merged;
}

/* invalidate the merged cache so next read re-loads from localStorage */
function invalidateTemplateCache() { _merged = null; }

/* ── CRUD for stage templates (called from admin) ── */

export function addStageTemplate(trade: Job['trade'], stage: Omit<StageTemplate, 'required'> & { required?: boolean }) {
  const templates = getTemplates();
  const newStage: StageTemplate = {
    ...stage,
    required: stage.required ?? true,
    signoffFields: stage.signoffFields ?? DEFAULT_SIGNOFF_FIELDS,
    rejectToStage: stage.rejectToStage ?? '',
  };
  templates[trade] = [...(templates[trade] ?? []), newStage];
  persistTemplates(templates);
}

export function updateStageTemplate(trade: Job['trade'], stageId: string, patch: Partial<StageTemplate>) {
  const templates = getTemplates();
  const list = templates[trade];
  if (!list) return;
  templates[trade] = list.map(s => s.id === stageId ? { ...s, ...patch } : s);
  persistTemplates(templates);
}

export function deleteStageTemplate(trade: Job['trade'], stageId: string) {
  const templates = getTemplates();
  templates[trade] = (templates[trade] ?? []).filter(s => s.id !== stageId);
  persistTemplates(templates);
}

/* add a new trade with default prep + handover stages */
export function addTrade(trade: string) {
  const templates = getTemplates();
  if (templates[trade as Job['trade']]) return; // already exists
  templates[trade as Job['trade']] = [
    { ...serializeStage(PREP_STAGE), signoffFields: PREP_STAGE.signoffFields, rejectToStage: '' } as StageTemplate,
    { ...serializeStage(HANDOVER_STAGE), signoffFields: HANDOVER_STAGE.signoffFields, rejectToStage: '' } as StageTemplate,
  ];
  persistTemplates(templates);
}

function persistTemplates(templates: Record<Job['trade'], StageTemplate[]>) {
  const serialized: Record<string, SerializedStage[]> = {};
  for (const [trade, list] of Object.entries(templates)) {
    serialized[trade] = list.map(serializeStage);
  }
  saveOverrides(serialized);
  invalidateTemplateCache();
}

/* export the merged templates as the public constant */
export const STAGE_TEMPLATES: Record<Job['trade'], StageTemplate[]> = new Proxy({} as Record<Job['trade'], StageTemplate[]>, {
  get(_target, prop: string) {
    return (getTemplates() as any)[prop];
  },
  ownKeys() {
    return Object.keys(getTemplates());
  },
  getOwnPropertyDescriptor(target, prop) {
    return { configurable: true, enumerable: true, value: (getTemplates() as any)[prop] };
  }
});

/* fields for a trade stage, backfills old saved workflows */
export function stageFieldsFor(trade: Job['trade'], stageId: string): StageField[] {
  return getTemplates()[trade]?.find(t => t.id === stageId)?.fields ?? [];
}

/* sign-off fields for a trade stage, backfills old saved workflows */
export function signoffFieldsFor(trade: Job['trade'], stageId: string): SignoffField[] {
  return getTemplates()[trade]?.find(t => t.id === stageId)?.signoffFields ?? DEFAULT_SIGNOFF_FIELDS;
}

/* all unique stage ids across all trades (for the admin screen) */
export function allStageIds(): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const templates of Object.values(getTemplates())) {
    for (const t of templates) {
      if (!seen.has(t.id)) seen.set(t.id, t.label);
    }
  }
  return [...seen.entries()].map(([id, label]) => ({ id, label }));
}

/* dynamic trade options — includes admin-added trades from localStorage */
export function getTradeOptions(): { label: string; value: string }[] {
  const trades = Object.keys(getTemplates()).sort((a, b) => {
    if (a === 'Welding') return -1;
    if (b === 'Welding') return 1;
    return a.localeCompare(b);
  });
  return trades.map(t => ({ label: t, value: t }));
}

export function buildStages(job: Job): WorkflowStage[] {
  /* prep + trade stages (from merged templates) + handover — no cycling */
  const templates = getTemplates();
  const tradeStages = templates[job.trade] ?? [];
  const handover = tradeStages.find(t => t.id === 'handover') ?? HANDOVER_STAGE;
  /* which Records track the job is on — same test buildStages() uses below to pick review-o63 vs review-o04 */
  const hasO63Data = Boolean(job.sfff || job.dssAaa || job.ss);

  const toStage = (t: StageTemplate): WorkflowStage => {
    const required = typeof t.required === 'function' ? t.required(job) : t.required;
    const sf = t.signoffFields ?? DEFAULT_SIGNOFF_FIELDS;
    const inputs: Record<string, string> = t.id === 'fitup-insp' ? { releaseToWelding: 'yes' } : {};
    const isWeldStage = ['tack', 'deferred-tack', 'root-weld', 'root-layer', 'final-weld'].includes(t.id);
    /* route NDT inspections to NQC Inspector when N Ind. is 1 or 2; Sold follows whichever Records track reviewed the job */
    const role = (t.role === 'Inspector' && (job.nInd === '1' || job.nInd === '2'))
      ? 'NQC Inspector' : t.id === 'sold' ? (hasO63Data ? 'O63 Records' : 'O04 Records') : (t.role ?? '');
    /* Only Root gets the 5X inspection field (user: should only appear on Root, not Final Weld),
       and only when NDT Root allows 5X -- answering yes auto-signs the Root VT/5X stage */
    let fields = (t.id === 'root-weld' && (job.ndtRoot || '').trim().toUpperCase() === '5X')
      ? [...t.fields, { key: 'performed5x', label: 'Did you perform 5X inspection and was it successful?', type: 'select' as const,
          options: [{ label: 'No I didn\'t perform 5X', value: 'no' }, { label: 'Yes I performed 5X and it was successful', value: 'yes' }] }]
      : [...t.fields];
    /* Weld stages get override fields */
    if (isWeldStage) {
      fields = [...fields, ...WELD_OVERRIDE_FIELDS.map(f => ({ ...f }))];
    }
    return {
      id: t.id,
      label: t.label,
      required,
      role,
      fields,
      inputs,
      signoffFields: sf.map(f => ({ ...f })),
      signoffInputs: {},
      result: null,
      rejectToStage: t.rejectToStage ?? '',
      repeatable: t.repeatable ?? false,
      routingType: t.routingOptions?.find(o => o.default)?.value ?? t.routingOptions?.[0]?.value ?? 'standard',
      swapStageId: '',
      /* inspection stages start blank so the inspector must state what was performed */
      inspectionType: t.role === 'Inspector' ? '' : (t.routingOptions?.find(o => o.default)?.value ?? t.routingOptions?.[0]?.value ?? ''),
      decisionLabel: t.decisionLabel ?? '',
      routingOptions: t.routingOptions,
      signed: false,
      signedAt: null,
      signoffRecords: [],
    };
  };

  // Welding: no prep, no handover — SOLD is the end
  if (job.trade === 'Welding') {
    const middle = tradeStages.filter(t => t.id !== 'prep' && t.id !== 'handover');
    const ndtFor = jobNdtSteps(job);
    const phaseOf = (id: string) => /^(root|layer|final)-ndt-/.exec(id)?.[1] as NdtPhase | undefined;
    const stepFor = (id: string) => {
      const phase = phaseOf(id);
      return phase ? ndtFor[phase].find(st => id === `${phase}-ndt-${st.kind}`) : undefined;
    };
    return middle.filter(t => {
      if (phaseOf(t.id)) return !!stepFor(t.id);
      if (t.id === 'pre-fit') {
        const needsInsertOrRing = job.nInd === '1' || job.nInd === '2';
        const jd = getJointDesign(job.jointDesign);
        const jdRequires = jd?.requiresConsumableInsert || jd?.requiresBackingRing || false;
        return needsInsertOrRing || jdRequires;
      }
      /* Records Review splits in two: O63 when any of SFFF/DSS-AAA/SS is set on the job, O04 otherwise */
      if (t.id === 'review-o63') return hasO63Data;
      if (t.id === 'review-o04') return !hasO63Data;
      return true;
    }).map(toStage).map(s => {
      const step = stepFor(s.id);
      if (!step) return s;
      /* only the method(s) the Joint Details values allow; a single one is locked in (pre-filled) */
      const routingOptions = s.routingOptions?.filter(o => step.methods.includes(o.value));
      return { ...s, routingOptions, inspectionType: step.methods.length === 1 ? step.methods[0] : '' };
    });
  }

  // Other trades: prep + stages + handover
  const prep = tradeStages.find(t => t.id === 'prep') ?? PREP_STAGE;
  const middle = tradeStages.filter(t => t.id !== 'prep' && t.id !== 'handover');
  return [prep, ...middle, handover].map(toStage);
}

const SEED_SPECIFIC_LOCATIONS = ['Bay 3, Rack 12', 'Bay 1, Rack 4', 'Bay 5, Rack 9', 'Cell 2, Line B', 'Pad C, Yard 1'];
/* W.E. Memo is a reference to a specific memo, e.g. M-10; about a third of jobs have none */
const seedWeMemo = (rand: () => number) => (rand() < 0.3 ? '' : `M-${10 + Math.floor(rand() * 40)}`);

/* Realistic, deterministic fabrication data for a welding job. Every select value is taken from the real
   option lists so the dropdowns are populated; Ship-only fields are set only when Location is Ship. */
export function seedFabricationData(job: Job): Record<string, string> {
  const rand = seeded(job.id.charCodeAt(0) * 131 + job.id.charCodeAt(1) * 17 + job.id.charCodeAt(3));
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const shops = shopOptions();
  const ship = shops.find(s => s.value === 'ship');
  const onShip = !!ship && rand() < 0.3;
  const location = onShip ? ship!.value : pick(shops.filter(s => s.value !== 'ship')).value;
  const usageOptions = FABRICATION_FIELDS.find(f => f.key === 'usage')?.options ?? [];
  const revised = rand() < 0.3;
  return {
    location,
    specificLocation: pick(SEED_SPECIFIC_LOCATIONS),
    ...(onShip ? {
      deck: `D${1 + Math.floor(rand() * 8)}`,
      frame: `F${10 + Math.floor(rand() * 60)}`,
      pscl: pick(['P', 'S', 'CL']),
      usage: pick(usageOptions).value,
    } : {}),
    id1: seededMic(rand),
    id2: seededMic(rand),
    drawingRev: job.drawingRev || 'C',
    actualThickness: pick(['0.375', '0.5', '0.625', '0.75', '1.0']),
    weldMemo: seedWeMemo(rand),
    revisedJointDesign: revised ? 'bj-g' : '',
    changeNumber: revised ? `ER-${1000 + Math.floor(rand() * 9000)}` : '',
    wtn: rand() < 0.5 ? '07:11.5-3' : '09:10.8-4',
  };
}

export function newWorkflow(job: Job): JobWorkflow {
  /* pre-populate fabrication data for welding demo */
  const fabData: Record<string, string> = job.trade === 'Welding' ? seedFabricationData(job) : {};
  return {
    jobId: job.id,
    technician: job.technician,
    stages: buildStages(job),
    attachments: [],
    conditionCode: '',
    conditionCount: 0,
    history: [],
    fabricationData: fabData,
  };
}

/* deterministic PRNG, stable per seed across reloads (mirrors jobs.ts / mock-history.ts) */
function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* how many leading stages are already signed off — varies the "current routing" per job.
   Deterministic per job: ensures coverage of every stage including all NDT types. */
function signedStageCount(job: Job, total: number): number {
  if (total <= 0) return 0;
  // Cycle through all stages so every position gets represented
  const id = String(job.id);
  const idx = Math.abs(id.charCodeAt(0) * 7 + id.charCodeAt(1) * 3) % total;
  return idx;
}

/* MIC (material identification code): hyphen-delimited heat/lot style, e.g. 250C-1500-290-5 */
function seededMic(rand: () => number): string {
  const letter = 'ABCDEFGH'[Math.floor(rand() * 8)];
  return `${200 + Math.floor(rand() * 300)}${letter}-${1000 + Math.floor(rand() * 9000)}-${100 + Math.floor(rand() * 900)}-${1 + Math.floor(rand() * 9)}`;
}

/* plausible recorded value for a seeded, already-signed stage field */
function seededFieldValue(f: StageField, rand: () => number): string {
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  if (f.type === 'select' && f.options?.length) {
    return f.options[Math.floor(rand() * f.options.length)].value;
  }
  /* checkboxes: signed verifications are checked, the rest left unchecked */
  if (f.type === 'checkbox') return f.key.startsWith('verify') ? 'yes' : '';
  if (f.type === 'number') return String(1 + Math.floor(rand() * 120));
  if (f.type === 'text' && /mic$|^(consumableinsertid|backingringid)$/i.test(f.key)) return seededMic(rand);
  if (f.placeholder && f.placeholder.startsWith('e.g. ')) return f.placeholder.slice(5);
  /* fallback realistic values based on key patterns */
  const key = f.key.toLowerCase();
  if (key.includes('name') || key.includes('inspector')) return pick(['J. Carter', 'M. Nguyen', 'R. Patel', 'S. Williams', 'T. Garcia', 'A. Singh', 'K. Brown', 'L. Chen']);
  if (key.includes('license') || key.includes('lic')) return `LIC-${1000 + Math.floor(rand() * 9000)}`;
  if (key.includes('brand') || key.includes('penetrant')) return pick(['Magnaflux', 'Sherwin', 'NDT Systems', 'Spotcheck']);
  if (key.includes('manufacturer')) return pick(['Magnaflux Corp', 'Sherwin Williams', 'NDT Systems Inc']);
  if (key.includes('procedure') || key.includes('method')) return pick(['ASME V', 'AWS D1.1', 'ISO 17636', 'ISO 3452']);
  if (key.includes('thickness')) return pick(['3/8"', '1/2"', '5/8"', '3/4"', '1"']);
  if (key.includes('wps')) return pick(['WPS-001', 'WPS-002', 'WPS-003']);
  if (key.includes('date')) return new Date(Date.now() - Math.floor(rand() * 30) * 86400000).toISOString().slice(0, 10);
  if (key.includes('note') || key.includes('comment')) return pick(['Standard procedure followed', 'No issues noted', 'Completed per spec', 'All criteria met']);
  return pick(['Completed', 'Verified', 'Accepted', 'Passed']);
}

/* a fresh workflow with a deterministic run of leading stages pre-signed (all accepted),
   so the current stage differs job-to-job. Persisted (real) workflows always override this. */
export function seededWorkflow(job: Job): JobWorkflow {
  const wf = newWorkflow(job);
  const total = wf.stages.length;
  /* a handful of jobs wait at Fit-Up Release for a Foreman: everything up to it signed, release box unchecked */
  const releaseIdx = wf.stages.findIndex(s => s.id === 'fitup-release');
  const awaitingRelease = releaseIdx >= 0 && [...job.id].reduce((a, c) => a + c.charCodeAt(0) * 31, 0) % 60 === 0;
  const k = awaitingRelease ? releaseIdx : signedStageCount(job, total);
  if (k <= 0) return wf;

  const rand = seeded(job.id.charCodeAt(0) * 97 + job.id.charCodeAt(1) * 13);
  const DAY = 24 * 60 * 60 * 1000, MIN = 60 * 1000;
  let t = Date.now() - (2 + Math.floor(rand() * 40)) * DAY;

  const names = SEEDED_INSPECTOR_NAMES;
  wf.stages = wf.stages.map((s, i) => {
    if (i >= k) return awaitingRelease && i === releaseIdx ? { ...s, required: true } : s;
    t += (20 + Math.floor(rand() * 180)) * MIN;
    const inputs = { ...s.inputs };
    for (const f of s.fields) inputs[f.key] = seededFieldValue(f, rand);
    if (awaitingRelease && s.id === 'fitup-insp') inputs['releaseToWelding'] = '';
    const signoffInputs: Record<string, string> = {};
    for (const f of s.signoffFields) {
      if (f.key === 'inspectorName') signoffInputs[f.key] = job.technician;
      else if (f.key === 'licenseNo') signoffInputs[f.key] = `LIC-${1000 + Math.floor(rand() * 9000)}`;
      else signoffInputs[f.key] = seededFieldValue(f, rand);
    }
    const who = signoffInputs['inspectorName'] || names[Math.floor(rand() * names.length)];
    const opts = s.routingOptions ?? [];
    const inspectionType = s.inspectionType || (opts.length ? opts[job.id.charCodeAt(2) % opts.length].value : '');
    const signedView = { ...s, inspectionType, inputs, signoffInputs, result: 'sat' as StageResult };
    wf.history.push({
      when: new Date(t).toISOString(),
      who,
      ...stampWho(who),
      section: 'Sign-off',
      action: s.label,
      from: '',
      to: hasDecision(s) ? 'SAT' : '',
      routing: s.label,
      inputs: snapshotInputs(signedView, fieldsShown(signedView), s.signoffFields),
      stageId: s.id,
    });
    return {
      ...s,
      inspectionType,
      inputs,
      signoffInputs,
      result: 'sat' as StageResult,
      signed: true,
      signedAt: new Date(t).toISOString(),
      signoffRecords: [{
        stageLabel: s.label,
        fields: Object.entries({ ...inputs, ...signoffInputs })
          .filter(([, v]) => v)
          .map(([key, value]) => ({ key, label: key, value })),
        result: 'sat' as StageResult,
        who,
        when: new Date(t).toISOString(),
        action: 'signed' as const,
      }],
    };
  });
  return wf;
}

/* locked until prior required stages signed */
export function isStageLocked(stages: WorkflowStage[], index: number): boolean {
  for (let i = 0; i < index; i++) {
    const s = stages[i];
    if (s.required && !s.signed) return true;
  }
  return false;
}

/* first unsigned required stage, the current routing */
export function currentRoutingLabel(stages: WorkflowStage[]): string {
  const next = stages.find(s => s.required && !s.signed);
  return next ? next.label : stages[stages.length - 1]?.label ?? 'Complete';
}

/* id of stage awaiting sign-off, null when done */
export function activeStageId(stages: WorkflowStage[]): string | null {
  return stages.find(s => s.required && !s.signed)?.id ?? null;
}

export function allRequiredSigned(stages: WorkflowStage[]): boolean {
  return stages.every(s => !s.required || s.signed);
}
