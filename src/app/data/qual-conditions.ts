/* Qual conditions (Admin > Qualifications): "when <field> is <value>, the welder or inspector needs
   <requirement>", where the requirement is an AND/OR group of quals (qual-requirements.ts). This is
   the only place quals are required. Joint fields (Controlled Material, SS, SFFF, N Ind., Titanium)
   are checked on every welding and inspection step as soon as it's open; WTN once a welding step has
   a WTN; Inspection Type once an inspection step's Type is picked. Controlled Material = either MCL 1
   or MCL 2 is a value the MCL Traceability table marks as requiring traceability (i.e. not STD).
   Titanium = either Material Type is flagged titanium in Admin > Material Classification. */
import { signal } from '@angular/core';
import { STORAGE } from './storage-keys';
import { Job, N_IND_POOL } from './jobs';
import { requiresTraceability } from './mcl-traceability';
import { procedures } from './procedures';
import { isTitaniumJoint } from './material-classification';
import { QualGroup, cloneGroup, requirementText } from './qual-requirements';

export interface QualCondition {
  field: string;   /* CONDITION_FIELDS key */
  value: string;
  require: QualGroup;
}

/* the step being checked: its WTN and inspection Type, once picked */
export interface ConditionStep { inputs?: Record<string, string>; inspectionType?: string; }

/* what a condition is checked against */
interface ConditionSubject { job: Job; step: ConditionStep; }

interface ConditionField {
  key: string;
  label: string;
  values: () => string[];
  get: (s: ConditionSubject) => string | undefined;
}

const yesNo = (v: string) => v === 'Yes' ? 'Yes' : 'No';
const YES_NO = () => ['Yes', 'No'];
/* the NDT methods (workflow/ndt.ts option values, upper-cased) */
const INSPECTION_TYPES = ['VT', '5X', 'MT', 'PT', 'RT', 'UT'];

/* every WTN on a procedure, sorted */
function wtnValues(): string[] {
  return [...new Set(procedures().map(p => p.wtn).filter(Boolean))].sort();
}

export const CONDITION_FIELDS: ConditionField[] = [
  { key: 'controlledMaterial', label: 'Controlled Material', values: YES_NO,
    get: s => requiresTraceability(s.job.mcl1) || requiresTraceability(s.job.mcl2) ? 'Yes' : 'No' },
  { key: 'ss', label: 'SS', values: YES_NO, get: s => yesNo(s.job.ss) },
  { key: 'sfff', label: 'SFFF', values: YES_NO, get: s => yesNo(s.job.sfff) },
  { key: 'nInd', label: 'N Ind.', values: () => N_IND_POOL, get: s => s.job.nInd },
  { key: 'titanium', label: 'Titanium', values: YES_NO,
    get: s => isTitaniumJoint({ materialType1: s.job.materialType1 ?? '', materialType2: s.job.materialType2 ?? '' }) ? 'Yes' : 'No' },
  { key: 'wtn', label: 'WTN', values: wtnValues, get: s => s.step.inputs?.['wtn'] || undefined },
  { key: 'inspectionType', label: 'Inspection Type', values: () => INSPECTION_TYPES,
    get: s => s.step.inspectionType ? s.step.inspectionType.toUpperCase() : undefined },
];

/* one seed row per kind of check: joint flags, a step's inspection type, and the base material */
function defaultConditions(): QualCondition[] {
  return [
    { field: 'controlledMaterial', value: 'Yes', require: { op: 'any', items: ['CNTRLMTL1', 'CNTRLMTL2'] } },
    { field: 'ss', value: 'Yes', require: { op: 'all', items: ['SSWELD1'] } },
    { field: 'inspectionType', value: 'VT', require: { op: 'all', items: ['VTINSP1'] } },
    { field: 'titanium', value: 'Yes', require: { op: 'all', items: ['TIWELD1'] } },
  ];
}

function load(): QualCondition[] {
  try {
    const raw = localStorage.getItem(STORAGE.qualConditions);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return defaultConditions();
}

export const qualConditions = signal<QualCondition[]>(load());

export function setQualConditions(conditions: QualCondition[]) {
  qualConditions.set(conditions);
  try { localStorage.setItem(STORAGE.qualConditions, JSON.stringify(conditions)); } catch { /* ignore */ }
}

export function conditionField(key: string): ConditionField | undefined {
  return CONDITION_FIELDS.find(f => f.key === key);
}

/* the requirements of every condition the joint and step match, in table order */
export function conditionRequirements(job: Job | undefined | null, step: ConditionStep = {}): QualGroup[] {
  if (!job) return [];
  const subject: ConditionSubject = { job, step };
  return qualConditions()
    .filter(c => { const v = conditionField(c.field)?.get(subject); return v !== undefined && v === c.value; })
    .map(c => cloneGroup(c.require));
}

/* the requirement of every WTN condition for this WTN, joined by AND; '' when there's none */
export function wtnRequirementText(wtn: string): string {
  const groups = qualConditions().filter(c => c.field === 'wtn' && c.value === wtn && c.require.items.length);
  if (groups.length === 1) return requirementText(groups[0].require);
  return groups.map(c => requirementText(c.require, true)).join(' AND ');
}
