/* Every localStorage key the app uses, in one place. */
export const STORAGE = {
  appVersion: 'welding:app-version',
  workflows: 'welding:workflows:v2',
  stageTemplates: 'welding:stage-templates:v2',
  routingOptions: 'welding:routing-options:v1',
  penetrants: 'welding:penetrants:v1',
  weldPositions: 'welding:weld-positions:v1',
  shops: 'welding:shops:v1',
  jointDesigns: 'welding:joint-designs:v1',
  mclTraceability: 'welding:mcl-traceability:v1',
  materialClassification: 'welding:material-classification:v2',
  banner: 'welding:banner',
  theme: 'welding:theme',
  searchState: 'welding:search-state:v1',
  resultColumns: 'welding:result-columns',
  filterVariants: 'welding:filter-variants',
  weldJoints: 'welding:weld-joints:v3',
  adminJointDesigns: 'welding:admin-joint-designs:v1',
  weldPlanningResultColumns: 'welding:weld-planning-result-columns',
  weldPlanningFilterVariants: 'welding:weld-planning-filter-variants',
  quickLinks: 'welding:quick-links:v1',
  procedures: 'welding:procedures:v5',
  makeup: 'welding:makeup:v2',
} as const;

/* Caches that must be rebuilt when stage definitions change (new app version or new build activated).
   procedures is included because its seeded GWP/WPS rows are generated from MATERIALS_1/MATERIALS_2
   (jobs.ts) -- a change to those codes without a matching cache clear leaves the GWP/WTN cascade
   silently blank (see storage-keys history, and the v4->v5 bump this line was added for). */
const STALE_ON_UPDATE = [STORAGE.workflows, STORAGE.stageTemplates, STORAGE.penetrants, STORAGE.weldPositions, STORAGE.procedures];

export function clearStaleCaches() {
  STALE_ON_UPDATE.forEach(k => localStorage.removeItem(k));
}
