# Welding — Architecture

Welding is a **welding work-order & inspection manager** (prototype app). It's a single-page Angular app with **no backend** — all data is generated in memory or saved to the browser's `localStorage`.

---

## Stack

- **Angular 19** — standalone components, signals, the router.
- **DaisyUI 5** (on Tailwind CSS 4) — UI components (buttons, tables, badges, dialogs, dropdowns, etc.).
- **Lucide Angular** — icons.
- **No server / no database.** All data is mock or localStorage.

## Run / build

```
npm start                 # dev server at http://localhost:4200
npm run build             # production build
cd "C:\Users\dewes\primeng-search-demo"; npx ng build 2>&1  # build (PowerShell)
```

---

## Version bumps & cache clearing

The app stores workflow data in `localStorage`. When stage definitions change, old cached data becomes stale.

- A `CURRENT_VERSION` constant lives in `src/app/services/workflow.service.ts` (line ~22). Current: `1.3.1`.
- On every app load, the version is checked against localStorage. If it doesn't match, all workflow/template caches are cleared.
- **Bump `CURRENT_VERSION`** whenever you change stage definitions, field names, data models, or seed data structure.

---

## Folder map

```
src/app/
  app.component.*        Root shell: top nav bar (Pipe Welding, Structural Welding, My Assignments, History, Advanced Search, Admin) + <router-outlet>
  app.routes.ts          URL → screen mapping

  table-search/          "Pipe Welding" screen — main job table (filters, role selector, page-size, CSV export, banner)
  work-history/          "History" screen — audit-trail activity log (filter by person / by job)
  adaptive-search/       "Advanced Search" screen — schema-driven filter bar + saved variants + column picker
  job-detail/            Single-job page — Routing (numbered step pills), Joint Details, Fabrication, Attachments, NDT, Signoff, Records Review
  sync-status/           Green/yellow/red sync indicator
  theme-picker/          "Theme" button — DaisyUI theme switcher

  admin-steps/           Admin → Routing — per-trade workflow steps
  admin-signoff-fields/  Admin → Signoff fields — per-trade+stage configurable signoff fields
  admin-characteristics/ Admin → Characteristic codes
  admin-conditions/      Admin → Condition codes
  admin-materials/       Admin → Materials
  admin-ndt/             Admin → Penetrant / NDT settings
  admin-locations/       Admin → Locations
  admin-step-options/    Admin → Step Options
  admin-weld-positions/  Admin → Weld Positions
  admin-banner/          Admin → Banner (info/warning/error banner across top)
  admin-set-step/        Admin → Set step (force a job's workflow to a chosen stage)

  data/                  Plain data & helpers (no UI):
    jobs.ts                Job model + seeded generator (240 mock jobs) + static seed data pools
    workflow.ts            Inspection workflow model: stage pipelines, types, buildStages(), seededWorkflow(), stage templates
    mock-history.ts        Seeded activity entries for Work history
    characteristics.ts     Characteristic code → description lookup
    conditions.ts          Condition code → description lookup
    materials.ts           Material list + options
    filter-schema.ts       Schema-driven filter engine
    export-csv.ts          downloadCsv() helper

  services/              Shared state (injected into components):
    workflow.service.ts    Per-job stages/components/attachments/sign-off + history; persists to localStorage; migrations
    sync.service.ts        Online/offline + pending-sync count (stubbed)

  shared/                Shared UI pieces:
    table-state.ts         TableState class: sorting, filtering, paging (used by table-search, work-history, adaptive-search)
    table-pager.component  Pagination bar (page size selector, prev/next, range display)
    multiselect-dropdown.component   Reusable multi-select filter dropdown
    tooltip.directive      Tooltip wrapper
    toast.service          Toast notification service
    confirm.service        Confirmation dialog service
```

---

## Screens (routes)

| Route | Screen | Notes |
|---|---|---|
| `/table` | Pipe Welding | Main job table; default route |
| `/history` | History | Audit log; `?job=<id>` deep-links filtered to one job |
| `/adaptive` | Advanced Search | Schema-driven filter bar + column picker |
| `/jobs/:id` | Job detail | The workflow page for one job |
| `/admin/steps` | Admin → Routing | Editable per-trade workflow steps |
| `/admin/signoff-fields` | Admin → Signoff fields | Per-trade+stage configurable signoff fields |
| `/admin/characteristics` | Admin → Characteristic codes | Editable code → description lookup |
| `/admin/conditions` | Admin → Condition codes | Editable condition code → description lookup |
| `/admin/materials` | Admin → Materials | Editable material list |
| `/admin/ndt` | Admin → Penetrant | NDT settings |
| `/admin/locations` | Admin → Locations | Location management |
| `/admin/step-options` | Admin → Step Options | Step option management |
| `/admin/weld-positions` | Admin → Weld Positions | Weld position management |
| `/admin/banner` | Admin → Banner | Info/warning/error banner across top |
| `/admin/set-step` | Admin → Set step | Admin override: force a job's workflow to a chosen stage |

---

## Data flow

1. **Jobs** are generated in [jobs.ts](src/app/data/jobs.ts) — 240 seeded jobs with deterministic data (same every load). Every screen imports the `JOBS` array.

2. **Stage templates** live in [workflow.ts](src/app/data/workflow.ts). Admin CRUD persists to localStorage (`homefix:stage-templates:v1`). `getTemplates()` returns the merged view. Each stage has a `role` field that determines which queue the job appears in.

3. **Per-job workflow** (stages, components, attachments, sign-off, history) lives in
   [WorkflowService](src/app/services/workflow.service.ts), keyed by job id, exposed as **signals**.
   A never-touched job starts from `seededWorkflow()` (deterministic mid-stream run of pre-signed
   stages so the current step varies job-to-job); the first real edit takes over. Every mutation appends a
   history entry and is persisted to `localStorage`.

4. **Seeded workflows** (`seededWorkflow()`) pre-sign a random number of leading stages with realistic
   field values and signoff history entries. The count varies per job for diversity.

5. **Work history** screen aggregates `WorkflowService.allWorkflows()` into one flat, filterable timeline.

### Welding trade stages (in order)

1. **Pre-fit** — NQC Inspector; only when N Ind. = 1 or 2
2. **Fit** — NQC Inspector; requires MIC 1, MIC 2, Drawing Rev, Actual Thickness
3. **Fit-Up Insp** — Inspector; releaseToWelding checkbox + release button
4. **Fit-Up Release** — Foreman; activated only when fit-up inspection rejects release
5. **Tack** — Welding; swapable to Deferred Tack
6. **Deferred Tack** — Welding; activated by Fit stage's deferTack option
7. **Root Weld** — Welding; includes 5X inspection option (auto-signs Root NDT VT/5X)
8. **Root NDT UT/RT** — Inspector/NQC Inspector; conditional on `job.ndt` having UT or RT
9. **Root NDT MT/PT** — Inspector/NQC Inspector; conditional on MT or PT
10. **Root NDT VT/5X** — Inspector/NQC Inspector; conditional on VT or 5X; auto-signed by Root Weld
11. **Layer** — Welding; Interim/Final Layer, consumable insert
12. **Layer NDT stages** — same pattern as Root NDT
13. **Final Weld** — Welding; includes 5X inspection option
14. **Final NDT stages** — same pattern as Root NDT
15. **Repair** — Foreman; inserted dynamically when any NDT rejects (UNSAT)
16. **Review** — Records; verification grid with all job fields, signoff history table

### NDT routing logic

`job.ndt` contains a string like "VT + UT", "VT + RT + 5X", etc. The `buildStages()` function filters NDT stages based on regex matching:
- `hasUTorRT = /\b(UT|RT)\b/.test(ndt)` — shows UT/RT stages
- `hasMTorPT = /\b(MT|PT)\b/.test(ndt)` — shows MT/PT stages
- `hasVT = /\b(VT|5X)\b/.test(ndt) || ndt.includes('VISUAL')` — shows VT/5X stages

### N Ind. (NDE Indication) field

`job.nInd` is '1', '2', or '3' (randomly seeded):
- **1 or 2**: Pre-fit stage appears; NDT routes to "NQC Inspector" role; weldPosition hidden unless nInd='1'
- **3**: No pre-fit; NDT uses "Inspector" role

### Signoff rejection → repair

When any NDT stage is rejected (UNSAT), a **Repair** stage is dynamically inserted after it. All subsequent stages are reopened. The Repair stage role is **Foreman**.

### NDT Data display

The NDT Data section on Joint Details shows requirement indicators (not results):
- "X" if that NDT type is required for the job (based on `job.ndt`)
- "5X" if 5X is the required method
- "—" if not required

---

## Layout / scrolling

- `.layout` — `height: 100vh; display: flex; flex-direction: column`
- `.topnav` — fixed 3rem height
- `.content` — `flex: 1; display: flex; flex-direction: column; overflow-x: hidden`
- `.content-body` — `flex: 1; overflow-y: auto; overflow-x: hidden` — the scroll container for page content
- `router-outlet` — `display: contents` (children become direct flex items of content-body)
- `.table-page-wrap` — `height: 100%; max-width: 100%; overflow-x: hidden` — constrains table pages so pager stays in viewport
- Table wrapper divs use `min-w-0` to prevent table min-widths from expanding the container

---

## Theming

- **DaisyUI 5** themes via `data-theme` attribute on `<html>`
- Dark mode is default
- Theme picker persists to localStorage

---

## Conventions

- **DaisyUI components** for all UI (tables, buttons, badges, dialogs, dropdowns, inputs).
- **Lucide icons** — `svg lucideXxx` pattern with `class="size-4"`.
- **Signals** for state — `signal()` + `computed()`.
- **Modern control flow** — `@if`/`@for` syntax (not `*ngIf`/`*ngFor`).
- **Standalone components** — no NgModules.
- Build command (PowerShell): `cd "C:\Users\dewes\primeng-search-demo"; npx ng build 2>&1`

---

## Known gaps / next steps

- **Editable jobs** — reassign technician, reschedule, change cost
- **Auth / access control** — Admin screens are unguarded
- **Real persistence/sync** — swap localStorage for a backend
- **My Assignments** — placeholder nav item, not yet implemented
