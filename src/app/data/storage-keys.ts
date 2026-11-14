/* Every localStorage key the app uses, in one place. */
export const STORAGE = {
  appVersion: 'welding:app-version',
  workflows: 'welding:workflows:v5',
  stageTemplates: 'welding:stage-templates:v7',
  signoffTypeRouting: 'welding:signoff-type-routing:v1',
  signoffTypes: 'welding:signoff-types:v5',
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
  adminGroups: 'welding:admin-groups:v6',
  viewer: 'welding:viewer:v1',
  theme: 'welding:theme',
  searchState: 'welding:search-state:v1',
  advancedSearchState: 'welding:advanced-search-state:v2',
  advancedSearchDefault: 'welding:advanced-search-default:v1',
  filterVariants: 'welding:filter-variants:v1',
  weldJoints: 'welding:weld-joints:v16',
  adminJointDesigns: 'welding:admin-joint-designs:v2',
  weldPlanningSearchState: 'welding:weld-planning-search-state',
  weldPlanningFilterVariants: 'welding:weld-planning-filter-variants:v2',
  quickLinks: 'welding:quick-links:v1',
  procedures: 'welding:procedures:v13',
  procedureSections: 'welding:procedure-sections:v2',
  makeup: 'welding:makeup:v3',
  qualConditions: 'welding:qual-conditions:v8',
  featureToggles: 'welding:feature-toggles:v1',
  stepFieldConfig: 'welding:step-field-config:v18',
  attributeCodeExceptions: 'welding:attribute-code-exceptions:v1',
} as const;

/* Caches that must be rebuilt when stage definitions change (new app version or new build activated).
   procedures is included because its seeded GWP/WTN rows are generated from MATERIAL_TYPES
   (jobs.ts) -- a change to those codes without a matching cache clear leaves the GWP/WTN cascade
   silently blank (see storage-keys history, and the v4->v5 bump this line was added for). */
const STALE_ON_UPDATE = [STORAGE.workflows, STORAGE.stageTemplates, STORAGE.penetrants, STORAGE.inspectionProcedures, STORAGE.defectCodes, STORAGE.signoffTypeRouting, STORAGE.signoffTypes, STORAGE.attributeCodeExceptions, STORAGE.shipLocations, STORAGE.weldPositions, STORAGE.procedures];

export function clearStaleCaches() {
  STALE_ON_UPDATE.forEach(k => localStorage.removeItem(k));
}
