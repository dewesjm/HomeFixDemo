/* Qual conditions (Admin > Qualifications): "when <field> is <value>, the welder or inspector needs
   <requirement>", where the requirement is an AND/OR group of quals (qual-requirements.ts). This is
   the only place quals are required. Joint fields (Controlled Material, SS, SFFF, N Ind.) are checked
   on every welding and inspection step as soon as it's open; WTN is checked on a welding step once a
   WTN is picked. Controlled Material = either MCL 1 or MCL 2 is a value the MCL Traceability table
   marks as requiring traceability (i.e. not STD). */
import { signal } from '@angular/core';
import { STORAGE } from './storage-keys';
import { Job, N_IND_POOL } from './jobs';
import { requiresTraceability } from './mcl-traceability';
import { procedures } from './procedures';
import { QUALIFICATIONS, QUAL_WEIGHTS } from './qualifications';
import { QualGroup, cloneGroup, requirementText } from './qual-requirements';

export interface QualCondition {
  field: string;   /* CONDITION_FIELDS key */
  value: string;
  require: QualGroup;
}

/* what a condition is checked against: the joint, plus the step's WTN once one is picked */
export interface ConditionSubject { job: Job; wtn?: string; }

interface ConditionField {
  key: string;
  label: string;
  values: () => string[];
  get: (s: ConditionSubject) => string | undefined;
}

const yesNo = (v: string) => v === 'Yes' ? 'Yes' : 'No';
const YES_NO = () => ['Yes', 'No'];

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
  { key: 'wtn', label: 'WTN', values: wtnValues, get: s => s.wtn || undefined },
];

/* weighted pick without repeats, kept in QUALIFICATIONS order: some quals are needed far more
   often than others (QUAL_WEIGHTS) */
function pickQuals(rand: () => number, min: number, max: number): string[] {
  const count = min + Math.floor(rand() * (max - min + 1));
  const pool = QUALIFICATIONS.map((q, i) => ({ q, w: QUAL_WEIGHTS[i] }));
  const picked = new Set<string>();
  while (picked.size < count) {
    const left = pool.filter(x => !picked.has(x.q));
    let r = rand() * left.reduce((sum, x) => sum + x.w, 0);
    const hit = left.find(x => (r -= x.w) < 0) ?? left[left.length - 1];
    picked.add(hit.q);
  }
  return QUALIFICATIONS.filter(q => picked.has(q));
}

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* Controlled Material needs either controlled-material qual, then each WTN (in procedure order)
   needs all of 1-3 WELD4xx quals */
function defaultConditions(): QualCondition[] {
  const rand = seeded(4242);
  const wtns = [...new Set(procedures().map(p => p.wtn).filter(Boolean))];
  return [
    { field: 'controlledMaterial', value: 'Yes', require: { op: 'any', items: ['CNTRLMTL1', 'CNTRLMTL2'] } },
    ...wtns.map((wtn): QualCondition => ({ field: 'wtn', value: wtn, require: { op: 'all', items: pickQuals(rand, 1, 3) } })),
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

/* the requirements of every condition the joint (and the step's WTN, if given) matches, in table order */
export function conditionRequirements(job: Job | undefined | null, wtn?: string): QualGroup[] {
  if (!job) return [];
  const subject: ConditionSubject = { job, wtn };
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
