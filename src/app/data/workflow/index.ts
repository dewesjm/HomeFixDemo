/* The workflow model and its rules, no UI. Each file is one concern:
     types              the data model (steps, history, deviations)
     weld-fields        welding step fields and their PH/IP requirement rules
     field-locks        which fields on a step can't be typed into (Disabled when)
     field-fill         fields prepopulated from another value (Prepopulated from)
     ndt                NDT steps and which ones a joint gets
     fabrication        the Fabrication section's fields
     welding-steps      the built-in Welding routing
     signoff-types      Admin > Signoff Type Availability: each step's Type options (seeded)
     signoff-forms      which form a step's sign-off shows, whether it's drawn from its definition, and its Comments box
     definition-layout  a step's form laid out from its definition (order, shared lines, headings)
     stage-templates    templates merged with Admin > Routing Settings changes, and its edits
     build-stages       a joint's steps from the templates
     step-ids           Repair / Excavation NDT / Engineering Hold ids and rounds, the two Fit-Up Insp ids
     added-steps        building those added steps
     stage-rules        per-step rules (decision, references, type lock, Correct locks)
     stage-display      recorded values as shown in History
     shown-fields       the fields a step shows, from its Signoff Type Definition or its template
     current-routing    the current step and which steps are locked
     routing-bar        which steps the joint page's routing bar shows
     route-changes      going back, Routing Override, Deprogress, discarding edits
     history-rows       History as table rows, and where Deprogress / Correct are offered
     seed-fabrication / seeded-workflow   demo data */
export * from './types';
export * from './weld-fields';
export * from './ndt';
export * from './fabrication';
export * from './welding-steps';
export * from './signoff-types';
export * from './signoff-forms';
export * from './stage-templates';
export * from './build-stages';
export * from './step-ids';
export * from './added-steps';
export * from './stage-rules';
export * from './stage-display';
export * from './current-routing';
export * from './routing-bar';
export * from './route-changes';
export * from './history-rows';
export * from './seed-fabrication';
export * from './seeded-workflow';
export * from './field-conditions';
export * from './field-catalog';
export * from './step-field-config';
export * from './field-rules';
export * from './joint-facts';
export * from './condition-context';
export * from './field-fill';
export * from './field-locks';
export * from './shown-fields';
export * from './definition-layout';
