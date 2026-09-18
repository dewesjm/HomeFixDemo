# Welding — Component & Pattern Reference

## Stack

- **Angular 19** — standalone components, signals, modern control flow
- **DaisyUI 5** (on Tailwind CSS 4) — all 32 built-in themes
- **Lucide Angular** — icons
- **No PrimeNG** — fully migrated away

---

## App shell (`app.component`)

- Top nav: Pipe Welding, Structural Welding (disabled), My Assignments, History, Advanced Search, Admin (dropdown)
- Admin dropdown: `<details>` element, native toggle, outside-click close via `ViewChild` + document listener
- Theme picker top-right (32 themes, scrollable, default: forest); `.topnav-left` has `overflow: hidden` to prevent dropdown clipping

## Table search (`table-search`)

Main jobs table with `table-page-wrap` layout (fixed header/filters, scrollable table):
- **TableState** class — sorting, global filter (includes ID column), column filters, paging
- **Role filter** dropdown
- **Column filters**: text inputs on Project, Drawing, Joint; hidden on mobile
- **Banner**: admin-configurable inline pill badge
- **CSV export**, **page-size selector**, **prev/next pager**
- **Frozen Actions column** (sticky right on mobile)
- Empty state uses `colspan="7"`
- Table row borders use `var(--app-border)` for theme-aware visibility

## Job detail (`job-detail`)

### Routing (numbered step pills)
- Horizontal scroll, auto-scrolls to center active step on load/navigation
- Active = `--color-success`, done = `--color-info`, disabled = 80% opacity
- Steps shrink on mobile

### Joint Details
- 3-column layout stacks vertically on mobile (`sm:flex-row`)
- Sections: General Info, Pipe Details, Joint Design, NDT Data, Additional Data, Attribute Codes
- Attribute Codes use `detail-row` class consistent with Additional Data

### Fabrication (cross-stage)
- Location dropdown: North Yard Fabrication, South Bay Welding, Pipe Shop — Building 4, Field — Onsite, MV Pacific Trader (Ship)
- Ship-specific fields (Deck, Frame, P/S/CL, Usage) appear with red `*` required indicator when Ship selected
- P/S/CL is a select with P, S, CL options
- MIC 1, MIC 2 (not MCL), Consumable MIC, Backing Ring MIC
- WTN auto-sets Weld Process (disabled) + PH/IP requirements
- PH/IP min/max display values from `stage.inputs` (set by WTN), not hardcoded
- NC values display as plain text in disabled-style div; range checks skip NC limits
- Override Requirements on weld stages (hidden for demo via `@if (false)`)
- Consumable insert auto-fills filler fields from Fit stage
- Consumable insert checkbox on Root Weld (custom block), not in generic field loop
- Affected Item section: below Type dropdown, horizontal layout with inline MIC + per-item "MIC verified" checkbox
- Actual Thickness shows "(in)" unit label

### Stage signoff
- **Step type dropdown** — shown on every stage that has `stepOptions` (Fit, Tack, Root, Layer, Final Weld, all NDT stages)
- **Stage inputs** — dynamic fields per stage template
- **PH/IP validation** — blur-triggered range checks; `stageInputBlur` only clears "is required" errors, not range errors
- **Partial + Portion** — checkbox and text field rendered inline on same line
- **Penetrant Brand** (select) and **Penetrant Manufacturer** (select) — horizontal layout
- **NDT `procedureUsed`** — required on all 9 NDT stages
- **RT fields** (`degreeRt`, `rtFileNumber`, `defectCode`) — show/hide based on `inspectionType === 'rt'`
- **Decision** — SAT/UNSAT or "Inspection Results" on NDT stages
- **Signoff dialog** — certification + password prompt
- Signoff navigates to `/table` or `/assignments` based on `?from=` query param
- **Probationary Inspector** — horizontal layout (checkbox + two text fields)

### Records Review (`stage.id === 'review'`)
- Verify record fields table with checkboxes
- **Signoff History** table — driven by `signoffRecords` (immutable audit trail across all stages)
  - Shows both signed and reopened records chronologically
  - Each record displays: Stage, Action (badge), Field, Value, Who, Date
- **Override Requirements** section (hidden for demo)

### Sold stage
- Once signed, all stages locked (`soldSigned()` computed)
- Deprogress is the only allowed action (via `canReopen` exemption)
- Work History deprogress button limited to most recent signoff entry per job

## My Assignments (`my-assignments`)

- Single-line list: ID, Project, Drawing, Step, Joint, Location, Assigned To (John Johnson), Assignment # (ASN-001)
- **Keyword filter** across all fields
- **Banner** from localStorage (`homefix:banner`)
- **Document link** (dead link, placeholder)
- **Back button** returns to `/assignments` when `?from=assignments`

## Work history (`work-history`)

- Activity log: When, Who, Action, Old/New, Step, Project, Actions
- **Deprogress** button — only on most recent signoff entry per job (not attachments, validation notes, or reopen entries)
- Requires a comment before executing (inline input with Go/Cancel)
- Filter by person, by job; CSV export
- Comment stored in `signoffRecords` and workflow history

## Adaptive search (`adaptive-search`)

- Schema-driven filter bar with saved variants, column picker, CSV export
- Columns: ID, Project, Technician, Drawing, Drawing Rev, Joint, Stage, Status
- All NDT fields (RT Root, RT Final, NDT Root, NDT Each, NDT Final, UT, PWHT)
- Additional data fields (Order, Work Package, Work Permit, Serial Number, Refit Number, Repair Number, Attribute Codes 1-3)

## Admin pages

- **Joint Designs** — admin-managed list with localStorage persistence; consumed by Fit stage
- **Teams & Permissions** — Azure DevOps-style: group list → detail with permission dropdowns (Not set / Allow / Deny)
- **Penetrant** — brand/manufacturer pairs
- All admin pages use ToastService for save confirmations

## Shared components

- **ToastHost** — themed alerts using `color-mix()` with CSS variables (success, info, warn, error)
- **ConfirmDialog** — native `<dialog>`, password-protected, signal-based
- **TablePager** — page size selector, prev/next, range display
- **MultiselectDropdown** — reusable multi-select filter

## Data patterns

- **Seeded workflows** — deterministic per job ID; pre-signs random leading stages with full `signoffRecords`
- **N Ind.** — '1'/'2'/'3', impacts weldPosition visibility, pre-fit visibility, NDT role routing
- **NDT routing** — `job.ndt` string filtered via regex: `hasUTorRT`, `hasMTorPT`, `hasVT`
- **Repair** — dynamically inserted on NDT rejection; role is Foreman
- **Affected Items** — `joiningItem`/`joinToItem` multi-select with `affectedItems` as comma-separated string in stage inputs
- **showIf** — fields support `{ key, equals }` for conditional visibility (e.g., Ship-specific fabrication fields, RT NDT fields)
- **requiredWhen** — fields support `{ key, notEmpty }` for conditional required (e.g., ER/IR Number when Revised Joint Design selected)

## Build

```powershell
cd "C:\Users\dewes\primeng-search-demo"; npx ng build 2>&1
```
