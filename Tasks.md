# Project backlog

Master index of outstanding requirements, gaps and ideas, audited against repository plans, architecture notes and explicit source comments on 2026-10-24. No automatically queued build work. [AGENTS.md](AGENTS.md) defines the review boundary. Update this index whenever work is added or completed. Detailed specifications remain in the linked plans. This audit covers repository evidence, not requirements in other chats.

## Deferred requirements and identified gaps


- [ ] **Attribute-code engineering clarification:** demo behavior for all 13 progression codes is implemented with a shared inspection-obligation resolver, explicit substitutes, separate required inspections, conflict blocking, Joint Details messages and fresh examples. Clarify the numbered assumptions and questions before treating meanings as authoritative; user comments remain alongside assumptions. No signed-joint migration needed for demo. [Single reference and clarification register](ATTRIBUTE-CODES-PLAN.md).
- [ ] **Remaining Repair / Excavation configuration:** summarize Repair/Excavation destinations across settings. General original/performed inspection facts have replaced the PT-to-5X marker. Shared Type-selection summaries and readable exception exports are complete. Separate repair-limit fields and configurable persona rules are complete. Preserve round identity, History, resets and Deprogress; decide effects on existing joints. [Scope and verification](ADMIN-CONFIGURATION-IDEAS.md#repair-and-excavation-ndt-configuration-follow-up).
- [ ] **Makeup audit log:** additions, date changes and removals with actor, timestamp, grant/person and before/after values. Preserve removal history; Changed by alone is insufficient. Deferred requirement. [Details](ADMIN-CONFIGURATION-IDEAS.md#makeup-audit-log--deferred-requirement).
- [ ] **Signoff Type Forms export:** identified gap: current export omits expanded conditions and behaviors. [Export audit](ADMIN-CONFIGURATION-IDEAS.md#export-audit--identified-gaps).

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
