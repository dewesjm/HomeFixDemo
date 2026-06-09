// Characteristic codes — a shared lookup of special job designations (code → description),
// e.g. "1234 = Hazardous". A job carries up to three of these (code1/code2/code3).
// Stands in for a maintainable config/lookup table; lives in memory for the demo.
export interface CharacteristicCode {
  code: string;          // short numeric designation, e.g. "1234"
  description: string;   // human-friendly meaning, e.g. "Hazardous"
}

export const CHARACTERISTIC_CODES: CharacteristicCode[] = [
  { code: '1234', description: 'Hazardous' },
  { code: '2001', description: 'Confined space' },
  { code: '3050', description: 'Permit required' },
  { code: '4100', description: 'Customer must be present' },
  { code: '5500', description: 'After-hours access only' },
  { code: '6200', description: 'High voltage' },
  { code: '7300', description: 'Asbestos risk' },
  { code: '8400', description: 'Two-person job' },
  { code: '9100', description: 'Warranty work' }
];

/** Description for a code value (empty string if blank/unknown). */
export function characteristicLabel(code: string): string {
  if (!code) return '';
  return CHARACTERISTIC_CODES.find(c => c.code === code)?.description ?? '';
}

/** Dropdown options: "1234 — Hazardous". */
export const CHARACTERISTIC_OPTIONS = CHARACTERISTIC_CODES.map(c => ({
  label: `${c.code} — ${c.description}`,
  value: c.code
}));
