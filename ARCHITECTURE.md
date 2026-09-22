# Welding — Architecture & Component Reference

Welding is a **welding work-order & inspection manager** (prototype). Single-page Angular app with **no backend** — all data is in-memory or `localStorage`.

## Stack

- **Angular 19** — standalone components, signals, modern control flow
- **DaisyUI 5** (on Tailwind CSS 4) — all 32 built-in themes enabled via `themes: all`
- **Lucide Angular** — icons
- **No PrimeNG, no server, no database.** All data is mock or localStorage.

## Terminology

| Term | Meaning |
|---|---|
| **Hull** | The vessel/record a job belongs to (`job.hull`, letter + 4 digits, e.g. `K7234`). **Not unique** — many jobs share a hull. Replaces the old "Project" / job number / title. There is no job `title` and no joint `title` either. |
| **XREFID** | The user-facing identifier shown everywhere (`job.xrefid`), 5-char alphanumeric, matching `job.id` when present. **Blank on ~25% of jobs** (`i % 4 === 0`), same imperfect-source-data pattern as My Assignments and Weld Planning; `job.id` itself is a separate, always-populated internal key (never shown) that routing, workflow lookups, and row selection use, so a blank XREFID never breaks navigation or workflow state. Renders **blank**, not a `'—'` placeholder, on the Weld Record table and Advanced Search lists (fixed 2026-09-22 — the dash was only a display fallback, never a real value, and read as if it were stored data); Joint Details keeps its own `'—'` fallback since that's a single-value detail view, not a list. |
| **Drawing** | Letter + 7 digits, e.g. `H7111234` or `S7204518` (`job.drawing`, weld-joint `drawing`); both `H` and `S` prefixes appear in seed data. |
| **Serial number** | 9 digits starting with 1 or 2, then `A`, e.g. `229348951A` (`job.serialNumber`). **Blank whenever XREFID is blank** — neither was captured for that record. |
| **Joint number** | Weld Planning's `jointNumber`: 2-letter prefix, hyphen, 5 digits, e.g. `ST-00001` (seed: `ST` structural, `PI` pipe). |
| **Joint (system-joint)** | The weld record's own `joint` field (`job.joint` and Weld Planning's separate `WeldJoint.joint`) — 2-letter system code, hyphen, 5 digits, e.g. `ST-10005` (seed system codes: ST/SW/FW/FO/LO/HV, my own unreviewed pick). Was previously free text (`J-001`); changed 2026-09-21, dropped the stray `J` before the digits 2026-09-22. |
| **Job identity** | A job is identified by **either** its XREFID **or** the unique combination of **hull + drawing + joint**. Never use hull alone as an identifier (labels/pickers show hull · drawing · joint). |
| **Routing** | The ordered sequence of stages for a job, and the label of the current one (`currentRouting`). Replaces the old "Step". |
| **Stage** | One unit of a routing (`WorkflowStage`): Fit, Tack, Root, NDT, … |
| **GWP** | Label of the `weldProcedure` field (formerly "Weld Procedure"). |
| **Nuclear Indicator** | Label of `job.nInd` (1/2/3). Joint Details shows a hover tooltip on the value (`N_IND_MEANINGS` in `joint-details.component.ts`): 1 = "N 250-1500-1", 2 = "N TP278", 3 = "Non". |

## Build & checks

```powershell
cd "C:\Users\dewes\primeng-search-demo"; npx ng build 2>&1
npx tsc --noEmit --noUnusedLocals -p tsconfig.app.json   # catches unused code
```

Pre-existing SCSS "rules skipped due to selector errors" warnings come from Tailwind/DaisyUI empty `&` selectors and are harmless.

## Version bumps

The "new version available" Reload button does NOT clear saved data; only a `CURRENT_VERSION` change does (on the next load). `CURRENT_VERSION` in `src/app/services/workflow.service.ts` (~line 21): bump when stage definitions, field names, data models, or seed data structure change. On mismatch the app clears the caches listed in `clearStaleCaches()` (`data/storage-keys.ts`).

## Storage

All `localStorage` keys live in `data/storage-keys.ts` (`STORAGE.*`, all prefixed `welding:`). Never write a key literal elsewhere. The site banner has one loader/saver in `data/banner.ts` (`bannerFor(page)`).

## Folder map

```
src/app/
  app.component.*        Shell: top nav + <router-outlet>. Admin dropdown, theme picker, PWA update prompt.
  app.routes.ts          URL → screen mapping

  weld-record/            All Weld Record (EWR) screens + their admin pages, grouped under one folder (moved
                          here 2026-09-23 — was 24 flat top-level folders; every admin-* folder turned out to
                          belong to Weld Record specifically, none to Weld Planning). Nesting is purely file
                          location — routes/URLs/component names are unchanged.
    pipe-search/           Pipe Welding — the deliberately simple, fast job table (filters, role, CSV, banner)
    adaptive-search/       Advanced Search — schema-driven filter bar + saved variants + column picker (for everyone else)
    work-history/          History — audit-trail activity log with deprogress
    my-assignments/        My Assignments — assignment list with keyword search
    job-detail/            Job detail — routing bar, joint details, fabrication, signoff, records review
    routing-bar/           Horizontal numbered routing pills (auto-scrolls to the selected stage)
    joint-details/         Read-only joint/NDT/additional data panel
    fabrication/           Cross-stage fabrication fields (Welding)
    signoff-panel/         Per-stage signoff form (weld layout is config-driven, see below)
    attachments/           Attachments list
    sync-status/           Online/offline indicator (stubbed)
    admin/
      admin-routing/         Admin → Routing (stage templates per trade)
      admin-set-routing/     Admin → Set routing (force a job's stage)
      admin-routing-options/ Admin → Routing options (per-stage Type dropdown options)
      admin-signoff-fields/  Admin → Signoff fields
      admin-characteristics/ Admin → Attribute codes
      admin-material-traceability/, admin-ndt/, admin-locations/, admin-weld-positions/,
      admin-joint-designs/, admin-banner/, admin-teams/, admin-quick-links/   Other admin pages

  weld-planning/          Weld Planning — joints list/form/detail/mass-edit/admin/advanced-search (own data in
                          weld-planning.data.ts; own filter engine in weld-planning-filter-schema.ts). Its own
                          admin screen (weld-planning-admin.component.ts) lives inside this folder, not split out.
  theme-picker/           DaisyUI theme switcher (32 themes, default: forest)

  data/
    jobs.ts              Job model + seeded generator (480 jobs), makeJobId(), makeHull(), addTestJob()
    workflow.ts          Stage templates, types, buildStages(), seededWorkflow(), FABRICATION_FIELDS, ROLES
    assignments.ts       Assignment model + seeded generator (36)
    mock-history.ts      Seeded activity entries; walks the job's real routing (`buildStages()`), not the raw trade
                         template — that still carries the old generic Prep/Handover stages, unused by Welding
    filter-schema.ts     Schema-driven filter engine for Advanced Search
    people.ts            Mock people directory (id, first, last, title), searchPeople(), stampWho(); one source for all seeded names
    storage-keys.ts      Every localStorage key + clearStaleCaches()
    banner.ts            Admin banner load/save/bannerFor(page)
    joint-designs.ts, characteristics.ts, mcl-traceability.ts, export-csv.ts

  services/
    workflow.service.ts  Per-job workflow state (signals), persists to localStorage; signStage, reopenStage,
                         goBackRouting, forceRouting, releaseFitUp
    sync.service.ts      Online/offline + pending-sync count (stubbed)

  shared/
    table-state.ts       Sorting, filtering, paging (one instance per table screen)
    sort-header.component  th[appSortHeader]: sort link + optional text/multiselect column filter
    table-pager.component, multiselect-dropdown.component, date-range.component
    toast.service / toast-host.component   Themed toast notifications
    confirm.service / confirm-dialog.component   Confirm dialogs; optional password field OR a generic
                       textInput field (label + placeholder), both captured via one `inputValue` signal —
                       generalized 2026-09-23 so any screen can prompt for a short piece of text (e.g.
                       History's Deprogress reason) without building its own dialog.
```

## Routes

| Route | Screen |
|---|---|
| `/table` | Pipe Welding (default) |
| `/history` | History (`?job=<id>` deep-link) |
| `/adaptive` | Advanced Search |
| `/jobs/:id` | Job detail (`?from=assignments` or `?from=history` returns there after Back/signoff; default is Pipe Welding — `backDestination()` in `job-detail.component.ts`) |
| `/assignments` | My Assignments |
| `/admin/routing`, `/admin/set-routing`, `/admin/routing-options` | Routing admin |
| `/admin/*` | Other admin pages (signoff-fields, characteristics, ndt, locations, weld-positions, banner, joint-designs, teams, material-traceability) |
| `/weld-planning`, `/weld-planning/new`, `/weld-planning/:id`, `/weld-planning/:id/edit` | Weld Planning joint list/create/detail/edit |
| `/weld-planning/search` | Weld Planning Advanced Search (schema-driven filter bar, saved variants, column picker — same pattern as `/adaptive`, scoped to `WeldJoint`) |
| `/weld-planning/import` | Weld Planning mass import/edit |
| `/weld-planning/admin` | Weld Planning admin (Joint Designs & NDT) |

## Data flow

1. **Jobs** — 480 seeded Welding jobs in `jobs.ts` sharing 48 hulls (3–18 jobs per hull). Internal `id` is 5-char alphanumeric (`makeJobId()`), always populated, unique; `xrefid` mirrors it except on ~25% of rows where it's blank (imperfect source data). Hull is letter + 4 digits (`makeHull()`). `generateJobs()` guarantees the identity rule of unique hull + drawing + joint (the true key when XREFID is blank).
2. **Stage templates** — `workflow.ts`. Admin CRUD persists to localStorage; `getTemplates()` returns the merged view. The nine NDT stages come from one `ndtStage(phase, kind)` factory.
3. **Per-job workflow** — `WorkflowService`, keyed by job id, exposed as signals. Seeded jobs start mid-stream with pre-signed stages (inspection stages get a chosen type).
4. **Assignments** — 36 seeded, assigned to "John Johnson".
5. **Work history** — aggregates `WorkflowService.allWorkflows()` into a filterable timeline.

### Welding stages (in order)

1. Pre-Fit → 2. Fit → 3. Tack → 4. Fit-Up Insp → 5. Fit-Up Release → 6. Deferred Tack → 7. Root → 8. Root NDT UT/RT → 9. Root NDT MT/PT → 10. Root NDT VT/5X → 11. Layer → 12. Layer NDT UT/RT → 13. Layer NDT VT/5X → 14. Layer NDT MT/PT → 15. Final Weld → 16. Final NDT UT/RT → 17. Final NDT MT/PT → 18. Final NDT VT/5X → 19. **O63 Records Review** *or* **O04 Records Review** → 20. Sold

Step 19 is exactly one of two stages, chosen by `buildStages()` (`data/workflow.ts`, Welding filter) from the job's own data — never both: **O63** (`review-o63`) when any of `job.sfff`, `job.dssAaa`, `job.ss` is set; **O04** (`review-o04`) otherwise. Split from a single `review` stage 2026-09-22. Both share identical fields/behavior (verification grid, `rejectToStage: 'final-ndt-vt5x'`) — only the id/label differ.

## Screens

### Pipe Welding (`pipe-search`)
- Deliberately the "dumb", fast version. Layout: `table-page-wrap` (fixed header/filters, scrollable table).
- Columns: XREFID, Hull, Drawing, Joint, Order, Sequence, Current routing, Actions — sortable, with per-column filters via `appSortHeader`.
- Role dropdown, CSV export (right-aligned, next to the keyword search box — moved 2026-09-23), page-size selector, admin banner pill, frozen Actions column on mobile.
- Persists filter/sort/page/role to `STORAGE.searchState`.

### Advanced Search (`adaptive-search`)
- For everyone who needs more than Pipe Welding: schema-driven filter bar, saved variants, column picker, CSV export. All NDT and additional-data fields.
- Text filters carry a `{ text, negate }` value (`TextFilterValue` in `data/filter-schema.ts`) with a **Contains / Does not contain** selector next to the input (fixed-width select, added 2026-09-23) instead of a plain contains-only string. Old saved variants (plain-string text values) are migrated to the new shape on load in `loadVariants()`.

### Job detail (`job-detail`)
- **Routing bar** — numbered pills, horizontal scroll, auto-centers the selected stage. Active = `--color-success`, done = `--color-info`.
- **Joint details** — 3 columns (stack on mobile): job info, joining/join-to, NDT data (RT/NDT/UT/VT as `X` or `5X`); "Show more" reveals additional data and attribute codes. Attribute codes show as `code description` (`attrCodeDisplay()`, looked up via `characteristicLabel()` in `data/characteristics.ts`, the same table Admin > Attribute Codes manages) — fixed 2026-09-22: `job.attributeCode1-4`'s seed pool used to be unrelated 2-letter codes (`AB`, `CD`, …) that never matched `CHARACTERISTIC_CODES`' real codes, so descriptions could never resolve; `ATTR_CODES` in `jobs.ts` now reuses `CHARACTERISTIC_CODES`' own codes.
- **Fabrication** (cross-stage) — Location (Ship adds Deck/Frame/P-S-CL/Usage with red `*`), MIC 1/2, Drawing Rev, Actual Thickness, WTN, Revised Joint Design.
- **Signoff panel** (below).
- **Top nav menus** — one open at a time; they close on outside click or when a real (non-disabled) link is chosen, and collapse their nested Admin submenu (`closeAll()` in `app.component.ts`).
- **Records Retention Review** (`review-o63` / `review-o04` stages — split 2026-09-22, see "Welding stages" above; role **Records Retention**, renamed from "Records" 2026-09-21) — verification grid + immutable `signoffRecords` history table.
- **Sold** — once signed all stages lock; only deprogress is allowed (Work History, most recent signoff per job).
- **Unsigned edits are discarded on leaving, with a warning if there are any** — `canDeactivateGuard` (`shared/can-deactivate.guard.ts`) calls `JobDetailComponent.canDeactivate()`, which now compares the live workflow against a snapshot taken on load (`loadSnapshot`/`hasUnsavedChanges()`) covering *every* unsigned stage's inputs/signoffInputs/routingType **and** `fabricationData` — not just the one stage the user last touched. `ngOnDestroy()` reverts all of that back to the snapshot for any stage that's still unsigned (and Fab data, unless the Fit stage got signed this visit) once the route actually changes, whether the user confirmed the warning or there was nothing to warn about. Before this fix (session ending 2026-09-23), Fab data was written straight into the persisted workflow on blur with no revert at all, so it silently survived navigating away without signing.

### Signoff panel (`signoff-panel`)
- **Type dropdown** for stages with `routingOptions`. On inspector/NDT stages it starts **blank**, is required (`*`), and signing is blocked until chosen (`inspectionTypeRequired`).
- **Weld stages** (Tack, Root, Layer, Final Weld, Fit weld build-up) render from the `WELD_GROUPS` config in `signoff-panel.component.ts` — four cards (only "PH/IP" and "Readings" have headers; the other two were untitled at the user's request) — through one field template, restructured 2026-09-22 so PH/IP requirements and actuals share one dedicated card instead of being split across the signoffs and Readings cards:
  1. **Signoffs** (untitled) — GWP / WTN / Weld Process (auto-set from WTN, locked), Qualification Check, **Consumable Insert checkbox** (Root; unchecking clears filler type/size/MIC) directly above **Filler Metal** (both moved here from Readings, checkbox positioned immediately above the fields it affects).
  2. **PH/IP** — Requirements (limits), Actuals, then **Override Requirements** incl. Override Note (all read-only, set from the WTN; `NC` = no limit; shown only for matching WTNs — moved here, under Actuals, 2026-09-22).
  3. **Readings** — weld position (Nuclear Indicator 1).
  4. (untitled) — 5X (Root/Final), Comments.
- Non-weld stages use the generic field loop; `showIf` / `requiredWhen` drive conditional fields.
- **PH/IP validation** — blur-triggered range checks; NC skips that limit.
- **Decision** — SAT/UNSAT (or "Inspection Results" on NDT); signoff dialog needs certification + password.
- **Defect Code** (RT, UNSAT only) renders in its own row right after Decision, not above it in the general fields loop — fixed 2026-09-22, since it only applies once UNSAT is chosen, showing it first read backwards.
- **Penetrant Manufacturer** select (MT/PT) was missing `w-full` (the app's `.stage-field input { width: 100% }` rule doesn't cover `<select>`), so it shrank to its selected option's text width inside its `flex-1` half of the row, leaving a gap next to Penetrant Brand — fixed 2026-09-22.
- **Sign button** — disabled until `canSignStage()` passes; it is derived from `signBlockers()` in job-detail, the single source of the rules. There is deliberately no on-screen "why" text (the sticky bar and then the note beside the button were both removed at the user's request). A failed attempt scrolls to and focuses the first validation error.
- **Fit-Up Insp** — verification grid against fabrication data, Release-to-welding checkbox.
- **Records Retention Review's embedded "Signoff History"** — same pattern as the History screen: one row per sign-off event (When, Who, Stage — Action with an expand chevron, Result badge), collapsed by default, with its own **Expand all / Collapse all**. Expanding shows the fields recorded at that sign-off. Local to `SignoffPanelComponent` (`expandedRecords`/`toggleRecord`/`toggleAllRecords`), not wired to the History screen's data or state.
- **Gotcha**: `.stage-field`'s `flex: 1 1 160px` is written for the row-based `.stage-inputs` grid, where 160px is a WIDTH basis. Reused inside a `flex flex-col` wrapper (e.g. Review's own layout), that same value becomes a HEIGHT basis and forces ~160px of dead space below short content. Don't use `.stage-field` inside a column-flex container; use a plain `<div>` (see Review's Comments field and Admin > Banner's Banner Message field, both fixed 2026-09-21).
- **Deprogress** — reverse the last signed stage with a required comment.
- **Interim Layer** signs off and navigates away; **5X** — answering the "Did you perform 5X inspection…" question only records the answer; auto-signing the matching VT/5X stage happens when the parent stage (Root/Final Weld) is itself signed off, not when the dropdown is changed (fixed 2026-09-22 — it previously fired on the dropdown change alone, signing a stage with no confirmation).

### My Assignments, History, Weld Planning
- My Assignments is **first** in the Weld Record nav dropdown (moved above Pipe Welding 2026-09-23 — it's the most common thing a tech opens). Column widths: Routing fixed at 8rem (was `1fr`, grew far past its longest value), Specific Location `1fr` (absorbs the freed space; was a cramped 9rem, truncating values). Expandable list (XREFID, Hull, Drawing, Joint, Routing, **Location** = shop (`getShops()`, same pool as Fabrication's Location) — or **'Ship'** for the couple of records below, **Specific Location** = bay/rack within it, Assignment # (6-digit, no prefix), WICC Date, **Source** — demo-only, which upstream system the assignment came from, keyed off role via `SOURCES_BY_ROLE` in `assignments.ts`: Fitting SWIMS, Welding EWICC, Foreman EWR, Inspector/NQC Inspector a random mix of SAIL/NCS, Records Retention EWR). Row click toggles an expanded panel below it (chevron indicator) showing Assigned By, Assigned Date, Job Description, and — for Welding assignments only — Filler Metal Type/Size and WTN (`Assignment.details`, demo-only stand-ins for fields eWICC would actually hand off; not built out for other roles yet). A Charge field renders as a real **Code 39 (3 of 9) barcode** (`barcodeElements()` in `my-assignments.component.ts`: narrow/wide bar-and-space patterns per the ISO/IEC 16388 character set, wrapped in `*` start/stop characters — replaced the old decorative random-width bars 2026-09-22), centered with the charge number underneath it. The separate "Details" button still navigates to the job page. A demo-only **role filter dropdown** (red-outlined `select-error` + an inline "Demo role:" label — replaced the small "Demo only" badge 2026-09-23 for visibility, defaults to **Welding**) filters by `assignedRoles`; also a keyword filter, banner, horizontal scroll on narrow windows (`min-width: 62rem`). `expirationDate` is seeded 0-6 days out (always within a week). No "Assigned To" column (removed; it previously showed a hardcoded "John Johnson", not `a.assignedTo`). **XREFID is blanked on ~25% of rows** (`i % 4 === 0`, same pattern as Weld Planning's records) to mimic real imperfect data; the Details button therefore looks the job up by **hull + drawing + joint** (the true identity key), never by the assignment's own `jobId` copy, which may be blank. A blank XREFID does **not** by itself mean shipboard work — most such records still track to a shop/bay like any other assignment. Only **two** assignments (`assignments.ts`, `toShip()`) get the shipboard-location treatment: Location = 'Ship', and the expanded row shows **Deck / Frame / P/S / CL (centerline offset) / Usage** instead of Specific Location. One is guaranteed to be the earliest-due Welding assignment (so it's visible near the top of the default view); the other is picked from elsewhere among the blank-XREFID records for variety.
- History: leftmost icon-only chevron column (expand/collapse), then **Routing, Action**, When, Who, **Value** (was Old value/New value — Old value dropped 2026-09-23: it was dash almost everywhere in practice, see below), XREFID, Hull, Drawing, Joint, Order, **Deprogress**, then a trailing details-button column (small primary icon button, same pattern as My Assignments' — plain XREFID text is no longer itself a clickable link, replaced 2026-09-23 since the whole-cell link was an easy accidental-click target; opening it sets `?from=history` so Back/sign-off returns to History instead of the Pipe Welding table, via `backDestination()` in `job-detail.component.ts`). Identity columns (XREFID/Hull/Drawing/Joint/Order) are sized to their real fixed-length content in `ch` units, not a blanket rem width. Every column has its own filter via `appSortHeader` (text, or a multiselect for Routing) alongside the top-bar Person/XREFID/search filters — the filter inputs show a small filter icon instead of "Filter…" placeholder text, which was clipping to "Fil"/a single letter in the narrow identity columns. Filters: person typeahead; **a job box that matches XREFID, drawing, joint or order** (not hull); and a right-hand **Search all** box covering every column and the sign-off field values. **It records what was input at each sign-off**: a sign-off row expands (per row, or **Expand all / Collapse all** for every sign-off matching the filters) to every editable field the user was shown, with its value at that moment, blanks included; each field row repeats the sign-off's When, Who, Routing, XREFID, Hull, Drawing and Joint in muted text so it reads on its own (`HistoryEntry.inputs`, built by `snapshotInputs()` in `workflow.ts`, from the job page's `signoffSnapshot()`). Read-only/derived fields (PH/IP limits, overrides, locked Weld Process, disabled fields) are not listed. Per-field edits (sections Stages/Fabrication) are still logged but **hidden** here. **Person filter is a typeahead** (`searchPeople`: first/last name prefixes in any order, or id). CSV has one line per field, including Drawing/Joint/Order alongside XREFID/Hull. Each entry carries `whoId`/`whoTitle`, stamped in `withHistory` via `stampWho()`.
  - **`routing` is the stage the action was *for*, not what it moved to afterward** (fixed 2026-09-23): `WorkflowService.withHistory()` now derives it from `currentRoutingLabel(prev.stages)` (pre-update state) instead of `next.stages` — a `'Fit — Signed off'` entry used to record whatever became active next (e.g. `'Tack'`) instead of `'Fit'`. `seededWorkflow()`'s own entries already got this right (`routing: s.label`); `mock-history.ts`'s generator was fixed the same way (records `stage.label`, not the next stage).
  - **Old value dropped** (2026-09-23): the only field types that ever populated `from` either never reach the grid (Stages/Fabrication are filtered out of `allActivity()`) or belonged to the dead Work Validation feature (see below), aside from one edge case (pre-signoff Decision flip-flopping) not worth a whole column.
  - **Routing filter sorts by workflow order**, not alphabetically (`routingOrder` in `work-history.component.ts`: each stage's first-appearance index across every trade's `getTemplates()`); anything not a real stage (e.g. `'All stages complete'`) sorts to the end.
  - **Deprogress is offered only on a job's last sign-off still in effect** (`deprogressable`: whole history, independent of filter/sort; a re-open cancels the sign-off before it; must match the live workflow's last signed stage — only when that live workflow actually *has* a signed stage to compare against: `lastSignedLabel.has(jobId)` used to be true even for a job whose live workflow was merely instantiated with nothing signed (e.g. just from appearing in the Pipe Welding table), which silently hid Deprogress on jobs whose real history is the mock fallback; fixed 2026-09-23). Clicking it now opens the shared **confirm modal** (`ConfirmService.textInput`) for the required reason, instead of an inline input/Go/Cancel row in the cell.
  - **Mock history realism fixes** (2026-09-23, all in `data/mock-history.ts`): dropped `Component added`/`Validation notes` entries (Work Validation has no UI anywhere in `job-detail` anymore — nothing can produce them); only stages with a `rejectToStage` ever get a SAT/UNSAT decision (matches the real signoff panel's auto-accept for the rest) and an UNSAT stops the mock sign-off chain there instead of pretending later stages were reached; `Attachment added` only fires when the current stage is one that actually shows Attachments (`isNdtStageId`, mirrors `job-detail`'s `isNdtStage`); free-text fields with no plausible value (Comments/Notes) pick from a small sentence pool instead of the literal fallback string `'recorded'`.
- Weld Planning: separate weld-joint data (`WeldJoint`; list/form/detail/mass edit/advanced search; the admin page has only Joint Designs, the NDT and PWHT option tabs were removed) with its own `hull` field .
  A joint has no title, WPS, PWHT, assignee, estimated hours, description or notes (all removed from the create/edit form; the data fields still exist and still show on the detail page & CSV for seeded joints). Joint is a free-text field in system-joint format (e.g. `ST-J10005`, see Terminology), not a dropdown. Its NDT requirements are the same seven fields as the weld record's joint details (`NDT_FIELDS` in `weld-planning.data.ts`: RT Root/Final, NDT Root/Each/Final, UT, VT; each blank, `X` or `5X`). Material 2 is labelled plainly (no "(Filler)"). The form, detail, admin and mass-edit pages fill the content area like every other screen (no centred max-width box). Plans saved in the browser before this change lack the NDT fields and show them blank.
  **Advanced Search** (`weld-planning-search`, route `/weld-planning/search`) mirrors the Job Advanced Search screen but scoped to `WeldJoint`: its own filter schema (`weld-planning-filter-schema.ts`), saved variants and result-column picker, both persisted under their own `STORAGE` keys (`weldPlanningFilterVariants`, `weldPlanningResultColumns`) so they don't collide with the Job Advanced Search screen's saved state.

## Data schema

### WorkflowStage (per stage)

```ts
{
  id: string;                    // e.g. 'fit', 'tack', 'root-weld'
  label: string;
  required: boolean;
  role: string;                  // e.g. 'Fitting', 'Welding', 'Inspector' ('|' separates several)
  fields: StageField[];
  inputs: Record<string, string>;
  signoffFields: SignoffField[];
  signoffInputs: Record<string, string>;
  result: 'sat' | 'unsat' | null;
  signed: boolean;
  signedAt: string | null;
  signoffRecords: SignoffRecord[]; // immutable audit trail
  rejectToStage: string;
  repeatable: boolean;
  routingType: string;           // 'standard' | 'repeat' | 'final' | fit type
  inspectionType: string;        // blank until chosen on inspector stages
  routingOptions?: StageOption[];
  swapStageId: string;
  decisionLabel?: string;
}
```

### SignoffRecord (one per signoff or reopen)

```ts
{ stageLabel: string; fields: { key: string; label: string; value: string }[];
  result: 'sat' | 'unsat' | null; who: string; when: string; action: 'signed' | 'reopened'; }
```

### HistoryEntry

```ts
{ when: string; who: string;
  section: 'Sign-off' | 'Stages' | 'Attachments' | 'Fabrication' | 'Release' | 'Work Validation';
  action: string; from?: string; to?: string;
  routing: string;               // routing label at time of change
  inputs?: { label: string; value: string }[];   // sign-off entries: every editable field + value at sign-off
}
```

### Job

```ts
{
  id: string;          // internal key, 5-char alphanumeric, always populated, unique — never shown
  xrefid: string;      // user-facing XREFID; mirrors id, but blank on ~25% of jobs
  hull: string;        // letter + 4 digits, e.g. K7234 — shared by many jobs
  // identity: id  OR  (hull + drawing + joint), each unique — xrefid is display-only, not an identity key
  trade: string;       // 'Welding'
  technician: string;
  drawing: string; drawingRev: string; joint: string; jointDesign: string; weldType: string;
  pipeSize: string; wallThickness: string;
  materialType1: string; materialType2: string; mcl1: string; mcl2: string;
  joiningItem: string; joinToItem: string;   // comma-separated
  sequenceNumber: string; order: string; engineeringNotes: string;
  wps: string; ndt: string; pwht: string;
  nInd: string;        // Nuclear Indicator: 1, 2 or 3
  // ... plus all NDT and additional data fields
}
```

## Data patterns

- **Job identity** — hulls repeat by design. Any new seed data or import must keep `id` unique and `(hull, drawing, joint)` unique; pickers and labels should show all three, not the hull alone.
- **Seeded workflows** are deterministic per job id and pre-sign random leading stages with full `signoffRecords`.
- **Nuclear Indicator** '1'/'2'/'3' drives weld-position visibility, pre-fit visibility and NDT role routing (1–2 → NQC Inspector).
- **NDT routing** — `job.ndt` is regex-matched: `hasUTorRT`, `hasMTorPT`, `hasVT`.
- **Repair** is inserted dynamically on NDT rejection; role Foreman.
- **Affected Items** — `joiningItem`/`joinToItem` with `affectedItems` stored as a comma-separated string.
- **MIC** values are hyphenated codes such as `250C-1500-290-5` (`seededMic`).
- **Trades** — only Welding ships with templates (the old HomeFix trades were purged). Admins can still add a trade (`addTrade`, prep + handover stages) and create a test hull for it.
- **Work package** — `Hull-Compartment-Detail`, e.g. `K7234-FWD-D03` (`workPackageFor()` in `jobs.ts`; compartments FWD/MID/AFT/ENG/CGO/HAB, details D01–D12).
- **Fit-Up Release** routes to role **Foreman** (was Welding). A handful of seeded jobs (about 7 of 480) sit at this stage awaiting a Foreman: Fit-Up Insp is signed with "Release to welding" unchecked, so Fit-Up Release is required and is the job's current routing. The Pipe Welding role filter checks the first unsigned **required** stage (the same rule as `currentRoutingLabel` / `activeStageId`), not just the first unsigned stage.
- **Deferred Tack** — identical form and behavior to Tack (same `WELD_STAGE_FIELDS`, WTN overrides, weld-card layout); it only sits after Fit-Up Release and is activated when Fit signs with Defer Tack = yes.

## Layout & styling

- `html { font-size: 112.5% }` in `styles.scss` scales everything (all sizes are rem). Small Tailwind/DaisyUI sizes and dimmed/disabled contrast are overridden at the end of `styles.scss` ("Readability overrides").
- `.signoff-panel` uses one text size (`--signoff-text`) for everything except bold headings.
- `.layout` — `height: 100vh; flex column`; `.topnav` sticky, 3rem, `z-index: 50`; `.content-body` scrolls; `.table-page-wrap` fixes the header/filters and scrolls the table.
- Theming: 32 DaisyUI themes; default `forest`; app tokens (`--app-bg`, `--app-surface`, `--app-border`, `--app-text-muted`) track the active theme. `--app-border` is a mix of the theme's text colour (25%), not `base-300`, because `base-300` is nearly the panel colour in dark themes and borders vanished; change it in one place to retune every border. Toasts use `color-mix()` with theme variables.
- Shared components: ToastHost, ConfirmDialog (native `<dialog>`, password), TablePager, MultiselectDropdown, SortHeader.

## Gotchas

- **Fabrication select labels**: `Location` and `Revised Joint Design` options exist only at runtime (`withRuntimeOptions()` in `job-detail`); the static `FABRICATION_FIELDS` entries have none. Any place that shows a fabrication value (e.g. Fit-Up Insp verification grid) must resolve its label through that helper, or it shows the raw stored code (`bj-g` instead of `BJ-G`).
- **Consumable insert vs filler metal choices**: they share `METAL_TYPE_OPTIONS` / `METAL_SIZE_OPTIONS` (`workflow.ts`) because "Only Consumable Insert used as filler" copies the Fit stage's insert type/size into the filler fields. If the two lists ever differ, a copied value that is missing from the filler list renders as a blank select. Keep them one list.
- **`SignoffRecord.fields` labels**: `WorkflowService` (signStage/reopenStage/forceRouting/goBackRouting) builds these from the raw `stage.inputs`/`stage.signoffInputs` key/value pairs, not from the properly-labeled `SignoffInput[]` the caller may pass in. Always resolve the display label via the `labelFor(stage, key)` helper (falls back to the field's key only if no matching `StageField`/`SignoffField` is found) — fixed 2026-09-21 after Signoff History showed raw keys like `consumableInsertType` instead of "Consumable Insert Type".
