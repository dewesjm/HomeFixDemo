/* Welder qualifications (WELD4xx codes). Each WPS lists the quals it requires
   (Procedure.qualificationsRequired, procedures.ts); Weld Record's Qualification Check compares
   them against the Test User's quals. There is no login, so the demo has one Test User whose
   quals are set under Admin > Qualifications. In the real system these come from the welder's
   certification record, not a list in the app. */
import { signal } from '@angular/core';
import { STORAGE } from './storage-keys';

/* ordered most to least common: seed procedures pick with these weights (QUAL_WEIGHTS) */
export const QUALIFICATIONS = [
  'WELD412', 'WELD427', 'WELD403', 'WELD458', 'WELD431', 'WELD466',
  'WELD419', 'WELD474', 'WELD440', 'WELD485', 'WELD409', 'WELD452',
  'WELD437', 'WELD491', 'WELD415', 'WELD463', 'WELD448', 'WELD470', 'WELD426', 'WELD498',
];

/* first 6 common, next 6 moderate, last 8 rare */
export const QUAL_WEIGHTS: number[] = QUALIFICATIONS.map((_, i) => i < 6 ? 8 : i < 12 ? 3 : 1);

export const TEST_USER_NAME = 'Test User';

/* the common and moderate quals, none of the rare ones, so some WTNs fail the check */
export const DEFAULT_TEST_USER_QUALS = QUALIFICATIONS.slice(0, 12);

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE.qualifications);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [...DEFAULT_TEST_USER_QUALS];
}

export const testUserQuals = signal<string[]>(load());

export function setTestUserQuals(quals: string[]) {
  const ordered = QUALIFICATIONS.filter(q => quals.includes(q));
  testUserQuals.set(ordered);
  try { localStorage.setItem(STORAGE.qualifications, JSON.stringify(ordered)); } catch { /* ignore */ }
}

export interface QualCheckResult {
  status: 'none' | 'passed' | 'failed';   /* none = no WPS resolved yet (GWP/WTN not picked) */
  message: string;
}

/* required = the resolved WPS's qualificationsRequired, or undefined when GWP/WTN don't resolve to one */
export function qualCheck(required: string[] | undefined, held: string[]): QualCheckResult {
  if (!required) return { status: 'none', message: 'Select a GWP and WTN to check qualifications' };
  if (!required.length) return { status: 'passed', message: 'Passed, no qualifications required' };
  const missing = required.filter(q => !held.includes(q));
  if (missing.length) return { status: 'failed', message: `Failed. Input disabled, qualifications ${missing.join(', ')} missing` };
  return { status: 'passed', message: `Passed, user has ${required.join(', ')}` };
}
