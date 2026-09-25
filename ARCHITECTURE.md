# Welding — Architecture & Component Reference

Welding is a **welding work-order & inspection manager** (prototype). Single-page Angular app with **no backend** — all data is in-memory or `localStorage`.

For the routing rules in plain language (every step, NDT, repairs, Cut, and what's required to sign each step), see **[ROUTING.md](ROUTING.md)**. Keep it in step with any routing change.

## Demo toggles (flipped often)

| Toggle | Where | On | Off |
|---|---|---|---|
| **NO MIKE** | `noMike` in `weld-record/makeup/makeup.component.ts` | `true`: the Makeup page shows only a big "NO MIKE" (a joke among friends). The menu entry still says "Makeup". | `false`: the real Makeup page (grid, search, 90-day cap) renders as normal. |

The real Makeup template is still in `makeup.component.html`, inside the `@else` branch of `@if (noMike)`. To remove the joke for good, delete the `noMike` field, the `@if (noMike) { ... } @else {` opening lines at the top of the template, and the single closing `}` on its last line. Nothing else depends on it.

## Stack

- **Angular 19** — standalone components, signals, modern control flow
- **DaisyUI 5** (on Tailwind CSS 4) — all 32 built-in themes enabled via `themes: all`
- **Lucide Angular** — icons
- **No PrimeNG, no server, no database.** All data is mock or localStorage.

## Terminology

| Term | Meaning |
|---|---|
| **Hull** | The record a job belongs to (`job.hull`, S, T, D or N + 4 digits, e.g. `S7234`; letters limited to those 2026-09-25). **Not unique** — many jobs share a hull. Replaces the old "Project" / job number / title. There is no job `title` and no joint `title` either. |
| **XREFID** | The user-facing identifier shown everywhere (`job.xrefid`), 5-char alphanumeric, matching `job.id` when present. **Blank on ~25% of jobs** (`i % 4 === 0`), same imperfect-source-data pattern as My Assignments and Weld Planning; `job.id` itself is a separate, always-populated internal key (never shown) that routing, workflow lookups, and row selection use, so a blank XREFID never breaks navigation or workflow state. Renders **blank**, not a `'—'` placeholder, on the Weld Record table and Advanced Search lists (fixed 2026-09-22 — the dash was only a display fallback, never a real value, and read as if it were stored data); Joint Details keeps its own `'—'` fallback since that's a single-value detail view, not a list. |
| **Drawing** | Letter + 3 digits, dash, 4 digits, e.g. `H711-1234` or `S753-0116` (dash added 2026-09-25, weld-joints key v8->v9) (`job.drawing`, weld-joint `drawing`); both `H` and `S` prefixes appear in seed data. |
| **Serial number** | 9 digits starting with 1 or 2, then `A`, e.g. `229348951A` (`job.serialNumber`). **Blank whenever XREFID is blank** — neither was captured for that record. |
| **Joint number** (`jointNumber`) | **Removed 2026-09-23.** Was a separate Weld Planning field (2-letter prefix, hyphen, 5 digits, e.g. `ST-00001`) sitting right next to `joint` (also system-joint format), reading as a near-duplicate. Briefly relabeled "System" the same day before the user decided to drop it outright rather than just rename it — "just get rid of the other." Removed from `WeldJoint` and every UI surface (create/edit form, detail page, Advanced Search filter/results columns, mass-edit paste box/table/CSV/validation); `joint` is now the required, sole identity field everywhere `jointNumber` used to be checked or matched (mass-edit's paste-to-find, save validation, list/detail page titles). |
| **Joint (system-joint)** | The weld record's own `joint` field (`job.joint` and Weld Planning's separate `WeldJoint.joint`) — 2-letter system code, hyphen, 5 digits, e.g. `ST-10005` (seed system codes: ST/SW/FW/FO/LO/HV, my own unreviewed pick). Was previously free text (`J-001`); changed 2026-09-21, dropped the stray `J` before the digits 2026-09-22. |
| **Job identity** | A job is identified by **either** its XREFID **or** the unique combination of **hull + drawing + joint**. Never use hull alone as an identifier (labels/pickers show hull · drawing · joint). |
| **Routing** | The ordered sequence of stages for a job, and the label of the current one (`currentRouting`). Replaces the old "Step". |
| **Stage** | One unit of a routing (`WorkflowStage`): Fit, Tack, Root, NDT, … |
| **GWP** (Governing WPS) | Label of the `weldProcedure` field. Groups several Weld Engineering `Procedure` rows, one per WTN (e.g. GWP `W-101` covers WTN `05.5-1`, `05.5-2`, `05.5A-3`, each its own WPS document/PDF). A GWP's base metal 1/2 is fixed across all its WTN rows; Weld Record's GWP droplist is filtered to whichever GWPs match the job's Material Type 1/2 (`gwpOptionsForMaterials()` in `data/procedures.ts`). GWP and WTN option labels are `<code> · <description>` and the selected one's description shows under the field (`procedureDescription()`, e.g. "Semiautomatic GTAW of 02-CS and 01-E60 using MIL-70S-6 for Surface Structure"; the GWP version drops the filler and reads off the GWP's first WPS row); the stored value stays the bare code. Picking a WTN then drives Weld Process, PH/IP requirements and override values by looking up the matching `Procedure` row — see "Weld Engineering" below. |
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

The "new version available" Reload button does NOT clear saved data; only a `CURRENT_VERSION` change does (on the next load). `CURRENT_VERSION` in `src/app/weld-record/services/workflow-store.service.ts` (2.10.9 as of 2026-09-24): bump when stage definitions, field names, data models, or seed data structure change. On mismatch the app clears the caches listed in `clearStaleCaches()` (`data/storage-keys.ts`).

## Deploy

Vercel (`vercel.json`), build output `dist/primeng-search-demo/browser`. The production build registers Angular's Service Worker (`serviceWorker: ngsw-config.json` under the `production` configuration in `angular.json`); `app.component.ts` uses `SwUpdate` for the "new version available" reload prompt. Offline caching itself isn't otherwise exercised as a demo feature yet, but the update-check plumbing is real and user-facing. `vercel.json`'s rewrite must exclude real static files (`ngsw.json`, `ngsw-worker.js`, hashed bundle files, `public/`'s icons/manifest) from the SPA catch-all, or the service worker's own update-manifest request (`/ngsw.json`) gets rewritten to `index.html` instead of the real file, which the SW can't parse as JSON — it retries forever (visible in DevTools Network as endless failed `ngsw.json?ngsw-cache-bust=...` requests) and can get stuck serving a stale cached build indefinitely. **Fixed 2026-09-23** (found while chasing an intermittent My Assignments click bug that turned out to be a stale-cache red herring, not a real code issue): the rewrite's `source` now excludes any path ending in a file extension (`/((?!.*\.[a-zA-Z0-9]+$).*)`) instead of blanket-matching everything (`/(.*)`), the standard SPA-hosting pattern (same idea as nginx's `try_files $uri $uri/ /index.html;`) — only extensionless paths (real app routes; nothing in this app's routes has a dot) fall back to `index.html`.

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
| `SignoffService` | Locking/reopening a stage's sign-off (`signStage`, `reopenStage`, `updateStageSignoff`, `correctStage`), Fit-Up release, and the side effects a sign-off can trigger: defer-tack, fit-up-release activation, Interim Layer and Records Review UNSAT staying put, NDT reject adding a Repair round (Repair #), Repair's own routing (Grind Only, Weld Repair → Excavation NDT, Cut → start over from Fit with Refit #), and Excavation NDT's routing. See ROUTING.md for the rules. |
| `AttachmentService` | `addAttachment`/`removeAttachment`. |
| `FabricationDataService` | `setFabricationData` — cross-stage Welding fields, unrelated to any one stage. |
| `DeviationService` | `record` (accepted deviations, saved on `JobWorkflow.deviations` with a 'Deviation' History entry), `openDeviations`, `isOnHold`. What counts as a deviation is `detectDeviations()` in `data/deviations.ts`. See "Deviations" below. |

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
next to their source (`*.spec.ts`). Coverage is currently thin and growing incrementally — 70 specs as of
2026-09-24, most of them in `weld-record/services/` (routing, repairs, Cut, NDT steps in
`signoff.service.spec.ts`) and `data/procedures.spec.ts`; most other modules (admin CRUD, filter-schema, the
screen components) still have none. When you touch a module that
lacks a spec file, adding one is in scope for that change, not a separate task.

## Folder map

```
src/app/
  app.component.*        Shell: top nav + <router-outlet>. System dropdowns / flatten button, theme picker, PWA update prompt.
  app.routes.ts          URL → screen mapping

  weld-record/            All Weld Record (EWR) screens + their admin pages, grouped under one folder (moved
                          here 2026-09-23 — was 24 flat top-level folders; every admin-* folder turned out to
                          belong to Weld Record specifically, none to Weld Planning). Nesting is purely file
                          location — routes/URLs/component names are unchanged.
    pipe-search/           Pipe Welding — the deliberately simple, fast job table (filters, role, CSV, banner)
    adaptive-search/       Advanced Search — schema-driven filter bar + saved variants + column picker (for everyone else)
    work-history/          History — audit-trail activity log with deprogress
    my-assignments/        My Assignments — assignment list with keyword search
    makeup/                Makeup — acting-foreman grants, flat grid (see Signoff panel section); `noMike` toggle, see Demo toggles
    joint-page/            Job detail — routing bar, joint details, fabrication, signoff, records review
    routing-bar/           Horizontal numbered routing pills (auto-scrolls to the selected stage)
    joint-details/         Read-only joint/NDT/additional data panel
    fabrication/           Cross-stage fabrication fields (Welding)
    signoff-panel/         Per-stage signoff form (weld layout is config-driven, see below)
    deviation-dialog/      Deviation acceptance screen Signoff opens when the stage has deviations
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
      deviation.service.ts  Accepted deviations + the hold they put on the joint.
      sync.service.ts      Online/offline + pending-sync count (stubbed)
    admin/
      admin-routing/         Admin → Routing (stage templates per trade)
      admin-set-routing/     Admin → Set routing (force a job's stage)
      admin-routing-options/ Admin → Routing options (per-stage Type dropdown options)
      admin-signoff-fields/  Admin → Signoff fields
      admin-characteristics/ Admin → Attribute codes
      admin-material-traceability/, admin-material-classification/, admin-ndt/, admin-locations/,
      admin-weld-positions/, admin-joint-designs/, admin-banner/, admin-teams/, admin-quick-links/,
      admin-qualifications/  Other admin pages

  weld-planning/          Weld Planning — joints list/form/detail/mass-edit/admin/advanced-search (own data in
                          weld-planning.data.ts; own filter engine in weld-planning-filter-schema.ts). Its own
                          admin screen (weld-planning-admin.component.ts) lives inside this folder, not split out.
                          No services/ yet — addWeldJoint()/updateWeldJoint() are called straight from the form
                          component since there's no business logic beyond persistence today; add one once
                          create-time rules exist (see "Weld Record services" above for the pattern to follow —
                          one store for state/persistence, one service per domain concern on top of it).

  weld-engineering/       Weld Engineering — Procedure Lookup (added 2026-09-23). Own data in data/procedures.ts.
                          One Procedure row per GWP+WTN pair (id `<gwp>-<n>`, e.g. `W-101-2`); a GWP's base
                          metal 1/2 is fixed across its WTN rows, 1-3 GWPs (2-4 WTNs each) per Material Type 1 x
                          Material Type 2 combination (same codes as Job.materialType1/2, see "GWP" in Terminology).
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
    person-search-input.component   Free-text field with a people-directory search assist (name/PERN/id);
                       used by Probationary/Oversight Inspector (see Signoff panel section).
```

## Routes

| Route | Screen |
|---|---|
| `/pipe-search` | Pipe Welding (default) |
| `/history` | History (`?job=<id>` deep-link) |
| `/adaptive` | Advanced Search |
| `/jobs/:id` | Job detail (`?from=assignments` or `?from=history` returns there after Back/signoff; default is Pipe Welding — `backDestination()` in `joint-page.component.ts`) |
| `/assignments` | My Assignments |
| `/changelog` | Change Log (Quick Links menu): plain-language list of changes from 2026-09-21 on, newest first, data in `data/changelog.ts`. **Add an entry with every user-facing change.** |
| `/admin/routing`, `/admin/set-routing`, `/admin/routing-options` | Routing admin |
| `/admin/*` | Other admin pages (signoff-fields, characteristics, ndt, locations, weld-positions, banner, joint-designs, teams, qualifications, material-traceability) |
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

Pre-Fit (conditional) → Fit → Tack → Fit-Up Insp → Fit-Up Release (conditional) → Deferred Tack (conditional) → Root → Root NDT → Layer → Layer NDT → Final Weld → Final NDT → **O63 Records Review** *or* **O04 Records Review** → Sold. Repair (and Excavation NDT) rounds are inserted at runtime after a failed NDT stage.

Each phase's NDT is 1–3 stages from the `ndtStage(phase, kind)` templates, in VT/5X → MT/PT → UT/RT order, chosen per job by `jobNdtSteps()` (see "NDT routing" under Data patterns, and ROUTING.md's chart).

Records Review is exactly one of two stages, chosen by `buildStages()` (`data/workflow.ts`, Welding filter) from the job's own data — never both: **O63** (`review-o63`) when any of `job.sfff`, `job.dssAaa`, `job.ss` is set; **O04** (`review-o04`) otherwise. Split from a single `review` stage 2026-09-22. Both share identical fields/behavior — only the id/label differ. Their `rejectToStage: 'final-ndt-vt5x'` is kept only so the SAT/UNSAT choice shows (`hasDecision()`); UNSAT doesn't route anywhere (2026-09-24, see "NDT routing").

## Screens

### Pipe Welding (`pipe-search`)
- Deliberately the "dumb", fast version. Layout: `table-page-wrap` (fixed header/filters, scrollable table).
- Columns: XREFID, Hull, Drawing, Joint, Order, Sequence, Current routing, Actions — sortable, with per-column filters via `appSortHeader`.
- Role dropdown, CSV export (right-aligned, next to the keyword search box — moved 2026-09-23), page-size selector, admin banner pill, frozen Actions column on mobile.
- Persists filter/sort/page/role to `STORAGE.searchState`.

### Advanced Search (`adaptive-search`)
- For everyone who needs more than Pipe Welding: schema-driven filter bar, saved variants, column picker, CSV export. All NDT and additional-data fields.
- Text filters carry a `{ text, negate }` value (`TextFilterValue` in `data/filter-schema.ts`) toggled by a **funnel icon button** joined to the left of the input (2026-09-24, replaced a 9.5rem Contains / Does not contain select that made the filter bar wrap): plain funnel = Contains, red funnel-X = Does not contain; tooltip and the empty-input placeholder ("Contains…" / "Does not contain…") say it in words, and the chip reads `Hull: not "K72"`. Old saved variants (plain-string text values) are migrated to the new shape on load in `loadVariants()`.
- **Compact layout** (2026-09-24, both this screen and Weld Planning's Advanced Search, kept identical): three bands instead of five. (1) Header line: title, **Variant droplist** (choosing one applies it; trash button deletes the chosen one and only shows when one is chosen; "Save variant…" reveals the name box + Save/Cancel, prefilled with the chosen variant's name so re-saving overwrites it; Enter saves, Esc cancels), then Adapt filters / Reset on the right (Reset also clears the chosen variant). (2) Filter bar with tighter padding (`.facet-row-compact` in `styles.css`, only these two screens). (3) Results line: match count, **active filter chips inline** (was its own row that pushed the table down), Columns / Export.

### Job detail (`joint-page`)
- **Routing bar** — numbered pills, horizontal scroll, auto-centers the selected stage. Active = `--color-success`, done = `--color-info`.
- **Joint details** — 3 columns (stack on mobile): job info (XREFID, **Ship** — 3-digit, added 2026-09-23, sits right above Hull —, Hull, ...), joining/join-to (MCL 1/2, Material Type 1/2, Joining/Join To Item — 1 letter + 8 digits + hyphen + 2 digits, e.g. `S12341001-14` (user-specified format, 2026-09-23, replacing the earlier invented piece-mark style like `HPF-D120-1`; leading letter still varies, still invented, not a real area-code scheme), NDT data (RT Root/Final and NDT Root/Each/Final shown exactly as stored, 2026-09-24; UT/VT still shown as `X`/`5X` derived from `job.ndt`'s free text by `ndtLabel()`); "Show more" reveals additional data and attribute codes. Attribute codes show as `code description` (`attrCodeDisplay()`, looked up via `characteristicLabel()` in `data/characteristics.ts`, the same table Admin > Attribute Codes manages) — fixed 2026-09-22: `job.attributeCode1-4`'s seed pool used to be unrelated 2-letter codes (`AB`, `CD`, …) that never matched `CHARACTERISTIC_CODES`' real codes, so descriptions could never resolve; `ATTR_CODES` in `jobs.ts` now reuses `CHARACTERISTIC_CODES`' own codes.
- **Fabrication** (cross-stage) — Location, MIC 1/2, Drawing Rev, Actual Thickness (all required with red `*`; Ship adds Deck/Frame/P-S-CL/Usage, also required with red `*`), WTN, Revised Joint Design. Location/MIC 1/2/Drawing Rev/Actual Thickness were already enforced before Fit could sign off (`FIT_REQUIRED_FABRICATION`) but had no star and no inline error until 2026-09-23 — MIC 1/MIC 2 only when that joint member's MCL requires traceability (same condition that hides the field entirely, see "Affected Items" below), matching `fabFields()`'s own filtering.
- **Signoff panel** (below).
- **Top nav menus** — one open at a time; they close on outside click or when a real (non-disabled) link is chosen, and collapse their nested Admin submenu (`closeAll()` in `app.component.ts`). Each group's Admin submenu (`.submenu` in `app.component.scss`) caps at `max-height: calc(100vh - 5rem)` with `overflow-y: auto` — fixed 2026-09-23 after Weld Record's Admin submenu (12 items) grew past the viewport with no way to reach the bottom entries; the fix is shared by all four nav groups since they use the same class.
- **Flatten button** (list/tree icon next to the system name, 2026-09-24) — one global on/off (`flatNav` in `app.component.ts`). When on, the top bar swaps the four system dropdowns for the **active system's** own items laid out flat, with that system's Admin as its one dropdown: Weld Engineering (Procedure Lookup + Admin), Weld Planning (Joint Search, Import Joints, Advanced Search + Admin), Weld Dispatch (all disabled + Admin), Weld Record (My Assignments … Makeup + Admin). The active system is `systemForUrl()`: `/weld-planning`, `/weld-assignment`, `/weld-engineering` map to their systems, **everything else is Weld Record** (Makeup, Hull Details, `/admin/*`). So a route in a new system needs a line there, or it'll be treated as Weld Record. Navigating across systems while flattened (e.g. Quick Links > Manage Quick Links) flattens the new system instead. Procedure Lookup and Joint Search use `exact: true` link matching, so they don't highlight while you're on their Admin pages (or their detail pages).
- **Records Retention Review** (`review-o63` / `review-o04` stages — split 2026-09-22, see "Welding stages" above; roles **O63 Records** / **O04 Records** — split from one "Records Retention" role 2026-09-22, itself renamed from "Records" 2026-09-21, since O63 and O04 are reviewed by different groups of people; `sold` follows whichever track the job went through) — verification grid + immutable `signoffRecords` history table.
- **Sold** — once signed all stages lock; only deprogress is allowed (Work History, most recent signoff per job).
- **Unsigned edits are discarded on leaving, with a warning if there are any** — `canDeactivateGuard` (`shared/can-deactivate.guard.ts`) calls `JointPageComponent.canDeactivate()`, which now compares the live workflow against a snapshot taken on load (`loadSnapshot`/`hasUnsavedChanges()`) covering *every* unsigned stage's inputs/signoffInputs/routingType **and** `fabricationData` — not just the one stage the user last touched. `ngOnDestroy()` reverts all of that back to the snapshot for any stage that's still unsigned (and Fab data, unless the Fit stage got signed this visit) once the route actually changes, whether the user confirmed the warning or there was nothing to warn about. Before this fix (session ending 2026-09-23), Fab data was written straight into the persisted workflow on blur with no revert at all, so it silently survived navigating away without signing.

### Signoff panel (`signoff-panel`)
- **Type dropdown** for stages with `routingOptions`. On inspector/NDT stages it starts **blank**, is required (`*`), and signing is blocked until chosen (`inspectionTypeRequired`) — unless the Joint Details values lock it to one method, in which case it's pre-filled, disabled, and explained underneath (`typeLockNote()`, e.g. "Set by NDT Each (MT)"; Excavation NDT: "Same inspection that rejected the joint").
- **Weld stages** (Tack, Root, Layer, Final Weld, Fit weld build-up) render from the `WELD_GROUPS` config in `signoff-panel.component.ts` — four cards (only "Preheat/Interpass" has a header, renamed from "PH/IP" 2026-09-23 — group header only, field labels unchanged; the other three are untitled at the user's request, including "Readings" — un-headered 2026-09-22) — through one field template, restructured 2026-09-22 so PH/IP requirements and actuals share one dedicated card instead of being split across the signoffs and Readings cards:
  1. **Signoffs** (untitled) — GWP / WTN / Weld Process, Qualification Check, **Consumable Insert checkbox** (Root only: added to Layer 2026-09-23, removed again 2026-09-24 at the user's request, CURRENT_VERSION 2.10.5; unchecking clears filler type/size/MIC) directly above **Filler Metal** (both moved here from Readings, checkbox positioned immediately above the fields it affects). GWP/WTN/Weld Process/PH-IP/override values cascade from Weld Engineering's procedures data (integrated 2026-09-23, `data/procedures.ts` + `joint-page.component.ts`), replacing the old static `WTN_PROCESS_MAP`/`WTN_PHIP_MAP`/`WTN_OVERRIDE_WTNS`/`WTN_OVERRIDE_VALUES`: the GWP droplist (`withStageRuntimeOptions()`) is filtered to GWPs matching the job's Material Type 1/2 (`gwpOptionsForMaterials()`); picking a GWP narrows WTN's droplist to that GWP's WTNs (`wtnOptionsForGwp()`); picking a WTN looks up the matching WPS (`getProcedureByGwpWtn()`) and sets Weld Process (locked, `isFieldLocked()` already treated it as WTN-driven), PH Min/Max, IP Min/Max, and the override fields (blank unless that WPS has `hasOverride()` true) — see `stageSelectChange()`. Filler Metal Type/Size cascade the same way, filtered (not auto-filled) to the resolved WPS's valid values (see "Weld Engineering" above); a selection that's no longer valid after a GWP/WTN change is cleared. **Fixed 2026-09-23**: when the Consumable Insert checkbox is on (fields locked, `isFieldLocked()`), `withStageRuntimeOptions()` now shows the *full* `FILLER_METAL_TYPE_OPTIONS`/`FILLER_METAL_SIZE_OPTIONS` set instead of the current WPS's narrower cascade — the copied value (from Fit's Consumable Insert Type/Size) commonly isn't in that WPS's valid subset, so the locked select had no matching `<option>` and rendered blank even though the underlying value was set correctly. The field isn't user-selectable while locked, so the WPS-specific filtering was never doing anything useful there anyway.
     - **Qualification Check** (2026-09-25, `data/welder-quals.ts`): 20 quals `WELD4NN` (`WELDER_QUALS`, ordered most to least common; `QUAL_WEIGHTS` 6 common / 6 moderate / 8 rare). Each seeded WPS requires 1-3 of them (`pickQuals()` in `procedures.ts`, own `seeded(4242)` sequence so no other seeded value moved; procedures key v7->v8). The Manage Procedures form picks quals from that list instead of free text (bulk import stays free text). There's no login, so the check is against one **Test User** whose quals are set in **Admin > Qualifications** (route `/admin/qualifications`, folder `admin-qualifications/`, `STORAGE.welderQuals`); default = the 12 common/moderate quals, none of the rare ones. `qualCheck()` shows "Select a GWP and WTN..." until both resolve to a WPS, "Passed, user has WELD4.., ..." (normal text), or "Failed. Input disabled, qualifications ... missing" (red, bold). **The check blocks nothing**: inputs and Sign stay enabled on a failure, same as the old hardcoded placeholder.
  2. **Preheat/Interpass** — Requirements (limits), then **Override Requirements** (hidden and not filled in since 2026-09-24 via `SHOW_WELD_OVERRIDES = false` in `workflow.ts`; kept intact because how an override applies is unsettled, likely it replaces the requirement shown) incl. Override Note (all read-only, set from the WTN; `NC` = no limit; shown only when the selected WPS has override values), then Actuals (reordered 2026-09-23 — Override had drifted to after Actuals; should read Requirements → Override → Actuals).
  3. **Readings** (untitled) — weld position, required with a red `*` whenever shown. Its row only renders when Nuclear Indicator is `'1'` (`WELD_GROUPS`' own `when` clause here, independent of the field's `showIf`); `visibleFields()` (`joint-page.component.ts`) excludes the `weldPosition` key the same way for any other N Ind. value, so required-ness/validation stay in step with what's actually on screen — this was a real regression during the 2026-09-23 requiredness pass (required was briefly made unconditional, which blocked signoff on every non-N-Ind-1 job) before being caught and fixed the same day.
  4. (untitled) — 5X (**Root only**, as of 2026-09-23 — was Root/Final Weld), Comments.
- **Fit/Pre-Fit's own signoff fields** (`(st.id === 'fit' || st.id === 'pre-fit') && !isFitBuildup(st)`, own `signoff-fit-row` flex layout, not the generic loop below): Consumable Insert Type/Size/MIC on one row, Backing Ring Type/MIC on the next — shown only when the effective joint design (Revised Joint Design if set, else the job's own Joint Design; `jointDesignRequiresInsert()`/`jointDesignRequiresBackingRing()`, `joint-designs.ts`) calls for that group. Within a shown group, Type/Size (and Backing Ring Type) are always required; the MIC field is required only when *also* either joint member's MCL requires traceability (`SignoffPanelComponent.micSignoffRequired()`) — same condition gates its red `*`. Fit only, below that: **Defer Tack** checkbox, then **Comments** (Defer Tack renders first — fixed 2026-09-23, it had been below Comments). Pre-Fit has no Defer Tack (no Tack exists yet to defer) but does get the same fullWidth Comments. Pre-Fit's own stage `fields` is empty — these are `signoffFields`, same as Fit — fixed 2026-09-23: they used to live under Pre-Fit's `fields` (a separate copy, no `required`, rendered through the generic field grid instead of this layout, never gated by joint design at all) rather than reusing Fit's rules.
- **`isFitBuildup(st)`** (`SignoffPanelComponent`) is the one place that decides "is this Fit routed as Weld Build-up" — every fit-specific block in this template calls it instead of repeating `st.id === 'fit' && st.routingType === 'weld-buildup'` inline. Introduced 2026-09-23 after the inline checks drifted out of sync: the "Default: one per row" fallback's condition was only "not fit-standard", so it caught weld-buildup too and rendered Defer Tack as a stray text input; the Defer Tack checkbox and the fullWidth Comments block checked `st.id === 'fit'` alone with no routing-type exclusion, so weld-buildup got a spurious Defer Tack checkbox (it has no Tack to defer) and a second, duplicate Comments box on top of the one it already gets from `WELD_GROUPS` (stage fields, section 1 above). All fixed the same day by routing every check through `isFitBuildup()`.
- Non-weld stages use the generic field loop; `showIf` / `requiredWhen` drive conditional fields.
- **PH/IP actuals** (split into four 2026-09-24: Actual PH Min/Max, Actual IP Min/Max, all required) — blur-triggered range checks against their requirement pair; NC skips that limit. `ACTUAL_REQUIREMENT` (`workflow.ts`) pairs each actual with its requirement: NC there sets the actual to NC on WTN select and locks it (`isFieldLocked`), and it clears again when the WTN/GWP changes. Actual Min above its Max is flagged on the Max field (`ACTUAL_MIN_MAX`/`actualOrderError`). Seeded PH/IP limits are round numbers (e.g. 60, 200, 300).
- **Decision** — SAT/UNSAT (or "Inspection Results" on NDT); signoff dialog needs certification + password.
- **Defect Code** (RT, UNSAT only) renders in its own row right after Decision, not above it in the general fields loop — fixed 2026-09-22, since it only applies once UNSAT is chosen, showing it first read backwards.
- **Penetrant Manufacturer** select (MT/PT) was missing `w-full` (the app's `.stage-field input { width: 100% }` rule doesn't cover `<select>`), so it shrank to its selected option's text width inside its `flex-1` half of the row — fixed 2026-09-22.
- **MT/PT's two penetrant fields are Penetrant Manufacturer + Penetrant Type** (renamed from Penetrant Brand 2026-09-23 — the old pair listed the same handful of companies twice under different labels, once as "Brand" and once as "Manufacturer"). Both now cascade from the admin-managed Penetrant table (`getPenetrants()`/`PenetrantEntry`, Admin > Penetrant — previously defined but never actually wired to this signoff field, it had its own hardcoded, redundant option lists): `penetrantManufacturerOptions()`/`penetrantTypeOptions()` in `workflow.ts` return the distinct manufacturers and distinct types across all entries, so Type reads as a real AWS-style designation (e.g. "Type I - Fluorescent") instead of a second copy of the company name. Field key `penetrantBrand` → `penetrantType`; the paired-row rendering in `signoff-panel.component.html` (renders both fields together, triggered off the first one in field order) now triggers off `penetrantManufacturer` since Manufacturer now comes first.
- **MT and PT (the `*-ndt-mtpt` stages) don't get the Attachments panel** (fixed 2026-09-23) — `JointPageComponent.isNdtStage` (and `mock-history.ts`'s mirrored `isNdtStageId`) now excludes any stage id ending `-mtpt`; UT/RT, VT/5X, Repair and Excavation NDT still get it (Excavation NDT's inclusion is inferred, not explicitly asked — it's "just" another NDT stage, so it follows the majority convention rather than MT/PT's carve-out).
- **Repair now routes somewhere specific on signoff, instead of just falling through to whatever's next** (`SignoffService.signStage()`, 2026-09-23) — checked in this priority order: **Allowable thickness exceeded** (checkbox) → reopens that phase's NDT UT/RT stage (`${phase}-ndt-utrt`); else **Grind Only** → reopens the NDT stage that failed (`originStageId`; until 2026-09-24 it went to that phase's VT/5X); else **Weld Repair** → inserts a new **Excavation NDT** stage (see below); else **Cut** → the joint **starts over from Fit** (2026-09-24, user: "we are not REOPENING anything"): every stage from Fit on is rebuilt fresh from `buildStages(job)` as on a new joint, keeping each stage's past `signoffRecords` (no "reopened" records written); earlier repair rounds stay as signed records; **Refit #** goes up by one (`JobWorkflow.refitNumber`, copied onto the job by `WorkflowStore.load()` since job records aren't saved) and a History row in the new **Refit** section records it ("Cut — routed back to Fit", to "Refit 01"). Fit-up (fabrication) data is reset to blank, and the Refit History entry keeps what it was (`fabInputs`, shown as "Fabrication before the Cut"). The **Allowable thickness exceeded** checkbox only shows when the joint has a UT/RT stage for that phase (`visibleFields()`). **Repair #** goes up by one with each new Repair round (`JobWorkflow.repairNumber`, copied onto the job at load like Refit #). **Repair Code is required** to sign Repair (2026-09-24). "Which phase" (root/layer/final), the exact rejecting stage id, and its inspection method are captured on the Repair stage's own `inputs['originPhase']`/`['originStageId']`/`['originInspectionType']` when it's created (parsed off the rejecting NDT stage, e.g. `root-ndt-mtpt` + `inspectionType: 'mt'`) — internal bookkeeping, not real `StageField`s, so none of it is rendered as a field. `stageFromTemplate()` (new, `workflow.ts`) builds a live `WorkflowStage` from a `StageTemplate` for both Repair and Excavation NDT.
- **Excavation NDT "requires the same inspection that was noted as reject"** (2026-09-23 — the excavation is the removal of the rejected material, so this stage is effectively signing off that it was cleaned out correctly, not running a fresh generic check): `excavationNdtStage(inspectionType)` (`workflow.ts`) builds its fields as `NDT_COMMON_FIELDS` **plus** whichever method's own fields the original rejection used (e.g. `mtpt`'s `penetrantManufacturer`/`penetrantType` if PT rejected it, `utrt`'s `degreeRt`/`rtFileNumber`/`defectCode` if RT did), with a **single-option Type droplist already showing that method** (`routingOptions`, same convention as Repair's fixed "Repair" Type) — not the free UT-vs-RT/MT-vs-PT/VT-vs-5X choice the original combined stage offered. `resolveExcavationInspectionType()` (`signoff.service.ts`) is the one place that decides the actual method: normally the origin's own `inspectionType`, **unless** that was **PT** and the job's material (Material Type 1 **or** 2 — either counts) is **non-ferrous or austenitic**, in which case it resolves to **5X instead of PT**. Non-ferrous/austenitic is looked up per material code from a new admin-managed table (`data/material-classification.ts`/`isNonFerrousOrAustenitic()`, Admin > Material Classification, `admin-material-classification/` — same load/save/add/remove shape as `data/mcl-traceability.ts`/Material Traceability) rather than hardcoded, since the user explicitly didn't want the metallurgy classification guessed in code. **Seed data is an unreviewed best guess** (`DEFAULT_ENTRIES` in `material-classification.ts`): SS-304/SS-316 (austenitic stainless), TI-6400/AL-1010/30-CUNI/60-INC (non-ferrous) → true; 02CS/40-AS/11CI (ferrous) and DS-2205 (duplex stainless — mixed austenitic/ferritic, not purely one or the other) → false; correct via the admin table, not a code change. Role gets the same nInd-based NQC Inspector remap every other Inspector-role NDT stage gets in `buildStages()` — applied by hand since this stage is built at runtime, bypassing that function. **Its own signoff routes onward** ("all weld repairs require the original joint inspection unless otherwise stated"): UNSAT → back to Repair (`rejectToStage: 'repair'`, same generic reject-to-stage reopen logic every other stage uses); SAT → reopens the exact NDT stage that originally rejected the joint (`resolveExcavationInspectionType()` again, same function, so creation and routing can't drift apart), or that phase's VT/5X stage when the PT/material override applies — reopened with **5X allowed and pre-selected** (`ndtKindOptions('vt5x')`, 2026-09-24), since that stage is otherwise locked to VT. **Demo aid**: a live info banner labeled "Demo only" (`JointPageComponent.repairRouteLabel()`, shared helper `originInspectionLabel()`), placed under the Signoff button, on both the Repair and Excavation NDT screens names the exact stage/method involved, so the routing is visible without signing and watching the routing bar change; always info-styled now that Cut has a defined route. Earlier the same session this was built method-less (asked explicitly, user said keep it that way) before the user came back with the fuller picture of what "requires the same inspection" meant — this supersedes that.
- **Found and fixed while building the Material Classification admin page**: `admin-material-traceability.component.ts`'s Back button used `routerLink` without importing Angular's `RouterLink` directive into the standalone component — a plain unbound attribute Angular silently ignores rather than an error, so the button rendered but never navigated. Fixed there and not repeated in the new `admin-material-classification.component.ts`.
- **Repair** (inserted automatically after any NDT stage that comes back UNSAT, `SignoffService.signStage()`; **no limit on repairs** (2026-09-24, user: "if any ndt fails, it goes to repair. period"): each round is its own stage, `repair` then `repair-2`, `repair-3`… labeled "Repair 2" etc., with its own paired `excavation-ndt[-n]` whose UNSAT goes back to that round's Repair (`isRepairStageId()`/`nextRepairStage()`/`repairIdForExcavation()` in `workflow.ts`); a new round never re-opens earlier rounds, and Cut leaves them as signed records; Excavation NDT's own UNSAT does not add a new round): a fixed single-option **Type** droplist ("Repair", nothing else — `REPAIR_STAGE.routingOptions`, 2026-09-23, following the same generic Type-dropdown convention every other `routingOptions` stage uses; Repair's role `Foreman` isn't an `Inspector` role, so `inspectionTypeRequired()` leaves it pre-filled with the default instead of a required blank choice — the same "fixed, pre-filled droplist" outcome Fit-Up Insp gets via its own hardcoded block instead), Repair Code (droplist — was radio buttons, changed 2026-09-23, user: fewer closely-spaced buttons to mis-click; still Grind Only/Weld Repair/Cut), (**no Affected Item**: added 2026-09-23 then removed 2026-09-24, user: only needed for base metal repairs, which this product doesn't cover since that's effectively a new joint), Allowable Thickness (disabled text) and its "exceeded" checkbox. **Allowable Thickness now varies by Nuclear Indicator** (`allowableThicknessText()` in `signoff.service.ts`, set when the Repair stage is created): `nInd` `'1'` (N 250-1500-1) → 3/8", `'2'` (N TP278) → 3/16" — `'3'` (Non) has no stated rule and falls back to the TP278 value, unreviewed.
- **NDT common fields (all NDT stages)**: **Probationary Inspector**/**Oversight Inspector** are required (red `*`) when **Has Probationary Inspector** is checked; **Portion of Weld Inspected** is required when **Partial** is checked (`NDT_COMMON_FIELDS` in `workflow.ts` — fixed 2026-09-23, they were optional even though `showIf`'d to only appear once their trigger checkbox was on). **Search assist** (`shared/person-search-input.component.ts`, 2026-09-23): both fields render as `app-person-search-input` instead of a plain text box — a typeahead over `PEOPLE` matching name, PERN or id (`searchPeople()`, same matching rules as Work History's/Makeup's own person filters), but the underlying value stays plain free text; picking a suggestion fills `"First Last · PERN"` and commits immediately, typing a name not in the directory and blurring still commits the raw text, same as before. `Person` gained a `pern` field (8-digit, SAP-style personnel number) for this — seeded alongside `id`, not a replacement for it. Built as a shared component (not a third copy-paste of the typeahead pattern already used by Work History and Makeup) but those two call sites weren't refactored onto it — same UI pattern, done independently.
- **Degree of RT Performed** (`degreeRt`, UT/RT stage, shown when inspection type = RT) changed from a fixed 60/360 radio to a **required** droplist (`required: true`, red `*`, 2026-09-23) over `RT_DEGREE_OPTIONS` (`workflow.ts`: blank, NA, 10, 100, 360, 60, 75) that **must equal the job's required degree** before the stage can be signed off — `Job.rtRoot` for `root-ndt-utrt`, `Job.rtFinal` for `final-ndt-utrt` (Layer never has an RT step: there's no RT Each field). Checked in both `signBlockers()` (summary reason) and `validateStageFields()` (red highlight on the field itself), same paired-rule-set convention as every other signoff requirement. The field's label gets `(Required: <value>)` appended at render time (`withStageRuntimeOptions()`) when a requirement applies. `Job.rtRoot`/`rtFinal` seed from `RT_DEGREES` in `jobs.ts` (blank, 10, 100, 360, 60, 75, NA; duplicated rather than imported from `workflow.ts` to avoid a circular import), never alongside a UT value for the same phase. A degree (not blank/NA) is also what adds the RT step itself (see "NDT routing"). Weld Planning's separate `WeldJoint.rtRoot`/`rtFinal` (blank/X/5X `NDT_MARKS`, one of its seven NDT requirement-marker fields) is a different model and was not touched.
- **Sign button** — always enabled (changed 2026-09-23, was `[disabled]="!canSignStage(st)"`): it's the only way to trigger validation and surface what's missing, so disabling it hid that feedback. `signStage()` (joint-page) still refuses to actually sign when `validateStageFields()` finds a per-field problem or `signBlockers()`/`canSignStage()` finds any other one (deliberately still no on-screen "why" text beyond the field-level highlighting below — the sticky bar and then the note beside the button were both removed earlier at the user's request). A failed attempt scrolls to and focuses the first validation error.
- **Every required field highlights red on a failed signoff attempt, everywhere** (2026-09-23): `validateStageFields()` (joint-page) is the single place that turns "this is required and missing" into a `{stageId}:{fieldKey}` entry in `fieldErrors` — covering ordinary stage fields (already existing), Fit-Up Insp's verification checkboxes, Weld Build-up's Affected Item/MIC verified, and now also Decision (`__decision`), Inspection Type (`__inspectionType`), Routing Type (`__routingType`), Fabrication-for-Fit (`__fabrication`, mirrors `fabErrors()`), and any stage's required `signoffFields` (via `requiredSignoffFields()`, shared with `signBlockers()` so the two rule sets can't drift apart — this replaced two separate copies of Fit/Pre-Fit's joint-design + traceability logic). Every template surface reads `ctx().fieldError()` to add a border (`input-error`/`select-error`/`checkbox-error`/`radio-error`) plus an inline message next to the existing red asterisk, and calls `ctx().clearFieldError()` (or the field just recomputes on blur) so the highlight clears the moment it's fixed. In passing: "Routing type \*" and "Decision \*" used an undefined `.req` CSS class with no styling anywhere in the app, so neither star was ever actually red — now `text-error` like every other required-field star.
  - **Root-cause fix in `signStage()`**: auto-accepting a non-inspection stage calls `setStageResult(stage, 'sat')` then immediately checks `canSignStage(stage)` — but `setStageResult()` writes through the store synchronously without mutating the `stage` object the click handler holds, so `canSignStage()` saw the still-falsy `.result` and `signBlockers()`'s auto-accept early return (`!stage.rejectToStage && !stage.result`) fired again, bypassing every other requirement (fabrication, signoff fields) for every auto-accept stage — Fit included, so today's earlier Consumable Insert/Backing Ring/Fabrication requiredness work was never actually enforced at the button until this was found and fixed the same day. `signStage()` now re-fetches the live stage from the store after auto-accepting, before the `canSignStage()` check.
- **Fit-Up Insp** — fixed, non-interactive **Type: Fit-Up Inspection** / **Layer: Fit** droplists at the top, one per line (added 2026-09-23, same visual convention — and layout — as the Type dropdown other inspector stages use, but disabled with a single option each since there's only ever one value for each here), then the verification grid against fabrication data, Release-to-welding checkbox.
- **Records Retention Review's embedded "Signoff History"** — same pattern as the History screen: one row per sign-off event (When, Who, Stage — Action with an expand chevron, Result badge), collapsed by default, with its own **Expand all / Collapse all**. Expanding shows the fields recorded at that sign-off. Local to `SignoffPanelComponent` (`expandedRecords`/`toggleRecord`/`toggleAllRecords`), not wired to the History screen's data or state.
- **Gotcha**: `.stage-field`'s `flex: 1 1 160px` is written for the row-based `.stage-inputs` grid, where 160px is a WIDTH basis. Reused inside a `flex flex-col` wrapper (e.g. Review's own layout), that same value becomes a HEIGHT basis and forces ~160px of dead space below short content. Don't use `.stage-field` inside a column-flex container; use a plain `<div>` (see Review's Comments field and Admin > Banner's Banner Message field, both fixed 2026-09-21).
- **Deprogress** — reverse the last signed stage with a required comment.
- **Correct** (`work-history/correct-stage-dialog.component.ts`, 2026-09-23) — fix a value already recorded on a *currently signed* stage without reopening it or touching routing. Offered per-stage (not just the job's last stage, unlike Deprogress: `correctable` in `work-history.component.ts` tracks the latest Sign-off-section `HistoryEntry` per `(jobId, stageId)`, requiring the live stage to still be `signed` and that entry to not itself be a re-open). Scope is the stage's own `fields`/`signoffFields` (via `fieldsShown()`/`isUserEditable()`, same filters the live signoff panel uses) plus job Attachments (`app-attachments`, reused as-is) — never `result`/`inspectionType`/`routingType`/Decision, which the dialog doesn't render at all. Individual field keys that fed a routing decision at the original signoff are shown **disabled with an explanation** rather than omitted: `ROUTING_LOCKED_FIELD_KEYS`/`isRoutingLockedField()` (`data/workflow.ts`) is the single source of truth — Repair's `repairType`/`allowableThicknessExceeded`, Fit-Up Insp's `releaseToWelding`, Fit's `deferTack` — enforced both in the dialog and again in `SignoffService.correctStage()` (defense in depth). Requires a reason; logs a new `SignoffRecord`/`HistoryEntry` action `'corrected'` (badge `CORRECTED` in the Records Retention Review signoff history) carrying the reason and a `from`/`to` diff per changed field, alongside the normal full-field snapshot. `HistoryEntry` gained `stageId` (only `signStage()`/`reopenStage()`/`correctStage()` set it) so Correct can find the live stage a Work History row belongs to — additive/optional, no `CURRENT_VERSION` bump needed. See [[project-correction-feature-fields]] for the full reasoning behind the locked list. **Fixed same day**: the select-field dropdown always offered a blank "Select" option even when the field already held a real value, letting a correction blank out a required field like Weld Color — now only shown when the field is genuinely empty. Also fixed: Work History's expanded row only showed the reason in the action text and then the *entire* current field snapshot, with no indication of which field(s) actually changed — `HistoryEntry` gained `changes`/`reason` (mirroring `SignoffRecord`'s own, but display-formatted via the newly-exported `displayValue()` to match `inputs`' convention) so the action text now names the changed field(s) directly (e.g. "Root NDT VT/5X — Corrected Weld Color") and the expanded row leads with a highlighted old → new line per change before the full snapshot. **Also fixed**: `correctable` requires `HistoryEntry.stageId` to find the live stage, but `seededWorkflow()` (the generator behind almost all of the demo's pre-existing signoff history) never set it — only entries created by live `signStage()`/`correctStage()` calls did, so Correct was effectively only ever offered on whatever had just been signed/corrected in the current session. `seededWorkflow()` now sets `stageId: s.id` on its own pushed entries too. **Person-search assist** (same day): Probationary/Oversight Inspector use `app-person-search-input` (text mode) in the Correct dialog too, not just the live signoff panel — `PERSON_SEARCH_FIELDS` in `correct-stage-dialog.component.ts` is the (currently 2-entry) list of which field keys get it.
- **Makeup** (`weld-record/makeup/`, `data/makeup.ts`, 2026-09-23) — `noMike` joke toggle, currently `false` (real page shown); see [Demo toggles](#demo-toggles-flipped-often). someone **below** the foreman level granted temporary "makeup" (acting-foreman) status for a set period: `MakeupGrant { personId, startDate, endDate }`. Its own nav entry in the Weld Record menu (not under Admin — routine foreman use, not admin config) and its own flat, inline-editable grid, not Admin > Teams' list-into-detail: the audience setting makeup is different from the one managing Teams' permission matrix and is used to a grid, and once the (later-removed) per-grant team roster was dropped there was nothing left per row to justify a detail panel anyway. Person picker is a search typeahead (`searchPeople`, same pattern as Work History's person filter) filtered to exclude anyone already titled `'Foreman'` — deliberately `PEOPLE`/`title` (AD-sourced identity in the real system), not the app's own `Role` type, which is per-stage routing, not who someone is. **Each person gets `ANNUAL_MAKEUP_DAYS` (90) makeup days per calendar year**, tracked by summing `daySpan()` (inclusive day count) across their grants whose start date falls in that year; `daysRemaining()` is checked both on add and on every inline date edit (`updateDates()`), rejecting a span that would exceed what's left — the grid's own "Days remaining" column and the add-row's live preview both call the same function so the number can't drift from what's actually enforced. **UI-only, explicitly not wired to anything**: the app has no concept of "who's logged in as which specific person" (only a role *filter*, e.g. Pipe Search's `selectedRole`), and there's no time-boxed AD group membership at this org to hang real enforcement off of — so this is set up and reviewable but doesn't grant any actual access, same demo-aid honesty as Admin > Teams' permission matrix (also unenforced, mocking what AD groups would really do). **Search + sort, not hide-inactive**: a name/id/title search box filters the grid, and active grants sort to the top (`filteredGrants()`) — inactive ones stay in the list, sorted below, so search can still reach them rather than disappearing once expired. ~20 seed grants (`DEFAULT_GRANTS`) so the list/search/sort actually has something to exercise.
- **Interim Layer** records a signoff (signoff record + History entry) and navigates away, but Layer stays unsigned and remains the current routing until it's signed as **Final Layer** (`isInterimLayer()`, `signoff.service.ts`); only Final Layer moves on to Layer NDT. **5X** — the "Did you perform 5X inspection…" question only appears on **Root** (removed from Final Weld 2026-09-23 at the user's request), and only when NDT Root is 5X (2026-09-24); answering it only records the answer, auto-signing the matching `root-ndt-vt5x` stage happens when Root is itself signed off, not when the dropdown is changed (fixed 2026-09-22 — it previously fired on the dropdown change alone, signing a stage with no confirmation).

### My Assignments, History, Weld Planning
- My Assignments is **first** in the Weld Record nav dropdown (moved above Pipe Welding 2026-09-23 — it's the most common thing a tech opens). Column widths: Routing fixed at 8rem (was `1fr`, grew far past its longest value), Specific Location `1fr` (absorbs the freed space; was a cramped 9rem, truncating values). Expandable list (XREFID, Hull, Drawing, Joint, Routing, **Location** = shop (`getShops()`, same pool as Fabrication's Location) — or **'Ship'** for the couple of records below, **Specific Location** = bay/rack within it, Assignment # (6-digit, no prefix), WICC Date, **Source** — demo-only, which upstream system the assignment came from, keyed off role via `SOURCES_BY_ROLE` in `assignments.ts`: Fitting SWIMS, Welding EWICC, Foreman EWR, Inspector/NQC Inspector a random mix of SAIL/NCS, O63/O04 Records EWR). Row click toggles an expanded panel below it (chevron indicator) showing Assigned By, Assigned Date, Job Description, and — for Welding assignments only — Filler Metal Type/Size and WTN (`Assignment.details`, demo-only stand-ins for fields eWICC would actually hand off; not built out for other roles yet). A Charge field renders as a real **Code 39 (3 of 9) barcode** (`barcodeElements()` in `my-assignments.component.ts`: narrow/wide bar-and-space patterns per the ISO/IEC 16388 character set, wrapped in `*` start/stop characters — replaced the old decorative random-width bars 2026-09-22), centered with the charge number underneath it. The separate "Details" button still navigates to the job page. A demo-only **role filter dropdown** (red-outlined `select-error` + an inline "Demo role:" label — replaced the small "Demo only" badge 2026-09-23 for visibility, defaults to **Welding**) filters by `assignedRoles`; also a keyword filter, banner, horizontal scroll on narrow windows (`min-width: 62rem`). `expirationDate` is seeded 0-6 days out (always within a week). No "Assigned To" column (removed; it previously showed a hardcoded "John Johnson", not `a.assignedTo`). **XREFID is blanked on ~25% of rows** (`i % 4 === 0`, same pattern as Weld Planning's records) to mimic real imperfect data; the Details button therefore looks the job up by **hull + drawing + joint** (the true identity key), never by the assignment's own `jobId` copy, which may be blank. A blank XREFID does **not** by itself mean shipboard work — most such records still track to a shop/bay like any other assignment. Only **two** assignments (`assignments.ts`, `toShip()`) get the shipboard-location treatment: Location = 'Ship', and the expanded row shows **Deck / Frame / P/S/CL / Usage** instead of Specific Location — on its own forced second line (`class="w-full ..."`, fixed 2026-09-23) below Assigned By/Date/Job Description/details/Charge, which now always ends the first line since it's unconditional and Deck/Frame/etc. only render for these two records. One is guaranteed to be the earliest-due Welding assignment (so it's visible near the top of the default view); the other is picked from elsewhere among the blank-XREFID records for variety. **Reworked 2026-09-23** (was too descriptive, e.g. "1st Platform"/"Fr 156"/separate P/S + CL-offset/"Fuel Oil Tank" — user wanted compartment-number-style codes, e.g. "2 150 P HAB"): Deck and Frame are now plain numeric codes; **P/S and the separate centerline-offset field were merged into one `pscl` field** reusing Fabrication's own P/S/CL values (`P`/`S`/`CL`, `FABRICATION_FIELDS` in `workflow.ts`) instead of a second invented option set; Usage is now a short code (`GALY`/`LIVE`/`HAB`/`ENGR`/`CARGO`/`DK`/`TANK`/`MACH`/`OTHR`) instead of a full descriptive phrase. **Per-column filters** (`shared/column-filter.component.ts`, 2026-09-23) — every data column (XREFID/Hull/Drawing/Joint/Routing/Location/Specific Location/Assignment #/WICC Date/Source) gets an `app-column-filter`: just a small icon until clicked, then a compact popover text box, not an always-open filter row like `sort-header.component`'s table-based columns use — the user specifically wanted it unobtrusive, and this grid is `<div>`-based (not `<table>`/`<th>`), so the existing `th[appSortHeader]` directive doesn't apply here anyway. Filters AND with each other and with the existing keyword/role filters (`MyAssignmentsComponent.assignments()`); WICC Date matches against the same formatted display text the column shows, not the raw ISO date.
- **Assignment generation rebalanced 2026-09-23** (`generateAssignments()` in `assignments.ts`) — role used to be *derived* from the routing label via a `rolesByRouting` lookup, and Inspector only existed as a random 50/50 split of the tiny 4-item Fit-Up Insp block with Foreman (easy to end up with just one Inspector assignment, or none — reported by the user). Rewritten so role is assigned directly per entry (`ROLE_ROUTINGS`, one or more real routing labels per role for variety) with a fixed `PER_ROLE = 7` count for every role, landing each in the user's requested 5-10 range. Source (`SOURCES_BY_ROLE`) is now assigned by `nextSource()`, cycling deterministically through a role's source pool instead of a random pick, so a role with more than one upstream system (Inspector/NQC Inspector: SAIL and NCS) is guaranteed at least one assignment from each rather than leaving it to chance.
- History: leftmost icon-only chevron column (expand/collapse), then **Routing, Action**, When, Who, **Value** (was Old value/New value — Old value dropped 2026-09-23: it was dash almost everywhere in practice, see below), XREFID, Hull, Drawing, Joint, Order, **Deprogress**, then a trailing details-button column (small primary icon button, same pattern as My Assignments' — plain XREFID text is no longer itself a clickable link, replaced 2026-09-23 since the whole-cell link was an easy accidental-click target; opening it sets `?from=history` so Back/sign-off returns to History instead of the Pipe Welding table, via `backDestination()` in `joint-page.component.ts`). Identity columns (XREFID/Hull/Drawing/Joint/Order) are sized to their real fixed-length content in `ch` units, not a blanket rem width. Every column has its own filter via `appSortHeader` (text, or a multiselect for Routing) alongside the top-bar Person/XREFID/search filters — the filter inputs show a small filter icon instead of "Filter…" placeholder text, which was clipping to "Fil"/a single letter in the narrow identity columns. Filters: person typeahead; **a job box that matches XREFID, drawing, joint or order** (not hull); and a right-hand **Search all** box covering every column and the sign-off field values. **It records what was input at each sign-off**: a sign-off row expands (per row, or **Expand all / Collapse all** for every sign-off matching the filters) to every editable field the user was shown, with its value at that moment, blanks included; each field row repeats the sign-off's When, Who, Routing, XREFID, Hull, Drawing and Joint in muted text so it reads on its own (`HistoryEntry.inputs`, built by `snapshotInputs()` in `workflow.ts`, from the job page's `signoffSnapshot()`). Read-only/derived fields (PH/IP limits, overrides, locked Weld Process, disabled fields) are not listed. Per-field edits (sections Stages/Fabrication) are still logged but **hidden** here. **Person filter is a typeahead** (`searchPeople`: first/last name prefixes in any order, or id). CSV has one line per field, including Drawing/Joint/Order alongside XREFID/Hull. Each entry carries `whoId`/`whoTitle`, stamped in `withHistory` via `stampWho()`.
  - **`routing` is the stage the action was *for*, not what it moved to afterward** (fixed 2026-09-23): `withHistory()` (now on `WorkflowStore`, was on `RoutingService` before the 2026-09-22 service split) derives it from `currentRoutingLabel(prev.stages)` (pre-update state) instead of `next.stages` — a `'Fit — Signed off'` entry used to record whatever became active next (e.g. `'Tack'`) instead of `'Fit'`. `seededWorkflow()`'s own entries already got this right (`routing: s.label`); `mock-history.ts`'s generator was fixed the same way (records `stage.label`, not the next stage).
  - **Old value dropped** (2026-09-23): the only field types that ever populated `from` either never reach the grid (Stages/Fabrication are filtered out of `allActivity()`) or belonged to the dead Work Validation feature (see below), aside from one edge case (pre-signoff Decision flip-flopping) not worth a whole column.
  - **Routing filter sorts by workflow order**, not alphabetically (`routingOrder` in `work-history.component.ts`: each stage's first-appearance index across every trade's `getTemplates()`); anything not a real stage (e.g. `'All stages complete'`) sorts to the end.
  - **Deprogress is offered only on a job's last sign-off still in effect** (`deprogressable`: whole history, independent of filter/sort; a re-open cancels the sign-off before it; must match the live workflow's last signed stage — only when that live workflow actually *has* a signed stage to compare against: `lastSignedLabel.has(jobId)` used to be true even for a job whose live workflow was merely instantiated with nothing signed (e.g. just from appearing in the Pipe Welding table), which silently hid Deprogress on jobs whose real history is the mock fallback; fixed 2026-09-23). Clicking it now opens the shared **confirm modal** (`ConfirmService.textInput`) for the required reason, instead of an inline input/Go/Cancel row in the cell.
  - **Mock history realism fixes** (2026-09-23, all in `data/mock-history.ts`): dropped `Component added`/`Validation notes` entries (Work Validation has no UI anywhere in `joint-page` anymore — nothing can produce them); only stages with a `rejectToStage` ever get a SAT/UNSAT decision (matches the real signoff panel's auto-accept for the rest) and an UNSAT stops the mock sign-off chain there instead of pretending later stages were reached; `Attachment added` only fires when the current stage is one that actually shows Attachments (`isNdtStageId`, mirrors `joint-page`'s `isNdtStage`); free-text fields with no plausible value (Comments/Notes) pick from a small sentence pool instead of the literal fallback string `'recorded'`.
- Weld Planning: separate weld-joint data (`WeldJoint`; list/form/detail/mass edit/advanced search; the admin page has only Joint Designs, the NDT and PWHT option tabs were removed) with its own `hull` field .
  A joint has no title, WPS, PWHT, assignee, estimated hours, description or notes (all removed from the create/edit form; the data fields still exist and still show on the detail page & CSV for seeded joints). Joint is a free-text field in system-joint format (e.g. `ST-J10005`, see Terminology), not a dropdown. Its NDT requirements are the same seven fields as the weld record's joint details (`NDT_FIELDS` in `weld-planning.data.ts`: RT Root/Final, NDT Root/Each/Final, UT, VT; each blank, `X` or `5X`). Note: Weld Planning still uses these `X`/`5X` markers; Weld Record's own NDT Root/Each/Final and RT Root/Final now use the real values (2026-09-24, see "NDT routing"). Material 2 is labelled plainly (no "(Filler)"). The form, detail, admin and mass-edit pages fill the content area like every other screen (no centred max-width box). Plans saved in the browser before this change lack the NDT fields and show them blank.
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
{ when: string; who: string; whoId?: string; whoTitle?: string;
  section: 'Sign-off' | 'Stages' | 'Attachments' | 'Fabrication' | 'Release' | 'Refit' | 'Deviation';
  action: string; from?: string; to?: string;
  routing: string;               // routing label at time of change
  inputs?: { label: string; value: string }[];      // sign-off entries: every editable field + value at sign-off
  fabInputs?: { label: string; value: string }[];   // fabrication data then: every sign-off, and a Cut's Refit entry (the data it reset)
  stageId?: string;              // set by signStage/reopenStage/correctStage
  changes?: { key: string; label: string; from: string; to: string }[]; reason?: string;   // 'corrected' entries
}
```

### JobWorkflow (per job, persisted)

```ts
{ jobId: string; technician: string; stages: WorkflowStage[]; attachments: Attachment[];
  conditionCode: string; conditionCount: number; history: HistoryEntry[];
  fabricationData: Record<string, string>;   // cross-stage fit-up fields
  refitNumber?: string;    // set by each Cut
  repairNumber?: string;   // set by each new Repair round
  deviations?: Deviation[]; // accepted at sign-off: { id, stageId, stageLabel, items: {kind, label, entered, required}[], reason, who, when, status: 'open' }
}
```
Job records aren't persisted, so `WorkflowStore.load()` copies `refitNumber`/`repairNumber` onto the job (`job.refitNumber`/`job.repairNumber`) — that's what Joint Details, search and filters read.

### Job

```ts
{
  id: string;          // internal key, 5-char alphanumeric, always populated, unique — never shown
  xrefid: string;      // user-facing XREFID; mirrors id, but blank on ~25% of jobs
  ship: string;        // 3-digit, e.g. 692 — stable per hull, shown above Hull in Joint Details
  hull: string;        // S/T/D/N + 4 digits, e.g. S7234 — shared by many jobs
  // identity: id  OR  (hull + drawing + joint), each unique — xrefid is display-only, not an identity key
  trade: string;       // 'Welding'
  technician: string;
  drawing: string; drawingRev: string; joint: string; jointDesign: string; weldType: string;
  pipeSize: string; wallThickness: string;
  materialType1: string; materialType2: string; mcl1: string; mcl2: string;
  // materialType1/2 use MATERIALS_1/MATERIALS_2 (jobs.ts, exported) -- same codes as Weld Engineering's
  // Procedure.baseMetal1Type/baseMetal2Type (data/procedures.ts), matched by gwpOptionsForMaterials()
  joiningItem: string; joinToItem: string;   // 1 letter + 8 digits + hyphen + 2 digits, e.g. S12341001-14; comma-separated in affectedItems
  sequenceNumber: string; order: string; engineeringNotes: string;
  wps: string; ndt: string; pwht: string;   // ndt: general free text, no longer drives routing
  nInd: string;        // Nuclear Indicator: 1, 2 or 3
  mcl1/mcl2: 'STD' | 'MC-I';                 // MC-I requires traceability
  ndtRoot/ndtEach/ndtFinal: '5X' | 'MT' | 'MT/PT' | 'PT' | 'UT' | 'VT';   // each phase's NDT (ROUTING.md)
  rtRoot/rtFinal: '' | '10' | '100' | '360' | '60' | '75' | 'NA';       // a degree adds an RT step
  refitNumber, repairNumber: string;         // '00'-style counters, bumped by Cut / each Repair
  // ... plus the remaining NDT and additional data fields
}
```

## Data patterns

- **Job identity** — hulls repeat by design. Any new seed data or import must keep `id` unique and `(hull, drawing, joint)` unique; pickers and labels should show all three, not the hull alone.
- **Seeded workflows** are deterministic per job id and pre-sign random leading stages with full `signoffRecords`.
- **Nuclear Indicator** '1'/'2'/'3' drives weld-position visibility, pre-fit visibility and NDT role routing (1–2 → NQC Inspector).
- **NDT routing** (plain-language version with the chart: ROUTING.md) — each phase's NDT steps come from its **Joint Details** values (2026-09-24, `phaseNdtSteps()`/`jobNdtSteps()` in `workflow.ts`): **NDT Root + RT Root** → Root, **NDT Each** → Layer, **NDT Final + RT Final** → Final. The general `job.ndt` field no longer drives routing. In VT/5X, MT/PT, UT/RT order: **VT is always required**, or 5X instead when the NDT value is 5X; MT, PT or UT adds that step with its Type **locked** to it; MT/PT adds the MT/PT step with a choice; an **RT degree** (10/100/360/60/75, not blank or NA) adds the UT/RT step locked to RT. Valid NDT Root/Each/Final values: 5X, MT, MT/PT, PT, UT, VT (`NDT_REQUIREMENT_VALUES`, `jobs.ts`; blank and NA are no longer valid, and blank is treated as VT only). Valid RT Root/Final values: blank, 10, 100, 360, 60, 75, NA. Real data never has UT with an RT degree for the same phase; seed data follows that, and if it happened the UT/RT step would offer both. A single-option Type on an inspection stage is pre-filled, disabled, and explained under the droplist (`SignoffPanelComponent.typeLockNote()`, also used for Excavation NDT). Root's "Did you perform 5X" question only shows when NDT Root is 5X. Joint Details shows all five values as stored. **Records Review UNSAT** does nothing yet: the signoff is recorded but the stage stays unsigned, so the joint stays in Records Review (`isRecordsReviewUnsat()`, `signoff.service.ts`; user hasn't decided what it should do). CURRENT_VERSION 2.10.8.
- **Repair** is inserted dynamically on every NDT rejection (no limit); role Foreman. See the Signoff panel's Repair/Excavation NDT bullets above and ROUTING.md.
- **Affected Items** — `joiningItem`/`joinToItem` with `affectedItems` stored as a comma-separated string. Each affected item's MIC 1/MIC 2 line (`signoff-panel.component.ts`) reads the real MIC value from `fabricationData.id1`/`id2`, and only shows when that item's MCL requires traceability per the admin MCL Traceability table (`requiresTraceability()`, `mcl-traceability.ts`) (valid MCL 1/MCL 2 values: STD, MC-I; MC-I requires traceability, STD doesn't — 2026-09-24, storage key v2) — fixed 2026-09-23: it was previously showing `job.mcl1`/`mcl2` (the MCL code) mislabeled "MIC:", unconditionally. Its "MIC verified" checkbox (`micVerified1`/`micVerified2`, weld build-up only) is required with a red `*` whenever shown, and `validateStageFields()` (`joint-page.component.ts`) now gates that requirement on the same traceability condition instead of unconditionally requiring it for any selected affected item — fixed 2026-09-23, the earlier unconditional check could permanently block signoff on a checkbox the user was never shown.
- **MIC** values are hyphenated codes such as `250C-1500-290-5` (`seededMic`).
- **Material Type 1/2 codes** (`MATERIALS_1`/`MATERIALS_2`, `jobs.ts`) — redesigned 2026-09-23 into one coherent `NN-LETTERS` numbering scheme (`02-CS`, `12-SS304`, `65-CUNI`, ...), not real AISI/AWS designations: `NN` groups by family and is shared across both lists (1x = stainless, 6x = nonferrous) so a base metal and its typical filler read as part of one system; the letters stay recognizable (real alloy chemistry/grade abbreviations) rather than reusing raw industry codes. Replaces the earlier mixed bag — Material Type 1 was some user-specified codes (`02CS`/`30-CUNI`/`AL-1010`) mixed with ad hoc invented ones; Material Type 2 was real AWS electrode classifications (`E6010`, `ER70S-6`, ...), inconsistent with Material Type 1's own style. `material-classification.ts`'s `DEFAULT_ENTRIES` and Weld Planning's own local `MATERIALS_1`/`MATERIALS_2` copies (`weld-planning.data.ts`, `weld-planning-form.component.ts`) were updated to match; `STORAGE.materialClassification` bumped to `v2` since old cached entries used the old codes.
- **Trades** — only Welding ships with templates (the old HomeFix trades were purged). Admins can still add a trade (`addTrade`, prep + handover stages) and create a test hull for it.
- **Work package** — `Hull-Compartment-Detail`, e.g. `S7234-FWD-D03` (`workPackageFor()` in `jobs.ts`; compartments FWD/MID/AFT/ENG/CGO/HAB, details D01–D12).
- **Fit-Up Release** routes to role **Foreman** (was Welding). A handful of seeded jobs (about 7 of 480) sit at this stage awaiting a Foreman: Fit-Up Insp is signed with "Release to welding" unchecked, so Fit-Up Release is required and is the job's current routing. The Pipe Welding role filter checks the first unsigned **required** stage (the same rule as `currentRoutingLabel` / `activeStageId`), not just the first unsigned stage.
- **Deferred Tack** — identical form and behavior to Tack (same `WELD_STAGE_FIELDS`, WTN overrides, weld-card layout); it only sits after Fit-Up Release and is activated when Fit signs with Defer Tack = yes.

## Layout & styling

- `html { font-size: 112.5% }` in `styles.scss` scales everything (all sizes are rem). Small Tailwind/DaisyUI sizes and dimmed/disabled contrast are overridden at the end of `styles.scss` ("Readability overrides").
- `.signoff-panel` uses one text size (`--signoff-text`) for everything except bold headings.
- `.layout` — `height: 100vh; flex column`; `.topnav` sticky, 3rem, `z-index: 50`; `.content-body` scrolls; `.table-page-wrap` fixes the header/filters and scrolls the table.
- Theming: 32 DaisyUI themes; default `forest`; app tokens (`--app-bg`, `--app-surface`, `--app-border`, `--app-text-muted`) track the active theme. `--app-border` is a mix of the theme's text colour (25%), not `base-300`, because `base-300` is nearly the panel colour in dark themes and borders vanished; change it in one place to retune every border. Toasts use `color-mix()` with theme variables.
- Shared components: ToastHost, ConfirmDialog (native `<dialog>`, password), TablePager, MultiselectDropdown, SortHeader.

## Deviations

Added 2026-09-25 (rules in plain language: ROUTING.md "Deviations").
- **What's acceptable** (`detectDeviations()`, `data/deviations.ts`): Actual PH/IP outside its requirement pair (`isActualOutOfRange()`, NC = no limit), a failed Qualification Check (Test User's quals vs the WPS), and a Filler Metal Type/Size not on the WPS (skipped while "Only Consumable Insert used as filler" locks them). Actual out of range is no longer a field error: `validateStageFields()`/`onFieldBlur()` dropped their range checks, and the field shows a live warning instead (`fieldWarning()`, amber). Actual Min > Max stays a hard stop.
- **Report Deviation** (joint page `reported` signal, keyed by stage id): typed text, not persisted until signing, dropped on leaving like any unsigned input (`hasUnsavedChanges()` counts it). While a stage has one, `withStageRuntimeOptions()` gives Filler Metal Type/Size the full list and WTN changes stop clearing them; removing the last report clears off-list filler values.
- **Sign flow**: `signStage()` runs the hard validation first; if `stageDeviations()` finds anything, it opens `DeviationAcceptDialogComponent` (items, required reason, password) instead of the confirm. Accepting calls `DeviationService.record()` then `SignoffService.signStage()`; the Root 5X auto-sign is skipped since the joint is now held.
- **Hold**: `heldAt(stage)` makes every stage except the deviated one(s) non-editable (`editable()`, `inputsEditable()`, `signBlockers()`); the signoff panel shows `holdNote()`. No release exists (user's decision); disposition comes later.
- Not covered: Work History's Correct can still change an Actual PH/IP after signing without a deviation.

## Gotchas

- **Fabrication select labels**: `Location` and `Revised Joint Design` options exist only at runtime (`withRuntimeOptions()` in `joint-page`); the static `FABRICATION_FIELDS` entries have none. Any place that shows a fabrication value (e.g. Fit-Up Insp verification grid) must resolve its label through that helper, or it shows the raw stored code (`c-18` instead of `C-18`).
- **Joint design lookup**: jobs and weld planning store a joint design's *label* (`C-18`), while Revised Joint Design stores its *code* (`c-18`). `getJointDesign()` (`joint-designs.ts`) matches either, case-insensitively. Until 2026-09-24 it matched code only, so a job's own joint design never triggered Consumable Insert/Backing Ring requirements or the Pre-Fit stage. Seed labels live once in `JOINT_DESIGN_LABELS`; `jobs.ts` and `weld-planning.data.ts` use it.
- **Joint design descriptions** (2026-09-25): `JointDesignEntry.description` (made-up generic text, editable in Admin > Joint Designs, joint-designs key v2->v3) rides on `jointDesignOptions()` as `detail`. Revised Joint Design's open droplist shows "C-18 · description"; the closed box shows only the code (same `select-overlay-label` overlay as GWP/WTN, `FabricationComponent.hasDetails()`), and unlike GWP there's no description line under the field.
- **Consumable insert vs filler metal choices**: they share `METAL_TYPE_OPTIONS` / `METAL_SIZE_OPTIONS` (`workflow.ts`) because "Only Consumable Insert used as filler" copies the Fit stage's insert type/size into the filler fields. If the two lists ever differ, a copied value that is missing from the filler list renders as a blank select. Keep them one list.
- **Filler metal option values, two representations**: `procedures.ts`'s `FILLER_METAL_TYPE_OPTIONS`/`FILLER_METAL_SIZE_OPTIONS` (lowercase `value`, e.g. `'mil-70s-3'`) must stay in sync with `workflow.ts`'s duplicated `METAL_TYPE_OPTIONS`/`METAL_SIZE_OPTIONS` — duplicated rather than imported to avoid a circular import (`procedures.ts` already imports `workflow.ts` for `getWeldPositions()`). A `Procedure.fillerMetalTypes`/`fillerMetalSizes` entry that doesn't match one of workflow.ts's option values will silently never appear as a valid choice in Weld Record. This is separate from `FILLER_METAL_TYPES` (label-cased, e.g. `'MIL-70S-3'`), which only feeds the unrelated free-text Classification field.
- **Weld build-up's field list is rebuilt, not reused**: `visibleFields()` (`joint-page.component.ts`) special-cases Fit's `weld-buildup` routing by rebuilding the field list from the raw Tack template rather than `stage.fields` (a change-detection timing issue, see the function's own comment). That rebuild must explicitly include anything Tack gets appended at `buildStages()` time that Fit itself doesn't (currently `WELD_OVERRIDE_FIELDS`, since `isWeldStage` there doesn't count `'fit'`) — override fields were missing entirely on weld build-up until fixed 2026-09-23, the same shape of bug as the earlier GWP/WTN-blank-on-weld-build-up fix. Same for N Ind./traceability-gated fields (`weldPosition`, `consumableInsertId`, `backingRingId`): the rebuild runs through the same `.filter()` as the normal path, so those stay correctly gated.
- **`clearHidden()`'s `showIf` resolution didn't match `visibleFields()`'s** (fixed 2026-09-23, real bug found from a user report): `visibleFields()` (`joint-page.component.ts`) special-cases `showIf.key === 'inspectionType'`/`'result'` to read `stage.inspectionType`/`stage.result` (top-level fields, not in `stage.inputs`), but `clearHidden()` — called after every select/text edit to blank out now-hidden dependent fields — always read `stage.inputs[f.showIf.key]` for every key, including `'inspectionType'`. Since `inspectionType` is never actually stored in `stage.inputs`, that read was always `undefined`, so **every field `showIf`'d on `inspectionType` was treated as permanently hidden** and immediately blanked back out the instant it was set — reported as "Degree of RT Performed clears itself when I change it" but it hit every such field (RT's `degreeRt`, `rtFileNumber`, `defectCode`; MT/PT's `penetrantManufacturer`/`penetrantType`; VT/5X's `weldColor`; MT/PT's `idAccessible` has no `showIf` so was unaffected), on both the UT/RT and MT/PT stages, blocking signoff since the values could never stick. Fixed by mirroring `visibleFields()`'s exact key resolution (including its `and` clause handling, which `clearHidden()` had never implemented at all).
- **`SignoffRecord.fields` labels**: `SignoffService` (signStage/reopenStage) and `RoutingService` (forceRouting/goBackRouting) build these from the raw `stage.inputs`/`stage.signoffInputs` key/value pairs, not from the properly-labeled `SignoffInput[]` the caller may pass in. Always resolve the display label via the `labelFor(stage, key)` helper — exported from `data/workflow.ts` alongside `show()` (the History Old/New em-dash formatter) so every service that logs history uses the same two helpers instead of each keeping its own copy (falls back to the field's key only if no matching `StageField`/`SignoffField` is found) — fixed 2026-09-21 after Signoff History showed raw keys like `consumableInsertType` instead of "Consumable Insert Type".
