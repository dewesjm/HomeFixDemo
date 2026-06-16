# HomeFix — Component & Pattern Reference

A team reference for the PrimeNG (v19) + Angular (v19) elements used in this app,
organized by feature. The recurring theme: **the library component does the heavy
lifting (rendering, sorting, paging, filtering, export, overlays); you only supply
data + config objects.** The only hand-written CSS is layout polish, never a
re-implemented widget.

## A. One-time app setup (`src/app/app.config.ts`)

These providers must be in place or the components below won't work:

| Provider | Why it's needed |
|---|---|
| `providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } }, ripple: true })` | Enables PrimeNG + the **Aura** theme; dark mode toggles via a `.app-dark` class on the root |
| `provideAnimationsAsync()` | **Required** — overlays (dropdowns, dialogs, tooltips) won't animate/position without it |
| `MessageService` | Backs the Toast notifications (admin save confirmations) |
| `provideRouter(routes)` | Screen routing (`app.routes.ts`) |
| `provideHttpClient()` | HTTP (data is currently mock, but the provider is in place for real calls) |
| `provideServiceWorker(...)` | PWA / offline + update prompt |

## B. By feature

### App shell & navigation (`app.component`)
- **`p-panelMenu`** — collapsible sidebar nav (built from a `MenuItem[]` model)
- **`p-toast`** — global notification host (paired with `MessageService`)
- **`p-button`** — actions (e.g. dark-mode toggle)
- Angular: `RouterOutlet`, `SwUpdate` (service-worker update prompt)

### Jobs table — the main grid (`table-search`)
The heaviest use of the library; one component does most of the work:
- **`p-table`** — the whole grid: **paginator** (`[paginator]` + `[rows]` + `[rowsPerPageOptions]`), **multi-sort** (`sortMode="multiple"`), **column resize** (`[resizableColumns]`), **horizontal scroll** (`[scrollable]`), and **CSV export** (`dt.exportCSV()` + `[columns]`/`[exportFunction]` config)
- **`p-iconField` + `p-inputIcon` + `pInputText`** — global search box with a leading search icon
- **`p-multiSelect`, `p-slider`, `p-datePicker`** — in-column filters (trade/tech/tags, cost range, date)
- **`p-select`** — the "role / trade lane" dropdown
- **`p-tag`** — status & tag pills; **`p-rating`** — inspection score stars; **`p-button`** — row actions

### Advanced / adaptive search (`adaptive-search`)
- **`p-dialog`** — modal for building a query / picking columns
- **`p-checkbox`, `p-multiSelect`, `p-select`, `p-slider`, `p-datePicker`, `p-rating`** — the filter inputs
- **`p-chip`** — removable "active filter" pills; **`p-tag`**, **`pTooltip`**, **`pInputText`**, **`p-button`**

### Work history (`work-history`)
- **`p-select`** — filter by technician/job; **`p-iconField`/`p-inputIcon`/`pInputText`** — search
- **`p-tag`** — event type; **`p-button`** + Angular `routerLink` — navigation

### Job detail (`job-detail`) — by section
| Section | Elements |
|---|---|
| **Job details** (read-only) | Plain Angular grid + **`p-tag`** (status) + **`pTooltip`** (code hovers). Inline label/value layout & "Show more" tier are CSS + a signal — no special component |
| **Stages** indicator | **`p-steps`** (wrapped in a CSS scroll container for narrow screens) |
| **Work validation** | **`p-select`** (work type / condition), **`pInputText`**, **`p-table`** (components list) |
| **Attachments** | **`p-fileUpload`** (basic/auto mode), **`p-table`** (file list) |
| **Sign-off** | **`p-radioButton`** (decision), **`pInputText`**, **`p-tag`**, **`p-button`** |

### Admin screens (`admin-steps`, `admin-characteristics`, `admin-conditions`, `admin-materials`)
All four share one pattern — **editable reference tables**:
- **`p-table`** with inline editing, **`pInputText` / `p-select` / `p-multiSelect`** for cells
- **`p-iconField`/`p-inputIcon`** search, **`p-button`** add/delete
- **`MessageService`** -> toast on save

### Smaller pieces
- **Theme picker** (`theme-picker`) — **`p-popover`** + **`p-button`**
- **Sync status** (`sync-status`) — **`pTooltip`** only

## C. Angular patterns used everywhere

- **Standalone components** — no `NgModules`; each component imports what it needs directly in `imports: [...]`
- **Signals for state** — `signal()` + `computed()` instead of plain fields; `inject()` instead of constructor params (mostly)
- **Forms** — `FormsModule` with `[(ngModel)]` (or `[ngModel]` + an event handler for controlled updates)
- **Control flow** — currently the older `CommonModule` `*ngIf`/`*ngFor` (not the new `@if`/`@for`). Pick one convention and keep it consistent
- **Routing** — `provideRouter`, `routerLink`, `ActivatedRoute` (+ query params for cross-screen filtering)

## D. Client-side vs. server-side (pagination, export)

The table runs **client-side** today: the full row set is loaded and `p-table`
pages/sorts/filters it in memory. Moving a table to **server-side** later is a
config change, not a rewrite — same `p-table`, add `[lazy]="true"` + `[totalRecords]`
and fill in an `(onLazyLoad)` handler that fetches one page per request. The
paginator UI, sort, and filter controls stay identical. Note that `exportCSV()`
only exports the rows currently in memory, so a server-side table needs a separate
fetch-all to export everything.
