# HomeFix — Architecture

HomeFix is a **home-repair work-order & inspection manager** (a learning/prototype app,
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
  adaptive-search/       "Adaptive filters" screen — schema-driven filter bar + saved variants
  job-detail/            Single-job page — Details, Stages (each is its own sign-off), cross-stage Work validation, Attachments, History
  sync-status/           The green/yellow/red sync indicator in the sidebar
  theme-picker/          The "Theme" button: primary + surface color palette switcher

  data/                  Plain data & helpers (no UI):
    jobs.ts                Job model + seeded generator (120 mock jobs) + STATUS_OPTIONS + statusLabel()
    workflow.ts            Inspection workflow model: per-trade stage pipelines, types, stage helpers, WORK_TYPE_OPTIONS
    characteristics.ts     Characteristic code → description lookup + options (job special designations)
    conditions.ts          Condition code → description lookup + options (Work validation condition dropdown)
    materials.ts           Material list + options (Build/install stage "Material used" dropdown)
    filter-schema.ts       Schema-driven filter engine: field defs + applyFilters() + saved variants
    export-csv.ts          downloadCsv() helper (Excel-friendly CSV download)

  services/              Shared state (injected into components):
    workflow.service.ts    Per-job stages/components/attachments/sign-off + history; persists to localStorage
    sync.service.ts        Online/offline (real) + pending-sync count (sync itself is stubbed)
```

**Rule of thumb:** folders are features/screens; `data/` is logic with no UI; `services/` is shared state.

---

## Screens (routes)

| Route | Screen | Notes |
|---|---|---|
| `/table` | Jobs (work orders) | Main table; default route |
| `/history` | Work history | Audit log; `?job=<id>` deep-links filtered to one job |
| `/adaptive` | Adaptive filters | Schema-driven filter bar |
| `/jobs/:id` | Job detail | The workflow page for one job |
| `/admin/steps` | Admin → Steps | Editable maintenance table for per-trade workflow steps |
| `/admin/characteristics` | Admin → Characteristic codes | Editable code → description lookup |
| `/admin/conditions` | Admin → Condition codes | Editable condition code → description lookup (feeds Work validation) |
| `/admin/materials` | Admin → Materials | Editable material list (feeds the Build/install "Material used" dropdown) |

---

## Data flow

1. **Jobs** are generated once at startup in [jobs.ts](src/app/data/jobs.ts) (seeded → same 120 jobs every load) and held in memory as `JOBS`. Every screen imports this array.
2. **Per-job workflow** (stages, components, attachments, sign-off, history) lives in
   [WorkflowService](src/app/services/workflow.service.ts), keyed by job id, exposed as **signals**.
   Every mutation appends a **history entry** and is **persisted to `localStorage`** (`homefix:workflows`).
3. **Work history** screen aggregates `WorkflowService.allWorkflows()` into one flat, filterable timeline.

### The audit trail
Every change a user can make flows through `WorkflowService` and is logged with **who / when /
section / what-changed / current-step**. Value edits record **before → after** (e.g.
`Decision: — → ACCEPT`, `Notes: “” → “…”`). Sections: `Stages`, `Work Validation`, `Attachments`, `Sign-off`.

### Stages = sign-offs (per trade)
[workflow.ts](src/app/data/workflow.ts) defines an ordered stage list per trade. **Each stage is its
own sign-off**: it carries its per-step data inputs plus inspector / license # / an **Accept or Reject
decision (required)** / notes. A stage is **locked** until every required stage before it is **signed**
(sequential), only the current stage is editable (shown in a PrimeNG accordion, one open at a time), and
the **job is complete once the last required stage is signed** — there is no separate final sign-off.
Some stages are **conditionally required** based on the job title (e.g. refrigerant check only for
AC/heat-pump work). The **Work validation** section is separate and **cross-stage** (build/install,
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
  **our own non-PrimeNG elements** (cards, panels, stage pipeline, history list).
- **Column filters** use `display="menu"` (funnel icon → popup → Apply/Clear).
- **value vs. label:** store the machine value (`'in-progress'`), display via a label lookup
  (`statusLabel()` in jobs.ts). Don't bind raw values to the screen.
- Each source file starts with a one-line header comment describing what it is.

---

## Real vs. stubbed (important)

| Thing | Reality |
|---|---|
| Jobs | Generated in memory (seeded); not editable; regenerate identically each load |
| Workflow data (stages/components/attachments/sign-off/history) | Real, persisted to `localStorage` (this browser only) |
| Sync indicator | Online/offline is **real**; the "push to server" is a **stub** (`flush()` just clears the pending count) |
| Attachments | **Filenames only** — files are not uploaded/stored |
| Auth / roles | None — "Admin" menu items are placeholders |
| `job.status` | Set by the generator; **does NOT update** when you sign off (known gap) |

---

## Known gaps / possible next steps

- **Editable jobs** (reassign technician, reschedule, change cost) — would make `job.status` changes
  and a fuller audit trail real.
- **Derive status from workflow** (signed off → Completed) — currently disconnected.
- **Build the Admin area** (the menu links exist; routes/components don't).
- **Real persistence/sync** — swap `localStorage` for a backend (the `WorkflowService` and `JOBS` are the
  seams); a tinkered-with option discussed was Dexie/IndexedDB for offline-first storage.
- **History broadening** — comments-only feed, lifecycle/system events, richer grouping/timeline views.
