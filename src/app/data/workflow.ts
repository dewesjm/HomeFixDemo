/* workflow model + stage helpers, no UI */
import { Job } from './jobs';
import { MATERIAL_OPTIONS } from './materials';

/* ── Role-based queue routing ── */
export const ROLES = ['Fitting', 'Welding', 'Foreman', 'Inspector', 'NQC Inspector', 'Records', 'View'] as const;
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
  type: 'text' | 'number' | 'select' | 'checkbox';
  unit?: string;          /* shown by the label, e.g. PSI */
  placeholder?: string;
  options?: { label: string; value: string }[];
  showIf?: { key: string; equals: string };   // ← declarative dependency, serializable
  fullWidth?: boolean;   /* spans full grid width */
  required?: boolean;    /* must be filled before signoff */
  minField?: string;     /* cross-field: value must be >= this field's value */
  maxField?: string;     /* cross-field: value must be <= this field's value */
}

/* configurable field on the per-stage sign-off panel */
export interface SignoffField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  showIf?: { key: string; equals: string };
  fullWidth?: boolean;   // spans full grid width (3 columns)
}

/* sequential stages, each its own sign-off */
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
  repeatable: boolean;            /* signing with stepType='repeat' inserts another copy */
  stepType: string;               /* 'standard' | 'repeat' | 'final' — chosen at signoff */
  routeTo: string;                /* stage id to jump to on sign (empty = next in sequence) */
  swapStageId: string;            /* which stage template to use for fields (empty = own) */
  inspectionType: string;         /* admin-managed sub-type (e.g. MT/PT on NDT MT/PT stage) */
  stepOptions?: StageOption[];    /* admin-managed options for this stage */
  signed: boolean;
  signedAt: string | null;        /* ISO string, set when signed */
  role: string;                   /* role this stage routes to (e.g. 'Fitting', 'Welding') */
  showOverride?: boolean;         /* show Override Requirements section (weld stages only) */
}

export interface InstalledComponent {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
}

export interface Attachment {
  id: string;
  name: string;           /* filename, files not actually uploaded here */
  addedBy: string;
  addedAt: string;        /* ISO string */
}

/* build vs install phase */
export type WorkType = 'build' | 'install';

export const WORK_TYPE_OPTIONS: { label: string; value: WorkType }[] = [
  { label: 'Build', value: 'build' },
  { label: 'Install', value: 'install' }
];

export interface HistoryEntry {
  when: string;          /* ISO string */
  who: string;
  section: 'Stages' | 'Work Validation' | 'Sign-off' | 'Attachments' | 'Fabrication' | 'Release';
  action: string;        /* what was changed/done — field name or event */
  from?: string;         /* previous value, when the action changed one */
  to?: string;           /* new value, when the action changed one */
  step: string;          /* step label at time of change */
}

export interface JobWorkflow {
  jobId: number;
  technician: string;
  stages: WorkflowStage[];
  components: InstalledComponent[];
  attachments: Attachment[];
  validationNotes: string;   /* free-text for Work Validation section */
  workType: WorkType | null; /* build vs install, set on Work Validation */
  conditionCode: string;     /* see conditions.ts, '' if none */
  conditionCount: number;    /* pairs with conditionCode */
  history: HistoryEntry[];
  fabricationData: Record<string, string>; /* cross-stage fields (Welding fabrication section) */
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
  /* admin-managed step options (e.g. Fit/Weld Build up, MT/PT) */
  stepOptions?: StageOption[];
}

const titleHas = (job: Job, ...words: string[]) =>
  words.some(w => job.title.toLowerCase().includes(w.toLowerCase()));

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
const SHOPS_LS_KEY = 'homefix:shops:v1';
const DEFAULT_SHOPS = ['Shop A', 'Shop B', 'Shop C', 'Field'];

export function getShops(): string[] {
  try {
    const raw = localStorage.getItem(SHOPS_LS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SHOPS;
  } catch { return DEFAULT_SHOPS; }
}

export function setShops(shops: string[]) {
  localStorage.setItem(SHOPS_LS_KEY, JSON.stringify(shops));
}

/* ── Weld Positions (admin-configurable via localStorage) ── */
export interface WeldPosition {
  code: string;
  description: string;
}

const WELD_POSITIONS_LS_KEY = 'homefix:weld-positions:v1';
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

/* ── Step options per stage (admin-configurable via localStorage) ── */
export type { StageOption };

const STEP_OPTIONS_LS_KEY = 'homefix:step-options:v1';

export function setStageStepOptions(trade: string, stageId: string, options: StageOption[]) {
  const raw = localStorage.getItem(STEP_OPTIONS_LS_KEY);
  const all: Record<string, StageOption[]> = raw ? JSON.parse(raw) : {};
  all[`${trade}:${stageId}`] = options;
  localStorage.setItem(STEP_OPTIONS_LS_KEY, JSON.stringify(all));
}

export function getStageStepOptions(trade: string, stageId: string): StageOption[] | undefined {
  const raw = localStorage.getItem(STEP_OPTIONS_LS_KEY);
  if (!raw) return undefined;
  const all: Record<string, StageOption[]> = JSON.parse(raw);
  return all[`${trade}:${stageId}`];
}

/* ── Penetrant entries (admin-configurable via localStorage) ── */
export interface PenetrantEntry {
  type: string;
  manufacturer: string;
}

const PENETRANT_LS_KEY = 'homefix:penetrants:v1';
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

/** Legacy helpers — delegate to the combined list */
export function getPenetrantTypes(): string[] {
  return [...new Set(getPenetrants().map(p => p.type))];
}
export function getPenetrantManufacturers(): string[] {
  return [...new Set(getPenetrants().map(p => p.manufacturer))];
}

/* ── Shared weld stage fields (Tack, Root, Final Weld) ── */
const WELD_STAGE_FIELDS: StageField[] = [
  { key: 'weldProcedure', label: 'Weld Procedure', type: 'select', required: true,
    options: [{ label: 'WPS-001', value: 'wps-001' }, { label: 'WPS-002', value: 'wps-002' },
      { label: 'WPS-003', value: 'wps-003' }, { label: 'WPS-004', value: 'wps-004' }] },
  { key: 'wtn', label: 'WTN', type: 'select', required: true,
    options: [{ label: 'WTN-101', value: 'wtn-101' }, { label: 'WTN-102', value: 'wtn-102' },
      { label: 'WTN-103', value: 'wtn-103' }, { label: 'WTN-201', value: 'wtn-201' }] },
  { key: 'weldProcess', label: 'Weld Process', type: 'select', required: true,
    options: [{ label: 'SMAW', value: 'smaw' }, { label: 'GMAW', value: 'gmaw' },
      { label: 'GTAW', value: 'gtaw' }, { label: 'FCAW', value: 'fcaw' }] },
  { key: 'qualificationCheck', label: 'Qualification Check', type: 'text' },
  { key: 'phMin', label: 'PH Min', type: 'number' },
  { key: 'phMax', label: 'PH Max', type: 'number' },
  { key: 'ipMin', label: 'IP Min', type: 'number' },
  { key: 'ipMax', label: 'IP Max', type: 'number' },
  { key: 'overridePhMin', label: 'Override PH Min', type: 'number' },
  { key: 'overridePhMax', label: 'Override PH Max', type: 'number' },
  { key: 'overrideIpMin', label: 'Override IP Min', type: 'number' },
  { key: 'overrideIpMax', label: 'Override IP Max', type: 'number' },
  { key: 'overrideNote', label: 'Override Note', type: 'text' },
  { key: 'actualPh', label: 'Actual PH', type: 'number', required: true, minField: 'phMin', maxField: 'phMax' },
  { key: 'actualIp', label: 'Actual IP', type: 'number', required: true, minField: 'ipMin', maxField: 'ipMax' },
  { key: 'weldPosition', label: 'Weld Position', type: 'select',
    options: getWeldPositions().map(p => ({ label: `${p.code} - ${p.description}`, value: p.code.toLowerCase() })) },
  { key: 'fillerMetalType', label: 'Filler Metal Type', type: 'select', required: true,
    options: [{ label: 'ER70S-6', value: 'er70s-6' }, { label: 'ER80S-D2', value: 'er80s-d2' },
      { label: 'E6010', value: 'e6010' }, { label: 'E7018', value: 'e7018' }] },
  { key: 'fillerMetalSize', label: 'Filler Metal Size', type: 'select', required: true,
    options: [{ label: '1/16"', value: '1/16' }, { label: '3/32"', value: '3/32' },
      { label: '1/8"', value: '1/8' }, { label: '5/32"', value: '5/32' }] },
  { key: 'fillerMetalMic', label: 'Filler Metal MIC', type: 'text', required: true },
  { key: 'comments', label: 'Comments', type: 'text', fullWidth: true },
];

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
}

export const FABRICATION_FIELDS: FabricationField[] = [
  // Line 1: Location and Specific Location
  { key: 'location', label: 'Location', type: 'select', row: 1,
    options: getShops().map(s => ({ label: s, value: s.toLowerCase().replace(/\s+/g, '-') })) },
  { key: 'specificLocation', label: 'Specific Location', type: 'text', placeholder: 'e.g. Bay 3, Rack 12', row: 1 },
  // Line 2: Deck, Frame, P/S/CL, and Usage
  { key: 'deck', label: 'Deck', type: 'text', row: 2 },
  { key: 'frame', label: 'Frame', type: 'text', row: 2 },
  { key: 'pscl', label: 'P/S/CL', type: 'text', row: 2 },
  { key: 'usage', label: 'Usage', type: 'text', row: 2 },
  // Line 3: MIC 1 and MIC 2
  { key: 'id1', label: 'MIC 1', type: 'text', row: 3 },
  { key: 'id2', label: 'MIC 2', type: 'text', row: 3 },
  // Line 4: Drawing Rev (Execution) and Actual Thickness
  { key: 'drawingRev', label: 'Drawing Rev (Execution)', type: 'text', row: 4 },
  { key: 'actualThickness', label: 'Actual Thickness', type: 'text', placeholder: 'IN', row: 4 },
  // Line 5: W.E. Memo, Revised Joint Design, and Change Number
  { key: 'weldMemo', label: 'W.E. Memo', type: 'text', row: 5 },
  { key: 'revisedJointDesign', label: 'Revised Joint Design', type: 'select', row: 5,
    options: [
      { label: 'BJ-G', value: 'bj-g' }, { label: 'BJ-S', value: 'bj-s' },
      { label: 'FJ-G', value: 'fj-g' }, { label: 'FJ-S', value: 'fj-s' },
      { label: 'LJ-G', value: 'lj-g' }, { label: 'LJ-S', value: 'lj-s' },
      { label: 'CJ-G', value: 'cj-g' }, { label: 'CJ-S', value: 'cj-s' },
      { label: 'EJ-G', value: 'ej-g' }, { label: 'EJ-S', value: 'ej-s' },
      { label: 'TJ-G', value: 'tj-g' }, { label: 'TJ-S', value: 'tj-s' },
    ] },
  { key: 'changeNumber', label: 'ER/IR', type: 'text', row: 5 },
];

const TRADE_STAGES: Record<Job['trade'], StageTemplate[]> = {
  HVAC: [
    { id: 'diagnostic',  label: 'Diagnose',                 required: true, fields: [
      { key: 'faultCode',  label: 'Fault code',   type: 'text',   placeholder: 'e.g. E4' },
      { key: 'supplyTemp', label: 'Supply temp',  type: 'number', unit: '°F' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'testMethod', label: 'Test method', type: 'select', required: false,
        options: [{ label: 'Visual + functional', value: 'visual-functional' }, { label: 'Meter reading', value: 'meter' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'repair',      label: 'Repair',         required: true, fields: [
      { key: 'partReplaced', label: 'Part replaced', type: 'text', placeholder: 'e.g. blower motor' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'licenseNo', label: 'License #', type: 'text', required: true },
      { key: 'reworkNeeded', label: 'Rework needed', type: 'select', required: false,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ], rejectToStage: 'diagnostic' },
    { id: 'refrigerant', label: 'Charge',   required: job => titleHas(job, 'AC', 'recharge', 'Heat pump'), fields: [
      { key: 'refrigerantType', label: 'Refrigerant type', type: 'text',   placeholder: 'e.g. R-410A' },
      { key: 'chargePsi',       label: 'Charge',           type: 'number', unit: 'PSI' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'permitVerified', label: 'Permit verified', type: 'select', required: true,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'N/A', value: 'na' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ], rejectToStage: 'diagnostic' },
    { id: 'combustion',  label: 'CO check',      required: job => titleHas(job, 'Furnace'), fields: [
      { key: 'coReading', label: 'CO reading', type: 'number', unit: 'ppm' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'safetyCheck', label: 'Safety check', type: 'select', required: true,
        options: [{ label: 'Passed', value: 'passed' }, { label: 'Failed', value: 'failed' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ], rejectToStage: 'repair' },
    { id: 'airflow',     label: 'Airflow', required: true, fields: [
      { key: 'airflowCfm', label: 'Airflow',            type: 'number', unit: 'CFM' },
      { key: 'setpoint',   label: 'Thermostat setpoint', type: 'number', unit: '°F' }
    ], signoffFields: DEFAULT_SIGNOFF_FIELDS, rejectToStage: 'diagnostic' } ],
  Plumbing: [
    { id: 'diagnostic', label: 'Diagnose',                    required: true, fields: [
      { key: 'leakLocation', label: 'Leak location', type: 'text', placeholder: 'e.g. under sink' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'testMethod', label: 'Test method', type: 'select', required: false,
        options: [{ label: 'Pressure test', value: 'pressure' }, { label: 'Visual', value: 'visual' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'shutoff',    label: 'Shutoff',                   required: true, fields: [
      { key: 'valveType', label: 'Shutoff valve type', type: 'text', placeholder: 'e.g. quarter-turn' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'safetyCheck', label: 'Safety check', type: 'select', required: true,
        options: [{ label: 'Passed', value: 'passed' }, { label: 'Failed', value: 'failed' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ], rejectToStage: 'diagnostic' },
    { id: 'pressure',   label: 'Pressure',                      required: true, fields: [
      { key: 'testPsi',  label: 'Test pressure', type: 'number', unit: 'PSI' },
      { key: 'holdTime', label: 'Hold time',     type: 'number', unit: 'min' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'permitVerified', label: 'Permit verified', type: 'select', required: false,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'N/A', value: 'na' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ], rejectToStage: 'shutoff' },
    { id: 'backflow',   label: 'Backflow',required: job => titleHas(job, 'Water heater', 'Sump'), fields: [
      { key: 'deviceSerial', label: 'Device serial #', type: 'text' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'permitVerified', label: 'Permit verified', type: 'select', required: true,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ], rejectToStage: 'pressure' },
    { id: 'code',       label: 'Code',              required: true, fields: [
      { key: 'codeSection', label: 'Code section', type: 'text', placeholder: 'e.g. UPC 604.3' }
    ], signoffFields: DEFAULT_SIGNOFF_FIELDS, rejectToStage: 'diagnostic' }
  ],
  Electrical: [
    { id: 'lockout',    label: 'Lockout',              required: true, fields: [
      { key: 'circuitNo', label: 'Breaker / circuit #', type: 'text' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'safetyCheck', label: 'Safety check', type: 'select', required: true,
        options: [{ label: 'Passed', value: 'passed' }, { label: 'Failed', value: 'failed' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'wiring',     label: 'Wiring',                    required: true, fields: [
      { key: 'wireGauge', label: 'Wire gauge', type: 'number', unit: 'AWG' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'permitVerified', label: 'Permit verified', type: 'select', required: false,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'N/A', value: 'na' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'continuity', label: 'Continuity',         required: true, fields: [
      { key: 'resistance', label: 'Resistance', type: 'number', unit: 'Ω' }
    ], signoffFields: DEFAULT_SIGNOFF_FIELDS },
    { id: 'gfci',       label: 'GFCI',           required: job => titleHas(job, 'GFCI', 'Outlet'), fields: [
      { key: 'tripTime', label: 'Trip time', type: 'number', unit: 'ms' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'testMethod', label: 'Test method', type: 'select', required: false,
        options: [{ label: 'Visual + functional', value: 'visual-functional' }, { label: 'Meter reading', value: 'meter' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'panel',      label: 'Panel',       required: job => titleHas(job, 'Panel'), fields: [
      { key: 'groundResistance', label: 'Ground resistance', type: 'number', unit: 'Ω' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'licenseNo', label: 'License #', type: 'text', required: true },
      { key: 'permitVerified', label: 'Permit verified', type: 'select', required: true,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] }
  ],
  Roofing: [
    { id: 'surface',  label: 'Surface',          required: true, fields: [
      { key: 'areaInspected', label: 'Area inspected', type: 'number', unit: 'sq ft' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'testMethod', label: 'Test method', type: 'select', required: false,
        options: [{ label: 'Visual + functional', value: 'visual-functional' }, { label: 'Load test', value: 'load' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'repair',   label: 'Repair',        required: true, fields: [
      { key: 'material', label: 'Material used', type: 'text', placeholder: 'e.g. architectural shingle' }
    ], signoffFields: DEFAULT_SIGNOFF_FIELDS },
    { id: 'flashing', label: 'Flashing',       required: true, fields: [
      { key: 'sealant', label: 'Sealant type', type: 'text', placeholder: 'e.g. polyurethane' }
    ], signoffFields: DEFAULT_SIGNOFF_FIELDS },
    { id: 'leaktest', label: 'Leak test',           required: job => titleHas(job, 'Leak', 'patch', 'Skylight'), fields: [
      { key: 'testDuration', label: 'Test duration', type: 'number', unit: 'min' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'testMethod', label: 'Test method', type: 'select', required: true,
        options: [{ label: 'Pressure test', value: 'pressure' }, { label: 'Visual + functional', value: 'visual-functional' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'cleanup',  label: 'Cleanup',required: true, fields: [
      { key: 'debrisBags', label: 'Debris removed', type: 'number', unit: 'bags' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'safetyCheck', label: 'Safety check', type: 'select', required: false,
        options: [{ label: 'Passed', value: 'passed' }, { label: 'N/A', value: 'na' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] }
  ],
  Carpentry: [
    { id: 'measure', label: 'Measure', required: true, fields: [
      { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g. 36" × 80"' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'testMethod', label: 'Test method', type: 'select', required: false,
        options: [{ label: 'Visual + functional', value: 'visual-functional' }, { label: 'Load test', value: 'load' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'build',   label: 'Build',              required: true, fields: [
      { key: 'material', label: 'Material used', type: 'select', options: MATERIAL_OPTIONS, placeholder: 'Select material' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'crewSize', label: 'Crew size', type: 'number', required: false },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'load',    label: 'Load check',       required: job => titleHas(job, 'Deck', 'Shelving', 'Cabinet'), fields: [
      { key: 'ratedLoad', label: 'Rated load', type: 'number', unit: 'lbs' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'testMethod', label: 'Test method', type: 'select', required: true,
        options: [{ label: 'Load test', value: 'load' }, { label: 'Visual + functional', value: 'visual-functional' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'sanding',  label: 'Sanding',              required: true, repeatable: true, fields: [
      { key: 'grit', label: 'Grit', type: 'select', options: [
        { label: '80 (rough)', value: '80' }, { label: '120 (medium)', value: '120' },
        { label: '220 (fine)', value: '220' }, { label: '400 (finish)', value: '400' }
      ]},
      { key: 'surface', label: 'Surface condition', type: 'text', placeholder: 'e.g. smooth, raised grain' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'finish',  label: 'Finish',                required: true, fields: [
      { key: 'finish', label: 'Finish / stain', type: 'text', placeholder: 'e.g. satin poly' }
    ], signoffFields: DEFAULT_SIGNOFF_FIELDS },
    { id: 'fit',     label: 'Final fit',         required: true, fields: [
      { key: 'gapTolerance', label: 'Gap tolerance', type: 'number', unit: 'in' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'reworkNeeded', label: 'Rework needed', type: 'select', required: false,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      { key: 'customerSignature', label: 'Customer signature', type: 'select', required: false,
        options: [{ label: 'On file', value: 'on-file' }, { label: 'Verbal', value: 'verbal' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] }
  ],
  Inspection: [
    { id: 'docs',       label: 'Docs',      required: true, fields: [
      { key: 'permitNo', label: 'Permit #', type: 'text' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'licenseNo', label: 'License #', type: 'text', required: true },
      { key: 'permitVerified', label: 'Permit verified', type: 'select', required: true,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'visual',     label: 'Visual',         required: true, fields: [
      { key: 'defectsFound', label: 'Defects found', type: 'number' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'testMethod', label: 'Test method', type: 'select', required: true,
        options: [{ label: 'Visual + functional', value: 'visual-functional' }] },
      { key: 'reworkNeeded', label: 'Rework needed', type: 'select', required: false,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'functional', label: 'Function',           required: true, fields: [
      { key: 'itemsTested', label: 'Items tested', type: 'number' }
    ], signoffFields: DEFAULT_SIGNOFF_FIELDS },
    { id: 'hazard',     label: 'Hazards',required: true, fields: [
      { key: 'hazards', label: 'Hazards noted', type: 'text', placeholder: 'e.g. exposed wiring' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'safetyCheck', label: 'Safety check', type: 'select', required: true,
        options: [{ label: 'Passed', value: 'passed' }, { label: 'Failed', value: 'failed' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'report',     label: 'Report',           required: true, fields: [
      { key: 'rating', label: 'Overall rating (1–5)', type: 'number' }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'licenseNo', label: 'License #', type: 'text', required: true },
      { key: 'customerSignature', label: 'Customer signature', type: 'select', required: true,
        options: [{ label: 'On file', value: 'on-file' }, { label: 'Pending', value: 'pending' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] }
  ],
  Welding: [
    { id: 'fit', label: 'Fit', required: true, role: 'Fitting', fields: [], signoffFields: [
      { key: 'consumableType', label: 'Consumable Type', type: 'select', required: true,
        options: [{ label: 'E6010', value: 'e6010' }, { label: 'E6013', value: 'e6013' },
          { label: 'E7018', value: 'e7018' }, { label: 'ER70S-6', value: 'er70s-6' },
          { label: 'ER80S-D2', value: 'er80s-d2' }, { label: 'ENiCrMo-3', value: 'enicrmo-3' }] },
      { key: 'consumableSize', label: 'Consumable Size', type: 'select', required: true,
        options: [{ label: '1/16"', value: '1/16' }, { label: '3/32"', value: '3/32' },
          { label: '1/8"', value: '1/8' }, { label: '5/32"', value: '5/32' },
          { label: '3/16"', value: '3/16' }, { label: '1/4"', value: '1/4' }] },
      { key: 'consumableId', label: 'Consumable ID', type: 'text', required: true },
      { key: 'backingRingType', label: 'Backing Ring Type', type: 'select', required: true,
        options: [{ label: 'Standard', value: 'standard' }, { label: 'Heavy', value: 'heavy' },
          { label: 'Copper', value: 'copper' }, { label: 'Ceramic', value: 'ceramic' }] },
      { key: 'backingRingId', label: 'Backing Ring ID', type: 'text', required: true },
      { key: 'comments', label: 'Comments', type: 'text', required: false, fullWidth: true },
      { key: 'deferTack', label: 'Defer Tack', type: 'text', required: false },
    ], stepOptions: [
      { label: 'Fit', value: 'fit', default: true },
      { label: 'Weld Build up', value: 'weld-buildup' },
    ] },
    { id: 'tack', label: 'Tack', displayName: 'Tack', required: true, role: 'Welding', fields: WELD_STAGE_FIELDS, signoffFields: [] },
    { id: 'fitup-insp', label: 'Fit-Up Insp', required: true, role: 'Foreman|Inspector', fields: [
      { key: 'verifyMic1', label: 'MIC 1 verified', type: 'checkbox' },
      { key: 'verifyMic2', label: 'MIC 2 verified', type: 'checkbox' },
      { key: 'verifyDrawingRev', label: 'Drawing Rev verified', type: 'checkbox' },
      { key: 'verifyActualThickness', label: 'Actual Thickness verified', type: 'checkbox' },
      { key: 'verifyRevisedJointDesign', label: 'Revised Joint Design verified', type: 'checkbox' },
    ],
      signoffFields: [], decisionLabel: 'Inspection Results', rejectToStage: 'tack' },
    { id: 'fitup-release', label: 'Fit-Up Release', displayName: 'Fit-Up Release', required: false, role: 'Foreman', fields: [], signoffFields: [] },
    { id: 'deferred-tack', label: 'Deferred Tack', displayName: 'Tack', required: false, role: 'Welding', fields: [
      { key: 'tackCount', label: 'Tack welds', type: 'number' },
      { key: 'tackSize', label: 'Tack size', type: 'number', unit: 'mm' },
      { key: 'tackCondition', label: 'Tack condition', type: 'select',
        options: [{ label: 'Good', value: 'good' }, { label: 'Cracked', value: 'cracked' },
          { label: 'Incomplete', value: 'incomplete' }] }
    ], signoffFields: [] },
    { id: 'root-weld', label: 'Root', required: true, role: 'Welding', fields: WELD_STAGE_FIELDS, signoffFields: [] },
    { id: 'root-ndt-utrt', label: 'Root NDT UT/RT', required: true, role: 'Inspector', fields: [
      { key: 'ndtMethod', label: 'NDT method', type: 'select',
        options: [{ label: 'Ultrasonic', value: 'ut' }, { label: 'Radiographic', value: 'rt' }] },
      { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text' },
      { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text' },
    ], signoffFields: [], rejectToStage: 'root-weld', decisionLabel: 'Inspection Results', stepOptions: [
      { label: 'UT', value: 'ut', default: true },
      { label: 'RT', value: 'rt' },
    ] },
    { id: 'root-ndt-mtpt', label: 'Root NDT MT/PT', required: true, role: 'Inspector', fields: [
      { key: 'penetrant', label: 'Penetrant', type: 'select', showIf: { key: 'inspectionType', equals: 'pt' },
        options: getPenetrants().map(p => ({ label: `${p.type} — ${p.manufacturer}`, value: `${p.type}|||${p.manufacturer}` })) },
      { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text' },
      { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text' },
    ], signoffFields: [], rejectToStage: 'root-weld', decisionLabel: 'Inspection Results', stepOptions: [
      { label: 'MT', value: 'mt', default: true },
      { label: 'PT', value: 'pt' },
    ] },
    { id: 'root-ndt-vt5x', label: 'Root NDT VT/5X', required: true, role: 'Inspector', fields: [
      { key: 'weldColor', label: 'Weld Color', type: 'select', showIf: { key: 'inspectionType', equals: 'vt' },
        options: [
          { label: 'Straw', value: 'straw' }, { label: 'Gold', value: 'gold' },
          { label: 'Light yellow', value: 'light-yellow' }, { label: 'Dark yellow', value: 'dark-yellow' },
          { label: 'Brown', value: 'brown' }, { label: 'Light blue', value: 'light-blue' },
          { label: 'Dark blue', value: 'dark-blue' }, { label: 'Grey', value: 'grey' },
          { label: 'Black', value: 'black' }, { label: 'White', value: 'white' },
          { label: 'Green', value: 'green' }, { label: 'No color', value: 'none' },
        ] },
      { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text' },
      { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text' },
    ], signoffFields: [], rejectToStage: 'root-weld', decisionLabel: 'Inspection Results', stepOptions: [
      { label: 'VT', value: 'vt', default: true },
      { label: '5X', value: '5x' },
    ] },
    { id: 'root-layer', label: 'Layer', required: true, role: 'Welding',
      fields: [...WELD_STAGE_FIELDS,
        { key: 'consumableInsertOnly', label: 'Only Consumable Insert used as filler', type: 'select',
          options: [{ label: 'No', value: 'no' }, { label: 'Yes', value: 'yes' }] },
      ],
      signoffFields: [], stepOptions: [
        { label: 'Interim Layer', value: 'interim', default: true },
        { label: 'Final Layer', value: 'final' },
      ] },
    { id: 'layer-ndt-utrt', label: 'Layer NDT UT/RT', required: true, role: 'Inspector', fields: [
      { key: 'ndtMethod', label: 'NDT method', type: 'select',
        options: [{ label: 'Ultrasonic', value: 'ut' }, { label: 'Radiographic', value: 'rt' }] },
      { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text' },
      { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text' },
    ], signoffFields: [], rejectToStage: 'root-layer', decisionLabel: 'Inspection Results', stepOptions: [
      { label: 'UT', value: 'ut', default: true },
      { label: 'RT', value: 'rt' },
    ] },
    { id: 'layer-ndt-vt5x', label: 'Layer NDT VT/5X', required: true, role: 'Inspector', fields: [
      { key: 'weldColor', label: 'Weld Color', type: 'select', showIf: { key: 'inspectionType', equals: 'vt' },
        options: [
          { label: 'Straw', value: 'straw' }, { label: 'Gold', value: 'gold' },
          { label: 'Light yellow', value: 'light-yellow' }, { label: 'Dark yellow', value: 'dark-yellow' },
          { label: 'Brown', value: 'brown' }, { label: 'Light blue', value: 'light-blue' },
          { label: 'Dark blue', value: 'dark-blue' }, { label: 'Grey', value: 'grey' },
          { label: 'Black', value: 'black' }, { label: 'White', value: 'white' },
          { label: 'Green', value: 'green' }, { label: 'No color', value: 'none' },
        ] },
      { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text' },
      { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text' },
    ], signoffFields: [], rejectToStage: 'root-layer', decisionLabel: 'Inspection Results', stepOptions: [
      { label: 'VT', value: 'vt', default: true },
      { label: '5X', value: '5x' },
    ] },
    { id: 'layer-ndt-mtpt', label: 'Layer NDT MT/PT', required: true, role: 'Inspector', fields: [
      { key: 'penetrant', label: 'Penetrant', type: 'select', showIf: { key: 'inspectionType', equals: 'pt' },
        options: getPenetrants().map(p => ({ label: `${p.type} — ${p.manufacturer}`, value: `${p.type}|||${p.manufacturer}` })) },
      { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text' },
      { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text' },
    ], signoffFields: [], rejectToStage: 'root-layer', decisionLabel: 'Inspection Results', stepOptions: [
      { label: 'MT', value: 'mt', default: true },
      { label: 'PT', value: 'pt' },
    ] },
    { id: 'final-weld', label: 'Final Weld', required: true, role: 'Welding', fields: WELD_STAGE_FIELDS, signoffFields: [] },
    { id: 'final-ndt-utrt', label: 'Final NDT UT/RT', required: true, role: 'Inspector', fields: [
      { key: 'ndtMethod', label: 'NDT method', type: 'select',
        options: [{ label: 'Ultrasonic', value: 'ut' }, { label: 'Radiographic', value: 'rt' }] },
      { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text' },
      { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text' },
    ], signoffFields: [], rejectToStage: 'final-weld', decisionLabel: 'Inspection Results', stepOptions: [
      { label: 'UT', value: 'ut', default: true },
      { label: 'RT', value: 'rt' },
    ] },
    { id: 'final-ndt-mtpt', label: 'Final NDT MT/PT', required: true, role: 'Inspector', fields: [
      { key: 'penetrant', label: 'Penetrant', type: 'select', showIf: { key: 'inspectionType', equals: 'pt' },
        options: getPenetrants().map(p => ({ label: `${p.type} — ${p.manufacturer}`, value: `${p.type}|||${p.manufacturer}` })) },
      { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text' },
      { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text' },
    ], signoffFields: [], rejectToStage: 'final-weld', decisionLabel: 'Inspection Results', stepOptions: [
      { label: 'MT', value: 'mt', default: true },
      { label: 'PT', value: 'pt' },
    ] },
    { id: 'final-ndt-vt5x', label: 'Final NDT VT/5X', required: true, role: 'Inspector', fields: [
      { key: 'weldColor', label: 'Weld Color', type: 'select', showIf: { key: 'inspectionType', equals: 'vt' },
        options: [
          { label: 'Straw', value: 'straw' }, { label: 'Gold', value: 'gold' },
          { label: 'Light yellow', value: 'light-yellow' }, { label: 'Dark yellow', value: 'dark-yellow' },
          { label: 'Brown', value: 'brown' }, { label: 'Light blue', value: 'light-blue' },
          { label: 'Dark blue', value: 'dark-blue' }, { label: 'Grey', value: 'grey' },
          { label: 'Black', value: 'black' }, { label: 'White', value: 'white' },
          { label: 'Green', value: 'green' }, { label: 'No color', value: 'none' },
        ] },
      { key: 'probationaryInspector', label: 'Probationary Inspector', type: 'text' },
      { key: 'oversightInspector', label: 'Oversight Inspector', type: 'text' },
    ], signoffFields: [], rejectToStage: 'final-weld', decisionLabel: 'Inspection Results', stepOptions: [
      { label: 'VT', value: 'vt', default: true },
      { label: '5X', value: '5x' },
    ] },
    { id: 'review', label: 'Review', required: true, role: 'Records', fields: [
      { key: 'reviewStatus', label: 'Review status', type: 'select',
        options: [{ label: 'Approved', value: 'approved' }, { label: 'Requires revision', value: 'revision' }] },
    ], signoffFields: [], rejectToStage: 'final-ndt-vt5x', decisionLabel: 'Inspection Results' },
    { id: 'sold', label: 'Sold', required: true, role: 'Records', fields: [], signoffFields: [] }
  ]
};

/* prep stage, trade stages, then handover */
const STATIC_TEMPLATES: Record<Job['trade'], StageTemplate[]> = Object.fromEntries(
  (Object.keys(TRADE_STAGES) as Job['trade'][]).map(t => [t, [PREP_STAGE, ...TRADE_STAGES[t], HANDOVER_STAGE]])
) as Record<Job['trade'], StageTemplate[]>;

/* ── localStorage persistence for stage templates ── */
const TEMPLATES_LS_KEY = 'homefix:stage-templates:v2';

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
  stepOptions?: StageOption[];
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
    stepOptions: t.stepOptions,
  };
}

function deserializeStage(s: SerializedStage): StageTemplate {
  return { ...s, signoffFields: s.signoffFields, rejectToStage: s.rejectToStage, repeatable: s.repeatable ?? false, role: s.role ?? '', stepOptions: s.stepOptions };
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
  const stepOptsRaw = localStorage.getItem(STEP_OPTIONS_LS_KEY);
  const stepOptsAll: Record<string, StageOption[]> = stepOptsRaw ? JSON.parse(stepOptsRaw) : {};
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
    // Merge stepOptions from separate localStorage key
    for (const s of _merged[trade]) {
      const key = `${trade}:${s.id}`;
      if (stepOptsAll[key]) s.stepOptions = stepOptsAll[key];
    }
  }
  // Include trades that exist only in localStorage (added via admin)
  for (const [trade, stages] of Object.entries(saved)) {
    if (!_merged[trade as Job['trade']]) {
      _merged[trade as Job['trade']] = stages.map(deserializeStage);
    }
  }
  // Remove fabrication — it's a cross-stage data section, not a workflow step
  for (const trade of Object.keys(_merged) as Job['trade'][]) {
    _merged[trade] = _merged[trade].filter(s => s.id !== 'fabrication');
  }
  return _merged;
}

/* invalidate the merged cache so next read re-loads from localStorage */
export function invalidateTemplateCache() { _merged = null; }

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

  const toStage = (t: StageTemplate): WorkflowStage => {
    const required = typeof t.required === 'function' ? t.required(job) : t.required;
    const sf = t.signoffFields ?? DEFAULT_SIGNOFF_FIELDS;
    const inputs: Record<string, string> = t.id === 'fitup-insp' ? { releaseToWelding: 'yes' } : {};
    const isWeldStage = ['tack', 'root-weld', 'final-weld'].includes(t.id);
    /* 50/50 chance of override requirements */
    let showOverride = false;
    if (isWeldStage) {
      showOverride = Math.random() < 0.5;
      if (showOverride) {
        Object.assign(inputs, { overridePhMin: '2.8', overridePhMax: '7.0', overrideIpMin: '1.2', overrideIpMax: '5.2', overrideNote: 'Approved deviation per WPS-001' });
      }
    }
    /* route NDT inspections to NQC Inspection when N Ind. is 1 or 2 */
    const role = (t.role === 'Inspector' && (job.nInd === '1' || job.nInd === '2'))
      ? 'NQC Inspection' : (t.role ?? '');
    /* Root and Final Weld get a 5X inspection field */
    const fields = (t.id === 'root-weld' || t.id === 'final-weld')
      ? [...t.fields, { key: 'performed5x', label: 'Did you perform 5X inspection and was it successful?', type: 'select' as const,
          options: [{ label: 'No I didn\'t perform 5X', value: 'no' }, { label: 'Yes I performed 5X and it was successful', value: 'yes' }] }]
      : t.fields;
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
      stepType: 'standard',
      routeTo: '',
      swapStageId: '',
      inspectionType: '',
      stepOptions: t.stepOptions,
      signed: false,
      signedAt: null,
      showOverride
    };
  };

  // Welding: no prep, no handover — SOLD is the end
  if (job.trade === 'Welding') {
    const middle = tradeStages.filter(t => t.id !== 'prep' && t.id !== 'handover');
    const ndt = (job.ndt || '').toUpperCase();
    const hasUTorRT = /\b(UT|RT)\b/.test(ndt);
    const hasMTorPT = /\b(MT|PT)\b/.test(ndt);
    const hasVT = /\b(VT|5X)\b/.test(ndt) || ndt.includes('VISUAL');
    return middle.filter(t => {
      if (t.id.endsWith('-utrt')) return hasUTorRT;
      if (t.id.endsWith('-mtpt')) return hasMTorPT;
      if (t.id.endsWith('-vt5x')) return hasVT;
      return true;
    }).map(toStage);
  }

  // Other trades: prep + stages + handover
  const prep = tradeStages.find(t => t.id === 'prep') ?? PREP_STAGE;
  const middle = tradeStages.filter(t => t.id !== 'prep' && t.id !== 'handover');
  return [prep, ...middle, handover].map(toStage);
}

export function newWorkflow(job: Job): JobWorkflow {
  /* pre-populate fabrication data for welding demo */
  const fabData: Record<string, string> = job.trade === 'Welding' ? {
    location: 'shop-a',
    specificLocation: 'Bay 3, Rack 12',
    deck: 'D2',
    frame: 'F14',
    pscl: 'PS',
    usage: 'Structural',
    id1: 'MIC-4410',
    id2: 'MIC-4411',
    drawingRev: 'Rev C',
    actualThickness: '0.75',
    weldMemo: 'Standard weld procedure',
    revisedJointDesign: 'bj-g',
    changeNumber: 'ER-0042',
  } : {};
  return {
    jobId: job.id,
    technician: job.technician,
    stages: buildStages(job),
    components: [],
    attachments: [],
    validationNotes: '',
    workType: null,
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

/* how many leading stages are already signed off — varies the "current step" per job.
   Deterministic per job: ensures coverage of every stage including all NDT types. */
function signedStageCount(job: Job, total: number): number {
  if (total <= 0) return 0;
  // Cycle through all stages so every position gets represented
  const id = String(job.id);
  const idx = Math.abs(id.charCodeAt(0) * 7 + id.charCodeAt(1) * 3) % total;
  return idx;
}

/* plausible recorded value for a seeded, already-signed stage field */
function seededFieldValue(f: StageField, rand: () => number): string {
  if (f.type === 'select' && f.options?.length) {
    return f.options[Math.floor(rand() * f.options.length)].value;
  }
  if (f.type === 'number') return String(1 + Math.floor(rand() * 120));
  if (f.placeholder && f.placeholder.startsWith('e.g. ')) return f.placeholder.slice(5);
  return 'recorded';
}

/* a fresh workflow with a deterministic run of leading stages pre-signed (all accepted),
   so the current stage differs job-to-job. Persisted (real) workflows always override this. */
export function seededWorkflow(job: Job): JobWorkflow {
  const wf = newWorkflow(job);
  const total = wf.stages.length;
  const k = signedStageCount(job, total);
  if (k <= 0) return wf;

  const rand = seeded(job.id * 97 + 13);
  const DAY = 24 * 60 * 60 * 1000, MIN = 60 * 1000;
  let t = Date.now() - (2 + Math.floor(rand() * 40)) * DAY;

  wf.stages = wf.stages.map((s, i) => {
    if (i >= k) return s;
    t += (20 + Math.floor(rand() * 180)) * MIN;
    const inputs = { ...s.inputs };
    for (const f of s.fields) inputs[f.key] = seededFieldValue(f, rand);
    const signoffInputs: Record<string, string> = {};
    for (const f of s.signoffFields) {
      if (f.key === 'inspectorName') signoffInputs[f.key] = job.technician;
      else if (f.key === 'licenseNo') signoffInputs[f.key] = `LIC-${1000 + Math.floor(rand() * 9000)}`;
      else signoffInputs[f.key] = seededFieldValue(f, rand);
    }
    return {
      ...s,
      inputs,
      signoffInputs,
      result: 'sat' as StageResult,
      signed: true,
      signedAt: new Date(t).toISOString()
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

/* first unsigned required stage, the current step */
export function currentStepLabel(stages: WorkflowStage[]): string {
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
