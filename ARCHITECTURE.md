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
| **Hull** | The vessel/record a job belongs to (`job.hull`, letter + 4 digits, e.g. `K7234`). **Not unique** — many jobs share a hull. Replaces the old "Project" / job number / title. There is no job `title`. |
| **XREFID** | Internal 5-char alphanumeric job id (`job.id`). Unique. |
| **Job identity** | A job is identified by **either** its XREFID **or** the unique combination of **hull + drawing + joint**. Never use hull alone as an identifier (labels/pickers show hull · drawing · joint). |
| **Routing** | The ordered sequence of stages for a job, and the label of the current one (`currentRouting`). Replaces the old "Step". |
| **Stage** | One unit of a routing (`WorkflowStage`): Fit, Tack, Root, NDT, … |
| **GWP** | Label of the `weldProcedure` field (formerly "Weld Procedure"). |
| **Nuclear Indicator** | Label of `job.nInd` (1/2/3). |

## Build & checks

```powershell
cd "C:\Users\dewes\primeng-search-demo"; npx ng build 2>&1
npx tsc --noEmit --noUnusedLocals -p tsconfig.app.json   # catches unused code
```

Pre-existing SCSS "rules skipped due to selector errors" warnings come from Tailwind/DaisyUI empty `&` selectors and are harmless.

## Version bumps

`CURRENT_VERSION` in `src/app/services/workflow.service.ts` (~line 21). Bump when stage definitions, field names, data models, or seed data structure change. On mismatch the app clears the caches listed in `clearStaleCaches()` (`data/storage-keys.ts`).

## Storage

All `localStorage` keys live in `data/storage-keys.ts` (`STORAGE.*`, all prefixed `welding:`). Never write a key literal elsewhere. The site banner has one loader/saver in `data/banner.ts` (`bannerFor(page)`).

## Folder map

```
src/app/
  app.component.*        Shell: top nav + <router-outlet>. Admin dropdown, theme picker, PWA update prompt.
  app.routes.ts          URL → screen mapping

  table-search/          Pipe Welding — the deliberately simple, fast job table (filters, role, CSV, banner)
  adaptive-search/       Advanced Search — schema-driven filter bar + saved variants + column picker (for everyone else)
  work-history/          History — audit-trail activity log with deprogress
  my-assignments/        My Assignments — assignment list with keyword search
  job-detail/            Job detail — routing bar, joint details, fabrication, signoff, records review
  routing-bar/           Horizontal numbered routing pills (auto-scrolls to the selected stage)
  joint-details/         Read-only joint/NDT/additional data panel
  fabrication/           Cross-stage fabrication fields (Welding)
  signoff-panel/         Per-stage signoff form (weld layout is config-driven, see below)
  attachments/           Attachments list
  weld-planning/         Weld Planning — joint plans list/form/detail/mass-edit/admin (own data in weld-planning.data.ts)
  sync-status/           Online/offline indicator (stubbed)
  theme-picker/          DaisyUI theme switcher (32 themes, default: forest)

  admin-routing/         Admin → Routing (stage templates per trade)
  admin-set-routing/     Admin → Set routing (force a job's stage)
  admin-routing-options/ Admin → Routing options (per-stage Type dropdown options)
  admin-signoff-fields/  Admin → Signoff fields
  admin-characteristics/ Admin → Attribute codes
  admin-material-traceability/, admin-ndt/, admin-locations/, admin-weld-positions/,
  admin-joint-designs/, admin-banner/, admin-teams/   Other admin pages

  data/
    jobs.ts              Job model + seeded generator (480 jobs), makeJobId(), makeHull(), addTestJob()
    workflow.ts          Stage templates, types, buildStages(), seededWorkflow(), FABRICATION_FIELDS, ROLES
    assignments.ts       Assignment model + seeded generator (36)
    mock-history.ts      Seeded activity entries
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
    confirm.service / confirm-dialog.component   Password-protected confirm dialogs
```

## Routes

| Route | Screen |
|---|---|
| `/table` | Pipe Welding (default) |
| `/history` | History (`?job=<id>` deep-link) |
| `/adaptive` | Advanced Search |
| `/jobs/:id` | Job detail (`?from=assignments` returns there after signoff) |
| `/assignments` | My Assignments |
| `/admin/routing`, `/admin/set-routing`, `/admin/routing-options` | Routing admin |
| `/admin/*` | Other admin pages (signoff-fields, characteristics, ndt, locations, weld-positions, banner, joint-designs, teams, material-traceability) |

## Data flow

1. **Jobs** — 480 seeded Welding jobs in `jobs.ts` sharing 48 hulls (3–18 jobs per hull). XREFID is 5-char alphanumeric (`makeJobId()`); hull is letter + 4 digits (`makeHull()`). `generateJobs()` guarantees both identity rules: unique XREFID and unique hull + drawing + joint.
2. **Stage templates** — `workflow.ts`. Admin CRUD persists to localStorage; `getTemplates()` returns the merged view. The nine NDT stages come from one `ndtStage(phase, kind)` factory.
3. **Per-job workflow** — `WorkflowService`, keyed by job id, exposed as signals. Seeded jobs start mid-stream with pre-signed stages (inspection stages get a chosen type).
4. **Assignments** — 36 seeded, assigned to "John Johnson".
5. **Work history** — aggregates `WorkflowService.allWorkflows()` into a filterable timeline.

### Welding stages (in order)

1. Pre-Fit → 2. Fit → 3. Tack → 4. Fit-Up Insp → 5. Fit-Up Release → 6. Deferred Tack → 7. Root → 8. Root NDT UT/RT → 9. Root NDT MT/PT → 10. Root NDT VT/5X → 11. Layer → 12. Layer NDT UT/RT → 13. Layer NDT VT/5X → 14. Layer NDT MT/PT → 15. Final Weld → 16. Final NDT UT/RT → 17. Final NDT MT/PT → 18. Final NDT VT/5X → 19. Review → 20. Sold

## Screens

### Pipe Welding (`table-search`)
- Deliberately the "dumb", fast version. Layout: `table-page-wrap` (fixed header/filters, scrollable table).
- Columns: XREFID, Hull, Drawing, Joint, Order, Sequence, Current routing, Actions — sortable, with per-column filters via `appSortHeader`.
- Role dropdown, CSV export, page-size selector, admin banner pill, frozen Actions column on mobile.
- Persists filter/sort/page/role to `STORAGE.searchState`.

### Advanced Search (`adaptive-search`)
- For everyone who needs more than Pipe Welding: schema-driven filter bar, saved variants, column picker, CSV export. All NDT and additional-data fields.

### Job detail (`job-detail`)
- **Routing bar** — numbered pills, horizontal scroll, auto-centers the selected stage. Active = `--color-success`, done = `--color-info`.
- **Joint details** — 3 columns (stack on mobile): job info, joining/join-to, NDT data (RT/NDT/UT/VT as `X` or `5X`); "Show more" reveals additional data and attribute codes.
- **Fabrication** (cross-stage) — Location (Ship adds Deck/Frame/P-S-CL/Usage with red `*`), MIC 1/2, Drawing Rev, Actual Thickness, WTN, Revised Joint Design.
- **Signoff panel** (below).
- **Top nav menus** — one open at a time; they close on outside click or when a real (non-disabled) link is chosen, and collapse their nested Admin submenu (`closeAll()` in `app.component.ts`).
- **Records Review** (`review` stage) — verification grid + immutable `signoffRecords` history table.
- **Sold** — once signed all stages lock; only deprogress is allowed (Work History, most recent signoff per job).

### Signoff panel (`signoff-panel`)
- **Type dropdown** for stages with `routingOptions`. On inspector/NDT stages it starts **blank**, is required (`*`), and signing is blocked until chosen (`inspectionTypeRequired`).
- **Weld stages** (Tack, Root, Layer, Final Weld, Fit weld build-up) render from the `WELD_GROUPS` config in `signoff-panel.component.ts` — three cards (only "Readings" has a header; the others were untitled at the user's request) — through one field template. Alignment (e.g. PH Min over Override PH Min) is set by each row's `width`, not by a grid: GWP / WTN / Weld Process (auto-set from WTN, locked), PH/IP limits and **Override Requirements** incl. Override Note (all read-only, set from the WTN; `NC` = no limit; overrides shown for matching WTNs on every weld stage), PH/IP actuals, weld position (Nuclear Indicator 1), Consumable Insert checkbox (Root; unchecking clears filler type/size/MIC), Filler Metal, 5X (Root/Final), Comments.
- Non-weld stages use the generic field loop; `showIf` / `requiredWhen` drive conditional fields.
- **PH/IP validation** — blur-triggered range checks; NC skips that limit.
- **Decision** — SAT/UNSAT (or "Inspection Results" on NDT); signoff dialog needs certification + password.
- **Sign button** — disabled until `canSignStage()` passes; it is derived from `signBlockers()` in job-detail, the single source of the rules. There is deliberately no on-screen "why" text (the sticky bar and then the note beside the button were both removed at the user's request). A failed attempt scrolls to and focuses the first validation error.
- **Fit-Up Insp** — verification grid against fabrication data, Release-to-welding checkbox.
- **Deprogress** — reverse the last signed stage with a required comment.
- **Interim Layer** signs off and navigates away; **5X** auto-signs the matching VT/5X stage.

### My Assignments, History, Weld Planning
- My Assignments: single-line list (XREFID, Hull, Drawing, Routing, Joint, Location, Assigned To, Assignment #, Expires), keyword filter, banner. `expirationDate` is seeded 0-6 days out (always within a week).
- History: When, Who (name + title held at the time), Action, Old/New, Routing, Hull, Actions. **Person filter is a typeahead** (`searchPeople`: any order of first/last name prefixes, or id; never a full list). **Field edits by the same person on the same job and stage within 15 min collapse into one expandable row** (`grouped` in the component; sign-offs and other events are never grouped; CSV exports one line per field). Each `HistoryEntry` carries `whoId`/`whoTitle`, stamped in `withHistory` via `stampWho()`. **Deprogress is offered only on a job's last sign-off still in effect** (`deprogressable` in the component: computed from the job's whole history, independent of filter/sort; a re-open cancels the sign-off before it; where the live workflow is loaded the entry must match its last signed stage). It needs a required comment.
- Weld Planning: separate joint-plan data (`wp` list/form/detail/mass edit/admin lists) with its own `hull` field and joint-plan `title`.

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
}
```

### Job

```ts
{
  id: string;          // XREFID, 5-char alphanumeric, unique
  hull: string;        // letter + 4 digits, e.g. K7234 — shared by many jobs
  // identity: id  OR  (hull + drawing + joint), each unique
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
- **Deferred Tack** — identical form and behavior to Tack (same `WELD_STAGE_FIELDS`, WTN overrides, weld-card layout); it only sits after Fit-Up Release and is activated when Fit signs with Defer Tack = yes.

## Layout & styling

- `html { font-size: 112.5% }` in `styles.scss` scales everything (all sizes are rem). Small Tailwind/DaisyUI sizes and dimmed/disabled contrast are overridden at the end of `styles.scss` ("Readability overrides").
- `.signoff-panel` uses one text size (`--signoff-text`) for everything except bold headings.
- `.layout` — `height: 100vh; flex column`; `.topnav` sticky, 3rem, `z-index: 50`; `.content-body` scrolls; `.table-page-wrap` fixes the header/filters and scrolls the table.
- Theming: 32 DaisyUI themes; default `forest`; app tokens (`--app-bg`, `--app-surface`, `--app-border`, `--app-text-muted`) track the active theme. Toasts use `color-mix()` with theme variables.
- Shared components: ToastHost, ConfirmDialog (native `<dialog>`, password), TablePager, MultiselectDropdown, SortHeader.

## Gotchas

- **Fabrication select labels**: `Location` and `Revised Joint Design` options exist only at runtime (`withRuntimeOptions()` in `job-detail`); the static `FABRICATION_FIELDS` entries have none. Any place that shows a fabrication value (e.g. Fit-Up Insp verification grid) must resolve its label through that helper, or it shows the raw stored code (`bj-g` instead of `BJ-G`).
