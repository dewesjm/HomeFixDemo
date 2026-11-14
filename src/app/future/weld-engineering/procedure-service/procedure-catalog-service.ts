/* Weld Engineering's procedure choices. Base material codes use the demo list until
   Weld Dispatch can provide its catalog. The service returns independent response values. */
const MATERIAL_TYPES = ['02-CS', '04-AS', '06-CI', '12-SS304', '13-SS316', '25-DS2205',
  '60-TICP', '61-TI64', '62-TI12', '63-AL10', '65-CUNI', '67-IN625'];

const FILLER_METAL_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'MIL-70S-3', value: 'mil-70s-3' }, { label: 'MIL-70S-6', value: 'mil-70s-6' },
  { label: 'MIL-80S-50', value: 'mil-80s-50' }, { label: 'MIL-80S-D2', value: 'mil-80s-d2' },
  { label: 'MIL-90S-B3', value: 'mil-90s-b3' }, { label: 'MIL-100S-1', value: 'mil-100s-1' },
];
const FILLER_METAL_SIZE_OPTIONS: { label: string; value: string }[] = [
  { label: '1/16"', value: '1/16' }, { label: '3/32"', value: '3/32' }, { label: '1/8"', value: '1/8' },
  { label: '5/32"', value: '5/32' }, { label: '3/16"', value: '3/16' }, { label: '1/4"', value: '1/4' },
];

export function getBaseMaterialCodes(): string[] {
  return [...MATERIAL_TYPES];
}

export function getProcedureFillerMetalTypes(): { label: string; value: string }[] {
  return FILLER_METAL_TYPE_OPTIONS.map(option => ({ ...option }));
}

export function getProcedureFillerMetalSizes(): { label: string; value: string }[] {
  return FILLER_METAL_SIZE_OPTIONS.map(option => ({ ...option }));
}
