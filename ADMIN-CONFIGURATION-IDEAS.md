# Weld Record admin configuration ideas

Weld Record ideas and deferred requirements. Nothing here queues implementation. Weld Planning and Weld Engineering are outside this scope.

Outstanding items are indexed in [Tasks.md](Tasks.md); keep that master backlog current when these detailed notes change.

## Implemented: separate repair thickness confirmations

Repair's Signoff Type Form includes two distinct checkbox fields. Indicator 1 uses the 3/8 inch or 20% limit; indicators 2/3 use the 3/16 inch or 20% limit, whichever is less. Editable Show when conditions select the group and require the phase's RT/UT routing. Separate recorded fields retain the confirmed limit in History; either checkbox routes via the existing Then go to rules. This replaces the proposed separate limits table for the current scope. No automatic measured-thickness calculation is included.

## Implemented: conditional routing personas

Routing Settings has ordered Persona rules using Joint Details conditions, with the base Persona as fallback. Excavation starts with NQC Inspector for indicators 1/2, Inspector otherwise. This replaces the fixed role remap. New/rebuilt stages use current configuration; existing stages keep their persona.

## Repair and Excavation NDT configuration follow-up

Deferred for a future session; review scope before implementing. Most routing decisions already read saved configuration, so this is an extension of existing configuration rather than a replacement workflow engine.

### Already configurable

| Behavior | Configuration owner |
|---|---|
| Failed NDT adds Repair | Routing Settings: Reject routes to / reject rules |
| Thickness exceeded returns to the rejecting phase's UT/RT; Grind Only returns to the failed inspection; Cut returns to Fit; Weld Repair adds Excavation NDT | Routing Settings: Repair's ordered Then go to rules |
| Excavation UNSAT returns to its own Repair; SAT returns to the failed inspection, or the phase's VT/5X for the PT-to-5X exception | Routing Settings: Excavation NDT's Reject routes to and Then go to rules |
| Excavation inherits the failed inspection method, with ordered material exceptions such as PT to 5X | Signoff Types By Routing: Excavation Type source and exceptions; Material Classification supplies the material flags |
| Repair fields, visibility and layout; shared inspection forms | Signoff Type Forms |

Starting destination rules are in `src/app/weld-record/routing/added-stage-templates.ts`; execution reads saved templates through `stage-templates.ts`. Inspection Type source and exceptions are in `src/app/weld-record/signoff-definition/signoff-types.ts` and have an existing admin editor. Ordinary NDT inclusion and Type availability also use existing routing and Type configuration.

### Remaining fixed business decisions

- Repair thickness confirmations are configured through the existing Signoff Type Form; no separate limits table remains proposed for the current scope.
- Repair Code options currently come from `signoff-definition/field-catalog.ts`: Grind Only, Weld Repair and Cut. Admin-defined choices are agreed deferred scope below; their behavior uses existing form conditions and routing rules. Specialized lifecycle effects remain code controlled.
- Excavation persona selection is now configured through Routing Settings Persona rules.
- PT-to-5X return context in `routing/signoff-routing.ts`: the special `typeChangedFromPtTo5x` marker is still generated in code even though the rule consuming it is configurable. Consider exposing original and performed inspection methods as readable rule facts instead. Preserve the original method across repair/excavation returns.

### Recommended scope and configuration clarity

1. Complete: separate repair thickness confirmation fields in Signoff Type Forms.
2. Complete: conditional persona selection in Routing Settings.
3. Replace the specific PT-to-5X marker with general inspection-context conditions usable by the existing routing rule editor.
4. Partially complete: package 4 provides readable Type-selection source/exception/fallback summaries and exports. Remaining: summarize Repair/Excavation routing destinations across settings and identify the relevant form configuration. The main usability issue is that related settings span Routing Settings, Signoff Types By Routing and Signoff Type Forms.

Expected scope is moderate: configuration models and editors, persistence/version handling as needed, rule evaluation, validation, documentation and focused regression tests. Reuse existing editors and keep advanced details out of the main table where practical. A new general-purpose workflow editor would add unnecessary complexity.

Keep round creation, linking Excavation to its own Repair, Repair # and Refit # counters, history preservation, route-back resets and Deprogress mechanics in code. These provide the consistent behavior that configured decisions invoke.

Before delivery, verify saved settings affect actual execution and the routing preview consistently. Cover repeated repair rounds, Excavation UNSAT returning to its own Repair, inspection exceptions and return Types, NQC/regular persona selection, thickness-rule precedence, Cut/fabrication reset, and Deprogress restoring the prior workflow. Decide explicitly how changed settings affect joints already in progress and preserve historical signoffs. This follow-up does not start the separate deferred testing backlog.

## Signoff field catalog and reusable option lists

Agreed boundary: the field catalog remains code controlled. New fields, their stable identities, data types, mappings and specialized behavior require code. Creating arbitrary fields through admin configuration is not planned.

Signoff Type Forms continues to select existing fields and configure layout, visibility, required conditions and supported behaviors. Selected option lists on existing fields may be admin maintained where appropriate. Weld Colors is complete; admin-defined Repair Codes are agreed scope below. Other option lists need an individual decision.

## Fabrication form definitions — long term

Low priority because fabrication is currently consistent. Potential future configuration includes field layout, required flags, and visibility rules, plus consolidating the separate Fit-required fabrication list. No current implementation requested.

## Makeup policy — lower priority

Potential settings for the fixed 90-day annual allowance and how usage is assigned to a year. Only pursue if business policy needs to change; no current implementation requested.

## Makeup entry point — tentative

Consider moving Makeup from the top navigation to a button specifically on the Foreman grid, similar to Release to Welding, opening the existing management screen. Only foremen should manage Makeup. This placement is still under consideration; do not implement yet.

In production, the persona selection will automatically reflect the user's actual role. The selectable persona droplist is a prototype stand-in while real roles are not implemented.

## Makeup audit log — deferred requirement

Record every Makeup change in a full audit log, including grants added, dates changed, and grants removed. Preserve who made the change, when it happened, the affected person/grant, and before/after values where applicable. The current Changed by column is not sufficient. Record removals without losing their audit history. Do not implement this now.

## Existing configuration and mockup boundaries

Routing, Signoff Type Forms, qualifications, material classification/traceability, inspection procedures, defect codes, penetrants, locations, and weld positions already have configuration. Prefer extending their existing owners over adding overlapping editors.

Groups already has an admin table, but its permissions are mocked rather than enforced. Real identity, permission enforcement and directory integration are outside this mockup’s task scope.

For any future configuration, consider stable field/code IDs, deactivation instead of deleting referenced values, configuration change history, and explicit behavior for existing joints and historical signoffs. History preservation, record identity, and repair numbering remain application mechanics.

## Implemented: Weld Colors

Admin > Weld Colors maintains a single Color field. Backing Ring Type is likely externally owned; leave its list alone pending that integration.

## Implemented: additional signoffs

Signoff Types supports conditional Additional Signoffs rules. Root's question and answer choices follow NDT Root VT or 5X, and the matching rule signs that inspection with Root. See ROUTING.md for behavior.

## Export audit — identified gaps

- Groups export is excluded from the backlog by request; no export work is planned for that page.
- Signoff Type Forms exports Type and field names, but omits expanded conditions and behaviors.

These findings are recorded for reference; no implementation is queued.


## Shared Type Exceptions — implemented

Implemented in added-routings package 4: one shared editor selects routing, original/replacement Type, ordered material and AND/OR Joint Details conditions. Type source remains per routing. The common resolver applies configured enable conditions in construction, insertion, preview and inspection returns. See ADDED-ROUTINGS-PLAN.md for behavior and verification.

## Repair / Excavation routing-bar visibility — follow-up decision

Confirm whether Repair and Excavation NDT should appear in the routing bar. The user recalls an earlier decision to hide them; revisit the desired display and whether visibility should be configurable. No display change is authorized as part of package 4.


## Configurable inserted routings and insertion — documented scope

Complete: administrators can create ordinary inserted definitions, configure Types/forms/personas and choose them as insertion targets. Repair, regular/NQC Excavation and Engineering Hold retain their specialized lifecycle behavior. Packages 1–4 include shared Type Exceptions and execution/preview validation.

See [ADDED-ROUTINGS-PLAN.md](ADDED-ROUTINGS-PLAN.md) for the required admin capabilities, insertion model, lifecycle boundaries, potential separate NQC Excavation NDT for indicators 1/2, implementation packages and verification. Packages 1-4 are implemented; stopped for review.


## Repair Code configuration — agreed scope

Allow administrators to define Repair Code choices, then use those choices in the existing Signoff Type Form conditions and ordered Repair destination rules. Reuse the existing Repair Code field and configuration owners; do not introduce arbitrary fields or a second routing engine. This scope is agreed but implementation has not started.

Use stable IDs, editable labels and active/inactive status so renames and retirement preserve stored values and History. New codes need to appear in the Repair form and existing condition editors, with saved settings driving execution and preview consistently. Define missing-rule behavior and verify save/cancel/reload before delivery.

Retain the existing Grind Only, Weld Repair and Cut identities. Cut has specialized fabrication/reset/Refit behavior; creating a similarly named option must not acquire that behavior implicitly. New lifecycle effects need explicit code and acceptance criteria. Deactivating an option should preserve historical records and labels. New lifecycle mechanics are outside this configuration scope. Implement this deferred work only when requested.

## Mockup scope clarification

Production identity, permissions, backend/synchronization, external reference-data integration and authoritative production-data review are outside this mockup backlog. Notes about those boundaries explain the prototype and do not queue implementation.
