/* Admin > Qualifications rows: "when <clauses>, signoff type <type>, require <quals>" requirement rows
   and "when User is <person>, holds <quals>" User rows. The model, the starting rows, load and save
   (localStorage). The live rows and the rules that read them are in
   weld-record/qualifications/qual-conditions.ts. */
import { STORAGE } from './storage-keys';
import type { QualGroup } from '../weld-record/qualifications/qual-requirements';
import type { WhenGroup } from '../weld-record/qualifications/qual-when';

export interface QualCondition {
  when: WhenGroup;
  require: QualGroup;   /* on a User row: the quals held (always an 'all' list) */
  type?: string;        /* the Signoff Type value the row applies to. Not used on a User row */
}

/* the User field's key, and the testing person the Qualification Check always runs as (no login) */
export const USER_FIELD = 'user';
export const SELF = 'SELF';

const when = (field: string, value: string): WhenGroup => ({ op: 'all', items: [{ field, op: 'is', values: [value] }] });

/* the starting rows; typeValues = the Signoff Types offered on forms with a Qualification Check, one
   row each for a requirement on every Type. SELF holds the seed quals except CNTRLMTL2, so every seed
   requirement passes (controlled material through the OR); one requirement per kind of check: joint
   flags, the step's Type, the base material */
export function defaultQualConditions(typeValues: string[]): QualCondition[] {
  const perType = (w: WhenGroup, require: QualGroup): QualCondition[] => typeValues.map(type => ({ when: w, type, require }));
  return [
    { when: when(USER_FIELD, SELF), require: { op: 'all', items: ['CNTRLMTL1', 'SSWELD1', 'VTINSP1', 'TIWELD1'] } },
    ...perType(when('controlledMaterial', 'Yes'), { op: 'any', items: ['CNTRLMTL1', 'CNTRLMTL2'] }),
    ...perType(when('ss', 'Yes'), { op: 'all', items: ['SSWELD1'] }),
    { when: { op: 'all', items: [] }, type: 'vt', require: { op: 'all', items: ['VTINSP1'] } },
    ...perType(when('material.titanium', 'Yes'), { op: 'all', items: ['TIWELD1'] }),
  ];
}

/* the saved rows; null when nothing is saved */
export function loadQualConditions(): QualCondition[] | null {
  try {
    const raw = localStorage.getItem(STORAGE.qualConditions);
    if (raw) return JSON.parse(raw) as QualCondition[];
  } catch { /* ignore */ }
  return null;
}

export function saveQualConditions(conditions: QualCondition[]): void {
  try { localStorage.setItem(STORAGE.qualConditions, JSON.stringify(conditions)); } catch { /* ignore */ }
}
