/* The workflow model and its rules, no UI. Each file is one concern:
     types              the data model (steps, history, deviations)
     weld-fields        welding step fields and which can't be typed into
     ndt                NDT steps and which ones a joint gets
     fabrication        the Fabrication section's fields
     welding-steps      the built-in Welding routing
     stage-templates    templates merged with Admin > Routing Settings changes, and its edits
     build-stages       a joint's steps from the templates
     step-ids           Repair / Excavation NDT / Engineering Hold ids and rounds
     added-steps        building those added steps
     stage-rules        per-step rules (decision, references, type lock, Correct locks)
     stage-display      recorded values as shown in History
     current-routing    the current step and which steps are locked
     route-changes      going back, Set Routing, Deprogress, discarding edits
     history-rows       History as table rows, and where Deprogress / Correct are offered
     seed-fabrication / seeded-workflow   demo data */
export * from './types';
export * from './weld-fields';
export * from './ndt';
export * from './fabrication';
export * from './welding-steps';
export * from './stage-templates';
export * from './build-stages';
export * from './step-ids';
export * from './added-steps';
export * from './stage-rules';
export * from './stage-display';
export * from './current-routing';
export * from './route-changes';
export * from './history-rows';
export * from './seed-fabrication';
export * from './seeded-workflow';
