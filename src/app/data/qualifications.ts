/* Welder qualifications (WELD4xx codes plus the controlled-material quals). Which quals a joint or
   WTN requires is set by the conditions under Admin > Qualifications (qual-conditions.ts); Weld
   Record's Qualification Check compares them against the Test User's quals. There is no login, so
   the demo has one Test User whose quals are toggled on that same page. In the real system these
   come from the welder's certification record, not a list in the app. */
import { signal } from '@angular/core';
import { STORAGE } from './storage-keys';
import { QualGroup, missingText, qualsIn, termMet } from './qual-requirements';

/* WELD4xx quals, offered when building a condition */
export const QUALIFICATIONS = [
  'WELD412', 'WELD427', 'WELD403', 'WELD458', 'WELD431', 'WELD466',
  'WELD419', 'WELD474', 'WELD440', 'WELD485', 'WELD409', 'WELD452',
  'WELD437', 'WELD491', 'WELD415', 'WELD463', 'WELD448', 'WELD470', 'WELD426', 'WELD498',
];

/* quals the seed conditions require (qual-conditions.ts): controlled material (either one will do),
   stainless, VT inspection, titanium */
const CONDITION_QUALS = ['CNTRLMTL1', 'CNTRLMTL2', 'SSWELD1', 'VTINSP1', 'TIWELD1'];
export const ALL_QUALS = [...QUALIFICATIONS, ...CONDITION_QUALS];

export const TEST_USER_NAME = 'Test User';

/* the first 12 WELD4xx quals, plus every seed condition's quals except CNTRLMTL2, so every seed
   condition passes by default (controlled material through the OR) */
export const DEFAULT_TEST_USER_QUALS = [...QUALIFICATIONS.slice(0, 12), ...CONDITION_QUALS.filter(q => q !== 'CNTRLMTL2')];

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

/* Admin > Qualifications toggles save right away */
export function toggleTestUserQual(qual: string) {
  const held = testUserQuals();
  setTestUserQuals(held.includes(qual) ? held.filter(q => q !== qual) : [...held, qual]);
}

export interface QualCheckResult {
  status: 'passed' | 'failed';
  message: string;
}

/* required = the requirements of every condition the step matches (conditionRequirements(),
   qual-conditions.ts); passed lists the held quals they name */
export function qualCheck(held: string[], required: QualGroup[]): QualCheckResult {
  const missing = required.map(g => missingText(g, held)).filter(Boolean);
  if (missing.length) return { status: 'failed', message: `Failed, qualifications ${missing.join(', ')} missing` };
  const used = qualsIn({ op: 'all', items: required }).filter(q => held.includes(q));
  if (!used.length) return { status: 'passed', message: 'Passed' };
  return { status: 'passed', message: `Passed, qualifications ${used.join(', ')}, active` };
}

export function requirementsMet(held: string[], required: QualGroup[]): boolean {
  return required.every(g => termMet(g, held));
}
