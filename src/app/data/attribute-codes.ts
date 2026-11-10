/* Provisional source-system identifiers and their supplied messages. */
export const PROGRESSION_ATTRIBUTE_CODES = [
  { code: 'PR', description: 'PT ROOT IF ID-VT / NO RT' },
  { code: 'PM', description: 'FINAL PT MAY BE SUBSTITUTED FOR MT' },
  { code: 'FC', description: 'FINAL PT NOT REQUIRED "VT" ONLY ON FINAL' },
  { code: 'BJ', description: '[material type] BRAZED JOINT (OPTO) "VT" ONLY ON FINAL' },
  { code: 'PU', description: 'PT & UT REQUIRED ON FINAL' },
  { code: 'SI', description: 'SHOP JTS ONLY-ID INSP-LIEU RT' },
  { code: 'RX', description: 'ROOT PT AND FINAL XRAY REQD' },
  { code: 'IA', description: 'PT/MT ID IF ACCESS' },
  { code: 'IR', description: 'PT/MT ID IN LIEU OF RT IF ACCESSIBLE' },
  { code: 'LR', description: 'ALLOW 60 DEG RT IN LIEU OF INTERMEDIATE LAYER PT' },
  { code: 'GV', description: 'GTA WELDS:VT ONLY ROOT & FINAL (5XROOT/1XFINAL)' },
  { code: 'RI', description: '60 RT AND/OR PT OF ID REQUIRED' },
  { code: 'BP', description: "BOTH 5X AND PT/MT ROOT REQ'D" },
] as const;

export type ProgressionAttributeCode = typeof PROGRESSION_ATTRIBUTE_CODES[number]['code'];

/* Attribute code lookup (Admin > Attribute Codes); a joint carries up to four codes. */
interface AttributeCode {
  code: string;
  description: string;   /* meaning, e.g. Hazardous */
}

export const ATTRIBUTE_CODES: AttributeCode[] = [
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
export function attributeCodeLabel(code: string): string {
  if (!code) return '';
  return ATTRIBUTE_CODES.find(c => c.code === code)?.description ?? '';
}
