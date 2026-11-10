# Project backlog

Master index of outstanding requirements, gaps and ideas, audited against repository plans, architecture notes and explicit source comments on 2026-10-24. No automatically queued build work. [AGENTS.md](AGENTS.md) defines the review boundary. Update this index whenever work is added or completed. Detailed specifications remain in the linked plans. This audit covers repository evidence, not requirements in other chats.

## Deferred requirements and identified gaps


- [ ] **Attribute-code engineering clarification:** demo behavior for all 13 progression codes is configured as seeded rows in Admin > Attribute Code Exceptions (add/drop routing, Types offered, Type needs ID accessible, minimum RT), with Joint Details messages and fresh examples. Clarify the numbered assumptions and questions before treating meanings as authoritative; user comments remain alongside assumptions. No signed-joint migration needed for demo. [Single reference and clarification register](ATTRIBUTE-CODES-PLAN.md).
- [ ] **Remaining Repair / Excavation configuration:** summarize Repair/Excavation destinations across settings. General original/performed inspection facts have replaced the PT-to-5X marker. Shared Type-selection summaries and readable exception exports are complete. Separate repair-limit fields and configurable persona rules are complete. Preserve round identity, History, resets and Deprogress; decide effects on existing joints. [Scope and verification](ADMIN-CONFIGURATION-IDEAS.md#repair-and-excavation-ndt-configuration-follow-up).
- [ ] **Makeup audit log:** additions, date changes and removals with actor, timestamp, grant/person and before/after values. Preserve removal history; Changed by alone is insufficient. Deferred requirement. [Details](ADMIN-CONFIGURATION-IDEAS.md#makeup-audit-log--deferred-requirement).
- [ ] **Signoff Type Forms export:** identified gap: current export omits expanded conditions and behaviors. [Export audit](ADMIN-CONFIGURATION-IDEAS.md#export-audit--identified-gaps).
- [x] **One field catalog:** merged the form and condition catalogs into one list with a Source on each entry. [Plan](FIELD-CATALOG-PLAN.md).

## Cleanup

Queued in AGENTS.md, in this order.

- [x] **Remove old migrations:** every listed conversion removed; saved data reset with a version bump and new form and Qualifications storage keys.
- [x] **Leftovers evaluation:** dead code and the remaining saved-data conversions removed; `addTestJob` removed, specs copy a seeded joint.
- [x] **File purpose:** every app source file (`.ts`, not specs) now opens with a comment saying what it is for; descriptions that sat below the imports were moved to the top.
- [x] **Routing folder size:** `weld-record/routing/` split into `signoff/`, `inserted/` and `preview/` subfolders; the joint's own routing stays at the top level. An import loop through generic-insertion was removed.
- [x] **Routing file placement follow-ups:** additional-signoffs moved to `signoff-definition/`; the routing bar rule is `routing-bar/routing-bar-steps.ts`; `routing/signoff/` is now `routing/on-signoff/`; `routing-role` is `routing-persona`; specs renamed to `build-stages.spec.ts` and `ndt-type-blank.spec.ts`.
- [x] **Admin table data in `data/`:** six admin pages kept their rows next to the code that uses them. Each is split: rows (starting values, load, save) to `data/`, rules stay in the feature folder. Routing Settings DONE (`data/welding-steps.ts` starting rows and rules, `data/routing-settings.ts` saved rows, `routing/routing-settings-rules.ts` rules). Signoff Types DONE (moved whole to `data/signoff-types.ts`; it held no rules). Signoff Type to Routing DONE (`data/signoff-type-routing.ts` rows, `signoff-definition/signoff-type-routing-rules.ts` rules). Signoff Type Forms DONE (`data/signoff-type-forms.ts` model, starting definitions, load/save; `signoff-definition/signoff-type-form-rules.ts` rules). Qualifications DONE (`data/qualifications.ts` model, starting rows, load/save; live rows and rules stay in `qualifications/qual-conditions.ts`). Attribute Code Exceptions DONE (moved to `data/attribute-code-exceptions.ts`; the per-routing rules shape and `codesChangingRouting` moved to `attribute-codes/exception-effects.ts`).
- [ ] **Common sign-off validation:** PROPOSED in [SIGNOFF-VALIDATION-PLAN.md](SIGNOFF-VALIDATION-PLAN.md) (inventory, proposal, 5 questions); waiting on answers. Every routing should decide and show what blocks Signoff the same way. Today a problem is either a red message on a field shown after clicking Signoff, or a reasons-list line that is no longer drawn anywhere, so Signoff silently does nothing. Example: on Fit, an invalid Fabrication value blocks Signoff through a hidden `__fabrication` field error nothing draws, while Fit-Up Insp lists "Fix the fabrication errors" and disables the button. Also: ordinary required fields block only on click, not in the reasons list. Propose one approach (where checks live: `joint-page/rules/sign-validation.ts`; what shows where) before building.
- [ ] **Remove `trade` (later, separate task, not queued in AGENTS.md):** Welding is the only trade, but `Job.trade` and the templates and Routing Settings rows keyed by trade remain (about 134 uses in 25 files). Removing it needs a storage reset.
- [ ] **Review the .md files for leftovers:** go through the repo's Markdown docs for stale, completed or duplicated content. Report findings before removing anything. Not queued in AGENTS.md.
- [ ] **Organization sweep:** look across the app for files whose location doesn't make sense: data mixed into rule files (or rules in `data/`), admin table rows kept next to the code that uses them beyond the six pages already queued, files in a folder that doesn't match their concern, and folder names that don't say what's inside. Report findings and proposed moves before changing anything. Not queued in AGENTS.md.
  Notes for this sweep (2026-11-09):
    - `weld-record/services/`: needs a similar organization pass.
    - `routing/inserted/`: probably rename to `inserted-routing/`.
    - `routing/on-signoff/`: take a look at what's in it.
    - `routing/preview/`: rename to `routing-preview/`.
    - `built-in-routing-rules`, `current-routing`, `inspection-context`: unclear what they are; explain or rename.
    - `ndt-type-blank.spec.ts`: a standalone spec; probably belongs inside another test file.
    - Signoff panel and related objects: consider a standalone folder for doing actual signoffs.
    - Theme picker: should it be under `shared/`?
    - `weld-record/fabrication/`: rename to `fabrication-panel/` or something else? Propose names first.
    - `weld-record/model/workflow-types.ts`: what is this model, and is the name right?
    - Conditions, step 2 (user chose to do later): move `signoff-definition/field-conditions.ts` into `conditions/` as `form-conditions.ts`, and rename one of the two `ConditionClause` types (joint-conditions and field-conditions both export one) so they no longer share a name. Step 1 (split of routing-conditions into `conditions/` and `routing/route-to-rules.ts`) is done.
    - Folder grouping: either group the joint page's UI together (fabrication, joint-details, signoff-panel), or group by concern (everything about signoffs together: panel, signoff-definition, services). Pick one direction before moving anything.
    - Persona wording (user decision: rename both): `routingRole()` in `routing/routing-persona.ts` becomes `routingPersona()`, and the routing fields `role` / `roleRules` become persona names. The field rename changes saved Routing Settings, so bump its storage key (resets saved Routing Settings).
    - Admin page names: every admin folder, component and URL should match its menu name. Example: `admin/admin-set-routing/` (URL `/admin/set-routing`) is the Routing Override page, so `admin-routing-override/`. Also `admin-signoff-type-definition/` (URL `/admin/signoff-fields`) is Signoff Type Forms. Check all admin pages for this.
    - Idea: a `future/` folder for code and docs that aren't in use yet (switched-off features, deferred plans), so readers know they can skip it. Identify candidates and propose before moving anything.
- [ ] **More .md files in .gitignore (later, not queued in AGENTS.md):** add more of the repo's Markdown docs to `.gitignore`; ask which ones first. Note: `AGENTS.md` and `Tasks.md` are already listed there but are still tracked by git, so the ignore has no effect on them until they are removed from the index (`git rm --cached`, which keeps the file on disk).
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

- **Routing retirement and deletion:** deferred. Define reference checks, new-work eligibility, open-joint migration and preservation of signed routings/History before extending lifecycle controls. Permanent deletion should be considered only for unused, unreferenced definitions. See ADMIN-CONFIGURATION-IDEAS.md.


- **Repair / Excavation routing-bar visibility:** revisit whether Repair and Excavation NDT should appear in the routing bar. The user recalls an earlier decision to hide them; confirm the intended behavior and whether visibility should be configurable. Current behavior is unchanged pending that decision.

- **Reusable option lists:** consider configuration for choices on existing fields. New fields, data types and mappings remain code controlled; arbitrary field creation through configuration is not planned. Weld Colors is complete; Repair Codes are implemented. [Details](ADMIN-CONFIGURATION-IDEAS.md#signoff-field-catalog-and-reusable-option-lists).
- **Fabrication form configuration:** layout, required flags, visibility and consolidation of Fit-required fabrication fields. Long term / low priority. [Details](ADMIN-CONFIGURATION-IDEAS.md#fabrication-form-definitions--long-term).
- **Makeup allowance policy:** configurable annual limit and year allocation only if policy needs to change. Current policy is 90 days, assigned by grant start year. [Details](ADMIN-CONFIGURATION-IDEAS.md#makeup-policy--lower-priority).
- **Makeup entry point:** tentative move from top navigation to the Foreman grid; only foremen should manage it. No implementation approved. [Details](ADMIN-CONFIGURATION-IDEAS.md#makeup-entry-point--tentative).
- **Override preview / reason-screen wording:** an earlier request mentioned wording, but the remaining exact changes are unspecified. Revisit only on a specific request; see the previous-request note below.

## Mockup scope

This project is a mockup. Real identity/permission enforcement, a backend, real synchronization, external reference-data integration and production data certification are outside the task backlog. Existing prototype boundaries are reference notes, not deferred implementation requirements.

## Completed work and deliberate switches

- [x] **Joint Details Engineering Notes:** stays on one line with horizontal scrolling, scoped to the notes value.

- [x] **Fabrication Usage field:** removed the prerequisite placeholder text.

- [x] **Additional Signoffs condition editing:** Add clause and Add group retain unfinished rows while editing; saved conditions include completed clauses only.

- [x] **Seeded Excavation NDT descriptions:** supplied reference text explains repair readiness and NQC requirements for both regular and NQC Excavation NDT.

- [x] **Seeded Repair description:** supplied reference text explains insertion after UNSAT NDT and configurable Repair codes in the Routing Settings description viewer.

- [x] **Seeded Pre-Fit description:** supplied reference text explains NQC validation and nuclear-joint applicability in the Routing Settings description viewer.

- [x] **Routing Settings drag handle:** reordering starts only from the grip button; row text and controls do not start a routing drag.

- [x] **Lookup editor consistency:** Repair Codes uses inline add/edit with pencil, save and cancel controls like Weld Colors. Repair Codes, Defect Codes and Weld Positions use an Active checkbox when editing; saved status and retirement behavior are preserved.

- [x] **Plain-English routing descriptions:** click a routing name in Routing Settings to read/edit its saved description in a compact dialog; descriptions are included in Excel export.

- [x] **Defect Code and Weld Position retirement:** editable Active/Inactive status, preserved stored identities and recorded values, active-only new choices, readable inactive rule choices and Status in exports. Weld Colors unchanged.

- [x] **Routing condition summaries:** If â€¦ Then go to distinguishes conditions from destinations, removes redundant inspection wording from thickness summaries and separates rules visually.

- [x] **Routing Settings button consistency:** right-aligned, theme-colored Add inserted routing matches Add numbered routing; Edit persona has spacing below the persona name and does not wrap.

- [x] **General inspection routing facts:** Original rejecting inspection Type and Performed inspection Type replace the special PT-to-5X flag. Regular/NQC defaults retain their return path; saved legacy conditions translate to the general facts.

- [x] **Admin table outline grid:** shared theme-aware cell borders and top alignment across all admin routes, including nested editors/imports. Recorded as the standard in AGENTS.md.

- [x] **Admin-defined Repair Codes:** Admin > Repair Codes maintains names and active/inactive status with stable values. Choices feed Repair forms, Type Form conditions and existing Repair destination rules; custom codes without a matching rule block signoff/preview. Existing Grind Only/Weld Repair/Cut identities and specialized behavior remain.

- [x] **Configurable inserted routings and insertion:** create runtime definitions and select them as configured insertion targets. Includes Type/form/persona setup, repeated instances, specialized lifecycle boundaries, and a potential separate NQC Excavation NDT for indicators 1/2 (regular for 3). [Implementation scope and acceptance criteria](ADDED-ROUTINGS-PLAN.md). Packages 1-4 are complete: definition CRUD/setup, generic insertion execution/preview, instance context, continuation, cycle validation, persistence, and separate configurable regular/NQC Excavation variants with round returns. Shared Type Exceptions adds ordered conditional replacements across routings, shared resolution, summaries and exports. Stopped for review.
- [x] **Shared Type Exceptions:** per-routing sources, ordered material/Joint Details conditions, shared execution/preview resolution, save/cancel/reload, readable Type-selection summaries and exports.
- [x] **Repair thickness confirmations:** separate indicator 1 and indicators 2/3 fields, distinct History labels, configurable visibility and destination rules, and compatibility for old saved conditions/forms.
- [x] **Conditional routing personas:** one editor for ordered persona rules and fallback; Excavation defaults select the appropriate persona.
- [x] **Routing Settings editing and terminology:** Inserted routings, compact name cells, editable insertion sources and applicability, and source-rule navigation.
- [x] **Conditional Additional Signoffs:** configured additional routing/Type signoffs with shared Deprogress behavior and updated heading.
- [x] **Weld Colors:** admin-maintained reusable inspection options.
- [x] **Routing configuration and field-definition consolidation:** completed reference plans; not queued work.
- [x] **Engineering Override:** implemented for joints without an external welding assignment; any unspecified wording changes remain a separate decision below.

Groups export was dropped from scope. O63/O04 selection already exists; no change was requested. Foreman Override remains deliberately disabled, and Makeup's NO MIKE switch hides the retained real screen. These are deliberate choices, not unfinished build tasks.

## Previous override request

Engineering Override is implemented for joints without an external welding assignment; Foreman Override remains disabled. See [ROUTING.md](ROUTING.md) for current behavior. The original task also mentioned preview and reason-screen wording; revisit any remaining wording only when specifically requested.

- [x] Type Exceptions grid consistency: show every routing’s exceptions together, identify routing per row, use header Add and inline pencil/check/X controls, and reorder within routing with left arrows or grip-only dragging. Type source remains configurable in the upper routing grid.

- [x] Separate Non-Ferrous and Austenitic material flags, use AND/OR conditions in Type Exceptions, and seed both Excavations with Non-Ferrous OR Austenitic.
