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
| `provideRouter(routes)` | **Angular** | Screen routing (`app.routes.ts`) |
| `provideHttpClient()` | **Angular** | HTTP (data is currently mock, but the provider is in place for real calls) |
| `provideServiceWorker(...)` | **Angular** | PWA / offline + update prompt |

## B. By feature

### App shell & navigation (`app.component`)
- **[PrimeNG]** `p-panelMenu` — collapsible sidebar nav (built from a `MenuItem[]` model)
- **[PrimeNG]** `p-toast` — global notification host (paired with `MessageService`)
- **[PrimeNG]** `p-button` — actions (e.g. dark-mode toggle)
- **[Angular]** `RouterOutlet` — renders the active route
- **[Angular]** `SwUpdate` — service-worker update prompt

### Jobs table — the main grid (`table-search`)
The heaviest use of the library; one component does most of the work:
- **[PrimeNG]** `p-table` — the whole grid: **paginator** (`[paginator]` + `[rows]` + `[rowsPerPageOptions]`), **multi-sort** (`sortMode="multiple"`), **column resize** (`[resizableColumns]`), **horizontal scroll** (`[scrollable]`), and **CSV export** (`dt.exportCSV()` + `[columns]`/`[exportFunction]` config)
- **[PrimeNG]** `p-iconField` + `p-inputIcon` + `pInputText` — global search box with a leading search icon
- **[PrimeNG]** `p-multiSelect`, `p-slider`, `p-datePicker` — in-column filters (trade/tech/tags, cost range, date)
- **[PrimeNG]** `p-select` — the "role / trade lane" dropdown
- **[PrimeNG]** `p-tag` — status & tag pills; `p-rating` — inspection score stars; `p-button` — row actions
- **[Angular]** `*ngFor`/`*ngIf` (CommonModule), `[(ngModel)]` (FormsModule), `Router` for row navigation

### Advanced / adaptive search (`adaptive-search`)
- **[PrimeNG]** `p-dialog` — modal for building a query / picking columns
- **[PrimeNG]** `p-checkbox`, `p-multiSelect`, `p-select`, `p-slider`, `p-datePicker`, `p-rating` — the filter inputs
- **[PrimeNG]** `p-chip` — removable "active filter" pills; `p-tag`, `pTooltip`, `pInputText`, `p-button`
- **[PrimeNG]** `p-table` — the **results list** (sortable columns, paginator, CSV export, frozen "Details" action). The adaptive bar does the filtering; the table just renders the matched rows
- **[Angular]** `signal()`/`computed()` state, `FormsModule` bindings

### Work history (`work-history`)
- **[PrimeNG]** `p-table` — the **activity log** (sortable columns, paginator; per-column **Trade** filter via `p-columnFilter`). Columns: When · Who · Action · Old value · New value · Step · Job · Trade
- **[PrimeNG]** `p-select` — filter by technician/job; `p-iconField`/`p-inputIcon`/`pInputText` — search
- **[PrimeNG]** `p-button` — Export to Excel / clear
- **[Angular]** `routerLink` — navigation; `ActivatedRoute` — read query params

### Job detail (`job-detail`) — by section
| Section | Elements |
|---|---|
| **Stages** indicator (first section) | **[PrimeNG]** `p-steps` (wrapped in an **[Angular]**/CSS scroll container for narrow screens) — **progress only**; recording + signing happen in the Sign-off section |
| **Job details** (read-only) | **[Angular]** plain grid (`*ngFor`) for the label/value pairs (no PrimeNG detail/description component exists — layout is CSS); **[PrimeNG]** `p-tag` (status), `pTooltip` (code hovers); the collapsible "Audit & records" tier is a **[PrimeNG]** `p-button` "Show more/less" toggle driving an **[Angular]** `*ngIf` over a `signal()` |
| **Work validation** | **[PrimeNG]** `p-select` (work type / condition), `pInputText`, `p-table` (components list) |
| **Attachments** | **[PrimeNG]** `p-fileUpload` (basic/auto mode), `p-table` (file list) |
| **Sign-off** (for the selected stage) | **[PrimeNG]** the stage's **readings inputs** (`pInputText` / `p-select`), then `p-radioButton` (Accept/Reject decision), `pInputText`, `p-tag`, `p-button` (Sign & lock / Re-open) |

### Admin screens (`admin-steps`, `admin-characteristics`, `admin-conditions`, `admin-materials`)
All four share one pattern — **editable reference tables**:
- **[PrimeNG]** `p-table` with inline editing, `pInputText` / `p-select` / `p-multiSelect` for cells
- **[PrimeNG]** `p-iconField`/`p-inputIcon` search, `p-button` add/delete, `MessageService` -> toast on save
- **[Angular]** `FormsModule` two-way bindings, `inject()` for the data service

### Smaller pieces
- **Theme picker** (`theme-picker`) — **[PrimeNG]** `p-popover` + `p-button`
- **Sync status** (`sync-status`) — **[PrimeNG]** `pTooltip` only

## C. Angular patterns used everywhere (all [Angular])

- **Standalone components** — no `NgModules`; each component imports what it needs directly in `imports: [...]`
- **Signals for state** — `signal()` + `computed()` instead of plain fields; `inject()` instead of constructor params (mostly)
- **Forms** — `FormsModule` with `[(ngModel)]` (or `[ngModel]` + an event handler for controlled updates)
- **Control flow** — currently the older `CommonModule` `*ngIf`/`*ngFor` (not the new `@if`/`@for`). Pick one convention and keep it consistent
- **Routing** — `provideRouter`, `routerLink`, `ActivatedRoute` (+ query params for cross-screen filtering)

> Note: `[(ngModel)]`, `*ngIf`, `*ngFor` are **Angular**. PrimeNG components are the
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
