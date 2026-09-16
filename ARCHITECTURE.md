# Welding — Architecture

Welding is a **welding work-order & inspection manager** (prototype). Single-page Angular app with **no backend** — all data is in-memory or `localStorage`.

## Stack

- **Angular 19** — standalone components, signals, modern control flow
- **DaisyUI 5** (on Tailwind CSS 4) — all UI components
- **Lucide Angular** — icons
- **No server / no database.** All data is mock or localStorage.

## Build

```powershell
cd "C:\Users\dewes\primeng-search-demo"; npx ng build 2>&1
```

Warnings (CSS selector rules skipped) are expected from Tailwind/DaisyUI and are harmless.

## Version bumps

`CURRENT_VERSION` in `src/app/services/workflow.service.ts` (~line 22). Bump when stage definitions, field names, data models, or seed data structure change. Old localStorage caches are cleared on version mismatch.

## Folder map

```
src/app/
  app.component.*        Shell: top nav + <router-outlet>. Admin dropdown, theme picker.
  app.routes.ts          URL → screen mapping

  table-search/          Pipe Welding — main job table (filters, role, page-size, CSV export, banner)
  work-history/          History — audit-trail activity log
  adaptive-search/       Advanced Search — schema-driven filter bar + saved variants
  job-detail/            Job detail — routing, joint details, fabrication, signoff, records review
  my-assignments/        My Assignments — assignment list with keyword search
  sync-status/           Online/offline indicator
  theme-picker/          DaisyUI theme switcher

  admin-steps/           Admin → Routing
  admin-signoff-fields/  Admin → Signoff fields
  admin-characteristics/ Admin → Attribute codes
  admin-conditions/      Admin → Condition codes
  admin-materials/       Admin → Materials
  admin-ndt/             Admin → Penetrant
  admin-locations/       Admin → Locations
  admin-step-options/    Admin → Step Options
  admin-weld-positions/  Admin → Weld Positions
  admin-banner/          Admin → Banner
  admin-set-step/        Admin → Set step (force a job's workflow stage)
  admin-joint-designs/   Admin → Joint Designs (with localStorage persistence)
  admin-teams/           Admin → Teams & Permissions (Azure DevOps-style)

  data/                  Plain data & helpers:
    jobs.ts              Job model + seeded generator (240 jobs) + makeJobId() (5-char), makeJobNumber()
    workflow.ts          Stage pipelines, types, buildStages(), seededWorkflow(), FABRICATION_FIELDS, ROLES
    assignments.ts       Assignment model + seeded generator (18 assignments)
    mock-history.ts      Seeded activity entries (welding components)
    joint-designs.ts     JointDesignEntry interface, jointDesigns signal, localStorage
    characteristics.ts   Characteristic code lookup
    conditions.ts        Condition code lookup
    materials.ts         Material list
    filter-schema.ts     Schema-driven filter engine
    export-csv.ts        downloadCsv() helper

  services/
    workflow.service.ts  Per-job workflow state (signals), persists to localStorage, CURRENT_VERSION
    sync.service.ts      Online/offline + pending-sync count (stubbed)

  shared/
    table-state.ts       Sorting, filtering, paging
    table-pager.component   Pagination bar
    multiselect-dropdown.component
    toast.service / toast-host.component   Themed toast notifications
    confirm.service / confirm-dialog.component   Password-protected confirm dialogs
```

## Routes

| Route | Screen |
|---|---|
| `/table` | Pipe Welding (default) |
| `/history` | History (`?job=<id>` deep-link) |
| `/adaptive` | Advanced Search |
| `/jobs/:id` | Job detail |
| `/assignments` | My Assignments |
| `/admin/*` | Admin pages (routing, signoff fields, codes, materials, NDT, locations, etc.) |
| `/admin/joint-designs` | Joint Designs admin |
| `/admin/teams` | Teams & Permissions |

## Data flow

1. **Jobs** — 240 seeded jobs in `jobs.ts`. ID is 5-char alphanumeric (`makeJobId()`), project number is letter + 4 digits (`makeJobNumber()`).
2. **Stage templates** — `workflow.ts`. Admin CRUD persists to localStorage. `getTemplates()` returns merged view.
3. **Per-job workflow** — `WorkflowService`, keyed by job ID, exposed as signals. Seeded jobs start mid-stream with pre-signed stages.
4. **Assignments** — 18 seeded assignments in `assignments.ts` with job references, hull, drawing, location, assigned to "John Johnson".
5. **Work history** — aggregates `WorkflowService.allWorkflows()` into filterable timeline.

### Welding trade stages (in order)

1. Pre-Fit → 2. Fit → 3. Tack → 4. Fit-Up Insp → 5. Fit-Up Release → 6. Deferred Tack → 7. Root → 8. Root NDT UT/RT → 9. Root NDT MT/PT → 10. Root NDT VT/5X → 11. Layer → 12. Layer NDT UT/RT → 13. Layer NDT VT/5X → 14. Layer NDT MT/PT → 15. Final Weld → 16. Final NDT UT/RT → 17. Final NDT MT/PT → 18. Final NDT VT/5X → 19. Review

### Key features

- **PH/IP validation** — range checks with NC (non-critical) support; NC min = no lower limit, NC max = no upper limit
- **Fabrication fields** — locked after Fit-Up Inspection; WTN auto-sets Weld Process + PH/IP requirements
- **Joint Designs** — admin-managed, stored in localStorage, consumed by Fit stage (consumable insert / backing ring visibility)
- **Interim Layer** — signs off and navigates away (fresh copy removed)
- **5X inspection** — auto-signs corresponding VT/5X NDT stage
- **Records Review** — verification grid + signoff history table with copy-to-clipboard

## Layout

- `.layout` — `height: 100vh; flex column`
- `.topnav` — sticky, 3rem, `z-index: 50`. `overflow: hidden` on `.topnav-left` to prevent dropdown clipping
- `.content-body` — `overflow-y: auto; overflow-x: hidden`
- `.table-page-wrap` — `height: calc(100vh - 3rem); overflow: hidden` — header/filters fixed, table scrolls
- Routing step colors use CSS variables (theme-aware)

## Theming

- DaisyUI 5 themes via `data-theme` on `<html>`
- Toasts use `color-mix()` with theme CSS variables
- Routing steps: active = `--color-success`, done = `--color-info`, disabled = `--app-muted`
