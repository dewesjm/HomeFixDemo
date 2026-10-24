# Project rules

Commit completed work locally when the requested changes are finished and verified. Do not push unless explicitly requested.

Read ARCHITECTURE.md first, and ROUTING.md for routing rules.

## Queued work (do in this order, one at a time; stop for review after each)

No queued build work. Completed plans are references, not instructions to start another feature.

Read [Tasks.md](Tasks.md) for the master backlog of deferred requirements, gaps, ideas and production integration boundaries. Keep it current as work changes. No queued work does not mean no outstanding work.

Deferred testing backlog: see TEST-COVERAGE-PLAN.md for the full audit and implementation scope.
Do not start it automatically; when requested, implement one package at a time and stop for review.

Remove an item here once it is built and committed. Keep deferred ideas in ADMIN-CONFIGURATION-IDEAS.md.

## Consistent search and pagination

- Nonempty search/filter inputs must provide a visible, accessible X clear button. Clearing removes the filter value and any corresponding URL or persisted state so an old value does not return unexpectedly. Preserve intentional deep links when first opening a page.
- Paginated tables use the shared `TablePagerComponent`: 10 rows by default, with 10, 25, 50, and 100 rows per page. Keep options in the shared component rather than overriding them per page. Embedded lists deliberately showing all rows are not paginated tables.
- Every admin table/list must offer Export to Excel through the standard table toolbar. Export the current filtered and sorted rows with readable column headings, matching the information shown in the table.

## Keep code organized for a human reader

- One concern per file. A new feature's logic goes in the file or service that owns that concern, not in
  whatever file is already open. If nothing owns it, make a new file.
- Components wire things together; rules (validation, visibility, option lists, routing) are plain
  functions in the feature folder of the concern they belong to (e.g. `weld-record/routing/`,
  `weld-record/signoff-definition/`, `weld-record/joint-page/rules/`) or a `weld-record/services/`
  service, where they can be unit tested.
- `data/` holds seed data and stored lookup tables only (records, their model, load/save), never rules.
- Don't build a monolith. Break code up the way a person would to read it: when a file or component
  starts handling several separate things, split it along those lines rather than adding another branch.
- Comments describe what the code does now. Dates, "used to", and who asked for what go in git
  history and the Change Log (`data/changelog.ts`), not in comments.
- Delete dead code. The exception is a feature deliberately switched off by a flag: keep it working,
  with a comment saying it is switched off and kept so it can be turned back on without a rewrite.
