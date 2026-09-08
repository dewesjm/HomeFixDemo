# HomeFix — Component & Pattern Reference

A team reference for the elements used in this app, organized by feature. Each
element is tagged **[PrimeNG]** (v19 component library) or **[Angular]** (v19
framework built-in) so it's clear what comes from where.

The recurring theme: **the PrimeNG component does the heavy lifting (rendering,
sorting, paging, filtering, export, overlays); Angular provides the structure
(components, state, routing, forms); you only supply data + config objects.** The
only hand-written CSS is layout polish, never a re-implemented widget.

## A. One-time app setup (`src/app/app.config.ts`)

These providers must be in place or the components below won't work:

| Provider | Source | Why it's needed |
|---|---|---|
| `providePrimeNG({ theme: { preset: Aura, ... }, ripple: true })` | **PrimeNG** | Enables PrimeNG + the **Aura** theme; dark mode toggles via a `.app-dark` class on the root |
| `provideAnimationsAsync()` | **Angular** | **Required by PrimeNG** — overlays (dropdowns, dialogs, tooltips) won't animate/position without it |
| `MessageService` | **PrimeNG** | Backs the Toast notifications (admin save confirmations) |
| `ConfirmationService` | **PrimeNG** | Backs the confirm dialogs (stage sign-off + the Set step admin override) |
| `provideRouter(routes)` | **Angular** | Screen routing (`app.routes.ts`) |
| `provideHttpClient()` | **Angular** | HTTP (data is currently mock, but the provider is in place for real calls) |
| `provideServiceWorker(...)` | **Angular** | PWA / offline + update prompt |

## B. By feature

### App shell & navigation (`app.component`)
- **[PrimeNG]** `p-panelMenu` — collapsible sidebar nav (built from a `MenuItem[]` model)
- **[PrimeNG]** `p-toast` — global notification host (paired with `MessageService`)
- **[PrimeNG]** `p-confirmDialog` — global confirmation host (paired with `ConfirmationService`); used by sign-off and Set step
- **[PrimeNG]** `p-button` — actions (e.g. dark-mode toggle)
- **[Angular]** `RouterOutlet` — renders the active route
- **[Angular]** `SwUpdate` — service-worker update prompt

### Jobs table — the main grid (`table-search`)
The heaviest use of the library; one component does most of the work:
- **[PrimeNG]** `p-table` — the whole grid: **paginator** (`[paginator]` + `[rows]` + `[rowsPerPageOptions]`), **multi-sort** (`sortMode="multiple"`), **column resize** (`[resizableColumns]`), **horizontal scroll** (`[scrollable]`), and **CSV export** (`dt.exportCSV()` + `[columns]`/`[exportFunction]` config)
- **[PrimeNG]** `p-iconField` + `p-inputIcon` + `pInputText` — global search box with a leading search icon
- **[PrimeNG]** `p-multiSelect`, `p-slider`, `p-datePicker` — in-column filters (trade/tech/tags, cost range, date)
- **[PrimeNG]** `p-select` — the "role / trade lane" dropdown
- **[PrimeNG]** `p-tag` — tag pills; `p-rating` — inspection score stars; `p-button` — row actions
- **"Current step"** is a derived text column (from the workflow's signed stages) — there is no job-status column
- **[Angular]** `*ngFor`/`*ngIf` (CommonModule), `[(ngModel)]` (FormsModule), `Router` for row navigation

### Advanced / adaptive search (`adaptive-search`)
- **Schema-driven filter bar** with saved variants — filters adapt to job data
- **Filters**: Trade, Technician, Tags, Cost range, Date range, Status, Make, Model, Code 1/2/3 (derived from job data)
- **Column picker** (`Columns3` icon) — toggle which columns appear in the results table; persisted to localStorage (`pn-demo:result-columns`)
- **Results table** — dynamic columns based on picker selection, sortable, paginated, CSV export
- Frozen "Details" action column

### Work history (`work-history`)
- **[PrimeNG]** `p-table` — the **activity log** (sortable columns, paginator; per-column **Trade** filter via `p-columnFilter`). Columns: When · Who · Action · Old value · New value · Step · Job · Trade
- **[PrimeNG]** `p-select` — filter by technician/job; `p-iconField`/`p-inputIcon`/`pInputText` — search
- **[PrimeNG]** `p-button` — Export to Excel / clear
- **[Angular]** `routerLink` — navigation; `ActivatedRoute` — read query params

### Job detail (`job-detail`) — by section
| Section | Elements |
|---|---|
| **Stages** indicator (first section) | Visual progress bar — **progress only**; recording + signing happen in the Sign-off section. Click to select a step |
| **Job details** (read-only) | Plain grid for label/value pairs; `p-tag` (tags), `pTooltip` (code hovers); collapsible "Audit & records" tier |
| **Work validation** | `p-select` (work type / condition), text inputs, `p-table` (components list) |
| **Attachments** | File upload (basic/auto mode), `p-table` (file list) |
| **Sign-off** (for the selected stage) | **Current step** dropdown (swap to Sanding/Cleaning/etc. — fields swap to match), **readings inputs** (dynamic per swapped stage), **Repeat/Final** radio (repeatable stages only), **Decision** (Accept/Reject), **Sign & lock** button with confirm dialog. Swapping current step loads that stage's readings + sign-off fields dynamically |

### Admin screens

**Admin → Steps** (`admin-steps`):
- Editable table of per-trade workflow steps with inline editing
- **Sequence column** with ▲/▼ reorder buttons
- **Settings** (⚙️) button opens a **field configuration dialog** — configure readings fields (key, label, type, unit, placeholder) and sign-off fields (key, label, type, required, options) per stage
- **New trade** button — creates a trade with default Prep + Handover stages
- **Add step** button — adds a new row, saves to data layer on confirm
- **Delete** — removes from data layer and localStorage
- **Reject routing** — dropdown to pick which stage to go back to on reject
- All changes persist to `localStorage` (`homefix:stage-templates:v1`)

**Admin → Sign-off fields** (`admin-signoff-fields`):
- Configurable sign-off fields per trade+stage
- Inline editing of field key, label, type, required, placeholder, options
- Add/delete fields, filtered by trade+stage
- Persists to `localStorage` via stage templates

**Admin → Characteristic codes / Condition codes / Materials** (`admin-characteristics`, `admin-conditions`, `admin-materials`):
- Editable reference tables with inline editing
- Search, add, delete rows
- Persists to `localStorage`

### Admin → Set step (`admin-set-step`)
An action form, not a reference table — an **admin override** to force a job's workflow to a chosen stage:
- **[PrimeNG]** `p-select` (filterable job picker + target-step picker), `p-tag` (current step), `p-button` (Force step), `ConfirmationService` confirm dialog before applying (it discards sign-offs)
- **[Angular]** `signal()`/`computed()` state; calls `WorkflowService.forceStep(job, index)` which signs every prior stage (accepted), re-opens the chosen stage onward, and logs a `Step forced (admin)` history entry

### Smaller pieces
- **Theme picker** (`theme-picker`) — **[PrimeNG]** `p-popover` + `p-button`
- **Sync status** (`sync-status`) — **[PrimeNG]** `pTooltip` only

## C. Angular patterns used everywhere (all [Angular])

- **Standalone components** — no `NgModules`; each component imports what it needs directly in `imports: [...]`
- **Signals for state** — `signal()` + `computed()` instead of plain fields; `inject()` instead of constructor params (mostly)
- **Forms** — `FormsModule` with `[(ngModel)]` (or `[ngModel]` + an event handler for controlled updates)
- **Control flow** — modern `@if`/`@for` syntax (not the older `*ngIf`/`*ngFor`)
- **Routing** — `provideRouter`, `routerLink`, `ActivatedRoute` (+ query params for cross-screen filtering)

> Note: `[(ngModel)]` is **Angular** (FormsModule). PrimeNG components are the
> *targets* of those bindings (e.g. `[(ngModel)]` on a `p-select`), but the binding
> syntax itself is the framework.

## D. Client-side vs. server-side (pagination, export)

The table runs **client-side** today: the full row set is loaded and `p-table`
(PrimeNG) pages/sorts/filters it in memory. Moving a table to **server-side** later
is a config change, not a rewrite — same `p-table`, add `[lazy]="true"` +
`[totalRecords]` and fill in an `(onLazyLoad)` handler that fetches one page per
request. The paginator UI, sort, and filter controls stay identical. Note that
`exportCSV()` only exports the rows currently in memory, so a server-side table
needs a separate fetch-all to export everything.
