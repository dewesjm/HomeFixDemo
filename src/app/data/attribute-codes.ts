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
