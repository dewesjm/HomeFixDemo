/* The workflow data model: a joint's steps, what's recorded on them, and its history */
import { Job } from '../jobs';
import { ConditionRule, RejectRule } from '../step-conditions';

/* roles a step routes to; Pipe Welding filters its queue by these */
export const ROLES = ['Fitting', 'Welding', 'Foreman', 'Inspector', 'NQC Inspector', 'O63 Records', 'O04 Records', 'Engineering', 'View'] as const;
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
  signoffType: string;            /* the Type picked at signoff (a typeOptions value), 'standard' when the step has none */
  swapStageId: string;            /* which stage template to use for fields (empty = own) */
  inspectionType: string;         /* admin-managed sub-type (e.g. MT/PT on NDT MT/PT stage) */
  typeOptions?: StageOption[];    /* admin-managed options for this stage */
  signed: boolean;
  signedAt: string | null;        /* ISO string, set when signed */
  role: string;                   /* role this stage routes to (e.g. 'Fitting', 'Welding') */
  /* the current routing was set to this stage (a route-back, or Admin > Routing Override): the joint
     proceeds from here, and unsigned stages before it no longer hold it. At most one stage has it. */
  routingFrom?: boolean;
  /* the external system sent no GWP/WTN/filler/PH/IP for this welding step, so they're typed in
     by hand (engineering override, ENGINEERING_ENTRY_KEYS). Set by WeldAssignmentService. */
  engineeringEntry?: boolean;
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
  section: 'Stages' | 'Sign-off' | 'References' | 'Fabrication' | 'Release' | 'Refit' | 'Routing' | 'Deviation' | 'Foreman Override' | 'Engineering Override';
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

/* one out-of-spec value accepted at sign-off (see data/deviations.ts) */
export interface DeviationItem {
  kind: 'out-of-range' | 'qual' | 'off-list' | 'reported';
  label: string;
  entered: string;
  required: string;
}

/* the deviations accepted at one sign-off; an open one holds the joint (DeviationService) */
export interface Deviation {
  id: string;
  stageId: string;
  stageLabel: string;
  items: DeviationItem[];
  reason: string;
  who: string;
  when: string;
  /* open = the joint is on Engineering Hold; dispositioned = Engineering set the routing;
     withdrawn = the sign-off that accepted it was deprogressed */
  status: 'open' | 'dispositioned' | 'withdrawn';
  /* the Engineering Hold step this deviation's sign-off added (absent on older saves) */
  holdStageId?: string;
  disposition?: { comments: string; routeTo: string; routeToLabel: string; who: string; when: string };
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
  deviations?: Deviation[];  /* accepted at sign-off; absent on older saved workflows */
  undo?: SignoffUndo[];      /* one per sign-off, newest last: what Deprogress restores */
}

/* the joint as it stood just before one sign-off, so Deprogress can undo everything that sign-off
   triggered. Field definitions aren't kept here. */
export interface SignoffUndo {
  stageId: string;
  historyWhen: string;       /* the sign-off's History entry, so Work History knows which row it is */
  stages: Omit<WorkflowStage, 'fields' | 'signoffFields'>[];
  fabricationData: Record<string, string>;
  refitNumber: string;
  repairNumber: string;
}

/* one choice in a step's Type droplist (e.g. Fit/Weld Build-Up, MT/PT) */
export interface StageOption {
  label: string;
  value: string;
  default?: boolean;
  /* signing with this Type records the signoff, leaves the routing where it is and blanks the step
     for the next signoff. Unset = signing completes the step. */
  repeatable?: boolean;
}

/* the definition a joint's step is built from (stage-templates.ts) */
export interface StageTemplate {
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
  /* role that this stage routes to */
  role?: string;
  /* Admin > Routing Settings "Role when N Ind 1 or 2": signs instead of role when the joint's Nuclear
     Indicator is 1 or 2; blank = role */
  nqcRole?: string;
  /* admin-managed signoff type options (Admin > Signoff Type Availability) (e.g. Fit/Weld Build-Up, MT/PT) */
  typeOptions?: StageOption[];
  /* when a joint gets this step (step-conditions.ts); none = always */
  includeWhen?: ConditionRule[];
  /* on UNSAT, the first matching rule picks the target instead of rejectToStage (step-conditions.ts) */
  rejectRules?: RejectRule[];
  /* set once Admin > Routing Settings saves this step's reject rules; until then the built-in ones apply */
  rejectRulesEdited?: boolean;
  /* Admin > Routing Settings "Fabrication editable": the Fabrication fields can be changed while this is the current step */
  fabricationEditable?: boolean;
}
