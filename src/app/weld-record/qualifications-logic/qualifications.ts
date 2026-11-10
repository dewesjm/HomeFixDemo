/* Qualification codes and the Qualification Check. Which quals a step requires, and which quals a
   person holds, are both set by the conditions under Admin > Qualifications (qual-conditions.ts).
   In the real system held quals come from each person's certification record, not a list in the app. */
import { QualGroup, missingText, qualsIn, termMet } from './qual-requirements';

/* WELD4xx quals, offered when building a condition */
export const QUALIFICATIONS = [
  'WELD412', 'WELD427', 'WELD403', 'WELD458', 'WELD431', 'WELD466',
  'WELD419', 'WELD474', 'WELD440', 'WELD485', 'WELD409', 'WELD452',
  'WELD437', 'WELD491', 'WELD415', 'WELD463', 'WELD448', 'WELD470', 'WELD426', 'WELD498',
];

/* quals the seed conditions use (qual-conditions.ts): controlled material (either one will do),
   stainless, VT inspection, titanium */
const CONDITION_QUALS = ['CNTRLMTL1', 'CNTRLMTL2', 'SSWELD1', 'VTINSP1', 'TIWELD1'];
export const ALL_QUALS = [...CONDITION_QUALS, ...QUALIFICATIONS];

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
