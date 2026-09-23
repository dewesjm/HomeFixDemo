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
| **GWP** (Governing WPS) | Label of the `weldProcedure` field. Groups several Weld Engineering `Procedure` rows, one per WTN (e.g. GWP `W-101` covers WTN `05.5-1`, `05.5-2`, `05.5A-3`, each its own WPS document/PDF). A GWP's base metal 1/2 is fixed across all its WTN rows; Weld Record's GWP droplist is filtered to whichever GWPs match the job's Material Type 1/2 (`gwpOptionsForMaterials()` in `data/procedures.ts`). Picking a WTN then drives Weld Process, PH/IP requirements and override values by looking up the matching `Procedure` row — see "Weld Engineering" below. |
| **WPS** | One Weld Engineering `Procedure` row/PDF, id `<gwp>-<n>` (e.g. `W-101-2`), shown as "WPS" throughout Weld Engineering screens. |
| **Ship** | `job.ship`, a 3-digit number shown just above Hull in Joint Details. Stable per hull (jobs sharing a hull share a ship), same idea as Hull itself. |
| **Nuclear Indicator** | Label of `job.nInd` (1/2/3). Joint Details shows a hover tooltip on the value (`N_IND_MEANINGS` in `joint-details.component.ts`): 1 = "N 250-1500-1", 2 = "N TP278", 3 = "Non". |

## Build & checks

```powershell
cd "C:\Users\dewes\primeng-search-demo"; npx ng build 2>&1
npx tsc --noEmit --noUnusedLocals -p tsconfig.app.json   # catches unused code
```

Pre-existing SCSS "rules skipped due to selector errors" warnings come from Tailwind/DaisyUI empty `&` selectors and are harmless.

## Version bumps

The "new version available" Reload button does NOT clear saved data; only a `CURRENT_VERSION` change does (on the next load). `CURRENT_VERSION` in `src/app/weld-record/services/workflow-store.service.ts`: bump when stage definitions, field names, data models, or seed data structure change. On mismatch the app clears the caches listed in `clearStaleCaches()` (`data/storage-keys.ts`).

## Storage

All `localStorage` keys live in `data/storage-keys.ts` (`STORAGE.*`, all prefixed `welding:`). Never write a key literal elsewhere. The site banner has one loader/saver in `data/banner.ts` (`bannerFor(page)`).

## Weld Record services

`weld-record/services/` used to be one file (`routing.service.ts`) that had grown to own per-job
state/persistence, fabrication data, attachments, sign-off/reject/repair logic, admin routing overrides,
*and* a whole dead feature (Work Validation) that had lost its UI but nobody had removed. Split 2026-09-22
into:

| Service | Owns |
|---|---|
| `WorkflowStore` | Per-job state (signals), localStorage persistence/migration, history-entry stamping (`withHistory`). No domain logic — every service below builds on it. |
| `RoutingService` | Filling in a stage's own fields (`setStageInput(s)`); admin routing override (`forceRouting`); reject-and-go-back (`goBackRouting`). |
| `SignoffService` | Locking/reopening a stage's sign-off (`signStage`, `reopenStage`, `updateStageSignoff`), Fit-Up release, and the side effects a sign-off can trigger (defer-tack, fit-up-release activation, NDT-reject-inserts-Repair). |
| `AttachmentService` | `addAttachment`/`removeAttachment`. |
| `FabricationDataService` | `setFabricationData` — cross-stage Welding fields, unrelated to any one stage. |

**Rule for adding new workflow behavior**: don't default to adding a method to whichever service is already
injected in the component you're editing — that's exactly how `routing.service.ts` grew into a god-service
last time. Before adding a method, ask:
- Is this the same *domain concern* as an existing service (sign-off decisions → `SignoffService`, routing
  navigation → `RoutingService`, etc.)? If yes, add it there.
- Is it a genuinely new concern (e.g. a future "Components installed" or "Job comments" feature)? Give it its
  own service, built on `WorkflowStore` the same way the others are — inject `WorkflowStore`, use
  `store.update(job, mutator)` + `store.withHistory(prev, next, entry)`, don't reinvent persistence.
- Never add state, persistence, or migration logic outside `WorkflowStore` — it's the single place that
  touches `localStorage` for workflows and the only place `CURRENT_VERSION` lives.
- Write the new service's spec file alongside it (see "Testing" below) in the same change, not as follow-up
  work — that's what let the Work Validation dead code go unnoticed for as long as it did.

## Testing

Karma + Jasmine (`npm test` / `npx ng test --watch=false --browsers=ChromeHeadless`), spec files colocated
next to their source (`*.spec.ts`). Coverage is currently thin and growing incrementally — the
`weld-record/services/` files above have full coverage (39 specs) as of the 2026-09-22 split; most other
modules (admin CRUD, filter-schema, the screen components) still have none. When you touch a module that
lacks a spec file, adding one is in scope for that change, not a separate task.

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
    joint-page/            Job detail — routing bar, joint details, fabrication, signoff, records review
    routing-bar/           Horizontal numbered routing pills (auto-scrolls to the selected stage)
    joint-details/         Read-only joint/NDT/additional data panel
    fabrication/           Cross-stage fabrication fields (Welding)
    signoff-panel/         Per-stage signoff form (weld layout is config-driven, see below)
    attachments/           Attachments list
    sync-status/           Online/offline indicator (stubbed)
    services/             Split 2026-09-22 from one god-service (routing.service.ts had grown to own state,
                          persistence, fabrication data, attachments, sign-off, and a dead Work Validation
                          feature) into a shared store + one service per concern. See "Weld Record services"
                          below for the full split and the rule for adding new ones.
      workflow-store.service.ts  Per-job workflow state (signals), localStorage persistence + migration,
                                 history-entry stamping (`withHistory`). The shared primitive every other
                                 service here builds on — owns no domain logic itself.
      routing.service.ts   Stage-progression routing: filling in a stage's own fields (setStageInput(s)),
                           admin routing override (forceRouting), reject-and-go-back (goBackRouting).
      signoff.service.ts   Per-stage sign-off: signStage, reopenStage, releaseFitUp, updateStageSignoff —
                           including the defer-tack, fit-up-release, and NDT-reject-to-repair side effects.
      attachment.service.ts      addAttachment, removeAttachment.
      fabrication-data.service.ts  setFabricationData (cross-stage Welding fields).
      sync.service.ts      Online/offline + pending-sync count (stubbed)
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
                          No services/ yet — addWeldJoint()/updateWeldJoint() are called straight from the form
                          component since there's no business logic beyond persistence today; add one once
                          create-time rules exist (see "Weld Record services" above for the pattern to follow —
                          one store for state/persistence, one service per domain concern on top of it).

  weld-engineering/       Weld Engineering — Procedure Lookup (added 2026-09-23). Own data in data/procedures.ts.
                          One Procedure row per GWP+WTN pair (id `<gwp>-<n>`, e.g. `W-101-2`); a GWP's base
                          metal 1/2 is fixed across its WTN rows, one GWP per Material Type 1 x Material
                          Type 2 combination (same codes as Job.materialType1/2, see "GWP" in Terminology).
                          Weld Record's GWP/WTN stage fields cascade from this data (gwpOptionsForMaterials(),
                          wtnOptionsForGwp(), getProcedureByGwpWtn() — no longer "kept separate", integrated
                          2026-09-23; see "Signoff panel" below for what replaced the old static WTN maps).
                          Filler Metal Type/Size cascade the same way (added later 2026-09-23): each Procedure
                          carries `fillerMetalTypes`/`fillerMetalSizes` (string[] of valid option VALUES, e.g.
                          `'mil-70s-3'`/`'1/16'` — matching workflow.ts's METAL_TYPE_OPTIONS/METAL_SIZE_OPTIONS,
                          not FILLER_METAL_TYPES' label casing), and Weld Record's Filler Metal Type/Size
                          fields filter to whichever the resolved GWP+WTN Procedure allows
                          (`fillerMetalTypeOptionsForProcedure()`/`fillerMetalSizeOptionsForProcedure()`) —
                          but stay user-selected rather than auto-filled like Weld Process/PH/IP, since a WPS
                          commonly allows more than one valid type/size. Changing GWP or WTN clears a selection
                          that's no longer valid under the new WPS. `fillerMetalClassification` (a single
                          label-cased MIL- string, e.g. `'MIL-80S-50'`) is unrelated — free text for the PDF,
                          not part of the cascade. Storage bumped to `welding:procedures:v4` for the shape
                          change (`fillerMetalType`/`fillerMetalSizeRange` strings → arrays).
    procedure-lookup/       All procedures shown at once (no pager), sortable/searchable. Columns: WPS, Rev
                            (narrow — wpsRev is max 5 chars), Effective Date, GWP, WTN, Title, Status, Weld
                            Process, Process Type, Base Metal 1/2 Type, Filler Metal Types (comma-joined array).
                            Search also covers GWP, Weld Process, Process Type, Base Metal 1/2 Type, Filler
                            Metal Types.
    procedure-detail/       Renders the generated PDF inline (iframe) + Download; page title shows WPS id + WTN.
    procedure-pdf.ts        Pure Procedure -> pdfmake document-definition transform (unit-tested). Layout:
                            Revision Record, then 1. Base Metal, 2. Joint Design, 3. Welding Position,
                            4. Filler Metal, 5. Welder Qualifications, 6. Preheat & Interpass Temperatures,
                            7. Equipment, 8. Gas, 9. Heat Input, 10. Parameters, 11. Heat Treatment, then
                            Rules/Specific Conditions. Every page has a header ("printed from Weld
                            Engineering, verify revision prior to use") and footer (GWP - WTN, Rev N left;
                            pagination right).
    procedure-pdf-actions.ts  The only file touching the real pdfmake renderer (open/download/getDataUrl + vfs fonts)
    admin/
      manage-procedures/     List (search/sort/Edit/Delete/CSV export) + procedure-form (create/edit, organized
                              into the same 11 sections as the PDF). Saving blocks a duplicate GWP+WTN pair and
                              a base metal pair that disagrees with other WPS rows already on that GWP. Editing
                              a WPS that's (or was) Active requires a Revision Note, appended to that
                              procedure's `revisionHistory` (shown at the top of the PDF as Revision Record).
                              Filler Metal Type/Size are checkbox lists against FILLER_METAL_TYPE_OPTIONS/
                              FILLER_METAL_SIZE_OPTIONS (which values are valid for this WPS), not a single
                              select/free-text range like the rest of the form.
      load-procedures/       Bulk import via .xlsx/.csv or "Use Sample", same pattern as Weld Planning's mass-edit

  theme-picker/           DaisyUI theme switcher (32 themes, default: forest)

  data/
    jobs.ts              Job model + seeded generator (480 jobs), makeJobId(), makeHull(), makeShip(),
                         addTestJob(); exports MATERIALS_1/MATERIALS_2 (base metal codes) reused by
                         Weld Engineering's procedures.ts for baseMetal1Type/baseMetal2Type
    workflow.ts          Stage templates, types, buildStages(), seededWorkflow(), FABRICATION_FIELDS, ROLES
    assignments.ts       Assignment model + seeded generator (36)
    mock-history.ts      Seeded activity entries; walks the job's real routing (`buildStages()`), not the raw trade
                         template — that still carries the old generic Prep/Handover stages, unused by Welding
    filter-schema.ts     Schema-driven filter engine for Advanced Search
    people.ts            Mock people directory (id, first, last, title), searchPeople(), stampWho(); one source for all seeded names
    storage-keys.ts      Every localStorage key + clearStaleCaches()
    banner.ts            Admin banner load/save/bannerFor(page)
    joint-designs.ts, characteristics.ts, mcl-traceability.ts, export-csv.ts
    procedures.ts         Weld Engineering Procedure model (one row per GWP+WTN pair, 11 WPS sections +
                          revisionHistory) + seeded generator (one GWP per Material Type 1 x 2 combination,
                          imported from jobs.ts's MATERIALS_1/MATERIALS_2), CRUD, GWP/WTN cascade helpers
                          (gwpOptions, gwpOptionsForMaterials, wtnOptionsForGwp, getProcedureByGwpWtn,
                          hasOverride, allWtns), Filler Metal Type/Size cascade helpers
                          (fillerMetalTypeOptionsForProcedure, fillerMetalSizeOptionsForProcedure) and their
                          option lists (FILLER_METAL_TYPE_OPTIONS, FILLER_METAL_SIZE_OPTIONS), CSV export/import

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
| `/pipe-search` | Pipe Welding (default) |
| `/history` | History (`?job=<id>` deep-link) |
| `/adaptive` | Advanced Search |
| `/jobs/:id` | Job detail (`?from=assignments` or `?from=history` returns there after Back/signoff; default is Pipe Welding — `backDestination()` in `joint-page.component.ts`) |
| `/assignments` | My Assignments |
| `/admin/routing`, `/admin/set-routing`, `/admin/routing-options` | Routing admin |
| `/admin/*` | Other admin pages (signoff-fields, characteristics, ndt, locations, weld-positions, banner, joint-designs, teams, material-traceability) |
| `/weld-planning`, `/weld-planning/new`, `/weld-planning/:id`, `/weld-planning/:id/edit` | Weld Planning joint list/create/detail/edit |
| `/weld-planning/search` | Weld Planning Advanced Search (schema-driven filter bar, saved variants, column picker — same pattern as `/adaptive`, scoped to `WeldJoint`) |
| `/weld-planning/import` | Weld Planning mass import/edit |
| `/weld-planning/admin` | Weld Planning admin (Joint Designs & NDT) |
| `/weld-engineering`, `/weld-engineering/procedures/:id` | Procedure Lookup list + PDF detail |
| `/weld-engineering/admin`, `/weld-engineering/admin/new`, `/weld-engineering/admin/:id/edit` | Manage Procedures list/create/edit |
| `/weld-engineering/admin/import` | Load Procedures bulk import |

## Data flow

1. **Jobs** — 480 seeded Welding jobs in `jobs.ts` sharing 48 hulls (3–18 jobs per hull). Internal `id` is 5-char alphanumeric (`makeJobId()`), always populated, unique; `xrefid` mirrors it except on ~25% of rows where it's blank (imperfect source data). Hull is letter + 4 digits (`makeHull()`). `generateJobs()` guarantees the identity rule of unique hull + drawing + joint (the true key when XREFID is blank).
2. **Stage templates** — `workflow.ts`. Admin CRUD persists to localStorage; `getTemplates()` returns the merged view. The nine NDT stages come from one `ndtStage(phase, kind)` factory.
3. **Per-job workflow** — `WorkflowStore`, keyed by job id, exposed as signals; `RoutingService`/`SignoffService`/`AttachmentService`/`FabricationDataService` mutate it (see "Weld Record services" below). Seeded jobs start mid-stream with pre-signed stages (inspection stages get a chosen type).
4. **Assignments** — 36 seeded, assigned to "John Johnson".
5. **Work history** — aggregates `WorkflowStore.allWorkflows()` into a filterable timeline.

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

### Job detail (`joint-page`)
- **Routing bar** — numbered pills, horizontal scroll, auto-centers the selected stage. Active = `--color-success`, done = `--color-info`.
- **Joint details** — 3 columns (stack on mobile): job info (XREFID, **Ship** — 3-digit, added 2026-09-23, sits right above Hull —, Hull, ...), joining/join-to (MCL 1/2, Material Type 1/2, Joining/Join To Item — seeded as invented piece-mark codes like `HPF-D120-1`, not generic names), NDT data (RT/NDT/UT/VT as `X` or `5X` — `ndtLabel()` derives these purely from `job.ndt`'s free text, it does not read `job.rtRoot`/`rtFinal` themselves, which since 2026-09-23 hold the *degree* required for RT, not an X/5X marker — see "Degree of RT Performed" under Signoff panel); "Show more" reveals additional data and attribute codes. Attribute codes show as `code description` (`attrCodeDisplay()`, looked up via `characteristicLabel()` in `data/characteristics.ts`, the same table Admin > Attribute Codes manages) — fixed 2026-09-22: `job.attributeCode1-4`'s seed pool used to be unrelated 2-letter codes (`AB`, `CD`, …) that never matched `CHARACTERISTIC_CODES`' real codes, so descriptions could never resolve; `ATTR_CODES` in `jobs.ts` now reuses `CHARACTERISTIC_CODES`' own codes.
- **Fabrication** (cross-stage) — Location, MIC 1/2, Drawing Rev, Actual Thickness (all required with red `*`; Ship adds Deck/Frame/P-S-CL/Usage, also required with red `*`), WTN, Revised Joint Design. Location/MIC 1/2/Drawing Rev/Actual Thickness were already enforced before Fit could sign off (`FIT_REQUIRED_FABRICATION`) but had no star and no inline error until 2026-09-23 — MIC 1/MIC 2 only when that joint member's MCL requires traceability (same condition that hides the field entirely, see "Affected Items" below), matching `fabFields()`'s own filtering.
- **Signoff panel** (below).
- **Top nav menus** — one open at a time; they close on outside click or when a real (non-disabled) link is chosen, and collapse their nested Admin submenu (`closeAll()` in `app.component.ts`). Each group's Admin submenu (`.submenu` in `app.component.scss`) caps at `max-height: calc(100vh - 5rem)` with `overflow-y: auto` — fixed 2026-09-23 after Weld Record's Admin submenu (12 items) grew past the viewport with no way to reach the bottom entries; the fix is shared by all four nav groups since they use the same class.
- **Records Retention Review** (`review-o63` / `review-o04` stages — split 2026-09-22, see "Welding stages" above; roles **O63 Records** / **O04 Records** — split from one "Records Retention" role 2026-09-22, itself renamed from "Records" 2026-09-21, since O63 and O04 are reviewed by different groups of people; `sold` follows whichever track the job went through) — verification grid + immutable `signoffRecords` history table.
- **Sold** — once signed all stages lock; only deprogress is allowed (Work History, most recent signoff per job).
- **Unsigned edits are discarded on leaving, with a warning if there are any** — `canDeactivateGuard` (`shared/can-deactivate.guard.ts`) calls `JointPageComponent.canDeactivate()`, which now compares the live workflow against a snapshot taken on load (`loadSnapshot`/`hasUnsavedChanges()`) covering *every* unsigned stage's inputs/signoffInputs/routingType **and** `fabricationData` — not just the one stage the user last touched. `ngOnDestroy()` reverts all of that back to the snapshot for any stage that's still unsigned (and Fab data, unless the Fit stage got signed this visit) once the route actually changes, whether the user confirmed the warning or there was nothing to warn about. Before this fix (session ending 2026-09-23), Fab data was written straight into the persisted workflow on blur with no revert at all, so it silently survived navigating away without signing.

### Signoff panel (`signoff-panel`)
- **Type dropdown** for stages with `routingOptions`. On inspector/NDT stages it starts **blank**, is required (`*`), and signing is blocked until chosen (`inspectionTypeRequired`).
- **Weld stages** (Tack, Root, Layer, Final Weld, Fit weld build-up) render from the `WELD_GROUPS` config in `signoff-panel.component.ts` — four cards (only "Preheat/Interpass" has a header, renamed from "PH/IP" 2026-09-23 — group header only, field labels unchanged; the other three are untitled at the user's request, including "Readings" — un-headered 2026-09-22) — through one field template, restructured 2026-09-22 so PH/IP requirements and actuals share one dedicated card instead of being split across the signoffs and Readings cards:
  1. **Signoffs** (untitled) — GWP / WTN / Weld Process, Qualification Check, **Consumable Insert checkbox** (Root **and** Layer, as of 2026-09-23 — was Root only; unchecking clears filler type/size/MIC) directly above **Filler Metal** (both moved here from Readings, checkbox positioned immediately above the fields it affects). GWP/WTN/Weld Process/PH-IP/override values cascade from Weld Engineering's procedures data (integrated 2026-09-23, `data/procedures.ts` + `joint-page.component.ts`), replacing the old static `WTN_PROCESS_MAP`/`WTN_PHIP_MAP`/`WTN_OVERRIDE_WTNS`/`WTN_OVERRIDE_VALUES`: the GWP droplist (`withStageRuntimeOptions()`) is filtered to GWPs matching the job's Material Type 1/2 (`gwpOptionsForMaterials()`); picking a GWP narrows WTN's droplist to that GWP's WTNs (`wtnOptionsForGwp()`); picking a WTN looks up the matching WPS (`getProcedureByGwpWtn()`) and sets Weld Process (locked, `isFieldLocked()` already treated it as WTN-driven), PH Min/Max, IP Min/Max, and the override fields (blank unless that WPS has `hasOverride()` true) — see `stageSelectChange()`. Filler Metal Type/Size cascade the same way, filtered (not auto-filled) to the resolved WPS's valid values (see "Weld Engineering" above); a selection that's no longer valid after a GWP/WTN change is cleared. **Fixed 2026-09-23**: when the Consumable Insert checkbox is on (fields locked, `isFieldLocked()`), `withStageRuntimeOptions()` now shows the *full* `FILLER_METAL_TYPE_OPTIONS`/`FILLER_METAL_SIZE_OPTIONS` set instead of the current WPS's narrower cascade — the copied value (from Fit's Consumable Insert Type/Size) commonly isn't in that WPS's valid subset, so the locked select had no matching `<option>` and rendered blank even though the underlying value was set correctly. The field isn't user-selectable while locked, so the WPS-specific filtering was never doing anything useful there anyway.
  2. **Preheat/Interpass** — Requirements (limits), then **Override Requirements** incl. Override Note (all read-only, set from the WTN; `NC` = no limit; shown only when the selected WPS has override values), then Actuals (reordered 2026-09-23 — Override had drifted to after Actuals; should read Requirements → Override → Actuals).
  3. **Readings** (untitled) — weld position, required with a red `*` whenever shown. Its row only renders when Nuclear Indicator is `'1'` (`WELD_GROUPS`' own `when` clause here, independent of the field's `showIf`); `visibleFields()` (`joint-page.component.ts`) excludes the `weldPosition` key the same way for any other N Ind. value, so required-ness/validation stay in step with what's actually on screen — this was a real regression during the 2026-09-23 requiredness pass (required was briefly made unconditional, which blocked signoff on every non-N-Ind-1 job) before being caught and fixed the same day.
  4. (untitled) — 5X (**Root only**, as of 2026-09-23 — was Root/Final Weld), Comments.
- **Fit/Pre-Fit's own signoff fields** (`(st.id === 'fit' || st.id === 'pre-fit') && !isFitBuildup(st)`, own `signoff-fit-row` flex layout, not the generic loop below): Consumable Insert Type/Size/MIC on one row, Backing Ring Type/MIC on the next — shown only when the effective joint design (Revised Joint Design if set, else the job's own Joint Design; `jointDesignRequiresInsert()`/`jointDesignRequiresBackingRing()`, `joint-designs.ts`) calls for that group. Within a shown group, Type/Size (and Backing Ring Type) are always required; the MIC field is required only when *also* either joint member's MCL requires traceability (`SignoffPanelComponent.micSignoffRequired()`) — same condition gates its red `*`. Fit only, below that: **Defer Tack** checkbox, then **Comments** (Defer Tack renders first — fixed 2026-09-23, it had been below Comments). Pre-Fit has no Defer Tack (no Tack exists yet to defer) but does get the same fullWidth Comments. Pre-Fit's own stage `fields` is empty — these are `signoffFields`, same as Fit — fixed 2026-09-23: they used to live under Pre-Fit's `fields` (a separate copy, no `required`, rendered through the generic field grid instead of this layout, never gated by joint design at all) rather than reusing Fit's rules.
- **`isFitBuildup(st)`** (`SignoffPanelComponent`) is the one place that decides "is this Fit routed as Weld Build-up" — every fit-specific block in this template calls it instead of repeating `st.id === 'fit' && st.routingType === 'weld-buildup'` inline. Introduced 2026-09-23 after the inline checks drifted out of sync: the "Default: one per row" fallback's condition was only "not fit-standard", so it caught weld-buildup too and rendered Defer Tack as a stray text input; the Defer Tack checkbox and the fullWidth Comments block checked `st.id === 'fit'` alone with no routing-type exclusion, so weld-buildup got a spurious Defer Tack checkbox (it has no Tack to defer) and a second, duplicate Comments box on top of the one it already gets from `WELD_GROUPS` (stage fields, section 1 above). All fixed the same day by routing every check through `isFitBuildup()`.
- Non-weld stages use the generic field loop; `showIf` / `requiredWhen` drive conditional fields.
- **PH/IP validation** — blur-triggered range checks; NC skips that limit.
- **Decision** — SAT/UNSAT (or "Inspection Results" on NDT); signoff dialog needs certification + password.
- **Defect Code** (RT, UNSAT only) renders in its own row right after Decision, not above it in the general fields loop — fixed 2026-09-22, since it only applies once UNSAT is chosen, showing it first read backwards.
- **Penetrant Manufacturer** select (MT/PT) was missing `w-full` (the app's `.stage-field input { width: 100% }` rule doesn't cover `<select>`), so it shrank to its selected option's text width inside its `flex-1` half of the row — fixed 2026-09-22.
- **MT/PT's two penetrant fields are Penetrant Manufacturer + Penetrant Type** (renamed from Penetrant Brand 2026-09-23 — the old pair listed the same handful of companies twice under different labels, once as "Brand" and once as "Manufacturer"). Both now cascade from the admin-managed Penetrant table (`getPenetrants()`/`PenetrantEntry`, Admin > Penetrant — previously defined but never actually wired to this signoff field, it had its own hardcoded, redundant option lists): `penetrantManufacturerOptions()`/`penetrantTypeOptions()` in `workflow.ts` return the distinct manufacturers and distinct types across all entries, so Type reads as a real AWS-style designation (e.g. "Type I - Fluorescent") instead of a second copy of the company name. Field key `penetrantBrand` → `penetrantType`; the paired-row rendering in `signoff-panel.component.html` (renders both fields together, triggered off the first one in field order) now triggers off `penetrantManufacturer` since Manufacturer now comes first.
- **MT and PT (the `*-ndt-mtpt` stages) don't get the Attachments panel** (fixed 2026-09-23) — `JointPageComponent.isNdtStage` (and `mock-history.ts`'s mirrored `isNdtStageId`) now excludes any stage id ending `-mtpt`; UT/RT, VT/5X and Repair still get it.
- **Repair** (inserted automatically after any NDT stage that comes back UNSAT, `SignoffService.signStage()`): Repair Code (radio: Grind Only/Weld Repair/Cut), **Affected Item** checkboxes (Joining Item / Join To Item, same `affectedItemSlots`/`toggleAffectedItem` mechanism Fit's Weld Build-up uses — added 2026-09-23, **no MIC verification this time**, at least one required to sign off, guarded in both `signBlockers`'s sibling `validateStageFields()` and `SignoffPanelComponent`'s template via `st.id === 'repair'`), Allowable Thickness (disabled text) and its "exceeded" checkbox. **Allowable Thickness now varies by Nuclear Indicator** (`allowableThicknessText()` in `signoff.service.ts`, set when the Repair stage is created): `nInd` `'1'` (N 250-1500-1) → 3/8", `'2'` (N TP278) → 3/16" — `'3'` (Non) has no stated rule and falls back to the TP278 value, unreviewed.
- **NDT common fields (all NDT stages)**: **Probationary Inspector**/**Oversight Inspector** are required (red `*`) when **Has Probationary Inspector** is checked; **Portion of Weld Inspected** is required when **Partial** is checked (`NDT_COMMON_FIELDS` in `workflow.ts` — fixed 2026-09-23, they were optional even though `showIf`'d to only appear once their trigger checkbox was on).
- **Degree of RT Performed** (`degreeRt`, UT/RT stage, shown when inspection type = RT) changed from a fixed 60/360 radio to a droplist (`RT_DEGREE_OPTIONS` in `workflow.ts`: blank, NA, 10, 100, 360, 60, 75) that **must equal the job's required degree** before the stage can be signed off — `Job.rtRoot` for `root-ndt-utrt`, `Job.rtFinal` for `final-ndt-utrt` (`root-ndt-utrt`'s sibling `layer-ndt-utrt` has no matching requirement field on `Job` and enforces nothing). Checked in both `signBlockers()` (summary reason) and `validateStageFields()` (red highlight on the field itself), same paired-rule-set convention as every other signoff requirement. The field's label gets `(Required: <value>)` appended at render time (`withStageRuntimeOptions()`) when a requirement applies. `Job.rtRoot`/`rtFinal` used to seed from the same pool as `ndtRoot`/`ndtEach`/`ndtFinal`/`ut` (`NDT_RESULTS`: SAT/UNSAT/N/A/blank — dead data, `JointDetailsComponent.ndtLabel()` never reads the raw field, it derives its own X/— from `job.ndt` text) — now seeds from the same 6-value degree pool (`RT_DEGREES` in `jobs.ts`, duplicated rather than imported from `workflow.ts` to avoid a circular import, same pattern as `METAL_TYPE_OPTIONS`). Weld Planning's separate `WeldJoint.rtRoot`/`rtFinal` (blank/X/5X `NDT_MARKS`, one of its seven NDT requirement-marker fields) is a different model and was not touched.
- **Sign button** — always enabled (changed 2026-09-23, was `[disabled]="!canSignStage(st)"`): it's the only way to trigger validation and surface what's missing, so disabling it hid that feedback. `signStage()` (joint-page) still refuses to actually sign when `validateStageFields()` finds a per-field problem or `signBlockers()`/`canSignStage()` finds any other one (deliberately still no on-screen "why" text beyond the field-level highlighting below — the sticky bar and then the note beside the button were both removed earlier at the user's request). A failed attempt scrolls to and focuses the first validation error.
- **Every required field highlights red on a failed signoff attempt, everywhere** (2026-09-23): `validateStageFields()` (joint-page) is the single place that turns "this is required and missing" into a `{stageId}:{fieldKey}` entry in `fieldErrors` — covering ordinary stage fields (already existing), Fit-Up Insp's verification checkboxes, Weld Build-up's Affected Item/MIC verified, and now also Decision (`__decision`), Inspection Type (`__inspectionType`), Routing Type (`__routingType`), Fabrication-for-Fit (`__fabrication`, mirrors `fabErrors()`), and any stage's required `signoffFields` (via `requiredSignoffFields()`, shared with `signBlockers()` so the two rule sets can't drift apart — this replaced two separate copies of Fit/Pre-Fit's joint-design + traceability logic). Every template surface reads `ctx().fieldError()` to add a border (`input-error`/`select-error`/`checkbox-error`/`radio-error`) plus an inline message next to the existing red asterisk, and calls `ctx().clearFieldError()` (or the field just recomputes on blur) so the highlight clears the moment it's fixed. In passing: "Routing type \*" and "Decision \*" used an undefined `.req` CSS class with no styling anywhere in the app, so neither star was ever actually red — now `text-error` like every other required-field star.
  - **Root-cause fix in `signStage()`**: auto-accepting a non-inspection stage calls `setStageResult(stage, 'sat')` then immediately checks `canSignStage(stage)` — but `setStageResult()` writes through the store synchronously without mutating the `stage` object the click handler holds, so `canSignStage()` saw the still-falsy `.result` and `signBlockers()`'s auto-accept early return (`!stage.rejectToStage && !stage.result`) fired again, bypassing every other requirement (fabrication, signoff fields) for every auto-accept stage — Fit included, so today's earlier Consumable Insert/Backing Ring/Fabrication requiredness work was never actually enforced at the button until this was found and fixed the same day. `signStage()` now re-fetches the live stage from the store after auto-accepting, before the `canSignStage()` check.
- **Fit-Up Insp** — fixed, non-interactive **Type: Fit-Up Inspection** / **Layer: Fit** droplists at the top, one per line (added 2026-09-23, same visual convention — and layout — as the Type dropdown other inspector stages use, but disabled with a single option each since there's only ever one value for each here), then the verification grid against fabrication data, Release-to-welding checkbox.
- **Records Retention Review's embedded "Signoff History"** — same pattern as the History screen: one row per sign-off event (When, Who, Stage — Action with an expand chevron, Result badge), collapsed by default, with its own **Expand all / Collapse all**. Expanding shows the fields recorded at that sign-off. Local to `SignoffPanelComponent` (`expandedRecords`/`toggleRecord`/`toggleAllRecords`), not wired to the History screen's data or state.
- **Gotcha**: `.stage-field`'s `flex: 1 1 160px` is written for the row-based `.stage-inputs` grid, where 160px is a WIDTH basis. Reused inside a `flex flex-col` wrapper (e.g. Review's own layout), that same value becomes a HEIGHT basis and forces ~160px of dead space below short content. Don't use `.stage-field` inside a column-flex container; use a plain `<div>` (see Review's Comments field and Admin > Banner's Banner Message field, both fixed 2026-09-21).
- **Deprogress** — reverse the last signed stage with a required comment.
- **Interim Layer** signs off and navigates away; **5X** — the "Did you perform 5X inspection…" question only appears on **Root** (removed from Final Weld 2026-09-23 at the user's request); answering it only records the answer, auto-signing the matching `root-ndt-vt5x` stage happens when Root is itself signed off, not when the dropdown is changed (fixed 2026-09-22 — it previously fired on the dropdown change alone, signing a stage with no confirmation).

### My Assignments, History, Weld Planning
- My Assignments is **first** in the Weld Record nav dropdown (moved above Pipe Welding 2026-09-23 — it's the most common thing a tech opens). Column widths: Routing fixed at 8rem (was `1fr`, grew far past its longest value), Specific Location `1fr` (absorbs the freed space; was a cramped 9rem, truncating values). Expandable list (XREFID, Hull, Drawing, Joint, Routing, **Location** = shop (`getShops()`, same pool as Fabrication's Location) — or **'Ship'** for the couple of records below, **Specific Location** = bay/rack within it, Assignment # (6-digit, no prefix), WICC Date, **Source** — demo-only, which upstream system the assignment came from, keyed off role via `SOURCES_BY_ROLE` in `assignments.ts`: Fitting SWIMS, Welding EWICC, Foreman EWR, Inspector/NQC Inspector a random mix of SAIL/NCS, O63/O04 Records EWR). Row click toggles an expanded panel below it (chevron indicator) showing Assigned By, Assigned Date, Job Description, and — for Welding assignments only — Filler Metal Type/Size and WTN (`Assignment.details`, demo-only stand-ins for fields eWICC would actually hand off; not built out for other roles yet). A Charge field renders as a real **Code 39 (3 of 9) barcode** (`barcodeElements()` in `my-assignments.component.ts`: narrow/wide bar-and-space patterns per the ISO/IEC 16388 character set, wrapped in `*` start/stop characters — replaced the old decorative random-width bars 2026-09-22), centered with the charge number underneath it. The separate "Details" button still navigates to the job page. A demo-only **role filter dropdown** (red-outlined `select-error` + an inline "Demo role:" label — replaced the small "Demo only" badge 2026-09-23 for visibility, defaults to **Welding**) filters by `assignedRoles`; also a keyword filter, banner, horizontal scroll on narrow windows (`min-width: 62rem`). `expirationDate` is seeded 0-6 days out (always within a week). No "Assigned To" column (removed; it previously showed a hardcoded "John Johnson", not `a.assignedTo`). **XREFID is blanked on ~25% of rows** (`i % 4 === 0`, same pattern as Weld Planning's records) to mimic real imperfect data; the Details button therefore looks the job up by **hull + drawing + joint** (the true identity key), never by the assignment's own `jobId` copy, which may be blank. A blank XREFID does **not** by itself mean shipboard work — most such records still track to a shop/bay like any other assignment. Only **two** assignments (`assignments.ts`, `toShip()`) get the shipboard-location treatment: Location = 'Ship', and the expanded row shows **Deck / Frame / P/S / CL (centerline offset) / Usage** instead of Specific Location — on its own forced second line (`class="w-full ..."`, fixed 2026-09-23) below Assigned By/Date/Job Description/details/Charge, which now always ends the first line since it's unconditional and Deck/Frame/etc. only render for these two records. One is guaranteed to be the earliest-due Welding assignment (so it's visible near the top of the default view); the other is picked from elsewhere among the blank-XREFID records for variety.
- History: leftmost icon-only chevron column (expand/collapse), then **Routing, Action**, When, Who, **Value** (was Old value/New value — Old value dropped 2026-09-23: it was dash almost everywhere in practice, see below), XREFID, Hull, Drawing, Joint, Order, **Deprogress**, then a trailing details-button column (small primary icon button, same pattern as My Assignments' — plain XREFID text is no longer itself a clickable link, replaced 2026-09-23 since the whole-cell link was an easy accidental-click target; opening it sets `?from=history` so Back/sign-off returns to History instead of the Pipe Welding table, via `backDestination()` in `joint-page.component.ts`). Identity columns (XREFID/Hull/Drawing/Joint/Order) are sized to their real fixed-length content in `ch` units, not a blanket rem width. Every column has its own filter via `appSortHeader` (text, or a multiselect for Routing) alongside the top-bar Person/XREFID/search filters — the filter inputs show a small filter icon instead of "Filter…" placeholder text, which was clipping to "Fil"/a single letter in the narrow identity columns. Filters: person typeahead; **a job box that matches XREFID, drawing, joint or order** (not hull); and a right-hand **Search all** box covering every column and the sign-off field values. **It records what was input at each sign-off**: a sign-off row expands (per row, or **Expand all / Collapse all** for every sign-off matching the filters) to every editable field the user was shown, with its value at that moment, blanks included; each field row repeats the sign-off's When, Who, Routing, XREFID, Hull, Drawing and Joint in muted text so it reads on its own (`HistoryEntry.inputs`, built by `snapshotInputs()` in `workflow.ts`, from the job page's `signoffSnapshot()`). Read-only/derived fields (PH/IP limits, overrides, locked Weld Process, disabled fields) are not listed. Per-field edits (sections Stages/Fabrication) are still logged but **hidden** here. **Person filter is a typeahead** (`searchPeople`: first/last name prefixes in any order, or id). CSV has one line per field, including Drawing/Joint/Order alongside XREFID/Hull. Each entry carries `whoId`/`whoTitle`, stamped in `withHistory` via `stampWho()`.
  - **`routing` is the stage the action was *for*, not what it moved to afterward** (fixed 2026-09-23): `withHistory()` (now on `WorkflowStore`, was on `RoutingService` before the 2026-09-22 service split) derives it from `currentRoutingLabel(prev.stages)` (pre-update state) instead of `next.stages` — a `'Fit — Signed off'` entry used to record whatever became active next (e.g. `'Tack'`) instead of `'Fit'`. `seededWorkflow()`'s own entries already got this right (`routing: s.label`); `mock-history.ts`'s generator was fixed the same way (records `stage.label`, not the next stage).
  - **Old value dropped** (2026-09-23): the only field types that ever populated `from` either never reach the grid (Stages/Fabrication are filtered out of `allActivity()`) or belonged to the dead Work Validation feature (see below), aside from one edge case (pre-signoff Decision flip-flopping) not worth a whole column.
  - **Routing filter sorts by workflow order**, not alphabetically (`routingOrder` in `work-history.component.ts`: each stage's first-appearance index across every trade's `getTemplates()`); anything not a real stage (e.g. `'All stages complete'`) sorts to the end.
  - **Deprogress is offered only on a job's last sign-off still in effect** (`deprogressable`: whole history, independent of filter/sort; a re-open cancels the sign-off before it; must match the live workflow's last signed stage — only when that live workflow actually *has* a signed stage to compare against: `lastSignedLabel.has(jobId)` used to be true even for a job whose live workflow was merely instantiated with nothing signed (e.g. just from appearing in the Pipe Welding table), which silently hid Deprogress on jobs whose real history is the mock fallback; fixed 2026-09-23). Clicking it now opens the shared **confirm modal** (`ConfirmService.textInput`) for the required reason, instead of an inline input/Go/Cancel row in the cell.
  - **Mock history realism fixes** (2026-09-23, all in `data/mock-history.ts`): dropped `Component added`/`Validation notes` entries (Work Validation has no UI anywhere in `joint-page` anymore — nothing can produce them); only stages with a `rejectToStage` ever get a SAT/UNSAT decision (matches the real signoff panel's auto-accept for the rest) and an UNSAT stops the mock sign-off chain there instead of pretending later stages were reached; `Attachment added` only fires when the current stage is one that actually shows Attachments (`isNdtStageId`, mirrors `joint-page`'s `isNdtStage`); free-text fields with no plausible value (Comments/Notes) pick from a small sentence pool instead of the literal fallback string `'recorded'`.
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
  section: 'Sign-off' | 'Stages' | 'Attachments' | 'Fabrication' | 'Release';
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
  ship: string;        // 3-digit, e.g. 692 — stable per hull, shown above Hull in Joint Details
  hull: string;        // letter + 4 digits, e.g. K7234 — shared by many jobs
  // identity: id  OR  (hull + drawing + joint), each unique — xrefid is display-only, not an identity key
  trade: string;       // 'Welding'
  technician: string;
  drawing: string; drawingRev: string; joint: string; jointDesign: string; weldType: string;
  pipeSize: string; wallThickness: string;
  materialType1: string; materialType2: string; mcl1: string; mcl2: string;
  // materialType1/2 use MATERIALS_1/MATERIALS_2 (jobs.ts, exported) -- same codes as Weld Engineering's
  // Procedure.baseMetal1Type/baseMetal2Type (data/procedures.ts), matched by gwpOptionsForMaterials()
  joiningItem: string; joinToItem: string;   // piece-mark style codes, e.g. HPF-D120-1; comma-separated in affectedItems
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
- **Affected Items** — `joiningItem`/`joinToItem` with `affectedItems` stored as a comma-separated string. Each affected item's MIC 1/MIC 2 line (`signoff-panel.component.ts`) reads the real MIC value from `fabricationData.id1`/`id2`, and only shows when that item's MCL requires traceability per the admin MCL Traceability table (`requiresTraceability()`, `mcl-traceability.ts`) — fixed 2026-09-23: it was previously showing `job.mcl1`/`mcl2` (the MCL code) mislabeled "MIC:", unconditionally. Its "MIC verified" checkbox (`micVerified1`/`micVerified2`, weld build-up only) is required with a red `*` whenever shown, and `validateStageFields()` (`joint-page.component.ts`) now gates that requirement on the same traceability condition instead of unconditionally requiring it for any selected affected item — fixed 2026-09-23, the earlier unconditional check could permanently block signoff on a checkbox the user was never shown.
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

- **Fabrication select labels**: `Location` and `Revised Joint Design` options exist only at runtime (`withRuntimeOptions()` in `joint-page`); the static `FABRICATION_FIELDS` entries have none. Any place that shows a fabrication value (e.g. Fit-Up Insp verification grid) must resolve its label through that helper, or it shows the raw stored code (`bj-g` instead of `BJ-G`).
- **Consumable insert vs filler metal choices**: they share `METAL_TYPE_OPTIONS` / `METAL_SIZE_OPTIONS` (`workflow.ts`) because "Only Consumable Insert used as filler" copies the Fit stage's insert type/size into the filler fields. If the two lists ever differ, a copied value that is missing from the filler list renders as a blank select. Keep them one list.
- **Filler metal option values, two representations**: `procedures.ts`'s `FILLER_METAL_TYPE_OPTIONS`/`FILLER_METAL_SIZE_OPTIONS` (lowercase `value`, e.g. `'mil-70s-3'`) must stay in sync with `workflow.ts`'s duplicated `METAL_TYPE_OPTIONS`/`METAL_SIZE_OPTIONS` — duplicated rather than imported to avoid a circular import (`procedures.ts` already imports `workflow.ts` for `getWeldPositions()`). A `Procedure.fillerMetalTypes`/`fillerMetalSizes` entry that doesn't match one of workflow.ts's option values will silently never appear as a valid choice in Weld Record. This is separate from `FILLER_METAL_TYPES` (label-cased, e.g. `'MIL-70S-3'`), which only feeds the unrelated free-text Classification field.
- **Weld build-up's field list is rebuilt, not reused**: `visibleFields()` (`joint-page.component.ts`) special-cases Fit's `weld-buildup` routing by rebuilding the field list from the raw Tack template rather than `stage.fields` (a change-detection timing issue, see the function's own comment). That rebuild must explicitly include anything Tack gets appended at `buildStages()` time that Fit itself doesn't (currently `WELD_OVERRIDE_FIELDS`, since `isWeldStage` there doesn't count `'fit'`) — override fields were missing entirely on weld build-up until fixed 2026-09-23, the same shape of bug as the earlier GWP/WTN-blank-on-weld-build-up fix. Same for N Ind./traceability-gated fields (`weldPosition`, `consumableInsertId`, `backingRingId`): the rebuild runs through the same `.filter()` as the normal path, so those stay correctly gated.
- **`SignoffRecord.fields` labels**: `SignoffService` (signStage/reopenStage) and `RoutingService` (forceRouting/goBackRouting) build these from the raw `stage.inputs`/`stage.signoffInputs` key/value pairs, not from the properly-labeled `SignoffInput[]` the caller may pass in. Always resolve the display label via the `labelFor(stage, key)` helper — exported from `data/workflow.ts` alongside `show()` (the History Old/New em-dash formatter) so every service that logs history uses the same two helpers instead of each keeping its own copy (falls back to the field's key only if no matching `StageField`/`SignoffField` is found) — fixed 2026-09-21 after Signoff History showed raw keys like `consumableInsertType` instead of "Consumable Insert Type".
