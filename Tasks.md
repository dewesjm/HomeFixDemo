# Project backlog

Master index of outstanding requirements, gaps and ideas, audited against repository plans, architecture notes and explicit source comments on 2026-10-24. No automatically queued build work. [AGENTS.md](AGENTS.md) defines the review boundary. Update this index whenever work is added or completed. Detailed specifications remain in the linked plans. This audit covers repository evidence, not requirements in other chats.

## Deferred requirements and identified gaps

- [ ] **Configurable added routings and insertion:** create runtime definitions and select them as configured insertion targets. Includes Type/form/persona setup, repeated instances, specialized lifecycle boundaries, and a potential separate NQC Excavation NDT for indicators 1/2 (regular for 3). [Implementation scope and acceptance criteria](ADDED-ROUTINGS-PLAN.md). Packages 1-2 are complete: definition CRUD/setup plus generic insertion execution/preview, instance context, continuation, cycle validation and persistence. Stopped for review; specialized/NQC Excavation and shared Type Exceptions packages remain deferred.
- [ ] **Attribute-code exceptions:** waiting for the applicable code list and each exception's behavior. Decide configuration versus fixed rules once requirements are known. Existing code/description lookup is implemented. [Source](ROUTING-RULES-PLAN.md#deferred-input).
- [ ] **Remaining Repair / Excavation configuration:** review general original/performed inspection facts replacing the PT-to-5X marker and a readable summary of the effective path and related settings. Separate repair-limit fields and configurable persona rules are complete. Preserve round identity, History, resets and Deprogress; decide effects on existing joints. [Scope and verification](ADMIN-CONFIGURATION-IDEAS.md#repair-and-excavation-ndt-configuration-follow-up).
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


- **Generic Type Exceptions:** replace the Excavation-specific exception section with a shared per-routing exception list. Keep Type source per routing; apply replacement rules consistently to enabled options, previews and repair returns. Scope discussed; implementation not requested.

- **Ordinary signoff field catalog and reusable option lists:** admin-managed labels, controls, units, help text, new ordinary fields and locally owned options. Under discussion; specialized behavior stays in its code owner. Weld Colors is complete. [Details](ADMIN-CONFIGURATION-IDEAS.md#signoff-field-catalog-and-reusable-option-lists).
- **Fabrication form configuration:** layout, required flags, visibility and consolidation of Fit-required fabrication fields. Long term / low priority. [Details](ADMIN-CONFIGURATION-IDEAS.md#fabrication-form-definitions--long-term).
- **Makeup allowance policy:** configurable annual limit and year allocation only if policy needs to change. Current policy is 90 days, assigned by grant start year. [Details](ADMIN-CONFIGURATION-IDEAS.md#makeup-policy--lower-priority).
- **Makeup entry point:** tentative move from top navigation to the Foreman grid; only foremen should manage it. No implementation approved. [Details](ADMIN-CONFIGURATION-IDEAS.md#makeup-entry-point--tentative).
- **Additional Repair Code options:** only if administrators need new actions; adding an option alone does not define routing. Existing Grind Only / Weld Repair / Cut remain fixed otherwise. [Details](ADMIN-CONFIGURATION-IDEAS.md#remaining-fixed-business-decisions).
- **Override preview / reason-screen wording:** an earlier request mentioned wording, but the remaining exact changes are unspecified. Revisit only on a specific request; see the previous-request note below.

## Production integration gaps, not agreed feature packages

Explicit prototype boundaries and source caveats, captured for visibility. Each needs its own scope before implementation.

- **Identity and permission enforcement:** Groups permissions and persona selection are mocked; actual identity/roles and authorization remain separate work. People are intended to come from an external directory. [Details](ADMIN-CONFIGURATION-IDEAS.md#existing-configuration-and-implementation-boundaries).
- **Backend and real synchronization:** browser-local data; SyncService simulates successful flush and contains an API TODO. Backend design/integration is unspecified. Sources: README.md and `src/app/weld-record/services/sync.service.ts`.
- **Externally owned reference data:** Backing Ring Type integration/ownership is pending; People and shared engineering references need coordination with owning systems. Attribute-code maintenance belongs to another system; its lookup is retained locally. Sources: ADMIN-CONFIGURATION-IDEAS.md and ARCHITECTURE.md.
- **Engineering/source-data review:** material-classification seeds are explicitly unreviewed; engineering notes use placeholder references until real notes are wired up. Invented seed codes/procedures/defects need authoritative production data. Sources: `src/app/data/material-classification.ts`, `src/app/data/jobs.ts`, `src/app/data/procedures.ts` and ARCHITECTURE.md.

## Completed work and deliberate switches

Repair limits are separate indicator 1 and indicator 2/3 checkbox fields in Signoff Type Forms, with distinct History labels and configurable routing rules. Conditional persona rules are editable in Routing Settings; Excavation starts with NQC Inspector for indicators 1/2 and Inspector otherwise. The Signoff Types heading is Additional Signoffs.

Groups export was dropped from scope; its missing export action is not an outstanding task.

Routing configuration and field-definition consolidation are completed references. Weld Colors and conditional additional signoffs are implemented. O63/O04 selection already exists in Routing Settings; the recent discussion requested no change. Foreman Override is deliberately disabled, and Makeup's NO MIKE switch hides the retained real screen. These are not outstanding build tasks unless explicitly requested.

## Previous override request

Engineering Override is implemented for joints without an external welding assignment; Foreman Override remains disabled. See [ROUTING.md](ROUTING.md) for current behavior. The original task also mentioned preview and reason-screen wording; revisit any remaining wording only when specifically requested.
