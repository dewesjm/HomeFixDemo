# Project backlog

Master index of outstanding requirements, gaps and ideas, audited against repository plans, architecture notes and explicit source comments on 2026-10-24. No automatically queued build work. [AGENTS.md](../AGENTS.md) defines the review boundary. Update this index whenever work is added or completed. Detailed specifications remain in the linked plans. This audit covers repository evidence, not requirements in other chats.

## Deferred requirements and identified gaps

- [ ] **Attribute-code engineering clarification:** demo behavior for all 13 progression codes is configured as seeded rows in Admin > Attribute Code Exceptions (add/drop routing, Types offered, Type needs ID accessible, minimum RT), with Joint Details messages and fresh examples. Clarify the numbered assumptions and questions before treating meanings as authoritative; user comments remain alongside assumptions. No signed-joint migration needed for demo. [Single reference and clarification register](ATTRIBUTE-CODES-PLAN.md).
- [ ] **Remaining Repair / Excavation configuration:** summarize Repair/Excavation destinations across settings. General original/performed inspection facts have replaced the PT-to-5X marker. Shared Type-selection summaries and readable exception exports are complete. Separate repair-limit fields and configurable persona rules are complete. The usability problem: related settings are spread across Routing Settings, Signoff Type to Routing and Signoff Type Forms, so one readable summary of where Repair/Excavation goes (and which form settings apply) is what's left. Keep round creation, linking Excavation to its own Repair, Repair # and Refit # counters, History, route-back resets and Deprogress in code; a general-purpose workflow editor is not wanted. Before delivery, check saved settings drive both execution and the routing preview, covering repeated repair rounds, Excavation UNSAT back to its own Repair, inspection exceptions and return Types, NQC/regular persona, thickness-rule precedence, Cut/fabrication reset and Deprogress. Decide how changed settings affect joints already in progress.
- [ ] **Makeup audit log:** additions, date changes and removals with actor, timestamp, grant/person and before/after values. Preserve removal history; Changed by alone is insufficient. Removals must not lose their audit history. Deferred requirement; do not build yet.
- [ ] **Signoff Type Forms export:** identified gap: the export has Type and field names but omits expanded conditions and behaviors.

## Cleanup

Nothing here is queued in AGENTS.md; start an item only on request.

- [ ] **Remove `trade` (later, separate task, not queued in AGENTS.md):** Welding is the only trade, but `Job.trade` and the templates and Routing Settings rows keyed by trade remain (about 134 uses in 25 files). Removing it needs a storage reset.
- [ ] **Organization sweep:** look across the app for files whose location doesn't make sense: data mixed into rule files (or rules in `data/`), admin table rows kept next to the code that uses them beyond the six pages already queued, files in a folder that doesn't match their concern, and folder names that don't say what's inside. Report findings and proposed moves before changing anything. Not queued in AGENTS.md.
  Notes for this sweep (2026-11-09):
    - `weld-record/services/`: needs a similar organization pass.
    - `routing/inserted/`: probably rename to `inserted-routing/`.
    - `routing/on-signoff/`: take a look at what's in it.
    - `routing/preview/`: rename to `routing-preview/`.
    - `built-in-routing-rules`, `current-routing`: unclear what they are; explain or rename. (`inspection-context` DONE: explained, moved to `conditions/inspection-types.ts`.)
    - `routing/ndt.ts`, `routing/route-to-rules.ts`, `routing/routing-ids.ts`: review what each holds and whether the name and location fit (user, 2026-11-09).
    - `ndt-type-blank.spec.ts`: DONE, split into `build-stages.spec.ts` and `inserted/excavation-definition.spec.ts`.
    - Signoff panel and related objects: consider a standalone folder for doing actual signoffs.
    - Theme picker: DONE, moved into `avatar-menu/` (only the avatar menu uses it; may move to `shared/` later with the avatar menu).
    - Avatar menu (future task, user 2026-11-09): move `avatar-menu/` (with the theme picker inside it) into `shared/`, since the top bar is shared by every section of the app.
    - `weld-record/fabrication/`: rename to `fabrication-panel/` or something else? Propose names first.
    - `weld-record/routing-bar/`: user note, possibly `routing-panel/`, to match `signoff-panel/` (and `fabrication-panel/` if that rename happens).
    - `weld-record/model/workflow-types.ts`: what is this model, and is the name right?
    - Conditions, step 2 (user chose to do later): move `signoff-definition/field-conditions.ts` into `conditions/` as `form-conditions.ts`, and rename one of the two `ConditionClause` types (joint-conditions and field-conditions both export one) so they no longer share a name. Step 1 (split of routing-conditions into `conditions/` and `routing/route-to-rules.ts`) is done.
    - Folder grouping: either group the joint page's UI together (fabrication, joint-details, signoff-panel), or group by concern (everything about signoffs together: panel, signoff-definition, services). Pick one direction before moving anything.
    - Persona wording (user decision: rename both): `routingRole()` in `routing/routing-persona.ts` becomes `routingPersona()`, and the routing fields `role` / `roleRules` become persona names. The field rename changes saved Routing Settings, so bump its storage key (resets saved Routing Settings).
    - Admin page names: every admin folder, component and URL should match its menu name. Example: `admin/admin-set-routing/` (URL `/admin/set-routing`) is the Routing Override page, so `admin-routing-override/`. Also `admin-signoff-type-definition/` (URL `/admin/signoff-fields`) is Signoff Type Forms. Check all admin pages for this.
    - Idea: a `future/` folder for code and docs that aren't in use yet (switched-off features, deferred plans), so readers know they can skip it. Identify candidates and propose before moving anything.
- [ ] **More .md files in .gitignore (later, not queued in AGENTS.md):** add more of the repo's Markdown docs to `.gitignore`; ask which ones first. Note: `AGENTS.md` and `Tasks.md` are already listed there but are still tracked by git, so the ignore has no effect on them until they are removed from the index (`git rm --cached`, which keeps the file on disk).
- [ ] **Remove No Mike (low priority, not queued in AGENTS.md):** the `noMike` joke flag in `weld-record/makeup/makeup.component.ts` is off and isn't one of the Admin > Feature Toggles, so it can only be flipped in code. Delete the field and the `@if (noMike) { ... } @else {` wrapper in `makeup.component.html` (plus its closing `}`), then remove the "Demo toggles" rows and the two `noMike` mentions in ARCHITECTURE.md.
- [ ] **Rename `work-history/`:** the folder holds the History page (and `history-table`, which Records Review also uses), but its name doesn't say so. Look at renaming it; propose names before changing anything. Not queued in AGENTS.md.

## Deferred testing packages

Implement one package at a time only when requested, commit and stop for review. [TEST-COVERAGE-PLAN.md](TEST-COVERAGE-PLAN.md) retains the detailed scenarios, acceptance criteria, checkboxes and historical inventory. Historical percentages are not current whole-project coverage.

- [ ] **1. Fixtures, coverage and CI:** deterministic fixtures, remove seed-dependent pending tests, documented commands, all-source measurement, CI checks/artifacts/thresholds and browser end-to-end harness.
- [ ] **2. Workflow screen integration and browser journeys:** normal signoff, Type changes, validation, repairs/excavation/Cut, Deprogress, holds, overrides, corrections, references and unsigned-edit navigation.
- [ ] **3. Shared controls, table state and import/export:** filters/sort/paging/selection, keyboard behavior, dialogs/guards, import failures/retries, actual downloaded contents and shared display controls.
- [ ] **4. Admin configuration and rendered editors:** conditions, Types, Type Forms, routing, qualifications, lookup CRUD, persistence and saved settings driving execution.
- [ ] **5. Weld Planning and external loads:** search/detail/edit/mass edit, imports/exports, settings, mapping/merge/cancel and reload.
- [ ] **6. Weld Engineering:** procedure lookup/detail/admin/import/sections/PDF/export and effects on assignments and requirement cascades.
- [ ] **7. App, storage and display integration:** persistence/migrations/failures, simulated sync, search/assignments, Makeup with its switch off, navigation/themes/banners/links, update prompts and deployment smoke checks.

## Ideas requiring a decision before implementation

- **Routing retirement and deletion:** deferred. Define reference checks, new-work eligibility, open-joint migration and preservation of signed routings/History before extending lifecycle controls. Permanent deletion should be considered only for unused, unreferenced definitions. Today's lifecycle controls for custom inserted routings don't set a general deletion/migration policy.

- **Repair / Excavation routing-bar visibility:** revisit whether Repair and Excavation NDT should appear in the routing bar. The user recalls an earlier decision to hide them; confirm the intended behavior and whether visibility should be configurable. Current behavior is unchanged pending that decision.

- **Reusable option lists:** consider configuration for choices on existing fields. New fields, data types and mappings remain code controlled; arbitrary field creation through configuration is not planned. Weld Colors and Repair Codes are done; other option lists need an individual decision. Backing Ring Type is probably owned by an external system: leave its list alone until that integration is known.
- **Fabrication form configuration:** layout, required flags, visibility and consolidation of Fit-required fabrication fields. Long term / low priority, since fabrication is consistent today.
- **Makeup allowance policy:** configurable annual limit and year allocation only if policy needs to change. Current policy is 90 days, assigned by grant start year.
- **Makeup entry point:** tentative move from top navigation to the Foreman grid; only foremen should manage it. It would be a button on the Foreman grid (like Release to Welding) opening the existing Makeup screen. No implementation approved.
- **Override preview / reason-screen wording:** an earlier request mentioned wording, but the remaining exact changes are unspecified. Revisit only on a specific request; see the previous-request note below.

## Mockup scope

This project is a mockup. Real identity/permission enforcement, a backend, real synchronization, external reference-data integration and production data certification are outside the task backlog. Existing prototype boundaries are reference notes, not deferred implementation requirements. Groups has an admin table but its permissions are mocked, and the persona droplist stands in for the user's real role.

## Guidelines for future configuration work

- Extend the page that already owns a setting (Routing Settings, Signoff Type Forms, Qualifications, the lookup pages) instead of adding an overlapping editor.
- Give configured values stable IDs; deactivate referenced values instead of deleting them.
- Decide explicitly how a change affects joints already in progress and signed History.
- History, record identity and repair numbering stay application mechanics in code.

## Deliberate switches

Groups export was dropped from scope. O63/O04 selection already exists; no change was requested. Foreman Override remains deliberately disabled, and Makeup's NO MIKE switch hides the retained real screen. These are deliberate choices, not unfinished build tasks.

## Previous override request

Engineering Override is implemented for joints without an external welding assignment; Foreman Override remains disabled. See [ROUTING.md](ROUTING.md) for current behavior. The original task also mentioned preview and reason-screen wording; revisit any remaining wording only when specifically requested.
