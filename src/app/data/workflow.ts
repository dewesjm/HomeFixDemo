// Inspection workflow model — per-trade stage pipelines plus all workflow types
// (stages w/ per-step inputs, components, attachments, sign-off, history entries) and
// stage helpers (locking/sequencing, current step). Pure data + functions, no UI.
import { Job } from './jobs';

/** A stage is green (done), red (failed), amber/pending (required, not yet done),
 *  or grey (not-required for this particular job). */
export type StageStatus = 'done' | 'failed' | 'pending' | 'not-required';

/** Definition of one data field a technician records on a given stage. */
export interface StageField {
  key: string;
  label: string;
  type: 'text' | 'number';
  unit?: string;          // shown alongside the label, e.g. "PSI", "°F"
  placeholder?: string;
}

export interface WorkflowStage {
  id: string;
  label: string;
  required: boolean;
  status: StageStatus;
  fields: StageField[];           // per-step input definitions (copied from the template)
  inputs: Record<string, string>; // recorded values, keyed by StageField.key
}

export interface InstalledComponent {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
}

export interface Attachment {
  id: string;
  name: string;           // filename (files aren't uploaded in this demo, only recorded)
  addedBy: string;
  addedAt: string;        // ISO string
}

export type SignResult = 'pass' | 'fail' | 'conditional';

export interface SignOff {
  inspectorName: string;
  licenseNo: string;
  result: SignResult | null;
  notes: string;
  signed: boolean;
  date: string | null;   // ISO string, set when signed
}

export interface HistoryEntry {
  when: string;          // ISO string
  who: string;
  section: 'Stages' | 'Work Validation' | 'Sign-off' | 'Attachments';
  change: string;
  step: string;          // current step label at the time of the change
}

export interface JobWorkflow {
  jobId: number;
  technician: string;
  stages: WorkflowStage[];
  components: InstalledComponent[];
  attachments: Attachment[];
  signoff: SignOff;
  validationNotes: string;   // free-text note for the Work Validation section
  history: HistoryEntry[];
}

interface StageTemplate {
  id: string;
  label: string;
  /** true/false, or a predicate so requiredness depends on the specific job. */
  required: boolean | ((job: Job) => boolean);
  /** The specific data fields a tech records on this stage. */
  fields: StageField[];
}

const titleHas = (job: Job, ...words: string[]) =>
  words.some(w => job.title.toLowerCase().includes(w.toLowerCase()));

/**
 * Ordered stage pipelines per trade. Each stage feeds the next: a stage stays
 * locked until every required stage before it is done. Conditional stages
 * (e.g. refrigerant inspection only for AC/heat-pump work) appear greyed-out
 * when they don't apply to this job.
 */
export const STAGE_TEMPLATES: Record<Job['trade'], StageTemplate[]> = {
  HVAC: [
    { id: 'diagnostic',  label: 'System diagnostic',                 required: true, fields: [
      { key: 'faultCode',  label: 'Fault code',   type: 'text',   placeholder: 'e.g. E4' },
      { key: 'supplyTemp', label: 'Supply temp',  type: 'number', unit: '°F' }
    ] },
    { id: 'repair',      label: 'Repair / part replacement',         required: true, fields: [
      { key: 'partReplaced', label: 'Part replaced', type: 'text', placeholder: 'e.g. blower motor' }
    ] },
    { id: 'refrigerant', label: 'Refrigerant charge & leak check',   required: job => titleHas(job, 'AC', 'recharge', 'Heat pump'), fields: [
      { key: 'refrigerantType', label: 'Refrigerant type', type: 'text',   placeholder: 'e.g. R-410A' },
      { key: 'chargePsi',       label: 'Charge',           type: 'number', unit: 'PSI' }
    ] },
    { id: 'combustion',  label: 'Combustion / CO safety check',      required: job => titleHas(job, 'Furnace'), fields: [
      { key: 'coReading', label: 'CO reading', type: 'number', unit: 'ppm' }
    ] },
    { id: 'airflow',     label: 'Airflow & thermostat verification', required: true, fields: [
      { key: 'airflowCfm', label: 'Airflow',            type: 'number', unit: 'CFM' },
      { key: 'setpoint',   label: 'Thermostat setpoint', type: 'number', unit: '°F' }
    ] }
  ],
  Plumbing: [
    { id: 'diagnostic', label: 'Leak diagnostic',                    required: true, fields: [
      { key: 'leakLocation', label: 'Leak location', type: 'text', placeholder: 'e.g. under sink' }
    ] },
    { id: 'shutoff',    label: 'Shutoff & repair',                   required: true, fields: [
      { key: 'valveType', label: 'Shutoff valve type', type: 'text', placeholder: 'e.g. quarter-turn' }
    ] },
    { id: 'pressure',   label: 'Pressure test',                      required: true, fields: [
      { key: 'testPsi',  label: 'Test pressure', type: 'number', unit: 'PSI' },
      { key: 'holdTime', label: 'Hold time',     type: 'number', unit: 'min' }
    ] },
    { id: 'backflow',   label: 'Backflow / water-quality inspection',required: job => titleHas(job, 'Water heater', 'Sump'), fields: [
      { key: 'deviceSerial', label: 'Device serial #', type: 'text' }
    ] },
    { id: 'code',       label: 'Code compliance check',              required: true, fields: [
      { key: 'codeSection', label: 'Code section', type: 'text', placeholder: 'e.g. UPC 604.3' }
    ] }
  ],
  Electrical: [
    { id: 'lockout',    label: 'De-energize & lockout',              required: true, fields: [
      { key: 'circuitNo', label: 'Breaker / circuit #', type: 'text' }
    ] },
    { id: 'wiring',     label: 'Repair / wiring',                    required: true, fields: [
      { key: 'wireGauge', label: 'Wire gauge', type: 'number', unit: 'AWG' }
    ] },
    { id: 'continuity', label: 'Continuity & polarity test',         required: true, fields: [
      { key: 'resistance', label: 'Resistance', type: 'number', unit: 'Ω' }
    ] },
    { id: 'gfci',       label: 'GFCI / AFCI verification',           required: job => titleHas(job, 'GFCI', 'Outlet'), fields: [
      { key: 'tripTime', label: 'Trip time', type: 'number', unit: 'ms' }
    ] },
    { id: 'panel',      label: 'Panel & grounding inspection',       required: job => titleHas(job, 'Panel'), fields: [
      { key: 'groundResistance', label: 'Ground resistance', type: 'number', unit: 'Ω' }
    ] }
  ],
  Roofing: [
    { id: 'surface',  label: 'Surface inspection',          required: true, fields: [
      { key: 'areaInspected', label: 'Area inspected', type: 'number', unit: 'sq ft' }
    ] },
    { id: 'repair',   label: 'Repair / replacement',        required: true, fields: [
      { key: 'material', label: 'Material used', type: 'text', placeholder: 'e.g. architectural shingle' }
    ] },
    { id: 'flashing', label: 'Flashing & seal check',       required: true, fields: [
      { key: 'sealant', label: 'Sealant type', type: 'text', placeholder: 'e.g. polyurethane' }
    ] },
    { id: 'leaktest', label: 'Water / leak test',           required: job => titleHas(job, 'Leak', 'patch', 'Skylight'), fields: [
      { key: 'testDuration', label: 'Test duration', type: 'number', unit: 'min' }
    ] },
    { id: 'cleanup',  label: 'Debris cleanup & walkthrough',required: true, fields: [
      { key: 'debrisBags', label: 'Debris removed', type: 'number', unit: 'bags' }
    ] }
  ],
  Carpentry: [
    { id: 'measure', label: 'Measurement & material check', required: true, fields: [
      { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g. 36" × 80"' }
    ] },
    { id: 'build',   label: 'Build / install',              required: true, fields: [
      { key: 'material', label: 'Material used', type: 'text', placeholder: 'e.g. red oak' }
    ] },
    { id: 'load',    label: 'Fastening & load check',       required: job => titleHas(job, 'Deck', 'Shelving', 'Cabinet'), fields: [
      { key: 'ratedLoad', label: 'Rated load', type: 'number', unit: 'lbs' }
    ] },
    { id: 'finish',  label: 'Finish & trim',                required: true, fields: [
      { key: 'finish', label: 'Finish / stain', type: 'text', placeholder: 'e.g. satin poly' }
    ] },
    { id: 'fit',     label: 'Final fit inspection',         required: true, fields: [
      { key: 'gapTolerance', label: 'Gap tolerance', type: 'number', unit: 'in' }
    ] }
  ],
  Inspection: [
    { id: 'docs',       label: 'Documentation review',      required: true, fields: [
      { key: 'permitNo', label: 'Permit #', type: 'text' }
    ] },
    { id: 'visual',     label: 'Visual inspection',         required: true, fields: [
      { key: 'defectsFound', label: 'Defects found', type: 'number' }
    ] },
    { id: 'functional', label: 'Functional test',           required: true, fields: [
      { key: 'itemsTested', label: 'Items tested', type: 'number' }
    ] },
    { id: 'hazard',     label: 'Hazard & safety assessment',required: true, fields: [
      { key: 'hazards', label: 'Hazards noted', type: 'text', placeholder: 'e.g. exposed wiring' }
    ] },
    { id: 'report',     label: 'Report & rating',           required: true, fields: [
      { key: 'rating', label: 'Overall rating (1–5)', type: 'number' }
    ] }
  ]
};

/** Field definitions for a given trade's stage id — used to backfill saved workflows
 *  that were persisted before per-step inputs existed. */
export function stageFieldsFor(trade: Job['trade'], stageId: string): StageField[] {
  return STAGE_TEMPLATES[trade].find(t => t.id === stageId)?.fields ?? [];
}

export function buildStages(job: Job): WorkflowStage[] {
  return STAGE_TEMPLATES[job.trade].map(t => {
    const required = typeof t.required === 'function' ? t.required(job) : t.required;
    return {
      id: t.id,
      label: t.label,
      required,
      status: (required ? 'pending' : 'not-required') as StageStatus,
      fields: t.fields,
      inputs: {}
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
    signoff: { inspectorName: '', licenseNo: '', result: null, notes: '', signed: false, date: null },
    validationNotes: '',
    history: []
  };
}

/** A stage is locked until every required stage before it is done. */
export function isStageLocked(stages: WorkflowStage[], index: number): boolean {
  for (let i = 0; i < index; i++) {
    const s = stages[i];
    if (s.required && s.status !== 'done') return true;
  }
  return false;
}

/** The first required stage that isn't done — i.e. the step the job is on. */
export function currentStepLabel(stages: WorkflowStage[]): string {
  const next = stages.find(s => s.required && s.status !== 'done');
  return next ? next.label : 'All stages complete';
}

export function allRequiredDone(stages: WorkflowStage[]): boolean {
  return stages.every(s => !s.required || s.status === 'done');
}
