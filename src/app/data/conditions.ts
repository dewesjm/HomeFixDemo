/* condition code lookup, recorded on Work validation */
export interface ConditionCode {
  code: string;          /* short code, e.g. C200 */
  description: string;   /* meaning, e.g. Cracked / damaged */
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

/* description for a condition code, '' if unknown */
export function conditionLabel(code: string): string {
  if (!code) return '';
  return CONDITION_CODES.find(c => c.code === code)?.description ?? '';
}

/* dropdown options, e.g. "C200 Cracked" */
export const CONDITION_OPTIONS = CONDITION_CODES.map(c => ({
  label: `${c.code} — ${c.description}`,
  value: c.code
}));
