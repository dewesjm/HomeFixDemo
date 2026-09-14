# Welding — Component & Pattern Reference

## Stack

- **Angular 19** — standalone components, signals, modern control flow
- **DaisyUI 5.6.16** (on Tailwind CSS 4.3.2) — all UI components
- **Lucide Angular** — icon library
- **No PrimeNG** — fully migrated away from PrimeNG

---

## App shell (`app.component`)

- Top nav bar with horizontal menu: Pipe Welding, Structural Welding, My Assignments (placeholder), History, Advanced Search, Admin (dropdown)
- Admin dropdown: closes on outside click via document listener; defaults collapsed
- Theme picker in top-right corner
- `<router-outlet>` with `display: contents` for proper flex layout

## Table search (`table-search`)

Main jobs table:
- **TableState** class (`shared/table-state.ts`) handles sorting, filtering, paging
- **Role filter** dropdown (Records, Welding, Fitting, Foreman, Inspector, NQC Inspector, View)
- **Column filters**: text inputs with X clear buttons on Project, Drawing, Joint columns; multiselect dropdown on Current step
- **Global search** with X clear button
- **Banner**: inline pill badge between title and sync status (admin-configurable)
- **CSV export** with column mapping
- **Page-size selector** + prev/next pager (TablePagerComponent)
- Table uses `min-w-0` on wrapper div to prevent horizontal overflow
- Columns: checkbox, ID (numeric), Project (jobNumber), Drawing, Joint, Current step, Actions

## Job detail (`job-detail`)

The workflow page for one job. Sections from top to bottom:

### Routing (numbered step pills)
- Horizontal scrollable row of numbered pills
- Active = green glow, completed = indigo, upcoming = default
- Read-only — click to select/view, not to sign

### Joint Details
- Structured sections: General Info, Pipe Details, Joint Design, NDT Data, Additional Data
- NDT Data shows requirement indicators (X/5X/—) based on `job.ndt`, not SAT/UNSAT
- "Show more/less" toggle for audit/records fields

### Fabrication (cross-stage)
- Location, Specific Location, Deck, Frame, PSCL, Usage
- MIC 1, MIC 2, Drawing Rev, Actual Thickness
- Weld Memo, Revised Joint Design, Change Number
- Fabrication data is **locked after Fit-Up Inspection** signs off
- WTN auto-sets Weld Process (disabled) + PH/IP requirements
- Override Requirements 50/50 chance on weld stages

### Stage signoff (for the selected stage)
- **Step type** dropdown (standard, repeat, etc.)
- **Stage inputs** — dynamic fields per stage template
- **Signoff fields** — inspector name, license, notes, etc.
- **Decision** — SAT/UNSAT (or "Inspection Results" on NDT stages via `decisionLabel`)
- **Required field validation** — inline red errors on signoff click
- **Range validation** — Actual PH/IP validated on blur

### Custom layouts
- **Fit, Root Weld, Final Weld**: custom layout with subsections (Material, Dimensions, Welding, etc.)
- **Tack / Deferred Tack**: custom layout with subsections
- **NDT stages**: fields with `showIf.key === 'inspectionType'` force line breaks (`<span class="stage-field-break">`)
- **5X inspection**: Root Weld and Final Weld have a `performed5x` dropdown; "Yes" auto-signs the corresponding VT/5X NDT stage
- **Layer**: Interim/Final Layer, consumable insert auto-fills filler fields, interim loops
- **Repair**: triggered on NDT rejection; role is Foreman; has attachment field

### Records Review (`stage.id === 'review'`)
- **Verify record fields** table with checkboxes (17 fields mapped to job data)
- **Signoff History** table — pulls directly from signed stages (not history entries)
  - Columns: Stage, Result, Field, Value, Signed By, Date
  - Stage name + result use `rowspan` for multi-field stages
  - **Copy button** — copies as tab-delimited text (paste-friendly for Excel/Sheets)
  - Field labels from stage definitions (not raw keys)
  - Signed By falls back to `job.technician` → seeded name

### Signoff dialog
- Certification checkbox + password prompt
- Required field validation before signoff

### Back button
- Inline with page title (LucideArrowLeft)

## Work history (`work-history`)

- Activity log with columns: When, Who, Action, Old value, New value, Step, Project, Trade, Actions
- Filter by person (select) and by job (text input)
- Global search
- Trade multiselect filter
- CSV export
- "Reverse" button on latest entry per job
- Wrapped in `table-page-wrap` for proper pager positioning

## Adaptive search (`adaptive-search`)

- Schema-driven filter bar with saved variants
- Column picker toggle
- Results table with dynamic columns
- CSV export

## Theme picker

- DaisyUI theme switching via `data-theme` attribute
- Persists to localStorage

## Table pager (`shared/table-pager.component`)

- Uses `ngModel` for page-size select (proper two-way binding)
- Shows: "Showing X to Y of Z", page-size selector, prev/next buttons
- `pr-16` padding to prevent right-edge clipping

---

## Key data patterns

### Seeded workflows (`seededWorkflow()`)
- Deterministic per job ID (PRNG seeded)
- Pre-signs a random number of leading stages
- Populates fields with realistic values via `seededFieldValue()` (selects from pools, falls back to key-based heuristics)
- Generates `HistoryEntry` for each signed stage
- `inspectorName` falls back to `job.technician`

### N Ind. field (`job.nInd`)
- '1', '2', or '3' — randomly seeded
- Impacts: weldPosition visibility, pre-fit stage visibility, NDT role routing

### Stage filtering by `job.ndt`
- `buildStages()` filters NDT stages using regex on `job.ndt` string
- Pattern: `hasUTorRT`, `hasMTorPT`, `hasVT` — determines which NDT stages appear

---

## Build

```powershell
cd "C:\Users\dewes\primeng-search-demo"; npx ng build 2>&1
```

Warnings (246 CSS selector rules skipped) are expected from Tailwind/DaisyUI and are harmless.
