// Materials — a shared list of wood species / building materials selectable as the
// "Material used" on the Build/install stage of the Work validation section. Stands in
// for a maintainable config/lookup table (Admin → Materials); lives in memory for the demo.
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

/** Dropdown options: the material name as both label and value (e.g. "Red oak"). */
export const MATERIAL_OPTIONS = MATERIALS.map(m => ({ label: m, value: m }));
