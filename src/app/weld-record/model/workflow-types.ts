/* The workflow data model: a joint's steps, what's recorded on them, and its history */
import { Job } from '../../data/jobs';
import { ConditionRule, RejectRule } from '../routing/step-conditions';

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

export interface WorkflowStage {
  id: string;
  label: string;
  displayName?: string;  /* override label shown on routing table */
  decisionLabel?: string; /* override 'Decision' label */
  required: boolean;
  inputs: Record<string, string>; /* recorded values, keyed by catalog field key */
  /* Values recorded by fields stored with the signoff, including Comments. */
  signoffInputs: Record<string, string>;
  // --- per-stage sign-off ---
  result: StageResult | null;     /* required before signing, kept special */
  rejectToStage: string;          /* stage id to route back to on reject (empty = no routing) */
  signoffType: string;            /* the Type picked at signoff (a typeOptions value), 'standard' when the step has none */
  inspectionType: string;         /* admin-managed sub-type (e.g. MT/PT on NDT MT/PT stage) */
  typeOptions?: StageOption[];    /* admin-managed options for this stage */
  signed: boolean;
  signedAt: string | null;        /* ISO string, set when signed */
  role: string;                   /* role this stage routes to (e.g. 'Fitting', 'Welding') */
  /* the current routing was set to this stage (a route-back, or Admin > Routing Override): the joint
     proceeds from here, and unsigned stages before it no longer hold it. At most one stage has it. */
  routingFrom?: boolean;
  /* Count of this routing's own rule returning it to itself. */
  repeats?: number;
  /* the external system sent no GWP/WTN/filler/PH/IP for this welding step, so they're typed in
     by hand (engineering override, ENGINEERING_ENTRY_KEYS). Set by WeldAssignmentService. */
  engineeringEntry?: boolean;
}

export interface Reference {
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

/* one out-of-spec value accepted at sign-off (see weld-record/joint-page/rules/deviations.ts) */
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
  references: Reference[];
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
  stages: WorkflowStage[];
  fabricationData: Record<string, string>;
  refitNumber: string;
  repairNumber: string;
}

/* one choice in a step's Type droplist (e.g. Fit/Weld Build-Up, MT/PT), with its Admin > Routing Signoff
   Types name and settings */
export interface StageOption {
  label: string;
  value: string;
  default?: boolean;
  /* the routing step this Type signs when picked on an earlier step (Layer's Final Weld); unset = this step */
  signsStep?: string;
}

/* the definition a joint's step is built from (stage-templates.ts) */
export interface StageTemplate {
  classification?: 'numbered' | 'added';
  lifecycle?: 'ordinary' | 'repair' | 'excavation' | 'engineering-hold';
  status?: 'draft' | 'active' | 'inactive';
  id: string;
  label: string;
  displayName?: string;  /* override label shown on routing table (e.g. 'Tack' for both 'tack' and 'deferred-tack') */
  decisionLabel?: string; /* override 'Decision' label (e.g. 'Inspection Results') */
  /* bool or predicate keyed off the job */
  required: boolean | ((job: Job) => boolean);
  /* stage id to route back to when this stage is rejected (empty = no routing) */
  rejectToStage?: string;
  /* role that this stage routes to */
  role?: string;
  /* Ordered Joint Details conditions choose a persona; no match uses role. */
  roleRules?: { when: ConditionRule; role: string }[];
  /* admin-managed signoff type options (Admin > Signoff Types By Routing) (e.g. Fit/Weld Build-Up, MT/PT) */
  typeOptions?: StageOption[];
  /* when a joint gets this step (step-conditions.ts); none = always */
  includeWhen?: ConditionRule[];
  /* on UNSAT, the first matching rule picks the target instead of rejectToStage (step-conditions.ts) */
  rejectRules?: RejectRule[];
  /* On accepted signoff, the first matching rule selects the next routing. */
  thenRules?: RejectRule[];
  /* set once Admin > Routing Settings saves this step's reject rules; until then the built-in ones apply */
  rejectRulesEdited?: boolean;
  /* Admin > Routing Settings "Fabrication editable": the Fabrication fields can be changed while this is the current step */
  fabricationEditable?: boolean;
}
