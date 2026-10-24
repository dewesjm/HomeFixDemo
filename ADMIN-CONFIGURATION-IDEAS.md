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
- Repair Code options in `signoff-definition/field-catalog.ts`: Grind Only, Weld Repair and Cut. Keep these fixed unless administrators need additional actions; adding an option alone does not define its routing behavior.
- Excavation persona selection is now configured through Routing Settings Persona rules.
- PT-to-5X return context in `routing/signoff-routing.ts`: the special `typeChangedFromPtTo5x` marker is still generated in code even though the rule consuming it is configurable. Consider exposing original and performed inspection methods as readable rule facts instead. Preserve the original method across repair/excavation returns.

### Recommended scope and configuration clarity

1. Complete: separate repair thickness confirmation fields in Signoff Type Forms.
2. Complete: conditional persona selection in Routing Settings.
3. Replace the specific PT-to-5X marker with general inspection-context conditions usable by the existing routing rule editor.
4. Add a plain-language summary beside Repair and Excavation configuration, showing the effective path and identifying where Type exceptions and forms are maintained. The main usability issue is that related settings span Routing Settings, Signoff Types By Routing and Signoff Type Forms.

Expected scope is moderate: configuration models and editors, persistence/version handling as needed, rule evaluation, validation, documentation and focused regression tests. Reuse existing editors and keep advanced details out of the main table where practical. A new general-purpose workflow editor would add unnecessary complexity.

Keep round creation, linking Excavation to its own Repair, Repair # and Refit # counters, history preservation, route-back resets and Deprogress mechanics in code. These provide the consistent behavior that configured decisions invoke.

Before delivery, verify saved settings affect actual execution and the routing preview consistently. Cover repeated repair rounds, Excavation UNSAT returning to its own Repair, inspection exceptions and return Types, NQC/regular persona selection, thickness-rule precedence, Cut/fabrication reset, and Deprogress restoring the prior workflow. Decide explicitly how changed settings affect joints already in progress and preserve historical signoffs. This follow-up does not start the separate deferred testing backlog.

## Signoff field catalog and reusable option lists

Under discussion. Signoff Type Forms already configure which existing fields appear, their layout, and their conditions. The field catalog itself remains code-defined in `src/app/weld-record/signoff-definition/field-catalog.ts`.

Possible extensions:

- Maintain ordinary field definitions (label, control type, unit, help text) through admin configuration.
- Create new ordinary fields and then select them in Signoff Type Forms.
- Maintain other reusable option lists where Weld Record owns those values. Weld Colors is implemented below; Backing Ring Type is likely externally owned.

Specialized fields such as GWP/WTN, Qualification Check, References, and Affected Item have dedicated behavior. Editing a field definition does not create new workflow behavior or integrations. Keep their behavior in code unless a separate requirement justifies configuration.

Shared engineering reference lists used by Weld Record may warrant future coordination with their owning system; no Weld Engineering work is proposed here.

## Fabrication form definitions — long term

Low priority because fabrication is currently consistent. Potential future configuration includes field layout, required flags, and visibility rules, plus consolidating the separate Fit-required fabrication list. No current implementation requested.

## Makeup policy — lower priority

Potential settings for the fixed 90-day annual allowance and how usage is assigned to a year. Only pursue if business policy needs to change; no current implementation requested.

## Makeup entry point — tentative

Consider moving Makeup from the top navigation to a button specifically on the Foreman grid, similar to Release to Welding, opening the existing management screen. Only foremen should manage Makeup. This placement is still under consideration; do not implement yet.

In production, the persona selection will automatically reflect the user's actual role. The selectable persona droplist is a prototype stand-in while real roles are not implemented.

## Makeup audit log — deferred requirement

Record every Makeup change in a full audit log, including grants added, dates changed, and grants removed. Preserve who made the change, when it happened, the affected person/grant, and before/after values where applicable. The current Changed by column is not sufficient. Record removals without losing their audit history. Do not implement this now.

## Existing configuration and implementation boundaries

Routing, Signoff Type Forms, qualifications, material classification/traceability, inspection procedures, defect codes, penetrants, locations, and weld positions already have configuration. Prefer extending their existing owners over adding overlapping editors.

Groups already has an admin table, but its permissions are mocked rather than enforced. Identity and permission enforcement is separate work. People are intended to come from an external directory.

For any future configuration, consider stable field/code IDs, deactivation instead of deleting referenced values, configuration change history, and explicit behavior for existing joints and historical signoffs. History preservation, record identity, and repair numbering remain application mechanics.

## Implemented: Weld Colors

Admin > Weld Colors maintains a single Color field. Backing Ring Type is likely externally owned; leave its list alone pending that integration.

## Implemented: additional signoffs

Signoff Types supports conditional Additional Signoffs rules. Root's question and answer choices follow NDT Root VT or 5X, and the matching rule signs that inspection with Root. See ROUTING.md for behavior.

## Export audit — identified gaps

- Groups export is excluded from the backlog by request; no export work is planned for that page.
- Signoff Type Forms exports Type and field names, but omits expanded conditions and behaviors.

These findings are recorded for reference; no implementation is queued.


## Generic inspection Type exceptions — under discussion

Replace the Excavation-specific exception list with a shared list selecting routing, original Type, replacement Type and conditions. Keep Type source (configured options or rejecting inspection) per routing. A shared resolver must honor enabled Types and work consistently for ordinary NDT, Excavation, routing preview and repair returns. This is follow-up scope, not an implementation queue.


## Configurable inserted routings and insertion — documented scope

Inserted routings currently edits the fixed runtime types Repair, Excavation NDT and Engineering Hold. Add routing creates a regular numbered routing, not another runtime type. Supporting arbitrary inserted routings needs creation UI, insertion targets, Type/form setup and lifecycle/identity rules; editing existing runtime routing rules does not provide this capability.

See [ADDED-ROUTINGS-PLAN.md](ADDED-ROUTINGS-PLAN.md) for the required admin capabilities, insertion model, lifecycle boundaries, potential separate NQC Excavation NDT for indicators 1/2, implementation packages and verification. Implementation has not started.
