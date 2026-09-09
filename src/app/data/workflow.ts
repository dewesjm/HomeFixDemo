/* workflow model + stage helpers, no UI */
import { Job } from './jobs';
import { MATERIAL_OPTIONS } from './materials';

/* accept/reject, required to sign */
export type StageResult = 'accept' | 'reject';

export const STAGE_RESULT_OPTIONS: { label: string; value: StageResult }[] = [
  { label: 'Accept', value: 'accept' },
  { label: 'Reject', value: 'reject' }
];

/* one field a tech records on a stage */
export interface StageField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  unit?: string;          /* shown by the label, e.g. PSI */
  placeholder?: string;
  options?: { label: string; value: string }[];
  showIf?: { key: string; equals: string };   // ← declarative dependency, serializable
}

/* configurable field on the per-stage sign-off panel */
export interface SignoffField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  showIf?: { key: string; equals: string };
}

/* sequential stages, each its own sign-off */
export interface WorkflowStage {
  id: string;
  label: string;
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
  signed: boolean;
  signedAt: string | null;        /* ISO string, set when signed */
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
  section: 'Stages' | 'Work Validation' | 'Sign-off' | 'Attachments';
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
}

interface StageTemplate {
  id: string;
  label: string;
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
    { id: 'fit', label: 'Fit', required: true, fields: [
      { key: 'jointType', label: 'Joint type', type: 'select',
        options: [{ label: 'Butt', value: 'butt' }, { label: 'Fillet', value: 'fillet' },
          { label: 'Lap', value: 'lap' }, { label: 'Corner', value: 'corner' },
          { label: 'Edge', value: 'edge' }] },
      { key: 'gap', label: 'Root gap', type: 'number', unit: 'mm' },
      { key: 'alignment', label: 'Alignment', type: 'select',
        options: [{ label: 'Flush', value: 'flush' }, { label: 'High-low', value: 'high-low' }] }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'testMethod', label: 'Test method', type: 'select', required: false,
        options: [{ label: 'Visual + functional', value: 'visual-functional' }, { label: 'Go/No-go gauge', value: 'gauge' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ] },
    { id: 'tack', label: 'Tack', required: true, fields: [
      { key: 'tackCount', label: 'Tack welds', type: 'number' },
      { key: 'tackSize', label: 'Tack size', type: 'number', unit: 'mm' },
      { key: 'tackCondition', label: 'Tack condition', type: 'select',
        options: [{ label: 'Good', value: 'good' }, { label: 'Cracked', value: 'cracked' },
          { label: 'Incomplete', value: 'incomplete' }] }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'safetyCheck', label: 'Safety check', type: 'select', required: true,
        options: [{ label: 'Passed', value: 'passed' }, { label: 'Failed', value: 'failed' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ], rejectToStage: 'fit' },
    { id: 'fitup-insp', label: 'Fit-Up Insp', required: true, fields: [
      { key: 'jointPrep', label: 'Joint prep condition', type: 'select',
        options: [{ label: 'Clean', value: 'clean' }, { label: 'Needs grinding', value: 'needs-grinding' },
          { label: 'Rejected', value: 'rejected' }] },
      { key: 'misalignment', label: 'Misalignment', type: 'number', unit: 'mm' },
      { key: 'fitApproved', label: 'Fit-up approved?', type: 'select',
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No — rework', value: 'no' }] }
    ], signoffFields: [
      { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
      { key: 'licenseNo', label: 'License #', type: 'text', required: true },
      { key: 'safetyCheck', label: 'Safety check', type: 'select', required: true,
        options: [{ label: 'Passed', value: 'passed' }, { label: 'Failed', value: 'failed' }] },
      { key: 'notes', label: 'Notes', type: 'text', required: false },
    ], rejectToStage: 'tack' }
  ]
};

/* prep stage, trade stages, then handover */
const STATIC_TEMPLATES: Record<Job['trade'], StageTemplate[]> = Object.fromEntries(
  (Object.keys(TRADE_STAGES) as Job['trade'][]).map(t => [t, [PREP_STAGE, ...TRADE_STAGES[t], HANDOVER_STAGE]])
) as Record<Job['trade'], StageTemplate[]>;

/* ── localStorage persistence for stage templates ── */
const TEMPLATES_LS_KEY = 'homefix:stage-templates:v1';

/* serialized form — required is always a plain boolean (no functions) */
interface SerializedStage {
  id: string;
  label: string;
  required: boolean;
  fields: StageField[];
  signoffFields: SignoffField[];
  rejectToStage: string;
  repeatable?: boolean;
}

function serializeStage(t: StageTemplate): SerializedStage {
  return {
    id: t.id,
    label: t.label,
    required: typeof t.required === 'function' ? true : t.required,
    fields: t.fields,
    signoffFields: t.signoffFields ?? DEFAULT_SIGNOFF_FIELDS,
    rejectToStage: t.rejectToStage ?? '',
    repeatable: t.repeatable ?? false,
  };
}

function deserializeStage(s: SerializedStage): StageTemplate {
  return { ...s, signoffFields: s.signoffFields, rejectToStage: s.rejectToStage, repeatable: s.repeatable ?? false };
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
  }
  // Include trades that exist only in localStorage (added via admin)
  for (const [trade, stages] of Object.entries(saved)) {
    if (!_merged[trade as Job['trade']]) {
      _merged[trade as Job['trade']] = stages.map(deserializeStage);
    }
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
  const trades = Object.keys(getTemplates()).sort();
  return trades.map(t => ({ label: t, value: t }));
}

export function buildStages(job: Job): WorkflowStage[] {
  /* prep + trade stages (from merged templates) + handover — no cycling */
  const templates = getTemplates();
  const tradeStages = templates[job.trade] ?? [];
  const prep = tradeStages.find(t => t.id === 'prep') ?? PREP_STAGE;
  const handover = tradeStages.find(t => t.id === 'handover') ?? HANDOVER_STAGE;
  const middle = tradeStages.filter(t => t.id !== 'prep' && t.id !== 'handover');
  return [prep, ...middle, handover].map(t => {
    const required = typeof t.required === 'function' ? t.required(job) : t.required;
    const sf = t.signoffFields ?? DEFAULT_SIGNOFF_FIELDS;
    return {
      id: t.id,
      label: t.label,
      required,
      fields: t.fields,
      inputs: {},
      signoffFields: sf.map(f => ({ ...f })),
      signoffInputs: {},
      result: null,
      rejectToStage: t.rejectToStage ?? '',
      repeatable: t.repeatable ?? false,
      stepType: 'standard',
      routeTo: '',
      swapStageId: '',
      signed: false,
      signedAt: null
    };
  });
}

export function newWorkflow(job: Job): JobWorkflow {
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
    history: []
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
   Deterministic per job: a spread of complete / early / mid-stream runs. */
function signedStageCount(job: Job, total: number): number {
  if (total <= 0) return 0;
  const rand = seeded(job.id * 31 + 7);
  const r = rand();
  if (r < 0.25) return total;                          // ~25% fully signed
  if (r < 0.45) return Math.floor(rand() * (total - 1)); // ~20% not-started / stalled early
  return 1 + Math.floor(rand() * (total - 1));         // rest mid-stream
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
      result: 'accept' as StageResult,
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
  return next ? next.label : 'All stages complete';
}

/* id of stage awaiting sign-off, null when done */
export function activeStageId(stages: WorkflowStage[]): string | null {
  return stages.find(s => s.required && !s.signed)?.id ?? null;
}

export function allRequiredSigned(stages: WorkflowStage[]): boolean {
  return stages.every(s => !s.required || s.signed);
}
