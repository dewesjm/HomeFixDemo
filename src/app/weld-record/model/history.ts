/* a joint's History entries and the undo snapshot Deprogress restores */
import type { WorkflowStage } from './workflow-types';

/* one editable field as it stood at sign-off; an empty value means it was left blank */
export interface SignoffInput { label: string; value: string }

export interface HistoryEntry {
  when: string;          /* ISO string */
  who: string;           /* person's full name */
  whoId?: string;        /* their identifier */
  whoTitle?: string;     /* title held at the time of the event */
  section: 'Stages' | 'Sign-off' | 'Correction' | 'References' | 'Fabrication' | 'Release' | 'Refit' | 'Routing' | 'Deviation' | 'Foreman Override' | 'Engineering Override';
  action: string;        /* what was changed/done — field name or event */
  from?: string;         /* previous value, when the action changed one */
  to?: string;           /* new value, when the action changed one */
  routing: string;       /* routing label at time of change */
  inputs?: SignoffInput[];   /* sign-off entries only: every editable field and its value at that moment */
  fabInputs?: SignoffInput[];  /* fabrication data as it stood at that moment: every sign-off entry, and a Cut's Refit entry (the data it reset) */
  stageId?: string;      /* sign-off and correction entries: which live stage this recorded, so Correct can find it again */
  changes?: { key: string; label: string; from: string; to: string }[];  /* Correction entries only: just the fields that actually changed */
  reason?: string;       /* Correction entries only */
}

/* the joint as it stood just before one sign-off, so Deprogress can undo everything that sign-off
   triggered. Field definitions aren't kept here. */
export interface SignoffUndo {
  stageId: string;
  historyWhen: string;       /* the sign-off's History entry, so History knows which row it is */
  stages: WorkflowStage[];
  fabricationData: Record<string, string>;
  refitNumber: string;
  repairNumber: string;
}
