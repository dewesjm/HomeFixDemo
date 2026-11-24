/* Every localStorage key the app uses, in one place. */
export const STORAGE = {
  appVersion: 'welding:app-version',
  workflows: 'welding:workflows:v6',
  offlineJointPrefix: 'welding:offline-joint:v1:',
  stageTemplates: 'welding:stage-templates:v7',
  signoffTypeRouting: 'welding:signoff-type-routing:v1',
  signoffTypes: 'welding:signoff-types:v6',
  /* Structural's own copies of the four per-joint-type settings tables (Pipe uses the keys above) */
  structuralStageTemplates: 'welding:structural:stage-templates:v1',
  structuralSignoffTypeRouting: 'welding:structural:signoff-type-routing:v1',
  structuralSignoffTypes: 'welding:structural:signoff-types:v1',
  structuralStepFieldConfig: 'welding:structural:step-field-config:v1',
  penetrants: 'welding:penetrants:v1',
  inspectionProcedures: 'welding:inspection-procedures:v1',
  defectCodes: 'welding:defect-codes:v1',
  shipLocations: 'welding:ship-locations:v1',
  repairCodes: 'welding:repair-codes:v1',
  weldColors: 'welding:weld-colors:v1',
  weldPositions: 'welding:weld-positions:v1',
  locations: 'welding:locations:v1',
  jointDesigns: 'welding:joint-designs:v3',
  mclTraceability: 'welding:mcl-traceability:v2',
  materialClassification: 'welding:material-classification:v5',
  banner: 'welding:banner',
  adminGroups: 'welding:admin-groups:v10',
  adminGroupHistory: 'welding:admin-group-history:v1',
  viewer: 'welding:viewer:v1',
  theme: 'welding:theme-override',
  searchState: 'welding:search-state:v1',
  advancedSearchState: 'welding:advanced-search-state:v2',
  advancedSearchDefault: 'welding:advanced-search-default:v1',
  filterVariants: 'welding:filter-variants:v1',
  structuralSearchState: 'welding:structural-search-state:v1',
  structuralSearchDefault: 'welding:structural-search-default:v1',
  nonNumberedSearchState: 'welding:non-numbered-search-state:v1',
  nonNumberedSearchDefault: 'welding:non-numbered-search-default:v1',
  nonNumberedFilterVariants: 'welding:non-numbered-filter-variants:v1',
  structuralFilterVariants: 'welding:structural-filter-variants:v1',
  weldJoints: 'welding:weld-joints:v16',
  adminJointDesigns: 'welding:admin-joint-designs:v2',
  weldPlanningSearchState: 'welding:weld-planning-search-state',
  weldPlanningFilterVariants: 'welding:weld-planning-filter-variants:v2',
  quickLinks: 'welding:quick-links:v1',
  procedures: 'welding:procedures:v13',
  procedureSections: 'welding:procedure-sections:v2',
  /* one key per image: this prefix + the image id */
  procedureImagePrefix: 'welding:procedure-image:v1:',
  makeup: 'welding:makeup:v4',
  qualConditions: 'welding:qual-conditions:v8',
  featureToggles: 'welding:feature-toggles:v1',
  stepFieldConfig: 'welding:step-field-config:v19',
  attributeCodeExceptions: 'welding:attribute-code-exceptions:v1',
} as const;

/* Caches that must be rebuilt when stage definitions change (new app version or new build activated).
   procedures is included because its seeded GWP/WTN rows are generated from the procedure catalog’s base-material codes
   (jobs.ts) -- a change to those codes without a matching cache clear leaves the GWP/WTN cascade
   silently blank (see storage-keys history, and the v4->v5 bump this line was added for). */
const STALE_ON_UPDATE = [STORAGE.workflows, STORAGE.stageTemplates, STORAGE.penetrants, STORAGE.inspectionProcedures, STORAGE.defectCodes, STORAGE.signoffTypeRouting, STORAGE.signoffTypes, STORAGE.structuralStageTemplates, STORAGE.structuralSignoffTypeRouting, STORAGE.structuralSignoffTypes, STORAGE.attributeCodeExceptions, STORAGE.shipLocations, STORAGE.weldPositions, STORAGE.procedures];

export function clearStaleCaches() {
  STALE_ON_UPDATE.forEach(k => localStorage.removeItem(k));
}

/* the storage key of a per-joint-type settings table (Routing Settings, Signoff Types, Signoff Type to
   Routing, Signoff Type Forms): Pipe keeps the original keys */
export type SettingsTable = 'stageTemplates' | 'signoffTypeRouting' | 'signoffTypes' | 'stepFieldConfig';
const STRUCTURAL_KEYS: Record<SettingsTable, string> = {
  stageTemplates: STORAGE.structuralStageTemplates,
  signoffTypeRouting: STORAGE.structuralSignoffTypeRouting,
  signoffTypes: STORAGE.structuralSignoffTypes,
  stepFieldConfig: STORAGE.structuralStepFieldConfig,
};
export function settingsKey(table: SettingsTable, jointType: 'pipe' | 'structural'): string {
  return jointType === 'pipe' ? STORAGE[table] : STRUCTURAL_KEYS[table];
}
