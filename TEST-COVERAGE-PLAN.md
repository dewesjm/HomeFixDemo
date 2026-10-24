# Test coverage implementation backlog

Status: deferred implementation packages; no package is queued automatically.
Audit date: 2026-10-23. Baseline commit: `9d1eb03`.
Implement one work package at a time, commit it, and stop for review. This document does not
queue automatic implementation. Update the checkboxes and inventory as work is completed.

## Audit baseline and limits

The counts, coverage percentages, and file inventory below are a historical snapshot at the baseline commit. Later feature work added focused tests, including Weld Colors and History filter clearing; those additions do not constitute completion of a backlog package or a new coverage audit.

- Angular/Karma/Jasmine: 408 tests passed in ChromeHeadless on 2026-10-23.
- 66 spec files and 208 non-spec TypeScript files under `src/app`.
- Measured coverage: statements 73.77% (3677/4984), branches 70.29% (2229/3171),
  functions 67.78% (1231/1816), lines 76.74% (2829/3686).
- The report includes 125 source files, not all 208. These percentages are **not**
  whole-project coverage; absent files must not be treated as covered or as measured zero.
- Source-file counts include configuration, models and catalogs. They are an inventory,
  not a target to create one test file for every source file.
- No repository end-to-end framework, CI test workflow or coverage minimum was found.
  `npm test` invokes `ng test`; coverage is optional via the CLI.
- Most tests exercise plain rules and service interactions. Component class tests often
  instantiate with `runInInjectionContext`, without rendering the template. Direct rendered
  tests were found for AppComponent, DefinitionFieldComponent and ExcavationTypeRulesComponent.
- Two sign-validation tests can call `pending()` when a seeded job lacks Root RT/UT;
  replace that dependency with explicit fixtures so those cases cannot silently skip.
- The inventory below records direct colocated specs and measured line coverage. A missing
  colocated spec does not prove a module is untested: many routing helpers are exercised
  through service and integration tests. Conversely, executed lines do not prove assertions
  cover behavior, failures, templates or interactions.

The generated HTML report is local and ignored by Git:
`coverage/primeng-search-demo/index.html`. The file-level snapshot below is committed so
this scope remains available after that report is deleted.

## Existing protection to preserve

Routing logic has about 97% measured line coverage, signoff definitions 95%, joint-page
rules 96%, qualifications 94%, and workflow services 87%. Existing specs cover routing
conditions, repairs, Cut, Deprogress, engineering holds and overrides, fabrication validation,
field rules/layout, qualifications, History, persistence and some migrations. Extend these
specs for gaps instead of replacing them or duplicating every helper in isolated tests.

Other existing suites cover filter-engine behavior, spreadsheet parsing, seeded workflows,
lookup data, procedure sections/PDF generation, and external-load rules. External-load helper
coverage is high; its screen, file selection and full import journey still need verification.

## Implementation order and concrete scope

### 1. Reliable fixtures, coverage measurement and CI

- [ ] Replace seed-dependent pending sign-validation cases with deterministic RT fixtures.
- [ ] Define reusable small test jobs/workflows with explicit identity, requirements and material
  classifications. Use fixed clocks for timestamps and debounced persistence. Reset localStorage,
  mutable catalogs, timers, TestBed and window listeners between tests.
- [ ] Add a documented non-watch test command and coverage command to package scripts.
- [ ] Ensure coverage includes executable application files that no spec imports. Document any
  exclusions individually (e.g. bootstrap-only configuration); do not exclude untested screens
  just to raise the score. Preserve separate line and branch figures.
- [ ] Add CI build, no-unused TypeScript check and headless tests with coverage artifacts. Choose
  minimums from the corrected baseline, document them, and prevent regressions. Do not claim
  the current 77% line figure is an appropriate all-source threshold without remeasuring.
- [ ] Add a browser end-to-end harness with isolated storage, deterministic fixtures and a stable
  local test server. Keep it separate from the fast Karma rules suite.

Acceptance: a clean checkout runs documented commands; a test or configured coverage regression
fails CI; reports list unimported executable files; no silent pending cases in critical validation.

### 2. Workflow screen integration and complete browser journeys

Owners: `weld-record/joint-page/`, `signoff-panel/`, `fabrication/`, `engineering-release/`,
`deviation-dialog/`, `references/`, `routing-bar/`, `work-history/`, and relevant services.

- [ ] Normal joint journey: find by identity, enter required fabrication data, select a Type,
  validate, confirm signoff, advance routing, open History, reload and verify persisted results.
- [ ] Type change clears entered form data, loads the selected definition and preserves only
  required bookkeeping/context. Disabled/unavailable Types cannot be selected.
- [ ] Missing or invalid fields show useful errors and block signoff; correcting them permits it.
  Required checkboxes, NC values, PH/IP ranges and RT degree minimums need screen-level checks.
- [ ] NDT failure -> Repair -> Grind Only return; Weld Repair -> Excavation SAT/UNSAT;
  Cut -> Fit with cleared fabrication and increased Refit #. Verify History and round identity.
- [ ] Deprogress restores the right state/counters while retaining allowed corrections.
- [ ] Accepted deviation -> Engineering Hold -> engineering disposition, with blocked later work,
  correct release destination and durable History.
- [ ] Engineering override reason: accept/cancel, manual values, locking after save, reopen with
  another reason, and leave/reload behavior.
- [ ] Root auto-5X respects configured availability. Parameterize Root/Layer/Final, NQC/regular,
  VT/5X, MT/PT/MT/PT choice, UT, RT degree, blank/NA RT and no Layer NDT in the rules suite;
  use representative combinations for browser journeys rather than duplicating the full matrix.
- [ ] Save/cancel corrections, required correction reason, protected routing fields, and History
  snapshots; references add/remove and eligibility for the chosen Type.
- [ ] Leaving with unsigned edits: cancel navigation retains edits, confirm navigation discards
  eligible edits, completed signoffs and engineering override values survive as specified.

Acceptance: tests assert visible controls and stored outcomes, including reload and cancellation;
service-only tests do not stand in for complete user journeys.

### 3. Shared controls, table state and import/export infrastructure

Owners: `shared/` (measured lines about 39%; `table-state.ts` about 33%).

- [ ] TableState: sorting and tie behavior, combined filters, pagination boundaries, page reset
  after filtering/deletion, selection across pages, empty results and persisted settings.
- [ ] Table toolbar, sort header and pager: user events update the correct state; disabled/empty
  states work; labels and keyboard interactions are usable.
- [ ] Multiselect, person search, ordered pick list, menu and date range: select/clear, filtering,
  keyboard navigation, dismissal, boundaries, date formats and ordering.
- [ ] ConfirmService/dialog and can-deactivate guard: accept/cancel resolve correctly; navigation
  proceeds or remains as requested; no repeated subscriptions or unresolved dialog state.
- [ ] BulkImport and import grid: parse failure, invalid rows, valid subset, duplicate records,
  save failure, retry, saved-row protection and counters. Extend existing spreadsheet specs.
- [ ] CSV/template exports: escaping commas/quotes/newlines, blank values, correct headers and
  mapped values; verify downloaded contents, not only that a click handler ran.
- [ ] Toast, tooltip, banner and compact navigation: meaningful state/dismissal and accessibility
  behavior. Avoid brittle tests that assert styling implementation details.

Acceptance: shared behaviors are tested once at their owner plus representative consuming screens.

### 4. Admin configuration and rendered editors

Owners: `weld-record/admin/` and lookup persistence in `data/`.
Existing measured admin lines range roughly 30-60%; many CRUD pages are absent from the report.

- [ ] Rendered Type enable editor: add/remove AND clauses and OR rules, change fields/operators,
  multiple values and blank values; summary matches saved conditions; cancel restores deep edits.
- [ ] Types By Routing: add/remove/reorder options, default selection, deleting a Type, all-disabled
  state, numbered Repair rows and Excavation source/material exception configuration.
- [ ] Signoff Types: names, duplicate/blank rejection, Signs routing, rename preserving identity,
  deletion propagation, save/cancel and reload persistence.
- [ ] Signoff Type Forms: add/edit/delete/reset, field search/selection, layout order/width,
  nested condition editor, required error messages and saved definition driving the joint form.
  Conditions/Behaviors headers appear only inside expanded details; collapse removes them.
- [ ] Routing Settings: inclusion/reject/then rule editors, add/remove/reorder, first match,
  invalid/relative targets, regular/NQC rows, inserted routings, save/cancel and preview agreement.
- [ ] Qualification condition/user editors: nested groups, required/held qualifications,
  add/delete/save/cancel, failed-check behavior and persistence.
- [ ] Lookup CRUD pages: inspection procedures, defect codes, penetrants, joint designs, locations,
  ship locations/import, weld positions, material classification/traceability, attribute codes,
  quick links, banner and feature toggles. Cover validation, duplicate handling where supported,
  save/cancel/delete, reload, and the relevant consumer reading the changed lookup.
- [ ] Groups is a deliberately non-persisted, non-enforced demo concept; test displayed editing
  behavior without inventing persistence or permission enforcement.
- [ ] Routing Override: identity lookup, valid target, forward/backward movement, reason/History
  and state reset. Include blank XREFID with hull+drawing+joint identity.

Acceptance: CRUD and rule-editing tests exercise DOM events, storage and a consuming workflow,
not just component construction or static explanatory text.

### 5. Weld Planning and external-load screens

Owners: `weld-planning/`, `data/weld-planning.ts`, `data/external-load-files.ts`.
Existing specs: filter schema and external-load helpers; main form/mass-edit screens lack direct specs.

- [ ] List/search/detail: combined filters, sorting, selection, pagination, opening the correct
  joint, blank XREFID, and state retained when returning from detail.
- [ ] Form/create/edit: required fields, identity uniqueness, conditional/dependent values,
  validation failures, save/cancel, and reload persistence.
- [ ] Mass edit: paste-to-find uses joint identity, unmatched/duplicate entries, selected subset,
  common versus mixed values, validation, cancellation and no unintended updates.
- [ ] Import Joints and spreadsheet exports/templates: malformed input, duplicates, invalid rows,
  valid subset, correct stored fields, repeat import and downloaded content.
- [ ] Planning admin settings: saved changes, reset/cancel and effects on planning forms.
- [ ] External loads: file selection, processing/mapping preview, invalid rows, lookup conflicts,
  merge decisions, canceled application, successful application and reload. Reuse the existing
  helper tests for rules; add integration tests around the UI and storage boundary.

Acceptance: a planning mass edit or import demonstrably changes only intended joints and survives reload.

### 6. Weld Engineering

Owners: `weld-engineering/`, `data/procedures.ts`.
Procedure data, sections and PDF helpers have specs; lookup/detail/admin screens need tests.

- [ ] Procedure lookup/detail: search, correct WPS/revision, empty results, section visibility,
  navigation and printable/PDF actions.
- [ ] Manage Procedures and form: GWP/WTN identity, material assignments, limits and NC values,
  optional sections, validation, add/edit/delete/cancel and persistence.
- [ ] Load Procedures: mapping, duplicates, invalid/partial input, retry and stored outcomes.
- [ ] Procedure Sections admin: order, field definitions, save/cancel and effect on procedure display.
- [ ] Exports/PDF actions: correct selected procedure data, file naming, generated document contents,
  and handled generation failures. Keep real helper assertions already present.
- [ ] Changed engineering data reaches weld assignments, dropdown filtering and requirement cascades.

### 7. Remaining app, storage and display integration

- [ ] WorkflowStore: extend existing reload/debounce/migration tests with malformed saved JSON,
  supported missing fields, stale-version clearing across configured cache keys, and storage failure
  handling consistent with the implemented contract.
- [ ] SyncService/status: offline/pending/synced transitions, queued updates, reconnect and flush
  timing; clean up timers/listeners. This is a local simulation, not an external backend.
- [ ] Pipe Welding, My Assignments and adaptive search: role filters, current routing, identity,
  blank XREFID, date/range filters, navigation and retained state.
- [ ] Makeup and makeup grants: date caps, eligibility and allowed edits. The real screen is
  deliberately behind the NO MIKE flag; test the retained implementation with that flag off,
  and preserve its intended ability to be re-enabled.
- [ ] App routes/navigation, selected theme persistence, Change Log, service-worker update prompt
  and reload behavior. Verify banner/quick-link configuration reaches displayed pages.
- [ ] Validate production hosting/update-manifest behavior with a deployment smoke check; do not
  confuse Karma tests with verification of Vercel rewrites or service-worker caching.

## Completion rules

For each package: record implemented scenarios, exact test files, commands/results and any intentional
exclusions here. Run affected tests and required build/type checks; finish with the full suite for
cross-cutting changes. Add representative keyboard/accessible-name checks to interactive components.
Do not write snapshot-only, generated boilerplate or implementation-mirroring tests to chase a score.
Do not rewrite business rules to fit tests; extract rules from large components where necessary under
AGENTS.md. Document genuine behavior decisions rather than assuming missing behavior is required.

Overall completion requires: critical browser journeys pass, high-impact unmeasured code has meaningful
assertions, all-source coverage is reported and enforced, and intentional remaining exclusions are
named with reasons. 100% file matching or a larger raw test count is not the completion criterion.

## File-level audit snapshot

Paths below are relative to `src/app/`. Direct spec means a sibling with the same basename and
`.spec.ts`; other specs may also cover the file. Percentages are measured lines from the audit run.
`Not measured` means absent from that run, **not** proof of no indirect test coverage.

### App root

| Source file | Direct spec | Measured lines |
|---|---|---|
| [app.component.ts](src/app/app.component.ts) | Yes | 35.84% |
| [app.config.ts](src/app/app.config.ts) | No | Not measured |
| [app.routes.ts](src/app/app.routes.ts) | No | Not measured |

### changelog

| Source file | Direct spec | Measured lines |
|---|---|---|
| [changelog.component.ts](src/app/changelog/changelog.component.ts) | No | Not measured |

### data

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-groups.ts](src/app/data/admin-groups.ts) | Yes | 100% |
| [assignments.ts](src/app/data/assignments.ts) | No | Not measured |
| [banner.ts](src/app/data/banner.ts) | No | Not measured |
| [changelog.ts](src/app/data/changelog.ts) | No | Not measured |
| [characteristics.ts](src/app/data/characteristics.ts) | No | 33.33% |
| [defect-codes.ts](src/app/data/defect-codes.ts) | Yes | 90.9% |
| [external-load-files.ts](src/app/data/external-load-files.ts) | No | 100% |
| [feature-toggles.ts](src/app/data/feature-toggles.ts) | No | 54.54% |
| [inspection-procedures.ts](src/app/data/inspection-procedures.ts) | Yes | 90% |
| [jobs.ts](src/app/data/jobs.ts) | No | 97.84% |
| [joint-designs.ts](src/app/data/joint-designs.ts) | No | 80% |
| [material-classification.ts](src/app/data/material-classification.ts) | No | 69.23% |
| [mcl-traceability.ts](src/app/data/mcl-traceability.ts) | No | 72.72% |
| [ndt-labels.ts](src/app/data/ndt-labels.ts) | No | 100% |
| [penetrants.ts](src/app/data/penetrants.ts) | No | 77.77% |
| [people.ts](src/app/data/people.ts) | No | 52.94% |
| [procedures.ts](src/app/data/procedures.ts) | Yes | 98.36% |
| [quick-links.ts](src/app/data/quick-links.ts) | No | 71.42% |
| [seed-fabrication.ts](src/app/data/seed-fabrication.ts) | No | 100% |
| [seeded-workflow.ts](src/app/data/seeded-workflow.ts) | Yes | 100% |
| [ship-locations.ts](src/app/data/ship-locations.ts) | Yes | 93.93% |
| [shops.ts](src/app/data/shops.ts) | Yes | 90% |
| [storage-keys.ts](src/app/data/storage-keys.ts) | No | 100% |
| [weld-assignment.ts](src/app/data/weld-assignment.ts) | No | 100% |
| [weld-planning.ts](src/app/data/weld-planning.ts) | No | 71.26% |
| [weld-positions.ts](src/app/data/weld-positions.ts) | No | 66.66% |
| [welding-steps.ts](src/app/data/welding-steps.ts) | No | 100% |

### shared

| Source file | Direct spec | Measured lines |
|---|---|---|
| [banner-pill.component.ts](src/app/shared/banner-pill.component.ts) | No | Not measured |
| [bulk-import.ts](src/app/shared/bulk-import.ts) | No | Not measured |
| [can-deactivate.guard.ts](src/app/shared/can-deactivate.guard.ts) | No | Not measured |
| [compact-nav.directive.ts](src/app/shared/compact-nav.directive.ts) | No | 28.57% |
| [confirm-dialog.component.ts](src/app/shared/confirm-dialog.component.ts) | No | 37.5% |
| [confirm.service.ts](src/app/shared/confirm.service.ts) | No | 23.07% |
| [date-format.ts](src/app/shared/date-format.ts) | No | 55.55% |
| [date-range.component.ts](src/app/shared/date-range.component.ts) | No | Not measured |
| [export-csv.ts](src/app/shared/export-csv.ts) | No | 0% |
| [filter-engine.ts](src/app/shared/filter-engine.ts) | Yes | 83.82% |
| [import-grid.component.ts](src/app/shared/import-grid.component.ts) | No | Not measured |
| [menu-button.component.ts](src/app/shared/menu-button.component.ts) | No | Not measured |
| [multiselect-dropdown.component.ts](src/app/shared/multiselect-dropdown.component.ts) | No | 6.66% |
| [ordered-pick-list.component.ts](src/app/shared/ordered-pick-list.component.ts) | No | Not measured |
| [person-search-input.component.ts](src/app/shared/person-search-input.component.ts) | No | 2.5% |
| [sort-header.component.ts](src/app/shared/sort-header.component.ts) | No | 5.55% |
| [spreadsheet-import.ts](src/app/shared/spreadsheet-import.ts) | Yes | 44.44% |
| [table-pager.component.ts](src/app/shared/table-pager.component.ts) | No | Not measured |
| [table-state.ts](src/app/shared/table-state.ts) | No | 33.33% |
| [table-toolbar.component.ts](src/app/shared/table-toolbar.component.ts) | No | 14.28% |
| [toast-host.component.ts](src/app/shared/toast-host.component.ts) | No | 75% |
| [toast.service.ts](src/app/shared/toast.service.ts) | No | 100% |
| [tooltip.directive.ts](src/app/shared/tooltip.directive.ts) | No | 50% |

### theme-picker

| Source file | Direct spec | Measured lines |
|---|---|---|
| [theme-picker.component.ts](src/app/theme-picker/theme-picker.component.ts) | No | 75% |

### weld-engineering/admin/load-procedures

| Source file | Direct spec | Measured lines |
|---|---|---|
| [load-procedures.component.ts](src/app/weld-engineering/admin/load-procedures/load-procedures.component.ts) | No | Not measured |

### weld-engineering/admin/manage-procedures

| Source file | Direct spec | Measured lines |
|---|---|---|
| [manage-procedures.component.ts](src/app/weld-engineering/admin/manage-procedures/manage-procedures.component.ts) | No | Not measured |
| [procedure-form.component.ts](src/app/weld-engineering/admin/manage-procedures/procedure-form.component.ts) | No | Not measured |

### weld-engineering/admin/procedure-sections

| Source file | Direct spec | Measured lines |
|---|---|---|
| [procedure-sections.component.ts](src/app/weld-engineering/admin/procedure-sections/procedure-sections.component.ts) | No | Not measured |

### weld-engineering/procedure-detail

| Source file | Direct spec | Measured lines |
|---|---|---|
| [procedure-detail.component.ts](src/app/weld-engineering/procedure-detail/procedure-detail.component.ts) | No | Not measured |

### weld-engineering

| Source file | Direct spec | Measured lines |
|---|---|---|
| [procedure-files.ts](src/app/weld-engineering/procedure-files.ts) | No | Not measured |

### weld-engineering/procedure-lookup

| Source file | Direct spec | Measured lines |
|---|---|---|
| [procedure-lookup.component.ts](src/app/weld-engineering/procedure-lookup/procedure-lookup.component.ts) | No | Not measured |

### weld-engineering/procedure-pdf

| Source file | Direct spec | Measured lines |
|---|---|---|
| [procedure-pdf-actions.ts](src/app/weld-engineering/procedure-pdf/procedure-pdf-actions.ts) | No | Not measured |
| [procedure-pdf.ts](src/app/weld-engineering/procedure-pdf/procedure-pdf.ts) | Yes | 74.19% |

### weld-engineering

| Source file | Direct spec | Measured lines |
|---|---|---|
| [procedure-sections.ts](src/app/weld-engineering/procedure-sections.ts) | Yes | 81.96% |

### weld-planning/external-loads

| Source file | Direct spec | Measured lines |
|---|---|---|
| [convert.ts](src/app/weld-planning/external-loads/convert.ts) | No | 100% |
| [external-loads-columns.ts](src/app/weld-planning/external-loads/external-loads-columns.ts) | No | Not measured |
| [external-loads.component.ts](src/app/weld-planning/external-loads/external-loads.component.ts) | No | Not measured |
| [file-checks.ts](src/app/weld-planning/external-loads/file-checks.ts) | No | 100% |
| [layout.ts](src/app/weld-planning/external-loads/layout.ts) | No | 100% |
| [loads.ts](src/app/weld-planning/external-loads/loads.ts) | No | 100% |
| [lookup.ts](src/app/weld-planning/external-loads/lookup.ts) | No | 100% |
| [merge.ts](src/app/weld-planning/external-loads/merge.ts) | No | 100% |
| [process-map.component.ts](src/app/weld-planning/external-loads/process-map.component.ts) | No | Not measured |
| [raw-lines.component.ts](src/app/weld-planning/external-loads/raw-lines.component.ts) | No | Not measured |
| [record-lookup.component.ts](src/app/weld-planning/external-loads/record-lookup.component.ts) | No | Not measured |
| [rules.ts](src/app/weld-planning/external-loads/rules.ts) | No | 100% |
| [stage-table.component.ts](src/app/weld-planning/external-loads/stage-table.component.ts) | No | Not measured |
| [table-rows.ts](src/app/weld-planning/external-loads/table-rows.ts) | No | Not measured |

### weld-planning

| Source file | Direct spec | Measured lines |
|---|---|---|
| [weld-joint-files.ts](src/app/weld-planning/weld-joint-files.ts) | No | Not measured |
| [weld-planning-admin.component.ts](src/app/weld-planning/weld-planning-admin.component.ts) | No | Not measured |
| [weld-planning-detail.component.ts](src/app/weld-planning/weld-planning-detail.component.ts) | No | Not measured |
| [weld-planning-filter-schema.ts](src/app/weld-planning/weld-planning-filter-schema.ts) | Yes | 57.69% |
| [weld-planning-form.component.ts](src/app/weld-planning/weld-planning-form.component.ts) | No | Not measured |
| [weld-planning-list.component.ts](src/app/weld-planning/weld-planning-list.component.ts) | No | Not measured |
| [weld-planning-mass-edit.component.ts](src/app/weld-planning/weld-planning-mass-edit.component.ts) | No | Not measured |
| [weld-planning-search.component.ts](src/app/weld-planning/weld-planning-search.component.ts) | No | Not measured |

### weld-record/adaptive-search

| Source file | Direct spec | Measured lines |
|---|---|---|
| [adaptive-search.component.ts](src/app/weld-record/adaptive-search/adaptive-search.component.ts) | No | Not measured |
| [filter-schema.ts](src/app/weld-record/adaptive-search/filter-schema.ts) | No | Not measured |

### weld-record/admin/admin-banner

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-banner.component.ts](src/app/weld-record/admin/admin-banner/admin-banner.component.ts) | No | Not measured |

### weld-record/admin/admin-characteristics

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-characteristics.component.ts](src/app/weld-record/admin/admin-characteristics/admin-characteristics.component.ts) | No | Not measured |

### weld-record/admin/admin-defect-codes

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-defect-codes.component.ts](src/app/weld-record/admin/admin-defect-codes/admin-defect-codes.component.ts) | No | Not measured |

### weld-record/admin/admin-feature-toggles

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-feature-toggles.component.ts](src/app/weld-record/admin/admin-feature-toggles/admin-feature-toggles.component.ts) | No | Not measured |

### weld-record/admin/admin-groups

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-groups.component.ts](src/app/weld-record/admin/admin-groups/admin-groups.component.ts) | No | Not measured |

### weld-record/admin/admin-inspection-procedures

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-inspection-procedures.component.ts](src/app/weld-record/admin/admin-inspection-procedures/admin-inspection-procedures.component.ts) | No | Not measured |

### weld-record/admin/admin-joint-designs

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-joint-designs.component.ts](src/app/weld-record/admin/admin-joint-designs/admin-joint-designs.component.ts) | No | Not measured |

### weld-record/admin/admin-locations

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-locations.component.ts](src/app/weld-record/admin/admin-locations/admin-locations.component.ts) | No | Not measured |

### weld-record/admin/admin-material-classification

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-material-classification.component.ts](src/app/weld-record/admin/admin-material-classification/admin-material-classification.component.ts) | No | Not measured |

### weld-record/admin/admin-material-traceability

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-material-traceability.component.ts](src/app/weld-record/admin/admin-material-traceability/admin-material-traceability.component.ts) | No | Not measured |

### weld-record/admin/admin-penetrant

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-penetrant.component.ts](src/app/weld-record/admin/admin-penetrant/admin-penetrant.component.ts) | No | Not measured |

### weld-record/admin/admin-qualifications

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-qualifications.component.ts](src/app/weld-record/admin/admin-qualifications/admin-qualifications.component.ts) | No | Not measured |
| [qual-group-editor.component.ts](src/app/weld-record/admin/admin-qualifications/qual-group-editor.component.ts) | No | Not measured |
| [when-group-editor.component.ts](src/app/weld-record/admin/admin-qualifications/when-group-editor.component.ts) | No | Not measured |

### weld-record/admin/admin-quick-links

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-quick-links.component.ts](src/app/weld-record/admin/admin-quick-links/admin-quick-links.component.ts) | No | Not measured |

### weld-record/admin/admin-routing

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-routing.component.ts](src/app/weld-record/admin/admin-routing/admin-routing.component.ts) | Yes | 36.93% |
| [condition-editing.ts](src/app/weld-record/admin/admin-routing/condition-editing.ts) | Yes | 100% |

### weld-record/admin/admin-routing-signoff-types

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-routing-signoff-types.component.ts](src/app/weld-record/admin/admin-routing-signoff-types/admin-routing-signoff-types.component.ts) | Yes | 60.37% |

### weld-record/admin/admin-set-routing

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-set-routing.component.ts](src/app/weld-record/admin/admin-set-routing/admin-set-routing.component.ts) | No | Not measured |

### weld-record/admin/admin-ship-locations

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-ship-locations.component.ts](src/app/weld-record/admin/admin-ship-locations/admin-ship-locations.component.ts) | No | Not measured |
| [import-ship-locations.component.ts](src/app/weld-record/admin/admin-ship-locations/import-ship-locations.component.ts) | No | Not measured |

### weld-record/admin/admin-signoff-type-definition

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-signoff-type-definition.component.ts](src/app/weld-record/admin/admin-signoff-type-definition/admin-signoff-type-definition.component.ts) | Yes | 22.64% |
| [condition-group-editor.component.ts](src/app/weld-record/admin/admin-signoff-type-definition/condition-group-editor.component.ts) | No | 4% |
| [condition-work.ts](src/app/weld-record/admin/admin-signoff-type-definition/condition-work.ts) | Yes | 95.45% |
| [definition-edits.ts](src/app/weld-record/admin/admin-signoff-type-definition/definition-edits.ts) | Yes | 84.61% |
| [definition-layout-list.component.ts](src/app/weld-record/admin/admin-signoff-type-definition/definition-layout-list.component.ts) | No | 5.88% |
| [field-condition-editor.component.ts](src/app/weld-record/admin/admin-signoff-type-definition/field-condition-editor.component.ts) | No | 10% |

### weld-record/admin/admin-signoff-types

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-signoff-types.component.ts](src/app/weld-record/admin/admin-signoff-types/admin-signoff-types.component.ts) | Yes | 52.23% |
| [excavation-type-rules.component.ts](src/app/weld-record/admin/admin-signoff-types/excavation-type-rules.component.ts) | Yes | 93.33% |
| [type-enable-conditions.component.ts](src/app/weld-record/admin/admin-signoff-types/type-enable-conditions.component.ts) | No | 7.69% |

### weld-record/admin/admin-weld-positions

| Source file | Direct spec | Measured lines |
|---|---|---|
| [admin-weld-positions.component.ts](src/app/weld-record/admin/admin-weld-positions/admin-weld-positions.component.ts) | No | Not measured |

### weld-record/deviation-dialog

| Source file | Direct spec | Measured lines |
|---|---|---|
| [deviation-accept-dialog.component.ts](src/app/weld-record/deviation-dialog/deviation-accept-dialog.component.ts) | No | Not measured |

### weld-record/engineering-release

| Source file | Direct spec | Measured lines |
|---|---|---|
| [engineering-release.component.ts](src/app/weld-record/engineering-release/engineering-release.component.ts) | No | Not measured |

### weld-record/fabrication

| Source file | Direct spec | Measured lines |
|---|---|---|
| [fabrication-fields.ts](src/app/weld-record/fabrication/fabrication-fields.ts) | No | 100% |
| [fabrication-form.ts](src/app/weld-record/fabrication/fabrication-form.ts) | Yes | 100% |
| [fabrication.component.ts](src/app/weld-record/fabrication/fabrication.component.ts) | No | Not measured |

### weld-record/joint-details

| Source file | Direct spec | Measured lines |
|---|---|---|
| [joint-details-values.ts](src/app/weld-record/joint-details/joint-details-values.ts) | Yes | 100% |
| [joint-details.component.ts](src/app/weld-record/joint-details/joint-details.component.ts) | No | Not measured |

### weld-record/joint-page

| Source file | Direct spec | Measured lines |
|---|---|---|
| [joint-overrides.service.ts](src/app/weld-record/joint-page/joint-overrides.service.ts) | No | Not measured |
| [joint-page.component.ts](src/app/weld-record/joint-page/joint-page.component.ts) | No | Not measured |

### weld-record/joint-page/rules

| Source file | Direct spec | Measured lines |
|---|---|---|
| [deviations.ts](src/app/weld-record/joint-page/rules/deviations.ts) | Yes | 93.33% |
| [fit-signoff.ts](src/app/weld-record/joint-page/rules/fit-signoff.ts) | Yes | 100% |
| [sign-validation.ts](src/app/weld-record/joint-page/rules/sign-validation.ts) | Yes | 98.63% |
| [stage-form.ts](src/app/weld-record/joint-page/rules/stage-form.ts) | Yes | 93.18% |
| [type-change.ts](src/app/weld-record/joint-page/rules/type-change.ts) | Yes | 100% |
| [unsaved-edits.ts](src/app/weld-record/joint-page/rules/unsaved-edits.ts) | Yes | 100% |
| [verify-values.ts](src/app/weld-record/joint-page/rules/verify-values.ts) | Yes | 100% |
| [weld-cascade.ts](src/app/weld-record/joint-page/rules/weld-cascade.ts) | Yes | 96.55% |

### weld-record/joint-page

| Source file | Direct spec | Measured lines |
|---|---|---|
| [signoff-form-edits.service.ts](src/app/weld-record/joint-page/signoff-form-edits.service.ts) | No | Not measured |
| [signoff-form-errors.service.ts](src/app/weld-record/joint-page/signoff-form-errors.service.ts) | No | Not measured |

### weld-record/makeup

| Source file | Direct spec | Measured lines |
|---|---|---|
| [makeup-grants.ts](src/app/weld-record/makeup/makeup-grants.ts) | No | Not measured |
| [makeup.component.ts](src/app/weld-record/makeup/makeup.component.ts) | No | Not measured |

### weld-record/model

| Source file | Direct spec | Measured lines |
|---|---|---|
| [workflow-types.ts](src/app/weld-record/model/workflow-types.ts) | No | 100% |

### weld-record/my-assignments

| Source file | Direct spec | Measured lines |
|---|---|---|
| [my-assignments.component.ts](src/app/weld-record/my-assignments/my-assignments.component.ts) | No | Not measured |

### weld-record/pipe-search

| Source file | Direct spec | Measured lines |
|---|---|---|
| [pipe-search.component.ts](src/app/weld-record/pipe-search/pipe-search.component.ts) | No | Not measured |

### weld-record/qualifications

| Source file | Direct spec | Measured lines |
|---|---|---|
| [qual-conditions.ts](src/app/weld-record/qualifications/qual-conditions.ts) | Yes | 97.01% |
| [qual-requirements.ts](src/app/weld-record/qualifications/qual-requirements.ts) | Yes | 100% |
| [qual-when.ts](src/app/weld-record/qualifications/qual-when.ts) | No | 61.53% |
| [qualifications.ts](src/app/weld-record/qualifications/qualifications.ts) | Yes | 100% |

### weld-record/references

| Source file | Direct spec | Measured lines |
|---|---|---|
| [references.component.ts](src/app/weld-record/references/references.component.ts) | No | Not measured |

### weld-record/routing

| Source file | Direct spec | Measured lines |
|---|---|---|
| [added-stage-templates.ts](src/app/weld-record/routing/added-stage-templates.ts) | No | 100% |
| [added-steps.ts](src/app/weld-record/routing/added-steps.ts) | No | 100% |
| [build-stages.ts](src/app/weld-record/routing/build-stages.ts) | No | 100% |
| [built-in-step-rules.ts](src/app/weld-record/routing/built-in-step-rules.ts) | Yes | 100% |
| [current-routing.ts](src/app/weld-record/routing/current-routing.ts) | No | 88.88% |
| [ndt.ts](src/app/weld-record/routing/ndt.ts) | No | 100% |
| [route-changes.ts](src/app/weld-record/routing/route-changes.ts) | No | 100% |
| [route-preview.ts](src/app/weld-record/routing/route-preview.ts) | Yes | 100% |
| [routing-bar.ts](src/app/weld-record/routing/routing-bar.ts) | No | 100% |
| [rule-targets.ts](src/app/weld-record/routing/rule-targets.ts) | Yes | 100% |
| [signoff-routing.ts](src/app/weld-record/routing/signoff-routing.ts) | Yes | 100% |
| [stage-templates.ts](src/app/weld-record/routing/stage-templates.ts) | No | 84.37% |
| [step-conditions.ts](src/app/weld-record/routing/step-conditions.ts) | Yes | 97.56% |
| [step-ids.ts](src/app/weld-record/routing/step-ids.ts) | No | 100% |
| [type-routing.ts](src/app/weld-record/routing/type-routing.ts) | No | 100% |

### weld-record/routing-bar

| Source file | Direct spec | Measured lines |
|---|---|---|
| [routing-bar.component.ts](src/app/weld-record/routing-bar/routing-bar.component.ts) | No | Not measured |

### weld-record/services

| Source file | Direct spec | Measured lines |
|---|---|---|
| [deviation.service.ts](src/app/weld-record/services/deviation.service.ts) | Yes | 100% |
| [engineering-override.service.ts](src/app/weld-record/services/engineering-override.service.ts) | Yes | 100% |
| [fabrication-data.service.ts](src/app/weld-record/services/fabrication-data.service.ts) | Yes | 100% |
| [foreman-override.service.ts](src/app/weld-record/services/foreman-override.service.ts) | Yes | 100% |
| [reference.service.ts](src/app/weld-record/services/reference.service.ts) | Yes | 100% |
| [routing.service.ts](src/app/weld-record/services/routing.service.ts) | Yes | 100% |
| [signoff.service.ts](src/app/weld-record/services/signoff.service.ts) | Yes | 65.51% |
| [sync.service.ts](src/app/weld-record/services/sync.service.ts) | No | 76.19% |
| [weld-assignment.service.ts](src/app/weld-record/services/weld-assignment.service.ts) | Yes | 94.44% |
| [workflow-store.service.ts](src/app/weld-record/services/workflow-store.service.ts) | Yes | 87.95% |

### weld-record/signoff-definition

| Source file | Direct spec | Measured lines |
|---|---|---|
| [condition-context.ts](src/app/weld-record/signoff-definition/condition-context.ts) | Yes | 62.5% |
| [definition-layout.ts](src/app/weld-record/signoff-definition/definition-layout.ts) | Yes | 100% |
| [field-catalog.ts](src/app/weld-record/signoff-definition/field-catalog.ts) | No | 96.15% |
| [field-conditions.ts](src/app/weld-record/signoff-definition/field-conditions.ts) | No | 76.19% |
| [field-fill.ts](src/app/weld-record/signoff-definition/field-fill.ts) | No | 100% |
| [field-locks.ts](src/app/weld-record/signoff-definition/field-locks.ts) | No | 100% |
| [field-rule-lines.ts](src/app/weld-record/signoff-definition/field-rule-lines.ts) | Yes | 100% |
| [field-rules.ts](src/app/weld-record/signoff-definition/field-rules.ts) | Yes | 96.05% |
| [form-fields.ts](src/app/weld-record/signoff-definition/form-fields.ts) | Yes | 100% |
| [joint-facts.ts](src/app/weld-record/signoff-definition/joint-facts.ts) | No | 100% |
| [routing-signoff-types.ts](src/app/weld-record/signoff-definition/routing-signoff-types.ts) | No | 80% |
| [shown-fields.ts](src/app/weld-record/signoff-definition/shown-fields.ts) | Yes | 100% |
| [signoff-parts.ts](src/app/weld-record/signoff-definition/signoff-parts.ts) | Yes | 100% |
| [signoff-types.ts](src/app/weld-record/signoff-definition/signoff-types.ts) | Yes | 93.33% |
| [stage-display.ts](src/app/weld-record/signoff-definition/stage-display.ts) | No | 100% |
| [stage-rules.ts](src/app/weld-record/signoff-definition/stage-rules.ts) | Yes | 100% |
| [step-field-config.ts](src/app/weld-record/signoff-definition/step-field-config.ts) | Yes | 97.22% |
| [weld-fields.ts](src/app/weld-record/signoff-definition/weld-fields.ts) | No | 100% |

### weld-record/signoff-panel

| Source file | Direct spec | Measured lines |
|---|---|---|
| [affected-item.component.ts](src/app/weld-record/signoff-panel/affected-item.component.ts) | No | Not measured |
| [definition-field.component.ts](src/app/weld-record/signoff-panel/definition-field.component.ts) | Yes | 45.16% |
| [definition-form.component.ts](src/app/weld-record/signoff-panel/definition-form.component.ts) | No | Not measured |
| [signoff-context.ts](src/app/weld-record/signoff-panel/signoff-context.ts) | No | Not measured |
| [signoff-history.component.ts](src/app/weld-record/signoff-panel/signoff-history.component.ts) | No | Not measured |
| [signoff-panel.component.ts](src/app/weld-record/signoff-panel/signoff-panel.component.ts) | No | Not measured |
| [signoff-type.component.ts](src/app/weld-record/signoff-panel/signoff-type.component.ts) | No | Not measured |
| [stage-decision.component.ts](src/app/weld-record/signoff-panel/stage-decision.component.ts) | No | Not measured |
| [verify-grid.component.ts](src/app/weld-record/signoff-panel/verify-grid.component.ts) | No | Not measured |

### weld-record/sync-status

| Source file | Direct spec | Measured lines |
|---|---|---|
| [sync-status.component.ts](src/app/weld-record/sync-status/sync-status.component.ts) | No | 54.54% |

### weld-record/work-history

| Source file | Direct spec | Measured lines |
|---|---|---|
| [correct-stage-dialog.component.ts](src/app/weld-record/work-history/correct-stage-dialog.component.ts) | No | Not measured |
| [history-rows.ts](src/app/weld-record/work-history/history-rows.ts) | Yes | 97.14% |
| [history-table-state.ts](src/app/weld-record/work-history/history-table-state.ts) | No | Not measured |
| [history-table.component.ts](src/app/weld-record/work-history/history-table.component.ts) | No | Not measured |
| [work-history.component.ts](src/app/weld-record/work-history/work-history.component.ts) | No | Not measured |

## Reproduction commands

Run from the repository root (Chrome must be available):

```powershell
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage
npx ng build
npx tsc --noEmit --noUnusedLocals -p tsconfig.app.json
```

These reproduce the current imported-file coverage baseline. Work package 1 must expand the denominator
before claiming project-wide percentages. Source inventory counts exclude spec files; generated output
and node_modules are outside scope. Revisit only files changed since the snapshot when implementing;
this backlog is intended to avoid repeating the initial whole-repository audit.
