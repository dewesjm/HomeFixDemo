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
  options?: { label: string; value: string }[];  /* choices for type: 'select' */
}

/* sequential stages, each its own sign-off */
export interface WorkflowStage {
  id: string;
  label: string;
  required: boolean;
  fields: StageField[];           /* input defs copied from template */
  inputs: Record<string, string>; /* recorded values, keyed by StageField.key */
  // --- per-stage sign-off ---
  inspectorName: string;
  licenseNo: string;
  result: StageResult | null;     /* required before signing */
  notes: string;
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
  change: string;
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
}

const titleHas = (job: Job, ...words: string[]) =>
  words.some(w => job.title.toLowerCase().includes(w.toLowerCase()));

/* ordered stage pipelines per trade, some conditional */
// Shared stages every trade gets: a safety/prep stage first and a handover stage last.
const PREP_STAGE: StageTemplate = {
  id: 'prep', label: 'Prep', required: true,
  fields: [{ key: 'ppe', label: 'PPE / safety', type: 'text', placeholder: 'e.g. gloves, eyewear' }]
};
const HANDOVER_STAGE: StageTemplate = {
  id: 'handover', label: 'Handover', required: true,
  fields: [{ key: 'walkthrough', label: 'Customer walkthrough', type: 'text', placeholder: 'e.g. confirmed operation' }]
};

const TRADE_STAGES: Record<Job['trade'], StageTemplate[]> = {
  HVAC: [
    { id: 'diagnostic',  label: 'Diagnose',                 required: true, fields: [
      { key: 'faultCode',  label: 'Fault code',   type: 'text',   placeholder: 'e.g. E4' },
      { key: 'supplyTemp', label: 'Supply temp',  type: 'number', unit: '°F' }
    ] },
    { id: 'repair',      label: 'Repair',         required: true, fields: [
      { key: 'partReplaced', label: 'Part replaced', type: 'text', placeholder: 'e.g. blower motor' }
    ] },
    { id: 'refrigerant', label: 'Charge',   required: job => titleHas(job, 'AC', 'recharge', 'Heat pump'), fields: [
      { key: 'refrigerantType', label: 'Refrigerant type', type: 'text',   placeholder: 'e.g. R-410A' },
      { key: 'chargePsi',       label: 'Charge',           type: 'number', unit: 'PSI' }
    ] },
    { id: 'combustion',  label: 'CO check',      required: job => titleHas(job, 'Furnace'), fields: [
      { key: 'coReading', label: 'CO reading', type: 'number', unit: 'ppm' }
    ] },
    { id: 'airflow',     label: 'Airflow', required: true, fields: [
      { key: 'airflowCfm', label: 'Airflow',            type: 'number', unit: 'CFM' },
      { key: 'setpoint',   label: 'Thermostat setpoint', type: 'number', unit: '°F' }
    ] }
  ],
  Plumbing: [
    { id: 'diagnostic', label: 'Diagnose',                    required: true, fields: [
      { key: 'leakLocation', label: 'Leak location', type: 'text', placeholder: 'e.g. under sink' }
    ] },
    { id: 'shutoff',    label: 'Shutoff',                   required: true, fields: [
      { key: 'valveType', label: 'Shutoff valve type', type: 'text', placeholder: 'e.g. quarter-turn' }
    ] },
    { id: 'pressure',   label: 'Pressure',                      required: true, fields: [
      { key: 'testPsi',  label: 'Test pressure', type: 'number', unit: 'PSI' },
      { key: 'holdTime', label: 'Hold time',     type: 'number', unit: 'min' }
    ] },
    { id: 'backflow',   label: 'Backflow',required: job => titleHas(job, 'Water heater', 'Sump'), fields: [
      { key: 'deviceSerial', label: 'Device serial #', type: 'text' }
    ] },
    { id: 'code',       label: 'Code',              required: true, fields: [
      { key: 'codeSection', label: 'Code section', type: 'text', placeholder: 'e.g. UPC 604.3' }
    ] }
  ],
  Electrical: [
    { id: 'lockout',    label: 'Lockout',              required: true, fields: [
      { key: 'circuitNo', label: 'Breaker / circuit #', type: 'text' }
    ] },
    { id: 'wiring',     label: 'Wiring',                    required: true, fields: [
      { key: 'wireGauge', label: 'Wire gauge', type: 'number', unit: 'AWG' }
    ] },
    { id: 'continuity', label: 'Continuity',         required: true, fields: [
      { key: 'resistance', label: 'Resistance', type: 'number', unit: 'Ω' }
    ] },
    { id: 'gfci',       label: 'GFCI',           required: job => titleHas(job, 'GFCI', 'Outlet'), fields: [
      { key: 'tripTime', label: 'Trip time', type: 'number', unit: 'ms' }
    ] },
    { id: 'panel',      label: 'Panel',       required: job => titleHas(job, 'Panel'), fields: [
      { key: 'groundResistance', label: 'Ground resistance', type: 'number', unit: 'Ω' }
    ] }
  ],
  Roofing: [
    { id: 'surface',  label: 'Surface',          required: true, fields: [
      { key: 'areaInspected', label: 'Area inspected', type: 'number', unit: 'sq ft' }
    ] },
    { id: 'repair',   label: 'Repair',        required: true, fields: [
      { key: 'material', label: 'Material used', type: 'text', placeholder: 'e.g. architectural shingle' }
    ] },
    { id: 'flashing', label: 'Flashing',       required: true, fields: [
      { key: 'sealant', label: 'Sealant type', type: 'text', placeholder: 'e.g. polyurethane' }
    ] },
    { id: 'leaktest', label: 'Leak test',           required: job => titleHas(job, 'Leak', 'patch', 'Skylight'), fields: [
      { key: 'testDuration', label: 'Test duration', type: 'number', unit: 'min' }
    ] },
    { id: 'cleanup',  label: 'Cleanup',required: true, fields: [
      { key: 'debrisBags', label: 'Debris removed', type: 'number', unit: 'bags' }
    ] }
  ],
  Carpentry: [
    { id: 'measure', label: 'Measure', required: true, fields: [
      { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g. 36" × 80"' }
    ] },
    { id: 'build',   label: 'Build',              required: true, fields: [
      { key: 'material', label: 'Material used', type: 'select', options: MATERIAL_OPTIONS, placeholder: 'Select material' }
    ] },
    { id: 'load',    label: 'Load check',       required: job => titleHas(job, 'Deck', 'Shelving', 'Cabinet'), fields: [
      { key: 'ratedLoad', label: 'Rated load', type: 'number', unit: 'lbs' }
    ] },
    { id: 'finish',  label: 'Finish',                required: true, fields: [
      { key: 'finish', label: 'Finish / stain', type: 'text', placeholder: 'e.g. satin poly' }
    ] },
    { id: 'fit',     label: 'Final fit',         required: true, fields: [
      { key: 'gapTolerance', label: 'Gap tolerance', type: 'number', unit: 'in' }
    ] }
  ],
  Inspection: [
    { id: 'docs',       label: 'Docs',      required: true, fields: [
      { key: 'permitNo', label: 'Permit #', type: 'text' }
    ] },
    { id: 'visual',     label: 'Visual',         required: true, fields: [
      { key: 'defectsFound', label: 'Defects found', type: 'number' }
    ] },
    { id: 'functional', label: 'Function',           required: true, fields: [
      { key: 'itemsTested', label: 'Items tested', type: 'number' }
    ] },
    { id: 'hazard',     label: 'Hazards',required: true, fields: [
      { key: 'hazards', label: 'Hazards noted', type: 'text', placeholder: 'e.g. exposed wiring' }
    ] },
    { id: 'report',     label: 'Report',           required: true, fields: [
      { key: 'rating', label: 'Overall rating (1–5)', type: 'number' }
    ] }
  ]
};

/* prep stage, trade stages, then handover */
export const STAGE_TEMPLATES: Record<Job['trade'], StageTemplate[]> = Object.fromEntries(
  (Object.keys(TRADE_STAGES) as Job['trade'][]).map(t => [t, [PREP_STAGE, ...TRADE_STAGES[t], HANDOVER_STAGE]])
) as Record<Job['trade'], StageTemplate[]>;

/* fields for a trade stage, backfills old saved workflows */
export function stageFieldsFor(trade: Job['trade'], stageId: string): StageField[] {
  return STAGE_TEMPLATES[trade].find(t => t.id === stageId)?.fields ?? [];
}

/* deterministic step count 5..15, stable per job */
function stageCountFor(job: Job): number {
  return 5 + ((job.id * 7 + 3) % 11);
}

/* filler stage so a job can run longer than its trade defines */
function fillerStage(n: number): StageTemplate {
  return {
    id: `extra-${n}`,
    label: `Check ${n}`,
    required: true,
    fields: [{ key: `reading${n}`, label: 'Reading', type: 'text', placeholder: 'value' }]
  };
}

export function buildStages(job: Job): WorkflowStage[] {
  /* prep + a 5..15 run (trade stages, then filler) + handover */
  const trade = TRADE_STAGES[job.trade];
  const middle: StageTemplate[] = [];
  for (let i = 0; i < stageCountFor(job) - 2; i++) {
    middle.push(i < trade.length ? trade[i] : fillerStage(i - trade.length + 1));
  }
  return [PREP_STAGE, ...middle, HANDOVER_STAGE].map(t => {
    const required = typeof t.required === 'function' ? t.required(job) : t.required;
    return {
      id: t.id,
      label: t.label,
      required,
      fields: t.fields,
      inputs: {},
      inspectorName: '',
      licenseNo: '',
      result: null,
      notes: '',
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
