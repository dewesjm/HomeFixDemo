/* Every localStorage key the app uses, in one place. */
export const STORAGE = {
  appVersion: 'welding:app-version',
  workflows: 'welding:workflows:v2',
  stageTemplates: 'welding:stage-templates:v2',
  routingOptions: 'welding:routing-options:v1',
  penetrants: 'welding:penetrants:v1',
  inspectionProcedures: 'welding:inspection-procedures:v1',
  shipLocations: 'welding:ship-locations:v1',
  weldPositions: 'welding:weld-positions:v1',
  shops: 'welding:shops:v2',
  jointDesigns: 'welding:joint-designs:v3',
  mclTraceability: 'welding:mcl-traceability:v2',
  materialClassification: 'welding:material-classification:v4',
  banner: 'welding:banner',
  theme: 'welding:theme',
  searchState: 'welding:search-state:v1',
  advancedSearchState: 'welding:advanced-search-state:v2',
  advancedSearchDefault: 'welding:advanced-search-default:v1',
  filterVariants: 'welding:filter-variants',
  weldJoints: 'welding:weld-joints:v10',
  adminJointDesigns: 'welding:admin-joint-designs:v2',
  weldPlanningResultColumns: 'welding:weld-planning-result-columns',
  weldPlanningFilterVariants: 'welding:weld-planning-filter-variants',
  quickLinks: 'welding:quick-links:v1',
  procedures: 'welding:procedures:v9',
  makeup: 'welding:makeup:v2',
  qualifications: 'welding:qualifications:v2',
  qualConditions: 'welding:qual-conditions:v1',
  featureToggles: 'welding:feature-toggles:v1',
} as const;

/* Caches that must be rebuilt when stage definitions change (new app version or new build activated).
   procedures is included because its seeded GWP/WPS rows are generated from MATERIAL_TYPES
   (jobs.ts) -- a change to those codes without a matching cache clear leaves the GWP/WTN cascade
   silently blank (see storage-keys history, and the v4->v5 bump this line was added for). */
const STALE_ON_UPDATE = [STORAGE.workflows, STORAGE.stageTemplates, STORAGE.penetrants, STORAGE.inspectionProcedures, STORAGE.shipLocations, STORAGE.weldPositions, STORAGE.procedures];

export function clearStaleCaches() {
  STALE_ON_UPDATE.forEach(k => localStorage.removeItem(k));
}
