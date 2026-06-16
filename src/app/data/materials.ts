/* materials list for the Build/install stage dropdown */
export const MATERIALS: string[] = [
  'Red oak',
  'White oak',
  'Walnut',
  'Maple',
  'Cherry',
  'Pine',
  'Poplar',
  'Cedar',
  'Birch plywood',
  'MDF'
];

/* dropdown options, name as label and value */
export const MATERIAL_OPTIONS = MATERIALS.map(m => ({ label: m, value: m }));
