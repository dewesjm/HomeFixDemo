/* a joint's workflow: its steps and what's recorded on them. History is history.ts, deviations
   deviation.ts, Routing Settings rows stage-template.ts; the persona list is data/roles.ts */
import type { HistoryEntry, SignoffUndo } from './history';
import type { Deviation } from './deviation';
import type { StageTemplate, StageOption } from './stage-template';
import type { AttributeStageRules } from '../attribute-codes-logic/exception-effects';

/* accept/reject, required to sign */
export type StageResult = 'sat' | 'unsat';

export const STAGE_RESULT_OPTIONS: { label: string; value: StageResult }[] = [
  { label: 'SAT', value: 'sat' },
  { label: 'UNSAT', value: 'unsat' }
];

export interface WorkflowStage {
  /* what Admin > Attribute Code Exceptions left on this routing for the joint (accessible rules, minimum RT) */
  attributeRules?: AttributeStageRules;
  /* Frozen insertion settings/context; later configuration edits affect future instances. */
  insertion?: {
    definition: StageTemplate;
    sequence: number;
    sourceId: string;
    continueAt: string;
    originStageId?: string;
    originPhase?: string;
    originInspectionType?: string;
    parentRepairId?: string;
  };
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

export interface JobWorkflow {
  jobId: string;
  technician: string;
  stages: WorkflowStage[];
  references: Reference[];
  history: HistoryEntry[];
  fabricationData: Record<string, string>; /* cross-stage fields (Welding fabrication section) */
  refitNumber?: string;      /* set by each Cut; job records aren't saved, so WorkflowStore copies it onto the job on load */
  repairNumber?: string;     /* set by each new Repair round; copied onto the job on load the same way */
  deviations?: Deviation[];  /* accepted at sign-off */
  undo?: SignoffUndo[];      /* one per sign-off, newest last: what Deprogress restores */
}
