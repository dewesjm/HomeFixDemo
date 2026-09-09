# Welding — Architecture

Welding is a **welding work-order & inspection manager** (a learning/prototype app,
rebranded from a PrimeNG search demo). It's a single-page Angular app with **no backend** —
all data is either generated in memory or saved to the browser's `localStorage`.

---

## Stack

- **Angular 19** — standalone components, signals, the router.
- **PrimeNG 19** with the **Aura** theme — all UI widgets (table, menu, buttons, dialogs, etc.).
- **PWA** — service worker via `@angular/pwa` (precaches the app shell for offline; production build only).
- **No server / no database.** See "Real vs. stubbed" below.

## Run / build

```
npm start                 # dev server at http://localhost:4200 (service worker OFF here)
npm run build             # production build (service worker ON; needs HTTPS/localhost to test)
```
Test the PWA/offline behavior by serving the prod build:
`npx http-server -p 8080 -c-1 dist/primeng-search-demo/browser`.

---

## Folder map

```
src/app/
  app.component.*        Root shell: collapsible sidebar (PanelMenu + sync status + theme) + <router-outlet>
  app.config.ts          App-wide providers: router, animations, PrimeNG/Aura theme, service worker
  app.routes.ts          URL → screen mapping

  table-search/          "Jobs" screen — the main p-table (filters, role selector, Job#, current step, CSV export)
  work-history/          "Work history" screen — the audit-trail activity log (filter by person / by job)
  adaptive-search/       "Adaptive filters" screen — schema-driven filter bar + saved variants + column picker
  job-detail/            Single-job page — Routing (progress bar), Joint details, Fabrication, Attachments, Signoff (current step override, readings, next step routing, repeat/final, decision, signoff)
  sync-status/           The green/yellow/red sync indicator in the sidebar
  theme-picker/          The "Theme" button: primary + surface color palette switcher

  admin-steps/           Admin → Routing — per-trade workflow steps (ordering, field config, new trades/steps, reject routing, role assignment)
  admin-signoff-fields/  Admin → Signoff fields — per-trade+stage configurable signoff fields
  admin-characteristics/ Admin → Characteristic codes — editable code → description lookup
  admin-conditions/      Admin → Condition codes — editable condition code → description lookup
  admin-materials/       Admin → Materials — editable material list (Build/install "Material used" dropdown)

  data/                  Plain data & helpers (no UI):
    jobs.ts                Job model + seeded generator (120 mock jobs) + dynamic TRADE_OPTIONS
    workflow.ts            Inspection workflow model: stage pipelines, types, STAGE_TEMPLATES (Proxy merging static defaults + localStorage), CRUD functions, buildStages(), getTemplates(), getTradeOptions()
    mock-history.ts        Seeded activity entries used to pad the Work history timeline for jobs with no real edits
    characteristics.ts     Characteristic code → description lookup + options (job special designations)
    conditions.ts          Condition code → description lookup + options (Work validation condition dropdown)
    materials.ts           Material list + options (Build/install stage "Material used" dropdown)
    filter-schema.ts       Schema-driven filter engine: field defs + applyFilters() + saved variants
    export-csv.ts          downloadCsv() helper (Excel-friendly CSV download)

  services/              Shared state (injected into components):
    workflow.service.ts    Per-job stages/components/attachments/sign-off + history; persists to localStorage; migrations
    sync.service.ts        Online/offline (real) + pending-sync count (sync itself is stubbed)

  shared/                Shared UI pieces:
    multiselect-dropdown.component   Reusable multi-select filter dropdown
    tooltip.directive                Tooltip wrapper
    toast.service                    Toast notification service
    confirm.service                  Confirmation dialog service
    table-state.ts                   Table state management (sorting, filtering, paging)
```

**Rule of thumb:** folders are features/screens; `data/` is logic with no UI; `services/` is shared state.

---

## Screens (routes)

| Route | Screen | Notes |
|---|---|---|
| `/table` | Jobs (work orders) | Main table; default route |
| `/history` | Work history | Audit log; `?job=<id>` deep-links filtered to one job |
| `/adaptive` | Adaptive filters | Schema-driven filter bar + column picker |
| `/jobs/:id` | Job detail | The workflow page for one job |
| `/admin/steps` | Admin → Routing | Editable per-trade workflow steps (ordering, field config, new trades/steps, reject routing, role assignment) |
| `/admin/signoff-fields` | Admin → Signoff fields | Per-trade+stage configurable signoff fields |
| `/admin/characteristics` | Admin → Characteristic codes | Editable code → description lookup |
| `/admin/conditions` | Admin → Condition codes | Editable condition code → description lookup (feeds Work validation) |
| `/admin/materials` | Admin → Materials | Editable material list (feeds the Build/install "Material used" dropdown) |
| `/admin/set-step` | Admin → Set step | Admin override: force a job's workflow to a chosen stage (sets the current step) |

---

## Data flow

1. **Jobs** are generated once at startup in [jobs.ts](src/app/data/jobs.ts) (seeded → same 120 jobs every load) and held in memory as `JOBS`. Every screen imports this array. `Job.trade` is now `string` (not a fixed union) so admin-added trades work.
2. **Stage templates** live in [workflow.ts](src/app/data/workflow.ts) as `STAGE_TEMPLATES`, a `Proxy` that merges static defaults with localStorage overrides (`homefix:stage-templates:v1`). Admin CRUD (`addStageTemplate`, `updateStageTemplate`, `deleteStageTemplate`, `addTrade`) persists to localStorage and invalidates the cache. `getTemplates()` returns the merged view; `getTradeOptions()` derives trade dropdown options from it. Each stage template has an optional `role` field that determines which queue the job appears in.
3. **Per-job workflow** (stages, components, attachments, sign-off, history) lives in
   [WorkflowService](src/app/services/workflow.service.ts), keyed by job id, exposed as **signals**.
   A never-touched job starts from `seededWorkflow()` (a deterministic, **mid-stream** run of pre-signed
   stages so the current step varies job-to-job); the first real edit takes over. Every mutation appends a
   **history entry** and is **persisted to `localStorage`** (`homefix:workflows:v2`).
4. **Migrations** run in `WorkflowService.load()` on every page load:
   - Backfill missing fields (`inputs`, `fields`, `signoffFields`, `signoffInputs`, `result`, `signed`, `repeatable`, `stepType`, `routeTo`, `swapStageId`)
   - Migrate old hardcoded fields (`inspectorName`, `licenseNo`, `notes`) into `signoffInputs`
   - v3: Rebuild stages if they have filler IDs (`extra-*`, `Check N`) or are missing current template stages (e.g. Sanding added after job was created); preserves signed state for stages that still exist
5. **Work history** screen aggregates `WorkflowService.allWorkflows()` into one flat, filterable timeline,
   padded with seeded [mock-history.ts](src/app/data/mock-history.ts) entries for jobs that have no real edits yet.

### The audit trail
Every change a user can make flows through `WorkflowService` and is logged as a structured entry:
**who / when / action / from / to / current-step** (plus an internal `section`). The Work history table
shows **Action / Old value / New value** as their own columns (e.g. action `Diagnose — Decision`,
from `—`, to `ACCEPT`). `section` (`Routing`, `Fabrication`, `Attachments`, `Signoff`) is kept on the
record for grouping but is no longer surfaced in the UI.

### Stages = signoffs (per trade)
[workflow.ts](src/app/data/workflow.ts) defines an ordered stage list per trade via `STAGE_TEMPLATES`
(merged from static defaults + localStorage overrides). **Each stage is its own signoff**: it carries
per-step **readings** fields plus configurable **signoff fields** (inspector, license, notes, etc.) and
an **SAT or UNSAT decision (required)**. A stage is **locked** until every required stage before it
is **signed** (sequential), only the current stage is editable.

**The Routing section** (first on the page) is a visual progress indicator — click a step to select it.
The selected stage's **Current step** override, **readings inputs**, **Next step** routing, **Repeat/Final**
(for repeatable stages), inspector/decision, and **Signoff** all live in the **Signoff** section.

**Current step override** (`swapStageId`): a dropdown at the top of signoff lets you pick a different
work type from the trade's stages. The readings and signoff fields swap to match the selected stage's template.
On sign, the workflow jumps to that stage.

**Next step routing** (`routeTo`): a dropdown showing all remaining stages, defaulting to "Next in sequence".
Override it to jump ahead (e.g. skip to Final Weld from Root Weld). On accept, stages between current and target
are re-opened so the workflow jumps there.

**Repeatable stages**: stages with `repeatable: true` show a **Repeat / Final** radio in signoff.
"Repeat" inserts another copy of the same stage after signing. "Final" advances normally.

**Stage reject routing** (`rejectToStage`): each stage can specify which stage to route back to on reject.
Rejecting re-opens all stages from the target up to (not including) the current stage.

**Role-based routing**: each stage has a `role` field (e.g. Fitting, Welding, Foreman, Inspector, NQC Inspector, Records).
The main table's Role dropdown filters jobs by which role their current unsigned step requires.
`View` shows all jobs. Roles are configured per-stage in Admin → Routing.

Every trade gets a shared **Site prep & safety** stage first and a **Cleanup & customer walkthrough**
stage last. The **job is complete once the last required stage is signed** — there is no overall final
signoff. The **Fabrication** section is separate and **cross-stage** (build/install,
condition code + count, installed components, notes for the whole job).

---

## Theming

- Configured in [app.config.ts](src/app/app.config.ts) with Aura + `darkModeSelector: '.app-dark'`.
- **Dark mode is the default** (`class="app-dark"` on `<html>` in `index.html`).
- The **Theme** button ([theme-picker](src/app/theme-picker/theme-picker.component.ts)) switches the
  **primary** and **surface** palettes at runtime via PrimeNG's `updatePrimaryPalette` /
  `updateSurfacePalette`, persisted to `localStorage`.
- **Scheme-aware variables:** custom (non-PrimeNG) elements must use `--app-bg` / `--app-surface` /
  `--app-border` (defined in [styles.scss](src/styles.scss)), NOT the raw `--p-surface-0/50` — the raw
  primitives don't flip between light/dark, which previously caused white-in-dark-mode bugs.

---

## Conventions worth knowing

- **PrimeNG components style themselves** (incl. dark mode). Custom CSS exists only for **layout** and
  **our own non-PrimeNG elements** (cards, panels, the stage readings/signoff grid).
- **Column filters** use `display="menu"` (funnel icon → popup → Apply/Clear).
- **value vs. label:** store the machine value (e.g. a condition code), display via a label lookup
  (`conditionLabel()` / `characteristicLabel()`). Don't bind raw codes to the screen.
- Each source file starts with a one-line header comment describing what it is.

---

## Real vs. stubbed (important)

| Thing | Reality |
|---|---|
| Jobs | Generated in memory (seeded); not editable; regenerate identically each load |
| Stage templates | Static defaults merged with localStorage overrides; admin CRUD persists to localStorage |
| Workflow data (stages/components/attachments/sign-off/history) | Real, persisted to `localStorage` (this browser only) |
| Stage routing | Current step override, next step routing, repeatable stages, reject routing — all real, persisted in workflow |
| Configurable sign-off fields | Real, per-trade+stage, persisted in stage templates |
| Sync indicator | Online/offline is **real**; the "push to server" is a **stub** (`flush()` just clears the pending count) |
| Attachments | **Filenames only** — files are not uploaded/stored |
| Auth / roles | None — Admin screens have no access control |
| Job progress | "Current step" is **real** — derived from the workflow's signed stages; there is no separate job-status field |

---

## Known gaps / possible next steps

- **Editable jobs** (reassign technician, reschedule, change cost) — would make a fuller audit trail real.
- **Auth / access control** — Admin screens (incl. the **Set step** override) are unguarded; a real build
  would gate them behind authentication/roles.
- **Real persistence/sync** — swap `localStorage` for a backend (the `WorkflowService` and `JOBS` are the
  seams); a tinkered-with option discussed was Dexie/IndexedDB for offline-first storage.
- **History broadening** — comments-only feed, lifecycle/system events, richer grouping/timeline views.
- **Stage field defaults** — when swapping current step, fields reset to empty; could pre-fill from previous values.
- **Repeatable stage limits** — no max-repeat cap; could add a configurable limit per stage.
