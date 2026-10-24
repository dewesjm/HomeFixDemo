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
- Repair Code options currently come from `signoff-definition/field-catalog.ts`: Grind Only, Weld Repair and Cut. Admin-defined choices are implemented below; their behavior uses existing form conditions and routing rules. Specialized lifecycle effects remain code controlled.
- Excavation persona selection is now configured through Routing Settings Persona rules.
- Complete: general Original rejecting inspection Type and Performed inspection Type facts replace the generated PT-to-5X flag. Original context comes from the linked Repair round or captured ordinary insertion context; performed Type comes from the selected signoff Type. Regular/NQC Excavation defaults use both facts.

### Recommended scope and configuration clarity

1. Complete: separate repair thickness confirmation fields in Signoff Type Forms.
2. Complete: conditional persona selection in Routing Settings.
3. Complete: general inspection-context conditions are available in the existing routing rule editor; legacy boolean conditions translate to ordinary AND/OR facts.
4. Partially complete: package 4 provides readable Type-selection source/exception/fallback summaries and exports. Remaining: summarize Repair/Excavation routing destinations across settings and identify the relevant form configuration. The main usability issue is that related settings span Routing Settings, Signoff Types By Routing and Signoff Type Forms.

Expected scope is moderate: configuration models and editors, persistence/version handling as needed, rule evaluation, validation, documentation and focused regression tests. Reuse existing editors and keep advanced details out of the main table where practical. A new general-purpose workflow editor would add unnecessary complexity.

Keep round creation, linking Excavation to its own Repair, Repair # and Refit # counters, history preservation, route-back resets and Deprogress mechanics in code. These provide the consistent behavior that configured decisions invoke.

Before delivery, verify saved settings affect actual execution and the routing preview consistently. Cover repeated repair rounds, Excavation UNSAT returning to its own Repair, inspection exceptions and return Types, NQC/regular persona selection, thickness-rule precedence, Cut/fabrication reset, and Deprogress restoring the prior workflow. Decide explicitly how changed settings affect joints already in progress and preserve historical signoffs. This follow-up does not start the separate deferred testing backlog.

## Signoff field catalog and reusable option lists

Agreed boundary: the field catalog remains code controlled. New fields, their stable identities, data types, mappings and specialized behavior require code. Creating arbitrary fields through admin configuration is not planned.

Signoff Type Forms continues to select existing fields and configure layout, visibility, required conditions and supported behaviors. Selected option lists on existing fields may be admin maintained where appropriate. Weld Colors is complete; admin-defined Repair Codes are implemented below. Other option lists need an individual decision.

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


## Repair Code configuration — implemented

Admin > Repair Codes defines Repair Code choices using the existing field and configuration owners. Each record has a stable value, editable name and active/inactive status. New records get a readable permanent value; renames retain it. Deactivation retires a choice without removing saved rules or History. There is no delete action.

Active codes appear in Repair forms. Condition editors include inactive codes with an inactive label so saved conditions remain readable. The existing Signoff Type Form conditions and Repair's ordered Then go to rules control fields and destinations. The first matching rule wins, including configured thickness-priority rules. A custom code with no matching rule, an inactive/unknown code, or an unresolved custom destination blocks signoff/preview before History or undo changes. Existing built-in fallback behavior is preserved.

Grind Only, Weld Repair and Cut keep their existing IDs. Cut's Refit increment remains tied to its built-in code and restart destination; a new code named similarly does not acquire that behavior. Any route-back to Fit still clears fabrication through the existing routing contract. New lifecycle mechanics remain code controlled. Shared field definitions and mappings remain code controlled.

The admin table uses the shared search/clear, sort, pager and filtered/sorted Excel-compatible export. Save/cancel/reload and storage failure preserve expected state. Version 2.10.59 follows the existing first-load demo cache-reset policy for the new lookup-backed field configuration. Repair Code records have their own storage key and are retained on later configuration resets.

Verified with **503 passing ChromeHeadless tests** using `npx ng test --watch=false --browsers=ChromeHeadless`, plus `npx ng build` and `npx tsc --noEmit --noUnusedLocals -p tsconfig.app.json`. Existing template/budget/CommonJS/SCSS build warnings remain. Focused coverage: `data/repair-codes.spec.ts`, `signoff-definition/repair-code-options.spec.ts`, `admin/admin-repair-codes/admin-repair-codes.component.spec.ts`, `admin/admin-routing/admin-routing.component.spec.ts`, and `routing/repair-code-rules.spec.ts`. Scenarios include rendered add/edit/retire/cancel, duplicate/blank names, reload, storage failure, actual filtered export contents, Repair form selection, routing condition values, preview/execution agreement, missing/invalid destinations, History, Deprogress and preservation of built-in behavior. The separate deferred testing program remains unchanged.

## Mockup scope clarification

Production identity, permissions, backend/synchronization, external reference-data integration and authoritative production-data review are outside this mockup backlog. Notes about those boundaries explain the prototype and do not queue implementation.


## General inspection routing facts — implemented

Repair exposes Original rejecting inspection Type. Regular/NQC Excavation and ordinary inserted definitions expose that fact and Performed inspection Type in Routing Settings conditions. Available values use Signoff Type labels, including Blank for missing context. Original Type reads the captured context of the linked Repair round (or the ordinary instance); performed Type reads the current selected inspection Type, including changes before signoff. Neither is another editable form field.

Default regular/NQC Excavation acceptance rules read original PT AND performed 5X, then return to the rejecting phase’s VT/5X; otherwise they return to the original inspection. The dedicated marker is no longer generated or retained by blanking/Type changes. Existing Repair/Excavation counters, round ownership, UNSAT/route-back, Deprogress, History and seed construction remain with their current owners.

Saved legacy positive/negative flag conditions translate into equivalent general fact clauses while preserving other conditions, order and destinations. Negative conditions split into adjacent alternatives as needed. Workflow version 2.10.60 uses the established first-load demo cache-reset policy for changed routing definitions; no pre-upgrade workflow preservation is promised. New workflows and later reloads retain ordinary original/selected Type data. No routing-bar visibility decision or cross-page destination-summary feature is included.


Verified with **513 passing ChromeHeadless tests** (`npx ng test --watch=false --browsers=ChromeHeadless`), `npx ng build`, and `npx tsc --noEmit --noUnusedLocals -p tsconfig.app.json`. Existing build warnings remain. Focused specs: `routing/inspection-context.spec.ts`, `routing/inspection-context-migration.spec.ts`, `routing/excavation-definition.spec.ts`, `routing/signoff-routing.spec.ts`, `joint-page/rules/type-change.spec.ts` and `admin/admin-routing/admin-routing.component.spec.ts`. Covers round-aware original facts, selected-Type changes, regular/NQC preview/execution and returns, another configured Type combination, legacy positive/negative condition semantics and rendered editor save. Existing reload, UNSAT, route-back, Deprogress, History and specialized Repair regression tests remain included.
