/* Qual conditions (Admin > Qualifications): "when the joint has <field> = <value>, the welder or
   inspector also needs <qual>". Checked on every welding and inspection step as soon as it's open,
   before any GWP/WTN is picked. Controlled Material = either MCL 1 or MCL 2 is a value the MCL
   Traceability table marks as requiring traceability (i.e. not STD). */
import { signal } from '@angular/core';
import { STORAGE } from './storage-keys';
import { Job, N_IND_POOL } from './jobs';
import { requiresTraceability } from './mcl-traceability';

export interface QualCondition {
  field: string;   /* CONDITION_FIELDS key */
  value: string;
  qual: string;
}

export interface ConditionField {
  key: string;
  label: string;
  values: string[];
  get: (job: Job) => string;
}

const yesNo = (v: string) => v === 'Yes' ? 'Yes' : 'No';

export const CONDITION_FIELDS: ConditionField[] = [
  { key: 'controlledMaterial', label: 'Controlled Material', values: ['Yes', 'No'],
    get: j => requiresTraceability(j.mcl1) || requiresTraceability(j.mcl2) ? 'Yes' : 'No' },
  { key: 'ss', label: 'SS', values: ['Yes', 'No'], get: j => yesNo(j.ss) },
  { key: 'sfff', label: 'SFFF', values: ['Yes', 'No'], get: j => yesNo(j.sfff) },
  { key: 'nInd', label: 'N Ind.', values: N_IND_POOL, get: j => j.nInd },
];

const DEFAULT_CONDITIONS: QualCondition[] = [
  { field: 'controlledMaterial', value: 'Yes', qual: 'CNTRLMTL1' },
];

function load(): QualCondition[] {
  try {
    const raw = localStorage.getItem(STORAGE.qualConditions);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_CONDITIONS.map(c => ({ ...c }));
}

export const qualConditions = signal<QualCondition[]>(load());

export function setQualConditions(conditions: QualCondition[]) {
  qualConditions.set(conditions);
  try { localStorage.setItem(STORAGE.qualConditions, JSON.stringify(conditions)); } catch { /* ignore */ }
}

/* quals the joint's conditions require, in table order, no repeats */
export function conditionQuals(job: Job | undefined | null): string[] {
  if (!job) return [];
  const out: string[] = [];
  for (const c of qualConditions()) {
    const f = CONDITION_FIELDS.find(ff => ff.key === c.field);
    if (f && c.qual && f.get(job) === c.value && !out.includes(c.qual)) out.push(c.qual);
  }
  return out;
}
