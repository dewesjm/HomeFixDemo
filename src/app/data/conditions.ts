// Condition codes — a shared lookup of inspection/quality conditions (code → description),
// e.g. "C200 = Cracked / damaged". Recorded on the Work validation section of a job,
// alongside the number of conditions found and whether they arose during build or install.
// Stands in for a maintainable config/lookup table; lives in memory for the demo.
export interface ConditionCode {
  code: string;          // short designation, e.g. "C200"
  description: string;   // human-friendly meaning, e.g. "Cracked / damaged"
}

export const CONDITION_CODES: ConditionCode[] = [
  { code: 'C100', description: 'Misaligned' },
  { code: 'C200', description: 'Cracked / damaged' },
  { code: 'C300', description: 'Leak / seepage' },
  { code: 'C400', description: 'Loose fastening' },
  { code: 'C500', description: 'Corrosion' },
  { code: 'C600', description: 'Incorrect material' },
  { code: 'C700', description: 'Code violation' },
  { code: 'C800', description: 'Missing component' },
  { code: 'C900', description: 'Poor finish' }
];

/** Description for a condition code value (empty string if blank/unknown). */
export function conditionLabel(code: string): string {
  if (!code) return '';
  return CONDITION_CODES.find(c => c.code === code)?.description ?? '';
}

/** Dropdown options: "C200 — Cracked / damaged". */
export const CONDITION_OPTIONS = CONDITION_CODES.map(c => ({
  label: `${c.code} — ${c.description}`,
  value: c.code
}));
