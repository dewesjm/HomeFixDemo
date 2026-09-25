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

/* quals only a joint condition requires (Admin > Qualifications conditions, qual-conditions.ts),
   never on a WPS; the Test User can hold them like any other */
export const CONDITION_QUALS = ['CNTRLMTL1'];
export const ALL_QUALS = [...QUALIFICATIONS, ...CONDITION_QUALS];

/* first 6 common, next 6 moderate, last 8 rare */
export const QUAL_WEIGHTS: number[] = QUALIFICATIONS.map((_, i) => i < 6 ? 8 : i < 12 ? 3 : 1);

export const TEST_USER_NAME = 'Test User';

/* the common and moderate quals, none of the rare ones, so some WTNs fail the check; plus the
   condition quals, so controlled material (most joints) doesn't fail by default */
export const DEFAULT_TEST_USER_QUALS = [...QUALIFICATIONS.slice(0, 12), ...CONDITION_QUALS];

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE.qualifications);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [...DEFAULT_TEST_USER_QUALS];
}

export const testUserQuals = signal<string[]>(load());

export function setTestUserQuals(quals: string[]) {
  const ordered = ALL_QUALS.filter(q => quals.includes(q));
  testUserQuals.set(ordered);
  try { localStorage.setItem(STORAGE.qualifications, JSON.stringify(ordered)); } catch { /* ignore */ }
}

export interface QualCheckResult {
  status: 'passed' | 'failed';
  message: string;
}

/* conditionRequired = quals the joint's conditions require (qual-conditions.ts), checked as soon as
   the step is open; wpsRequired = the selected GWP+WTN's quals, added once they resolve to a WPS */
export function qualCheck(held: string[], conditionRequired: string[], wpsRequired: string[] = []): QualCheckResult {
  const required = [...new Set([...conditionRequired, ...wpsRequired])];
  const missing = required.filter(q => !held.includes(q));
  if (missing.length) return { status: 'failed', message: `Failed, qualifications ${missing.join(', ')} missing` };
  if (!required.length) return { status: 'passed', message: 'Passed' };
  return { status: 'passed', message: `Passed, user has ${required.join(', ')}` };
}
