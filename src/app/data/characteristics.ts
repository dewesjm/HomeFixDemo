import { PROGRESSION_ATTRIBUTE_CODES } from './attribute-codes';
/* Attribute code lookup; a joint carries up to four codes. */
interface CharacteristicCode {
  code: string;
  description: string;   /* meaning, e.g. Hazardous */
}

export const CHARACTERISTIC_CODES: CharacteristicCode[] = [
  ...PROGRESSION_ATTRIBUTE_CODES,
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

/* description for a code, '' if unknown */
export function characteristicLabel(code: string): string {
  if (!code) return '';
  return CHARACTERISTIC_CODES.find(c => c.code === code)?.description ?? '';
}
