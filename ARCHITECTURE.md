# Welding — Architecture & Component Reference

Welding is a **welding work-order & inspection manager** (prototype). Single-page Angular app with **no backend** — all data is in-memory or `localStorage`.

For the routing rules in plain language (every routing, NDT, repairs, Cut, and what's required to sign each routing), see **[ROUTING.md](ROUTING.md)**. Keep it in routing with any routing change.

**Routing rule for all code: never un-sign a stage.** Anything that sends a joint back sets the current routing to the target via `routeBack()` (`weld-record/routing/route-changes.ts`): every stage from there on gets a fresh copy from `buildStages(job)` (blank inputs, not signed, default `required` flags, then `applySignedFlags()` re-applies Defer Tack / Fit-Up Release from signed stages before the target); the joint then proceeds normally (its earlier sign-offs stay in History).
- Other Repair/Excavation NDT rounds stay as records (unsigned ones stop being required); a Repair target's own round comes up blank (bookkeeping inputs kept, its Excavation NDT not required until Weld Repair is chosen again).
- Going back to Fit or earlier blanks fabrication data. Each route-back writes one History entry, section `Routing`, "<Routing> — Routed back to <X>" (with `fabInputs` when fit-up data was blanked); Cut writes its Refit entry instead.
- **Deprogress** (`RoutingService.deprogress()` / `deprogressWorkflow()`): `signStage()` and `releaseFitUp()` push a `SignoffUndo` onto `JobWorkflow.undo` (routing values, fabrication data, Refit #/Repair # as they were just before); Deprogress pops it, so everything that signoff triggered is undone; signed stages whose `signedAt` still matches keep their current values (Corrections survive); the deprogressed routing and every unsigned routing after it come up blank; its History entry reads "<Routing> - Deprogressed: <reason>".
- With no undo entry (seeded signoffs) it falls back to the last signed stage in routing order.
- **Current routing** = first required unsigned stage counted from the stage flagged `routingFrom` (`activeStage()`; no flag = from the start).
- `routeBack()` puts the flag on its target and NDT UNSAT puts it on the new Repair, so unsigned stages passed over by an admin forward move never become current again; `isStageLocked()` locks everything before the flag.
- Admin > Routing Override (`RoutingService.setRouting`) marks nothing signed: backward = `routeBack()`, forward = just moves the flag (`setRoutingFrom()`), and both clear the undo stack.
- Nothing in the app says "reopen"; the word for undoing a signoff is Deprogress.

## Demo toggles (flipped often)

| Toggle | Where | On | Off |
|---|---|---|---|
| **NO MIKE** | `noMike` in `weld-record/makeup/makeup.component.ts` | `true`: the Makeup page shows only a big "NO MIKE" (a joke among friends). The menu entry still says "Makeup". | `false`: the real Makeup page (grid, search, 90-day cap) renders as normal. |

The real Makeup template is still in `makeup.component.html`, inside the `@else` branch of `@if (noMike)`. To remove the joke for good, delete the `noMike` field, the `@if (noMike) { ... } @else {` opening lines at the top of the template, and the single closing `}` on its last line. Nothing else depends on it.

## Stack

- **Angular 19** — standalone components, signals, modern control flow
- **DaisyUI 5** (on Tailwind CSS 4) — all 32 built-in themes enabled via `themes: all`
- **Lucide Angular** — icons
- **No PrimeNG, no server, no database.** All data is mock or localStorage.

## Terminology

| Term | Meaning |
|---|---|
| **Hull** | The record a job belongs to (`job.hull`, S, T, D or N + 4 digits, e.g. `S7234`). **Not unique** — many jobs share a hull. There is no job number or job `title`, and no joint `title`. |
| **XREFID** | The user-facing identifier shown everywhere (`job.xrefid`), 5-char alphanumeric, matching `job.id` when present. **Blank on ~25% of jobs** (`i % 4 === 0`), same imperfect-source-data pattern as My Assignments and Weld Planning; `job.id` itself is a separate, always-populated internal key (never shown) that routing, workflow lookups, and row selection use, so a blank XREFID never breaks navigation or workflow state. Renders **blank**, not a `'—'` placeholder, on the Weld Record table and Advanced Search lists (a dash in a list reads as if it were stored data); Joint Details keeps its own `'—'` fallback since that's a single-value detail view, not a list. |
| **Drawing** | Letter + 3 digits, dash, 4 digits, e.g. `H711-1234` or `S753-0116` (`job.drawing`, weld-joint `drawing`); both `H` and `S` prefixes appear in seed data. |
| **Serial number** | 9 digits starting with 1 or 2, then `A`, e.g. `229348951A` (`job.serialNumber`). **Blank whenever XREFID is blank** — neither was captured for that record. |
| **Joint (system-joint)** | The weld record's own `joint` field (`job.joint` and Weld Planning's separate `WeldJoint.joint`) — 2-letter system code, hyphen, 5 digits, e.g. `ST-10005` (seed system codes ST/SW/FW/FO/LO/HV are placeholders). It is the only joint identity field: there is no separate joint number, and mass-edit's paste-to-find, save validation and list/detail page titles all match on `joint`. |
| **Job identity** | A job is identified by **either** its XREFID **or** the unique combination of **hull + drawing + joint**. Never use hull alone as an identifier (labels/pickers show hull · drawing · joint). |
| **Routing** | A status the joint is in: Pre-Fit, Fit, Tack, Root, Root NDT 5X/VT, … One row of Admin > Routing Settings, one box on the routing bar; the joint's routing is the ordered list of them, and its current one is `currentRouting`. In code a joint's routing is a `WorkflowStage` (template `StageTemplate`), and ids, file names and parameters still say stage/step (`stepId`, `step-ids.ts`); in anything a person reads (screens, messages, these docs' prose) the word is **routing**, never "step" or "routing step". |
| **Signoff Type** (Type) | What gets signed in a routing: Fit, Weld Build-Up, Tack, VT, 5X, Interim Layer, Final Weld, Repair, … Listed on Admin > Signoff Types (name, Signs routing). One Signoff Type can be offered on several routings (VT on Root, Layer and Final NDT). The joint page's Type droplist picks one. |
| **Signoff Types By Routing** | Admin page: which Signoff Types each routing offers, and its default. |
| **Signoff Type Forms** | Admin page: one form (definition) per Signoff Type (fields, their rules and the layout). Picking a Type on the joint page loads that Type's definition. |
| **Display Name** | Routing Settings column: what the joint, routing bar, Pipe Welding and History call a routing (blank = its Routing name), so two routings can show the same name (Tack and Deferred Tack both as "Tack"). |
| **GWP** (Governing WPS) | Label of the `weldProcedure` field. Groups several Weld Engineering `Procedure` rows, one per WTN (e.g. GWP `W-101` covers WTN `05.5-1`, `05.5-2`, `05.5A-3`, each its own WPS document/PDF). A GWP's base metal 1/2 is fixed across all its WTN rows; Weld Record's GWP droplist is filtered to whichever GWPs match the job's Material Type 1/2 (`gwpOptionsForMaterials()` in `data/procedures.ts`). GWP and WTN option labels are `<code> · <description>` and the selected one's description shows under the field (`procedureDescription()`, e.g. "Semiautomatic GTAW of 02-CS and 01-E60 using MIL-70S-6 for Surface Structure"; the GWP version drops the filler and reads off the GWP's first WPS row); the stored value stays the bare code. Picking a WTN then drives Weld Process, PH/IP requirements and override values by looking up the matching `Procedure` row — see "Weld Engineering" below. |
| **WPS** | One Weld Engineering `Procedure` row/PDF, id `<gwp>-<n>` (e.g. `W-101-2`), shown as "WPS" throughout Weld Engineering screens. |
| **Ship** | `job.ship`, a 3-digit number shown just above Hull in Joint Details. Stable per hull (jobs sharing a hull share a ship), same idea as Hull itself. |
| **Nuclear Indicator** | Label of `job.nInd` (1/2/3). Joint Details shows a hover tooltip on the value (`N_IND_MEANINGS` in `joint-details.component.ts`): 1 = "N 250-1500-1", 2 = "N TP278", 3 = "Non". |

## Build & checks

```powershell
cd "C:\Users\dewes\primeng-search-demo"; npx ng build 2>&1
npx tsc --noEmit --noUnusedLocals -p tsconfig.app.json   # catches unused code
```

Pre-existing SCSS "rules skipped due to selector errors" warnings come from Tailwind/DaisyUI empty `&` selectors and are harmless.

## Version bumps

The "new version available" Reload button does NOT clear saved data; only a `CURRENT_VERSION` change does (on the next load). `CURRENT_VERSION` in `src/app/weld-record/services/workflow-store.service.ts`: bump when stage definitions, field names, data models, or seed data structure change. On mismatch the app clears the caches listed in `clearStaleCaches()` (`data/storage-keys.ts`).

## Deploy

Vercel (`vercel.json`), build output `dist/primeng-search-demo/browser`.
- The production build registers Angular's Service Worker (`serviceWorker: ngsw-config.json` under the `production` configuration in `angular.json`); `app.component.ts` uses `SwUpdate` for the "new version available" reload prompt.
- Offline caching itself isn't otherwise exercised as a demo feature yet, but the update-check plumbing is real and user-facing.
- `vercel.json`'s rewrite must exclude real static files (`ngsw.json`, `ngsw-worker.js`, hashed bundle files, `public/`'s icons/manifest) from the SPA catch-all, or the service worker's own update-manifest request (`/ngsw.json`) gets rewritten to `index.html` instead of the real file, which the SW can't parse as JSON — it retries forever (visible in DevTools Network as endless failed `ngsw.json?ngsw-cache-bust=...` requests) and can get stuck serving a stale cached build indefinitely.
- So the rewrite's `source` excludes any path ending in a file extension (`/((?!.*\.[a-zA-Z0-9]+$).*)`), the standard SPA-hosting pattern (same idea as nginx's `try_files $uri $uri/ /index.html;`) — only extensionless paths (real app routes; nothing in this app's routes has a dot) fall back to `index.html`.

## Storage

All `localStorage` keys live in `data/storage-keys.ts` (`STORAGE.*`, all prefixed `welding:`). Never write a key literal elsewhere. The site banner has one loader/saver in `data/banner.ts` (`bannerFor(page)`).

## Weld Record services

`weld-record/services/` is a shared store plus one service per concern:

| Service | Owns |
|---|---|
| `WorkflowStore` | Per-job state (signals), localStorage persistence/migration, history-entry stamping (`withHistory`). No domain logic — every service below builds on it. |
| `RoutingService` | Filling in a stage's own fields (`setStageInput(s)`); Admin > Routing Override (`setRouting`); Deprogress (`deprogress`). |
| `SignoffService` | Locking a stage's sign-off (`signStage`, `updateStageSignoff`, `correctStage`) and Fit-Up release, saving each with its History entries and undo. Where a signoff sends the joint is `routeSignoff()` in `weld-record/routing/signoff-routing.ts`: defer-tack, fit-up-release activation, Then go to rules for accepted signoffs and an UNSAT whose Reject routes to is the routing itself staying put (Records Review's default), NDT reject adding a Repair round (Repair #), Repair's own routing (Grind Only, Weld Repair → Excavation NDT, Cut → start over from Fit with Refit #), and Excavation NDT's routing. See ROUTING.md for the rules. |
| `ReferenceService` | `addReference`/`removeReference` (the References panel). |
| `FabricationDataService` | `setFabricationData` — cross-stage Welding fields, unrelated to any one stage. |
| `DeviationService` | `record` (accepted deviations, saved on `JobWorkflow.deviations` with a 'Deviation' History entry), `openDeviations`, `isOnHold`. What counts as a deviation is `detectDeviations()` in `weld-record/joint-page/rules/deviations.ts`. See "Deviations" below. |
| `WeldAssignmentService` | `applyAll`/`apply` — writes the external-system stand-in's GWP/WTN/filler onto unsigned welding routings (no History entry). See "External assignment" below. |

**Rule for adding new workflow behavior**: don't default to adding a method to whichever service is already
injected in the component you're editing; that is how one service ends up owning everything. Before
adding a method, ask:
- Is this the same *domain concern* as an existing service (sign-off decisions → `SignoffService`, routing
  navigation → `RoutingService`, etc.)? If yes, add it there.
- Is it a genuinely new concern (e.g. a future "Components installed" or "Job comments" feature)? Give it its
  own service, built on `WorkflowStore` the same way the others are — inject `WorkflowStore`, use
  `store.update(job, mutator)` + `store.withHistory(prev, next, entry)`, don't reinvent persistence.
- Never add state, persistence, or migration logic outside `WorkflowStore` — it's the single place that
  touches `localStorage` for workflows and the only place `CURRENT_VERSION` lives.
- Write the new service's spec file alongside it (see "Testing" below) in the same change, not as follow-up
  work.

## Testing

The remaining test work is scoped in [TEST-COVERAGE-PLAN.md](TEST-COVERAGE-PLAN.md):
prioritized scenarios, acceptance criteria, baseline measurements and a file-level inventory.
This is a deferred backlog; implement one package at a time when requested.

Karma + Jasmine (`npm test` / `npx ng test --watch=false --browsers=ChromeHeadless`), spec files colocated
next to their source (`*.spec.ts`). The tests cover the rules: most of them are in `weld-record/services/` (routing, repairs, Cut, NDT routings in
`signoff.service.spec.ts`), `weld-record/routing/`, `weld-record/signoff-definition/`, `data/procedures.spec.ts`, `weld-record/joint-page/rules/*.spec.ts` (one per rule file) and
the filter engine (`shared/filter-engine.spec.ts`, `weld-planning-filter-schema.spec.ts`); most other modules
(admin CRUD, the screen components) still have none. When you touch a module that
lacks a spec file, adding one is in scope for that change, not a separate task.

## Folder map

```
src/app/
  app.component.*        Shell: top nav + <router-outlet>. System dropdowns / flatten button, theme picker, PWA update prompt.
  app.routes.ts          URL → screen mapping

  weld-record/            All Weld Record (EWR) screens, their admin pages, and the rules behind them. Folder
                          nesting is file location only; it doesn't show in routes or component names.
                          Rules are plain functions (no Angular), in the folder of the concern they belong to:
    model/workflow-types.ts  The workflow data model: a joint's routings, what's recorded on them, its History
    routing/               Everything that decides where a joint is and where it goes (see ROUTING.md):
                           build-stages (which routings a joint gets, from the templates + Included when),
                           step-conditions (Included when / reject rules: the model and matching),
                           stage-templates (built-in routings merged with Admin > Routing Settings edits),
                           current-routing (the current routing, locking), signoff-routing (where a signoff
                           sends the joint: reject targets, Repair, Cut, Excavation NDT, Then go to rules, Engineering
                           Hold), route-changes (route back, Routing Override, Deprogress), type-routing
                           (a Type that signs a later routing), added-stage-templates (editable added-routing seeds), rule-targets (relative destinations), added-steps (Repair /
                           Excavation NDT / Engineering Hold), step-ids (what routing ids look like: NQC twins,
                           repair rounds), built-in-step-rules (every fixed rule tied to one built-in routing),
                           ndt (which NDT routings a joint gets),
                           routing-bar, route-preview (the demo "On signoff, this routes to" line)
    signoff-definition/    What each routing's sign-off shows, requires and locks (Admin > Routing Signoff
                           Types / Signoff Types By Routing / Signoff Type Forms): field-catalog,
                           routing-signoff-types (the Types), signoff-types (which routings offer which),
                           step-field-config (one definition per Type, defaults, localStorage), field-rules,
                           field-rule-lines, field-conditions, condition-context, joint-facts, field-fill,
                           field-locks, shown-fields, definition-layout, signoff-parts, stage-rules,
                           stage-display, form-fields (catalog fields selected by Type), weld-fields
    qualifications/        Qualification Check and Admin > Qualifications conditions (qual-conditions,
                           qual-when, qual-requirements, qualifications)
    pipe-search/           Pipe Welding (Classic) — the old simple job table, switched off by a feature toggle
    adaptive-search/       Pipe Welding (built as Advanced Search) — job table + stacked-condition filters, every field, variants with columns;
                           filter-schema.ts: its fields, rows, variants/page state
    work-history/          History — audit-trail activity log with deprogress (history-rows.ts: History as table
                           rows, where Deprogress/Correct are offered); history-table is its table, which
                           Records Review also shows for one joint
    my-assignments/        My Assignments — assignment list with keyword search
    makeup/                Makeup — acting-foreman grants, flat grid (see Signoff panel section); grants in makeup-grants.ts; `noMike` toggle, see Demo toggles
    joint-page/            Job detail — page state, wiring and signing; joint-overrides.service.ts holds the visit's
                           Foreman/engineering override state; signoff-form-edits.service.ts = what happens when a
                           value changes on the sign-off form; signoff-form-errors.service.ts = its red field messages
      rules/               The joint page's form rules, plain functions: fit-signoff (the sign-off fields
                           Pre-Fit/Fit/Fit-Up Insp draw), stage-form (which routing fields show, their options),
                           weld-cascade (what a GWP/WTN/requirement change clears; the fill rules do the rest),
                           sign-validation (sign blockers + field errors), deviations (out-of-spec values that
                           can be accepted), verify-values, unsaved-edits, type-change (what picking a Type does)
    routing-bar/           Horizontal numbered routing pills (auto-scrolls to the selected stage)
    joint-details/         Read-only joint/NDT/additional data panel (joint-details-values.ts: UT/VT worked out from the job)
    fabrication/           Cross-stage fabrication fields (Welding): fabrication-fields.ts (the fields, snapshots),
                           fabrication-form.ts (which show, their options, what is missing)
    signoff-panel/         Per-routing sign-off. signoff-panel is the frame every routing shares (Type, Inspecting,
                           Comments, Signoff and overrides) around definition-form, the routing's form laid out
                           from its Signoff Type Form: definition-field (one field), affected-item,
                           stage-decision (Inspection Results), verify-grid (Fit-Up Insp / Records Review rows),
                           signoff-history (the joint's History, Records Review).
                           signoff-context.ts: SignoffContext, what the joint page hands them all
    deviation-dialog/      Deviation acceptance screen Signoff opens when the stage has deviations
    references/            References panel (file names recorded on the joint)
    sync-status/           Online/offline dot in the top bar (app.component), status text on hover (stubbed)
    services/             A shared store + one service per concern. See "Weld Record services" above for
                          what each owns and the rule for adding new ones.
      workflow-store.service.ts  Per-job workflow state (signals), localStorage persistence + migration,
                                 history-entry stamping (`withHistory`). The shared primitive every other
                                 service here builds on — owns no domain logic itself.
      routing.service.ts   Stage-progression routing: filling in a stage's own fields (setStageInput(s)),
                           Admin > Routing Override (setRouting), Deprogress (deprogress).
      signoff.service.ts   Per-stage sign-off: signStage, correctStage, releaseFitUp, updateStageSignoff;
                           the routing a signoff triggers is routing/signoff-routing.ts (routeSignoff).
      reference.service.ts addReference, removeReference.
      fabrication-data.service.ts  setFabricationData (cross-stage Welding fields).
      deviation.service.ts  Accepted deviations + the hold they put on the joint.
      sync.service.ts      Online/offline + pending-sync count (stubbed)
    admin/
      admin-routing/         Admin → Routing Settings (stage templates per trade): Order (drag), Included when
                             and reject rules (weld-record/routing/step-conditions.ts; clause ops is / is not / contains,
                             compared trimmed, any case; fields = Joint Details + 'step.<stageId>.<key>'
                             routing answers of earlier routings, built from the templates workflow/stage-templates.ts
                             registers via registerStepTemplates(); 'self.<key>' in reject rules),
                             Fabrication editable, Role. Clause editing rules shared by both rule
                             dialogs: weld-record/admin/admin-routing/condition-editing.ts. A routing's fields aren't editable or
                             saved here; they come from the built-in routing definitions
      admin-set-routing/     Admin → Routing Override (change a joint's current routing; typed Hull/Drawing/Joint + required reason)
      admin-routing-signoff-types/ Admin → Signoff Types (every Type: name, Signs routing)
      admin-signoff-types/ Admin → Signoff Types By Routing (seeded table: which routings have a Type droplist, and which Types it offers)
      admin-signoff-type-definition/  Admin → Signoff Type Forms (/admin/signoff-fields): configure which
                             catalog fields are active on each Type; live configuration stored in
                             welding:step-field-config (key in data/storage-keys.ts). Parts: definition-layout-list
                             (line numbers, widths, headings, Inspection Results), field-condition-editor
                             (a rule's condition and Prepopulated from source) over condition-group-editor /
                             condition-work, definition-edits (writes the open condition back to its field)
      admin-characteristics/ Admin → Attribute codes
      admin-material-traceability/, admin-material-classification/, admin-penetrant/, admin-locations/, admin-ship-locations/,
      admin-weld-positions/, admin-joint-designs/, admin-banner/, admin-groups/, admin-quick-links/,
      admin-qualifications/, admin-inspection-procedures/,
      admin-defect-codes/    Other admin pages
      Admin page conventions: table pages edit one row at a time (pencil, then check or cancel; opening
      another row cancels the open one; a never-saved new row goes away on cancel). Banner is one form
      with Save, Feature Toggles save on change, Routing Override is an action form. Every delete asks
      through ConfirmService.confirmDelete(). The Weld Record Admin menu (both copies in
      app.component.html) is alphabetical with one icon per page.

  weld-planning/          Weld Planning — joints list/form/detail/mass-edit/admin/advanced-search (own data in
                          data/weld-planning.ts; export columns and import template in weld-joint-files.ts; filter fields in weld-planning-filter-schema.ts, matching through shared/filter-engine.ts). Its own
                          admin screen (weld-planning-admin.component.ts) lives inside this folder, not split out.
                          No services/ yet — addWeldJoint()/updateWeldJoint() are called straight from the form
                          component since there's no business logic beyond persistence today; add one once
                          create-time rules exist (see "Weld Record services" above for the pattern to follow —
                          one store for state/persistence, one service per domain concern on top of it).

    external-loads/       Weld Planning > External Loads: read-only demo of the planned vendor file load (nothing runs a real
                          load). Process map on top picks which stage table shows below (stage-table.component.ts is the shared
                          sortable table; column lists in external-loads-columns.ts), plus raw-lines (column ruler, shaded
                          layout fields), record-lookup (XREFID or hull/drawing/joint through every stage) and the error log.
                          The load pipeline is in this folder: layout.ts (fixed-width layout spec), convert.ts (Converted),
                          rules.ts (Processed: Vendor Joint, Excluded by status, Not converted), merge.ts (into the shared weld
                          joint table; joints with weld record data are never removed; a line that won't convert keeps the
                          joint's previous values), file-checks.ts, data/external-load-files.ts (three small sample files), loads.ts (runs the
                          samples through every stage), lookup.ts, table-rows.ts. Static, no localStorage.

  weld-engineering/       Weld Engineering — Procedure Lookup. Own data in data/procedures.ts; added sections in
                          procedure-sections.ts; CSV export columns and import template in procedure-files.ts.
                          One Procedure row per GWP+WTN pair (id `<gwp>-<n>`, e.g. `W-101-2`); a GWP's base
                          metal 1/2 is fixed across its WTN rows, 1-3 GWPs (2-4 WTNs each) per Material Type 1 x
                          Material Type 2 combination (same codes as Job.materialType1/2, see "GWP" in Terminology).
                          Weld Record's GWP/WTN stage fields cascade from this data (gwpOptionsForMaterials(),
                          wtnOptionsForGwp(), getProcedureByGwpWtn(); see "Signoff panel" below).
                          Filler Metal Type/Size cascade the same way: each Procedure
                          carries `fillerMetalTypes`/`fillerMetalSizes` (string[] of valid option VALUES, e.g.
                          `'mil-70s-3'`/`'1/16'` — the same FILLER_METAL_TYPE_OPTIONS/FILLER_METAL_SIZE_OPTIONS Pre-Fit/Fit's Consumable Insert uses,
                          not FILLER_METAL_TYPES' label casing), and Weld Record's Filler Metal Type/Size
                          fields filter to whichever the resolved GWP+WTN Procedure allows
                          (`fillerMetalTypeOptionsForProcedure()`/`fillerMetalSizeOptionsForProcedure()`) —
                          and GWP, WTN and Filler Metal Type/Size are set by a stand-in for an external
                          system (see "External assignment" below), read-only unless the joint is an
                          engineering override one (typed by hand). Under a Foreman Override (turned off), changing GWP or WTN clears a selection that's no longer
                          valid under the new WPS. `fillerMetalClassification` (a single
                          label-cased MIL- string, e.g. `'MIL-80S-50'`) is unrelated — free text for the PDF,
                          not part of the cascade.
    procedure-sections.ts  Added procedure sections: definitions (sections + fields, own localStorage key) and
                            the rules for their values. A procedure stores every added field's value in one
                            bag, `Procedure.extraFields`, keyed by field key (a real DB: two definition tables +
                            one JSON column). Nothing in Weld Record reads added fields; they show on the
                            procedure form, PDF and CSV export only. Procedure Lookup doesn't search them.
    procedure-files.ts      CSV export columns (Manage Procedures) and the Load Procedures .xlsx template
    procedure-lookup/       All procedures shown at once (no pager), sortable/searchable. Columns: WPS, Rev
                            (narrow — wpsRev is max 5 chars), Effective Date, GWP, WTN, Title, Status, Weld
                            Process, Process Type, Base Metal 1/2 Type, Filler Metal Types (comma-joined array).
                            Search also covers GWP, Weld Process, Process Type, Base Metal 1/2 Type, Filler
                            Metal Types.
    procedure-detail/       Renders the generated PDF inline (iframe) + Download; page title shows WPS id + WTN.
    procedure-pdf.ts        Pure Procedure -> pdfmake document-definition transform (unit-tested). Layout:
                            Revision Record, then 1. Base Metal, 2. Joint Design, 3. Welding Position,
                            4. Filler Metal, 5. Welder Qualifications, 6. Preheat & Interpass Temperatures,
                            7. Equipment, 8. Gas, 9. Heat Input, 10. Parameters, 11. Heat Treatment, then
                            added sections (12 on, weld-engineering/procedure-sections.ts), then Rules/Specific Conditions. Every page has a header ("printed from Weld
                            Engineering, verify revision prior to use") and footer (GWP - WTN, Rev N left;
                            pagination right).
    procedure-pdf-actions.ts  The only file touching the real pdfmake renderer (open/download/getDataUrl + vfs fonts)
    admin/
      manage-procedures/     List (search/sort/Edit/Delete/CSV export) + procedure-form (create/edit, organized
                              into the same 11 sections as the PDF). Saving blocks a duplicate GWP+WTN pair and
                              a base metal pair that disagrees with other WPS rows already on that GWP. Editing
                              a WPS that's (or was) Active requires a Revision Note, appended to that
                              procedure's `revisionHistory` (shown at the top of the PDF as Revision Record).
                              Filler Metal Type/Size are checkbox lists against FILLER_METAL_TYPE_OPTIONS/
                              FILLER_METAL_SIZE_OPTIONS (which values are valid for this WPS), not a single
                              select/free-text range like the rest of the form.
      load-procedures/       Bulk import via .xlsx/.csv or "Use Sample"; shares BulkImport + app-import-grid with Weld Planning's mass-edit
                              (keeps an existing procedure's extraFields; doesn't import added-section values)
      procedure-sections/    Add sections after the built-in 1-11 and fields to them (text, number, min/max
                              range, list; required or not). Add only: no rename/remove. A "How it's stored"
                              panel shows the definitions and one procedure's extraFields as JSON.

  theme-picker/           DaisyUI theme switcher (32 themes, default: Light)

  data/                   Seed data and stored lookup tables only: the app's stand-in for a backend. Each
                          file is records, their model, and load/save (localStorage); rules that use them
                          live in the feature folders above.
    jobs.ts              Job model + seeded generator (480 jobs), makeJobId(), makeHull(), makeShip(),
                         addTestJob(); exports MATERIALS_1/MATERIALS_2 (base metal codes) reused by
                         Weld Engineering's procedures.ts for baseMetal1Type/baseMetal2Type
    seeded-workflow.ts, seed-fabrication.ts   Each job's workflow with a deterministic run of routings already signed
    welding-steps.ts     The built-in Welding routings, in order (Admin > Routing Settings edits merge onto these)
    assignments.ts       Assignment model + seeded generator (36)
    people.ts            Mock people directory (id, first, last, title), searchPeople(), stampWho(); one source for all seeded names
    weld-assignment.ts   Stand-in for the external system that sets GWP / WTN / Filler Metal (see "External assignment")
    shops.ts, weld-positions.ts, penetrants.ts, ship-locations.ts, defect-codes.ts, inspection-procedures.ts,
    joint-designs.ts, characteristics.ts, mcl-traceability.ts, material-classification.ts, admin-groups.ts,
    quick-links.ts       Admin lookup tables
    banner.ts            Admin banner load/save/bannerFor(page)
    feature-toggles.ts   Admin > Feature Toggles
    ndt-labels.ts        The Joint Details NDT field names
    storage-keys.ts      Every localStorage key + clearStaleCaches()
    changelog.ts         Quick Links > Change Log entries
    weld-planning.ts     Weld Planning's joints (model, seed, CRUD) and admin joint designs
    external-load-files.ts  The External Loads page's three sample vendor files
    procedures.ts         Weld Engineering Procedure model (one row per GWP+WTN pair, 11 WPS sections +
                          revisionHistory) + seeded generator (one GWP per Material Type 1 x 2 combination,
                          imported from jobs.ts's MATERIALS_1/MATERIALS_2), CRUD, GWP/WTN cascade helpers
                          (allGwpOptions, gwpOptionsForMaterials, wtnOptionsForGwp, getProcedureByGwpWtn,
                          hasOverride, allWtns), Filler Metal Type/Size cascade helpers
                          (fillerMetalTypeOptionsForProcedure, fillerMetalSizeOptionsForProcedure) and their
                          option lists (FILLER_METAL_TYPE_OPTIONS, FILLER_METAL_SIZE_OPTIONS)

  shared/
    filter-engine.ts     Filter engine both Advanced Searches use: stacked conditions, matching, chip text
    export-csv.ts, spreadsheet-import.ts   CSV download; reading an uploaded .csv/.xlsx into rows, blank .xlsx templates
    table-state.ts       Sorting, filtering, paging (one instance per table screen)
    sort-header.component  th[appSortHeader]: sort link + optional text/multiselect column filter (clickToFilter: hidden behind a funnel)
    menu-button.component  ⋯ button opening a small menu of projected <li><button> items
    table-pager.component, multiselect-dropdown.component, date-range.component
    table-toolbar.component  Toolbar over every admin table: search box, Export, Add (addLabel; blank = no Add);
                         [toolbarEnd] slot for pages that add rows inline. Pair with th[appSortHeader] columns.
    bulk-import.ts / import-grid.component  Shared spreadsheet-import flow (file/sample load, validate, Save All)
                         and frame (counts, actions, status column, empty state) for Import Joints / Mass Edit
                         and Load Procedures. A page extends BulkImport and passes its columns as
                         #headerCells / #rowCells templates.
    banner-pill.component  The admin banner: a pill beside the page title, or a full-width strip under the header past BANNER_PILL_MAX (60) characters
    date-format.ts       The one date format: formatDate / formatDateTime and the appDate / appDateTime pipes
                         (09/26/2026, 09/26/2026 3:04 PM). Use these for every displayed or exported date.
    toast.service / toast-host.component   Themed toast notifications
    confirm.service / confirm-dialog.component   Confirm dialogs; optional password field OR a generic
                       textInput field (label + placeholder), both captured via one `inputValue` signal,
                       so any screen can prompt for a short piece of text (e.g. History's Deprogress
                       reason) without building its own dialog.
    person-search-input.component   Free-text field with a people-directory search assist (name/PERN/id);
                       used by Probationary/Oversight Inspector (see Signoff panel section).
```

## Routes

| Route | Screen |
|---|---|
| `/pipe-search` | Pipe Welding (default) = `AdaptiveSearchComponent` |
| `/pipe-search-classic` | Pipe Welding (Classic) = `PipeSearchComponent`; redirects to `/pipe-search` unless Admin > Feature Toggles > Classic Pipe Welding page is on |
| `/history` | History (`?job=<id>` deep-link) |
| `/adaptive` | Redirects to `/pipe-search` (kept so old links still work) |
| `/jobs/:id` | Job detail (`?from=assignments` or `?from=history` returns there after Back/signoff; default is Pipe Welding — `backDestination()` in `joint-page.component.ts`) |
| `/assignments` | My Assignments |
| `/changelog` | Change Log (Quick Links menu): plain-language list of changes, newest first, data in `data/changelog.ts`. **Add an entry with every user-facing change.** |
| `/admin/routing`, `/admin/set-routing`, `/admin/routing-signoff-types`, `/admin/signoff-types` | Routing admin |
| `/admin/*` | Other admin pages (signoff-fields, characteristics, ndt, locations, ship-locations (+ /import), weld-positions, banner, joint-designs, groups, qualifications, material-traceability, inspection-procedures, defect-codes) |
| `/weld-planning`, `/weld-planning/new`, `/weld-planning/:id`, `/weld-planning/:id/edit` | Weld Planning joint list/create/detail/edit |
| `/weld-planning/search` | Weld Planning Advanced Search (schema-driven filter bar, saved variants, column picker — the older pattern of Weld Record's search, before stacked conditions; scoped to `WeldJoint`) |
| `/weld-planning/import` | Weld Planning mass import/edit |
| `/weld-planning/admin` | Weld Planning admin (Joint Designs & NDT) |
| `/weld-engineering`, `/weld-engineering/procedures/:id` | Procedure Lookup list + PDF detail |
| `/weld-engineering/admin`, `/weld-engineering/admin/new`, `/weld-engineering/admin/:id/edit` | Manage Procedures list/create/edit |
| `/weld-engineering/admin/import` | Load Procedures bulk import |
| `/weld-engineering/admin/sections` | Procedure Sections (add sections/fields after 11) |

## Field definitions

`signoff-definition/field-catalog.ts` is the only source of field labels, types and options. `FormField` is its runtime shape with evaluated required/disabled rules; field types stay fixed in the catalog. Signoff Type Forms selects the fields and their rules/layout, and shows each field's type read-only in its Fields list.

`form-fields.ts` derives fields for the selected Type when needed. `formInputFields()` reads ordinary inputs; `formSignoffFields()` reads Pre-Fit/Fit's signoff-stored insert, ring and Defer Tack values. `routingFormFields()` unions all offered Types for routing and qualification condition pickers. Picker caches refresh when forms change. `shown-fields.ts` applies visibility, required and disabled conditions to catalog definitions. Defer Tack is therefore a checkbox everywhere, including History and validation.

`WorkflowStage`, `StageTemplate` and undo snapshots have no `fields` or `signoffFields` properties. They carry routing state, Type choices and recorded values. The store drops legacy copied definitions (including those on undo snapshots) on load and keeps recorded values and History snapshots. There is no template-field fallback, including for a custom routing without a Type form. Engineering Hold retains its dedicated release form.

## Data flow

1. **Jobs** — 480 seeded Welding jobs in `jobs.ts` sharing 48 hulls (3–18 jobs per hull). Internal `id` is 5-char alphanumeric (`makeJobId()`), always populated, unique; `xrefid` mirrors it except on ~25% of rows where it's blank (imperfect source data). Hull is letter + 4 digits (`makeHull()`). `generateJobs()` guarantees the identity rule of unique hull + drawing + joint (the true key when XREFID is blank).
2. **Stage templates** — `workflow/stage-templates.ts` (built-in routings in `workflow/welding-steps.ts`). Admin CRUD persists to localStorage; `getTemplates()` returns the merged view. The nine NDT stages come from one `ndtStage(phase, kind)` factory.
   Added templates (Repair, Excavation NDT, Engineering Hold) are stored and edited with numbered templates, but `buildStages()` excludes them. Runtime factories read their shared settings using `getAddedTemplate()`; `routingTemplateId()` maps numbered rounds to their shared row. Then go to / Reject targets support insertion and relative destinations. Repair #, Refit #, insertion and route-back bookkeeping remain in code; repair destination choices are table rules.
3. **Per-job workflow** — `WorkflowStore`, keyed by job id, exposed as signals; `RoutingService`/`SignoffService`/`ReferenceService`/`FabricationDataService` mutate it (see "Weld Record services" below). Seeded jobs start mid-stream with pre-signed stages (inspection stages get a chosen type).
4. **Assignments** — 36 seeded, assigned to "John Johnson".
5. **History** — aggregates `WorkflowStore.allWorkflows()` into a filterable timeline.

### Welding stages (in order)

Pre-Fit (conditional) → Fit → Tack → Fit-Up Insp → Fit-Up Release (conditional) → Deferred Tack (conditional) → Root → Root NDT → Layer → Layer NDT → Final Weld → Final NDT → **O63 Records Review** *or* **O04 Records Review** → Sold. Repair (and Excavation NDT) rounds are inserted at runtime after a failed NDT stage.

Each phase's NDT is 1–3 stages from the `ndtStage(phase, kind)` templates, in 5X/VT → MT/PT → RT/UT order, chosen per job by `jobNdtSteps()` (see "NDT routing" under Data patterns, and ROUTING.md's chart).

Records Review is exactly one of two stages, chosen by `buildStages()` (`weld-record/routing/build-stages.ts`, via each Review's Admin > Routing Settings condition) from the job's own data — never both: **O63** (`review-o63`) when any of `job.sfff`, `job.dssAaa`, `job.ss` is set; **O04** (`review-o04`) otherwise.
- Both share identical fields/behavior — only the id/label differ. Their `rejectToStage: 'final-ndt-vt5x'` is kept so UNSAT can be signed (an UNSAT with no reject target is a sign error); UNSAT doesn't route anywhere (see "NDT routing").
- The SAT/UNSAT choice itself shows because their definitions list Inspection Results (`hasDecision()`).

## Screens

### Pipe Welding (Classic) (`pipe-search`)
- **Switched off**: Pipe Welding is the Advanced Search screen below. This one opens at `/pipe-search-classic` only while the `classicPipeWelding` feature toggle (`data/feature-toggles.ts`, a signal the menu and route guard read) is on, and then has its own Weld Record menu entry. Kept so it can be turned back on without a rewrite.
- Deliberately the "dumb", fast version. Layout: `table-page-wrap` (fixed header/filters, scrollable table).
- Columns: XREFID, Hull, Drawing, Joint, Order, Sequence, Current routing, Actions — sortable, with per-column filters via `appSortHeader`.
- Role dropdown, CSV export (right-aligned, next to the keyword search box), page-size selector, admin banner pill, frozen Actions column on mobile.
- Persists filter/sort/page/role to `STORAGE.searchState`.

### Pipe Welding (`adaptive-search`)
- **Is Pipe Welding**: route `/pipe-search`, menu entry Pipe Welding, heading Pipe Welding, banner target `pipe-welding` (a banner saved for `advanced-search` loads as `pipe-welding`), CSV `pipe-welding.csv`. Code names (`adaptive-search`, `AdaptiveSearchComponent`, `STORAGE.advancedSearchState`) are unchanged.
- **Pipe Welding plus the adaptive tools**. Layout is Pipe Welding's `table-page-wrap`. Has everything Pipe Welding has: role droplist (same "current routing's role" filter, `View All`), keyword search over XREFID/hull/drawing/joint/order/sequence, `appSortHeader` sort + filter in every column heading (multiselect for list fields, text box for text, sort only for numbers/dates), checkbox select + Release to Welding (Foreman, Fit-Up Release rows), History + Details buttons, banner pill.
- **Fields** (`searchFields()` in `weld-record/adaptive-search/filter-schema.ts`): one list used for both filters and columns.
  - Every `Job` field (incl. Ship), Current routing, every Fabrication field (`fab.<key>`, select values shown as labels), and every Welding routing's own answers (`step.<stageId>.<key>`, from `allStepAnswerFields()` in `step-conditions.ts`, same fields Admin > Routing Settings conditions use; blank until that routing is signed).
  - Built when the screen opens since routing templates are admin-editable. Rows are built by `buildRow()`; fabrication/routing values are only worked out for keys a column, filter or sort uses (there are a lot of routing fields).
- **Stacked conditions**: filter values are `Record<fieldKey, Condition[]>`; each field in the bar shows its conditions (operator droplist + value) and "Add condition".
  - Operators: text `contains / does not contain / is / is not / starts with / is blank / is not blank`; list fields `is / is not` (multiselect of the values present) plus contains/does not contain/blank; numbers and dates `between / greater than (after) / less than (before)`.
  - Combining: a field's include conditions are OR'd, its exclude conditions (does not contain, is not, is not blank) must all hold; different fields AND. The stacked rows are prefixed "or"/"and" to show this.
  - Chips read e.g. `Hull: starts with "S" or starts with "T", and does not contain "7"`. Empty conditions don't filter. Taking a field out of the bar (Adapt filters) clears its conditions.
- **UI wording**: the screens say **View** ("Save view…", "Delete this view", "View name") and **Customize filters**; the code, storage keys and the notes below still say variant / Adapt filters. The built-in one is still labeled **Standard**.
- **Header layout**: header = title, banner, View droplist, a ⋯ View menu (Save view…, Make this my default / Stop using as my default, Delete view), and a "Filters (n)" toggle.
  - "Customize filters" is the "+ Add field" tile at the end of the filter bar (the bar can show with no fields, just the tile).
  - Second row: role, Release, match count, chips, "Clear all" (only while something filters: chips, heading filters, keyword or a role other than View All), keyword search, then a ⋯ menu with Columns… and Export.
  - Delete view asks through `ConfirmService` first (both Advanced Searches). Column-heading filters use `clickToFilter`: a funnel beside the heading name opens the box, filled/primary while that column filters.
  - Weld Planning's Advanced Search has the same View ⋯ menu, "+ Add field" tile, "Clear all" (its old Reset) and Columns/Export ⋯ menu.
- **Variants = layouts**: a variant saves filter bar fields + conditions, columns, column-heading filters, keyword, sort and role (`SearchLayout`).
  - Built-in **Standard** variant (first in the droplist, can't be deleted or overwritten) = Pipe Welding's columns (XREFID, Hull, Drawing, Joint, Order, Sequence, Current routing), filter bar **empty** (the column headings already filter those; the bar only shows once Adapt filters adds a field), role View All.
  - **Default variant** (per user, not global): "Make this my default" in the View menu makes the chosen variant this browser's default (`STORAGE.advancedSearchDefault`; the app has no logins, so per browser = per user, same as variants themselves); the droplist marks it "(default)"; "Stop using as my default" goes back to Standard; deleting the default variant clears it.
  - Variants saved in an older one-value-per-field format are converted on load (`loadVariants()`). The page's own state (layout + chosen variant + page/page size) is saved to `STORAGE.advancedSearchState` in both sessionStorage and localStorage.
  - Opening the page: this tab's state if any (refresh, back from a joint), else a new visit opens on the default variant (the starred one, else Standard), with the filter bar hidden; only page size carries over from the last visit.
- **Compact filter bar + Hide/Show**: one line per condition (operator box sized to the chosen operator's label, value box beside it; the last line ends in a + "Add condition" button, earlier lines in x "Remove this condition"); fields are 19rem wide. The "Filters (n)" toggle in the header folds the bar away (chips still show active filters); kept for this tab (`filtersHidden`), not saved in variants; a new visit starts hidden; Adapt filters adding fields shows the bar.
- Routing fields: Fit's Defer Tack and Fit-Up Insp's Release to welding sit under their own routing, so groups follow routing order.
- **Drag column headings to reorder**: native HTML drag and drop on the `th`, only armed when the press starts outside the heading's filter box/button (`armColDrag`), drop on the left/right half of another heading puts it before/after (inset primary-colour edge shows where). Mouse only (HTML drag and drop doesn't fire on touch); the Columns dialog's arrows still cover touch/keyboard. The new order is part of the layout, so it persists and saves with a variant.
- Clear all (Pipe Welding's Clear filters): clears conditions, column filters and keyword, role back to View All; keeps the bar fields, columns and chosen variant. Hiding a column drops its column filter and sort.
- Weld Planning's Advanced Search is a separate, simpler screen (see below).

### Job detail (`joint-page`)
- **Routing bar** — numbered pills, horizontal scroll, auto-centers the selected stage. Active = `--color-success`, done = `--color-info`. Which routings it shows is `routingBarSteps()` (`weld-record/routing/routing-bar.ts`): signed, required or current routings, except a repair round (Repair + its Excavation NDT) shows only while open, unnumbered.
- **Joint details** — 3 columns (stack on mobile): job info (XREFID, **Ship** (3-digit, right above Hull), Hull, ...), joining/join-to (MCL 1/2, Material Type 1/2, Joining/Join To Item — 1 letter + 8 digits + hyphen + 2 digits, e.g. `S12341001-14` (seed values are invented), NDT data (RT Root/Final and NDT Root/Each/Final shown exactly as stored; UT/VT still shown as `X`/`5X` derived from `job.ndt`'s free text by `ndtLabel()`); "Show more" reveals additional data and attribute codes. Attribute codes show as `code description` (`attrCodeDisplay()`, looked up via `characteristicLabel()` in `data/characteristics.ts`, the same table Admin > Attribute Codes manages; that page is not in the menus because attribute codes belong to another system, and the route `/admin/characteristics` and table stay for the code -> description lookup). `ATTR_CODES` in `jobs.ts` reuses `CHARACTERISTIC_CODES`' codes so seeded descriptions resolve.
- **Fabrication** (cross-stage) — Location, MIC 1/2, Drawing Rev, Actual Thickness (all required with red `*`; Ship adds Deck/Frame/P-S-CL/Usage, also required with red `*`), WTN, Revised Joint Design. Location/MIC 1/2/Drawing Rev/Actual Thickness are enforced before Fit can sign off (`FIT_REQUIRED_FABRICATION`); MIC 1/MIC 2 only when that joint member's MCL requires traceability (same condition that hides the field entirely, see "Affected Items" below), matching `fabFields()`'s own filtering.
- **Signoff panel** (below).
- **Top nav menus** — one open at a time; they close on outside click or when a real (non-disabled) link is chosen, and collapse their nested Admin submenu (`closeAll()` in `app.component.ts`). Each group's Admin submenu (`.submenu` in `app.component.scss`) caps at `max-height: calc(100vh - 5rem)` with `overflow-y: auto` so a long Admin submenu scrolls; all four nav groups share the class.
- **Flatten button** (list/tree icon next to the system name) — one global on/off (`flatNav` in `app.component.ts`).
  - When on, the top bar swaps the four system dropdowns for the **active system's** own items laid out flat, with that system's Admin as its one dropdown: Weld Engineering (Procedure Lookup + Admin), Weld Planning (Joint Search, Import Joints, Advanced Search + Admin), Weld Dispatch (all disabled + Admin), Weld Record (My Assignments … Makeup + Admin).
  - The active system is `systemForUrl()`: `/weld-planning`, `/weld-assignment`, `/weld-engineering` map to their systems, **everything else is Weld Record** (Makeup, Hull Details, `/admin/*`).
  - So a route in a new system needs a line there, or it'll be treated as Weld Record. Navigating across systems while flattened (e.g. Quick Links > Manage Quick Links) flattens the new system instead.
  - Procedure Lookup and Joint Search use `exact: true` link matching, so they don't highlight while you're on their Admin pages (or their detail pages).
- **Records Retention Review** (`review-o63` / `review-o04` stages, see "Welding stages" above; roles **O63 Records** / **O04 Records**, since O63 and O04 are reviewed by different groups of people; `sold` follows whichever track the job went through) — verification grid + the joint's History (the History screen's table without the joint columns, with Deprogress, Correct, sort and column filters).
- **Sold** — once signed all stages lock; only deprogress is allowed (Work History, most recent signoff per job).
- **Unsigned edits are discarded on leaving, with a warning if there are any** — `canDeactivateGuard` (`shared/can-deactivate.guard.ts`) calls `JointPageComponent.canDeactivate()`, which compares the live workflow against a snapshot taken on load (`loadSnapshot`, `hasUnsavedEdits()` in `weld-record/joint-page/rules/unsaved-edits.ts`) covering *every* unsigned stage's inputs/signoffInputs/signoffType **and** `fabricationData` — not just the one stage the user last touched.
  - `ngOnDestroy()` reverts all of that back to the snapshot for any stage that's still unsigned (and Fab data, unless the Fit stage got signed this visit) once the route actually changes, whether the user confirmed the warning or there was nothing to warn about.

### Signoff panel (`signoff-panel`)
- **Structure**: one shared frame (`signoff-panel`: Type, Inspecting, Comments, Signoff) around one form, `definition-form`, laid out from the Signoff Type's definition for every routing (see **Layout from the definition**).
  - There is no per-routing form kind: what a routing draws is its definition's fields.
  - What's left tied to the routing is listed in one file, `weld-record/routing/built-in-step-rules.ts`, one function and comment per rule: Sold (`closesJoint()`) is never signed: it shows a SOLD badge and "Job closed", has no Comments box or routing preview, and closes the joint; Fit (`needsFabricationComplete()`) needs its required Fabrication values (`missingFitFabrication()`) and no Fabrication errors to be signed, Fit-Up Insp (`blocksOnFabricationErrors()`) no Fabrication errors.
  - Engineering Hold (an added routing, `isEngineeringHoldId()`) shows Engineering's release form instead of Signoff. Weld override fields remain in the catalog and welding Type forms; their display/fill behavior is switched off by SHOW_WELD_OVERRIDES.
- **Qualification Check** is an ordinary field of any routing whose definition lists it (the welding routings and Pre-Fit, Fit-Up Insp, every NDT, Excavation NDT): `definition-field` shows the signer's quals checked against the conditions the joint and routing match (`conditionRequirements()`), where the Layout list places it, following its Show when. `detectDeviations()` checks quals on a routing that shows it.
- **Signoff section fields** (Type, Inspection Results, Comments): catalog fields `type`, `decision`, `comments` (`TYPE_KEY`, `DECISION_KEY`, `COMMENTS_KEY`, `ownComponent`, fixed rules), ticked on a Signoff Type's definition; the panel draws them.
  - `showsType()` (stage-rules.ts): the routing has Signoff Types By Routing options and the picked Type's definition lists Type (always while no Type is picked); `inspectionTypeRequired()`: the routing's options have no default.
  - `hasDecision()`: the definition lists Inspection Results; a routing with no definition (added in Routing Settings) falls back to having a reject target.
  - UNSAT on a routing with no reject target is a sign error (`unsatWithoutRejectTarget()`, "UNSAT needs a Reject routes to target in Admin > Routing Settings").
  - Seeds tick Type on the Types whose routing showed a Type droplist (not Pre-Fit, Fit-Up Insp, Fit-Up Release, Records Review or Sold), Inspection Results on Types whose routing has a reject target, and Comments everywhere but Sold.
- **Comments**: one optional Comments box, drawn by the frame (`hasCommentsBox()`: the Signoff Type's definition lists Comments; with no definition, all but Engineering Hold, which has its own required Comments, and Sold). It's saved in `signoffInputs.comments`, and `withComments()` adds `COMMENTS_FIELD` wherever a routing's sign-off fields are read (History snapshot, Correct, labels, the store's load-time backfill).
- **Types**: Admin > Signoff Types (`weld-record/signoff-definition/routing-signoff-types.ts`) lists every Type (name, stored value, Signs routing); a Type is added there first. The Types named after a routing (Pre-Fit, Fit, Tack, Fit-Up Insp, Fit-Up Release, Repair, the Records Reviews, Sold) use that routing's id as their value, so rules keyed by routing id (`isRoutingLockedField()`, `drawnByOwnForm()`) read the same on the Type's definition. A routing is a status; its Types are what can be signed in it.
- **Type dropdown** for stages with `typeOptions`, which come only from Admin > Signoff Types By Routing (`weld-record/signoff-definition/signoff-types.ts`): a seeded table the admin adds rows to and removes them from, each row naming the Types a routing offers (by value) and its default; `signoffTypeOptions()` joins them with their name and settings, leaving out a Type deleted from Signoff Types. A routing with no row has no Type. Every built-in routing has a row (the ones without a choice offer one Type, named after the routing).
  - Every Repair round reads the Repair row. Excavation NDT reads its configured Type source and ordered material exceptions on Signoff Types By Routing (`excavationTypeOptions()`); the default source is the rejecting inspection, with PT to 5X for either non-ferrous/austenitic member.
  - A routing whose options have **no default** starts **blank**, is required (`*`), and signing is blocked until chosen (`inspectionTypeRequired()` in `weld-record/signoff-definition/stage-rules.ts`), even with one option; a default pre-fills it.
  - The pick is stored in both `inspectionType` and `signoffType` (`typeValues()`, stage-rules.ts); one handler (`typeChange()`, `weld-record/joint-page/rules/type-change.ts`) sets them on every routing, **clears the form** (inputs, sign-off inputs and the routing's red messages) and loads the new Type's definition; it's recorded in History. Every Type reads its own form at render, validation, fill and History time. No fields are copied onto the routing. Type changes keep only Repair-round origin and inspection-exception bookkeeping.
  - The NDT rows are seeded with no default, so NDT Type starts on "Select the inspection performed…"; when the Joint Details values allow only some methods the droplist lists just those, and a default outside them leaves it blank.
  - Excavation NDT and the 5X/VT routing a PT excavation routes back to start blank too.
- **Weld stages** (Tack, Root, Layer, Final Weld, Fit weld build-up): their seeded definitions (`weldFields()`, routing-field-config.ts) draw four boxes (only "Preheat/Interpass" has a header; the other three are untitled); PH/IP requirements and actuals share one box:
  1. **Signoffs** (untitled) — GWP / WTN / Weld Process, Qualification Check, **Consumable Insert checkbox** (Root only; unchecking clears filler type/size/MIC) directly above **Filler Metal**, the fields it affects.
     - GWP/WTN/Weld Process/PH-IP/override values cascade from Weld Engineering's procedures data (`data/procedures.ts` + `weld-record/joint-page/rules/stage-form.ts`): the GWP droplist (`stageFieldOptions()`, `weld-record/joint-page/rules/stage-form.ts`) is filtered to GWPs matching the job's Material Type 1/2 (`gwpOptionsForMaterials()`); picking a GWP narrows WTN's droplist to that GWP's WTNs (`wtnOptionsForGwp()`); picking a WTN fills Weld Process and PH Min/Max, IP Min/Max from the matching WPS by their fill rules ("Filled from the WTN", `wtnFillValue()` in `data/procedures.ts`, applied by `fillChanges()`; locked, not under an engineering override), and `selectChangeCascade()` (`weld-record/joint-page/rules/weld-cascade.ts`) sets the override fields (blank unless that WPS has `hasOverride()` true).
     - An actual is NC and locked while its requirement is NC (its "Filled from this routing's requirement" rule).
     - Filler Metal Type/Size cascade the same way, filtered (not auto-filled) to the resolved WPS's valid values (see "Weld Engineering" above); a selection that's no longer valid after a GWP/WTN change is cleared.
     - While the Consumable Insert checkbox is on (fields locked, `isFieldLocked()`), `stageFieldOptions()` shows the *full* `FILLER_METAL_TYPE_OPTIONS`/`FILLER_METAL_SIZE_OPTIONS` set, since the value copied from Fit's Consumable Insert often isn't in the WPS's subset and a locked select needs a matching `<option>`.
     - **Qualification Check** (`weld-record/qualifications/qualifications.ts`, `weld-record/qualifications/qual-conditions.ts`, `weld-record/qualifications/qual-when.ts`, `weld-record/qualifications/qual-requirements.ts`): quals are required and held only through **conditions** in **Admin > Qualifications** (route `/admin/qualifications`, folder `admin-qualifications/`, `STORAGE.qualConditions`).
       - A requirement row is "When <WhenGroup>, Require <QualGroup>": the When is All of (AND) / Any of (OR) of "<field> is <value>" clauses with nested groups (`when-group-editor.component`, recursive; `whenMatches()`), e.g. Type is VT AND Weld Color is Straw.
       - An empty When matches nothing.
       - `conditionFields()` (cached per routing-template set and Type-form version) = Joint Details (Admin > Routing Settings's non-routing-answer `STEP_CONDITION_FIELDS`) + Titanium (`isTitaniumJoint()`), then sign-off fields keyed `step:<key>`: `step:id` (the routing), `step:inspectionType` (Type), and the union of catalog fields selected by every offered Type form (`routingAnswerFields()` for each `tradeSteps()` row), once per key, options unioned; checkbox = Yes/No. Fields with options get an Is droplist, others a typed value (compared whole, any case).
       - Joint fields apply as soon as the routing opens; sign-off fields read the routing being checked (`conditionRequirements(job, step)`), so they apply once filled in.
       - The requirement is a `QualGroup` (All of = AND / Any of = OR) with nested groups (`qual-group-editor.component`, recursive).
       - A **User** row (a When of exactly one User clause, `userOf()`; "When User is <person>, Holds <quals>", plain list, no AND/OR; User is offered only for the top group's single clause) gives that person quals; values are SELF plus the people directory.
       - There's no login, so the check runs as **SELF** (`heldQuals()` = `heldBy(SELF)`). Procedures don't store quals; the procedure form and PDF section 5 show read-only the requirements of conditions a routing matches on its WTN alone (`wtnRequirementText()`).
       - Seeds: SELF holds CNTRLMTL1, SSWELD1, VTINSP1, TIWELD1; Controlled Material = Yes requires CNTRLMTL1 OR CNTRLMTL2; SS = Yes requires SSWELD1; Type = VT requires VTINSP1; Titanium = Yes requires TIWELD1 (so nothing fails by default).
       - `qualCheck()` shows "Passed", "Passed, qualifications X, Y, active" (held quals the matched conditions name), or "Failed, qualifications ... missing" (red, bold; an unmet OR group is named whole).
       - **The check blocks nothing**: it's an acceptable deviation at sign-off. Weld assignment prefers a WTN whose conditions SELF meets.
  2. **Preheat/Interpass** — Requirements (limits), then **Override Requirements** (switched off: hidden and not filled in via `SHOW_WELD_OVERRIDES = false` in `weld-record/signoff-definition/weld-fields.ts`; kept because how an override applies is unsettled, likely it replaces the requirement shown) incl. Override Note (all read-only, set from the WTN; `NC` = no limit; shown only when the selected WPS has override values), then Actuals (order: Requirements → Override → Actuals).
  3. **Readings** (untitled) — weld position, required with a red `*` whenever shown. It shows only when Nuclear Indicator is `'1'`: its catalog Show when rule (`defaultShowIf`, editable on Admin > Signoff Type Forms), which `visibleStageFields()` (`weld-record/joint-page/rules/stage-form.ts`) applies on every path (added routings through `fieldActivation()`'s catalog defaults), so the row and its required-ness follow the same rule.
  4. (untitled) — 5X (**Root only**).
- **Fit/Pre-Fit's own signoff fields** (sign-off fields, drawn among the definition's others while the routing is required): Consumable Insert Type/Size/MIC on one line, Backing Ring Type/MIC on the next — shown only when the effective joint design (Revised Joint Design if set, else the job's own Joint Design) calls for that group: the fields' catalog Show when rules on the virtual Joint Details keys `consumableInsertRequired` / `backingRingRequired` (`weld-record/signoff-definition/joint-facts.ts`), applied by `visibleSignoffFields()` and editable on Admin > Signoff Type Forms.
  - Within a shown group, Type/Size (and Backing Ring Type) are always required; the MIC field is required only when either joint member's MCL requires traceability (its Required when rule, `defaultRequiredIf` on `materialTraceability`) — same condition gates its red `*`.
  - Fit only, below that: **Defer Tack** checkbox. Pre-Fit has no Defer Tack (no Tack exists yet to defer). These are `signoffFields`; Pre-Fit's and Fit's `fields` are empty.
- A routing without a Type form has no fields; there is no routing-template field or layout fallback.
- **Layout from the definition**: a definition's `fields` list is also its layout.
  - Each item has a `line` number (one count for the whole form, headings included); items with the same number sit side by side in list order, and the list is kept sorted by it (`inLineOrder()`; the Layout list's arrows only reorder within a line).
  - Inspection Results, verify-grid rows and Signoff History always get a line of their own. The seeds' `same()` shorthand and saves from before line numbers (`sameLine`) are numbered by `numberLines()` (routing-field-config.ts) on load, so nothing moves. A newly ticked field gets a new line at the end (`withNewField()`).
  - Heading items (`heading` text, key prefixed `heading:`, `newBox` = starts a box) sit in the list and are skipped everywhere else (`definitionFields()` drops them).
  - Inspection Results (`DECISION_KEY` 'decision') is a field the admin ticks: the routing's SAT/UNSAT (`stage-decision` component), drawn where the list places it on a required routing.
  - `width` (pixels) is the most a field is drawn wide; it narrows to min(width, 160px) before its line wraps; unset = shares the line.
  - `layoutSections()` (`weld-record/signoff-definition/definition-layout.ts`) turns the list plus "is this key shown" into boxes / headings / lines, dropping headings and boxes with nothing shown under them.
  - `definition-form` draws the cells: `definition-field` per field, Affected Item from `affected-item`, Pre-Fit/Fit's sign-off fields among the others while the routing is required, the shown verify-grid rows (`isVerifyRow()`, keys starting `verify`) as one `verify-grid` table where the first shown row is listed, and Signoff History (`signoffHistory`, catalog `ownComponent`; seeded on Records Review) as `signoff-history`.
  - What the grid's values are checked against is the definition's **Verify grid checks against** (`TypeDefinition.verifyAgainst`: `fabrication` = Fit-Up Insp's Fabrication values, `record` = the joint's Joint Details; `verifyAgainst()` falls back to the default definition's, else record); it also picks the grid's heading and the sign blocker wording.
  - Fields on a line share its width, a checkbox takes its own width. Type (`signoff-type`), Comments (a sign-off field, while the routing is required) and References (`references`, the width of the form, on a line of its own) are placed by the Layout list like any field.
  - The panel shows **Inspecting** (`inspectingLabel()`, routing/built-in-routing-rules.ts): Fit on Fit-Up Insp, the phase on NDT, Excavation on Excavation NDT.
  - Seeds reproduce the earlier built-in layouts (weld boxes and widths, Preheat/Interpass with Requirements/Actuals, NDT pairs, Inspection Results then Defect Code at 320px, insert/ring rows, Affected Item first on Weld Build-Up, Release to welding then Inspection Results on Fit-Up Insp).
- **Configurable field system**: `weld-record/signoff-definition/field-catalog.ts` holds every field that can ever appear on any routing (`FIELD_CATALOG`, one list); every field can be on any routing's definition.
  - `drawnByOwnForm()` (signoff-parts.ts) says which are drawn their own way rather than as ordinary routing fields: Affected Item and References (`ownComponent`) on any routing, Signoff History (`ownComponent`) on any routing, Pre-Fit/Fit's insert, backing ring and Defer Tack (sign-off fields, resolved by `visibleSignoffFields()`, `ownFormSteps`) only on those routings; elsewhere those are ordinary fields saved in the routing's `inputs`.
  - Release to welding is an ordinary field everywhere; routing reads it only on Fit-Up Insp (`definitionFieldNote()` says so on the admin page). Signing checks the routing's shown fields (`stageFieldErrors()` over `visibleFields`), not its template.
  - `weld-record/signoff-definition/step-field-config.ts` stores one definition per Type (`TypeDefinition`, keyed by the Type's value) in localStorage (`STORAGE.stepFieldConfig`, v13; a save from an older storage key isn't read, so those show their defaults), edited on Admin → Signoff Type Forms.
  - A field's effective show/greyed-out/required rule (its own setting, else the catalog default) and its plain-language wording live in `weld-record/signoff-definition/field-rules.ts`; conditions are checked against `buildConditionContext()` (`weld-record/signoff-definition/condition-context.ts`; a field condition can read the routing's Type as `inspectionType` and its SAT/UNSAT as `result`), whose virtual Joint Details keys (`titanium`, `consumableInsertRequired`, `materialTraceability`...) come from `weld-record/signoff-definition/joint-facts.ts` and whose other Joint Details keys read through `jointDetailField()` (`JOINT_DETAIL_FIELDS`, `weld-record/routing/step-conditions.ts`, the same values Routing Settings conditions see).
  - The admin condition editor's Joint detail is a droplist of those two lists (facts as Yes/No, fields with suggested values in a datalist).
  - A condition is an AND/OR group (`{ all: [...] }` or `{ any: [...] }`, items are clauses or nested groups; an empty group = always; `hasClauses()`, `conditionClauses()`, `conditionText()` with parentheses around nested groups).
  - The admin page edits it with `condition-group-editor` (recursive, like Qualifications' `when-group-editor`) over a working copy (`condition-work.ts`, `conditionToWork()` / `workToCondition()`, which drops incomplete clauses and empty nested groups); its This routing field is a droplist of Type (`inspectionType`), Inspection Results (`result`, when ticked) and the routing's own fields, with suggested values.
  - **One list of fields shown** (`weld-record/signoff-definition/shown-fields.ts`): `definedFields()` turns a Signoff Type's definition into its fields with every rule evaluated, `fieldsShown()` and `visibleSignoffFields()` are what History (live, seeded and corrections) and the Correct window list, and the joint page's `visibleStageFields()` is `definedFields()` plus runtime options, so all of them list the same fields with catalog labels.
  - `definitionId(step)` selects the current Type form. Root, Layer, Final and Excavation inspections share their inspection Type forms. While Type is blank, only the Type picker is shown. A routing without a configured Type form has no ordinary fields.
  - Pass the stage (not its id) to `fieldActivation()` / `hasStepActivation()` / `getActivationForStep()` so the Type is seen.
  - **Weld Color** shows on VT only on a titanium joint (catalog Show when, virtual Joint Details key `titanium`).
  - **Tack and Deferred Tack** hide Filler Metal Type/Size/MIC when the joint design (Revised Joint Design first) needs a consumable insert, and when neither part's MCL requires traceability; Root's Only Consumable Insert checkbox is separate.
  - **Fill rules** (`FieldFill`: source routing + field + a `when` condition on the routing's own fields; catalog `defaultFill`, a routing's `fill`, `null` = never filled): while `when` holds the field copies the source routing's recorded value (`signoffInputs`, else `inputs`) and is locked.
  - `weld-record/signoff-definition/field-fill.ts` (`activeFill`/`isFilledByRule`, `fillChanges(before, after, stages)`) decides it; `weld-record/signoff-definition/field-locks.ts` (`isFieldLocked`/`isUserEditable`) locks filled fields; `selectChangeCascade()` and `assignedInputs()` leave them alone; `withEngineeringEntry()` doesn't blank them.
  - The joint page's `applyFills()` runs after every routing input change: copies values in when a rule starts holding, blanks fields when it stops, then reapplies the external system's values (not under a Foreman Override or engineering override).
  - A fill's source is another routing's recorded value, a field on this same routing (`from: 'thisStep'`), or the WTN's WPS (`from: 'wtn'`, `WTN_FILL_FIELDS`; never holds on an engineering override routing, and always writes, blank when GWP+WTN matches no WPS).
  - `fillChanges()` repeats its passes until nothing changes, since one fill can feed another (the WTN sets PH Min to NC, which makes Actual PH Min NC); `withFills()` applies them after the external system's assignment and the engineering override's blanking (`WeldAssignmentService`).
  - Defaults: Weld Process and PH/IP Min/Max from the WTN; each Actual PH/IP from its requirement while that is NC; Root's Filler Metal Type/Size/MIC from Fit's Consumable Insert Type/Size/MIC while Only Consumable Insert used as filler is checked.
  - `isFieldLocked()` is just "filled by a rule", and `isReadonlyLimit()` (field-locks.ts) shows the overrides and a filled PH/IP requirement as plain text.
  - A routing with no definition, or a field its definition doesn't list, follows the catalog defaults (`fieldActivation()`).
  - **Required when**: a required field can be required only while a condition holds (`requiredIf`, catalog `defaultRequiredIf`, `isRequiredNow()`; an empty condition = always), e.g. the insert and backing ring MICs only when either part requires material traceability.
  - Admin → Signoff Type Forms shows and edits it as "Filled from ... and locked when ..." (not offered on always-read-only, fixed-rule or `drawnByOwnForm` fields).
- **PH/IP actuals** (Actual PH Min/Max, Actual IP Min/Max, all required) — blur-triggered range checks against their requirement pair; NC skips that limit. `ACTUAL_REQUIREMENT` (`weld-record/signoff-definition/weld-fields.ts`) pairs each actual with its requirement: NC there sets the actual to NC on WTN select and locks it (`isFieldLocked`), and it clears again when the WTN/GWP changes. Actual Min above its Max is flagged on the Max field (`ACTUAL_MIN_MAX`/`actualOrderError`). Seeded PH/IP limits are round numbers (e.g. 60, 200, 300).
- **Decision** — SAT/UNSAT (or "Inspection Results" on NDT); signoff dialog needs certification + password.
- **Defect Code** (RT, UNSAT only) renders in its own row right after Decision, since it only applies once UNSAT is chosen.
- **Gotcha**: the app's `.stage-field input { width: 100% }` rule doesn't cover `<select>`; give selects `w-full` or they shrink to their selected option's width.
- **MT/PT's two penetrant fields are Penetrant Manufacturer + Penetrant Type** Both cascade from the admin-managed Penetrant table (`getPenetrants()`/`PenetrantEntry`, Admin > Penetrant): `penetrantManufacturerOptions()`/`penetrantTypeOptions()` in `data/penetrants.ts` return the distinct manufacturers and distinct types across all entries, so Type reads as a designation (e.g. "Type I - Fluorescent"). The NDT definitions put them on one line (Penetrant Type has Manufacturer's Line number), Manufacturer first.
- **Procedure Used for Inspection** (every NDT routing, `NDT_COMMON_FIELDS`) comes from Admin > Inspection Procedures (`data/inspection-procedures.ts`, `STORAGE.inspectionProcedures`, cleared with the other stale caches on a version bump): Type (RT/UT/MT/PT/5X/VT, `INSPECTION_TYPES`) + procedure rows.
  - `stageFieldOptions()` lists only the routing's Type's procedures (`inspectionProcedureOptions(stage.inspectionType)`, all when no Type yet; an unlisted current value is kept as an option); `setInspectionType()` clears one not designated for the new Type; seeds pick one designated for the seeded Type.
  - Values are the procedure names. Seed rows: each Type has its own procedures, MT/PT share "AWS D1.1 MT/PT", 5X/VT share "ASME Sec V Art. 9", RT and UT share none; seed names are placeholders.
- **Defect Code** (RT/UT routing, shown when Type is RT and the result is UNSAT, required) comes from Admin > Defect Codes (`data/defect-codes.ts`, `STORAGE.defectCodes`, cleared with the other stale caches on a version bump): rows of Type (`INSPECTION_TYPES`) + Defect Code + Code Description.
  - `stageFieldOptions()` lists the routing's Type's codes (`defectCodeOptions(stage.inspectionType)`, label `CODE - Description`, value = the code; an unlisted current value is kept). Type is there so other Types can get codes later; only RT shows the field today.
  - Seed rows are six RT defects, codes PO/SI/LF/IP/CR/UC (placeholders).
- **Ship Locations** (Admin > Ship Locations, `data/ship-locations.ts`, `STORAGE.shipLocations`, cleared with the other stale caches on a version bump): flat rows Hull | Deck | Frame | P/S/CL | Usage.
  - Fabrication's Deck/Frame/Usage are selects cascading from it for the joint's hull (`shipLocationOptions()`, applied in joint-page `withRuntimeOptions()`): Deck = the hull's decks; Frame = frames on that deck (disabled "Pick a Deck first" until one is picked); P/S/CL = only the sides with a row at Deck + Frame (so Usage is never empty for a picked side; empty until Frame is picked); Usage = usages at Deck + Frame + P/S/CL (disabled "Pick Deck, Frame and P/S/CL first"); an empty list for a picked parent says "None set up in Admin"; a saved value not on the list is still offered.
  - `FabricationDataService.setFabricationData()` blanks a dependent (`SHIP_LOCATION_DEPENDENTS`) only when the new parent no longer offers it, with its own History entry.
  - Admin page shows "Used by N joints" per row and refuses edit/delete of an in-use row (toast); its Import page (`/admin/ship-locations/import`, BulkImport + app-import-grid, CSV parsing reused from weld-planning.data) rejects unknown hulls, P/S/CL other than P/S/CL, blanks and rows already on the list.
  - Sample data: one layout per hull letter (S/D/T/N), each line one Deck + Frame with its P | S | CL usages, about half the sides with 2-3 usages (`LAYOUTS`); `seedFabricationData()` picks a real row for the joint's hull. Usage values are the admin text.
  - My Assignments' two Ship assignments are ones whose joint is on the Ship and show the joint's live Deck/Frame/P-S-CL/Usage (`fabFor()`); `Assignment` doesn't store them.
- **References panel** (`weld-record/references/`, `ReferenceService`, `wf.references`): which routings show it is one rule, `showsReferences()` in `weld-record/signoff-definition/stage-rules.ts`; `definition-form` draws it inside the sign-off form where the Layout list places References. The Work History Correct dialog shows References on every routing, not gated by this rule. By default it shows only on the RT and UT Types and Repair; not on VT, 5X, MT, PT or Excavation NDT. History entries say `References` / `Reference added`. Saved workflows with the older `attachments` field are migrated on load.
- **Repair routing on signoff** (`routeSignoff()`, routing/signoff-routing.ts) — checked in this priority order: **Allowable thickness exceeded** (checkbox) → goes back to that phase's NDT RT/UT stage (`${phase}-ndt-utrt`); else **Grind Only** → goes back to the NDT stage that failed (`originStageId`); else **Weld Repair** → inserts a new **Excavation NDT** stage (see below); else **Cut** → the joint **starts over from Fit** (nothing is reopened): every stage from Fit on is rebuilt fresh from `buildStages(job)` as on a new joint, its past sign-offs staying in History (no deprogress entries written); earlier repair rounds stay as signed records; **Refit #** goes up by one (`JobWorkflow.refitNumber`, copied onto the job by `WorkflowStore.load()` since job records aren't saved) and a History row in the new **Refit** section records it ("Cut — routed back to Fit", to "Refit 01").
  - Fit-up (fabrication) data is reset to blank, and the Refit History entry keeps what it was (`fabInputs`, shown as "Fabrication before the Cut").
  - The **Allowable thickness exceeded** checkbox only shows when the joint has a RT/UT stage for that phase (`visibleFields()`).
  - **Repair #** goes up by one with each new Repair round (`JobWorkflow.repairNumber`, copied onto the job at load like Refit #).
  - **Repair Code is required** to sign Repair.
  - "Which phase" (root/layer/final), the exact rejecting stage id, and its inspection method are captured on the Repair stage's own `inputs['originPhase']`/`['originStageId']`/`['originInspectionType']` when it's created (parsed off the rejecting NDT stage, e.g. `root-ndt-mtpt` + `inspectionType: 'mt'`) — internal bookkeeping, not real `StageField`s, so none of it is rendered as a field.
  - `stageFromTemplate()` (`weld-record/routing/added-steps.ts`) builds a live `WorkflowStage` from a `StageTemplate` for both Repair and Excavation NDT.
- **Excavation NDT** loads the selected inspection Type's shared Signoff Type Form (`definitionId()`), including its layout, conditions and required fields. There is no separate combined Excavation form. `excavationNdtStageFor()` builds the round's shell and remaps Inspector to NQC Inspector when needed.
  - `excavationTypeOptions()` in `signoff-types.ts` resolves the configured source and first matching material exception. The seeded PT to 5X exception tests Material Type 1 or 2 using Admin > Material Classification. No material exception is embedded in routing code.
  - At insertion, `inputs.typeChangedFromPtTo5x` records whether PT was replaced by 5X. Type changes and route-back blanking preserve this internal value, just as Repair preserves `originPhase`, `originStageId` and `originInspectionType`.
  - The added-routing template's accepted rules route a PT to 5X replacement to Rejecting phase's VT/5X, otherwise to Rejecting NDT; Reject routes to = Own Repair. `rule-targets.ts` resolves the current round and the joint's regular/NQC row. Returning to VT/5X after the exception enables 5X on that routing.
  - `route-preview.ts` uses the real dry run for every routing, including Repair and Excavation NDT, so admin changes affect both the explanation and the actual routing.
- **Gotcha**: a standalone component that uses `routerLink` must import `RouterLink`; without it Angular silently treats it as a plain attribute and the link never navigates.
- **Repair** (inserted automatically after any NDT stage that comes back UNSAT, `routeSignoff()`; **no limit on repairs** (any NDT failure goes to Repair): each round is its own stage, `repair` then `repair-2`, `repair-3`… labeled "Repair 2" etc., with its own paired `excavation-ndt[-n]` whose UNSAT goes back to that round's Repair (`isRepairStageId()`/`nextRepairStage()`/`repairIdForExcavation()` in `weld-record/routing/step-ids.ts`); a new round never changes earlier rounds, and Cut leaves them as signed records; Excavation NDT's own UNSAT does not add a new round): a **Type** droplist from the Repair row of Admin > Signoff Types By Routing (seeded with one option, "Repair", as the default, so it is pre-filled), Repair Code (droplist: Grind Only/Weld Repair/Cut), (**no Affected Item**: only needed for base metal repairs, which this product doesn't cover since that's effectively a new joint), Allowable Thickness (disabled text) and its "exceeded" checkbox.
  - **Allowable Thickness varies by Nuclear Indicator** (`allowableThicknessText()` in `signoff.service.ts`, set when the Repair stage is created): `nInd` `'1'` (N 250-1500-1) → 3/8", `'2'` (N TP278) → 3/16" — `'3'` (Non) has no stated rule and falls back to the TP278 value (unconfirmed).
- **NDT common fields (all NDT stages)**: **Probationary Inspector**/**Oversight Inspector** are required (red `*`) when **Has Probationary Inspector** is checked; **Portion of Weld Inspected** is required when **Partial** is checked (`NDT_COMMON_FIELDS` in `weld-record/routing/ndt.ts`).
  - **Search assist** (`shared/person-search-input.component.ts`): both fields render as `app-person-search-input` instead of a plain text box — a typeahead over `PEOPLE` matching name, PERN or id (`searchPeople()`, same matching rules as Work History's/Makeup's own person filters), but the underlying value stays plain free text; picking a suggestion fills `"First Last · PERN"` and commits immediately, typing a name not in the directory and blurring commits the raw text.
  - `Person.pern` is an 8-digit personnel number seeded alongside `id`. Work History and Makeup have their own copies of the same typeahead pattern, not yet moved onto this component.
- **Degree of RT Performed** (`degreeRt`, RT/UT stage, shown when inspection type = RT) is a **required** droplist (`required: true`, red `*`) over `RT_DEGREE_OPTIONS` (`weld-record/routing/ndt.ts`: blank, NA, 10, 60, 75, 100, 360) that **must be at least the job's required degree** (plain number of degrees, NA = none, `rtDegrees()`) before the stage can be signed off — `Job.rtRoot` for `root-ndt-utrt`, `Job.rtFinal` for `final-ndt-utrt` (Layer never has an RT routing: there's no RT Each field).
  - Checked in both `signBlockers()` (summary reason) and `stageFieldErrors()` (red highlight on the field itself), same paired-rule-set convention as every other signoff requirement.
  - The field's label gets `(Required: <value>)` appended at render time (`stageFieldOptions()`) when a requirement applies.
  - `Job.rtRoot`/`rtFinal` seed from `RT_DEGREES` in `jobs.ts` (blank, 10, 100, 360, 60, 75, NA; duplicated rather than imported from `weld-record/routing/ndt.ts` to avoid a circular import), never alongside a UT value for the same phase.
  - A degree (not blank/NA) is also what adds the RT routing itself (see "NDT routing"). Weld Planning's separate `WeldJoint.rtRoot`/`rtFinal` (blank/X/5X `NDT_MARKS`, one of its seven NDT requirement-marker fields) is a different model.
- **Sign button** — always enabled: it's the only way to trigger validation and surface what's missing, so disabling it hid that feedback. `signStage()` (joint-page) still refuses to actually sign when `stageFieldErrors()` finds a per-field problem or `signBlockers()`/`canSignStage()` finds any other one (deliberately no on-screen "why" text beyond the field-level highlighting below). A failed attempt scrolls to and focuses the first validation error.
- **Every required field highlights red on a failed signoff attempt, everywhere**: `stageFieldErrors()` (`weld-record/joint-page/rules/sign-validation.ts`) is the single place that turns "this is required and missing" into a `{stageId}:{fieldKey}` entry in `fieldErrors` — covering ordinary stage fields, Fit-Up Insp's verification checkboxes, Weld Build-up's Affected Item/MIC verified, Decision (`__decision`), Type (`__inspectionType`), Fabrication on a routing with Fabrication complete to sign (`__fabrication`, mirrors `fabErrors()`), and any stage's required `signoffFields` (via `requiredSignoffFields()`, shared with `signBlockers()` so the two rule sets can't drift apart).
  - Every template surface reads `ctx().fieldError()` to add a border (`input-error`/`select-error`/`checkbox-error`/`radio-error`) plus an inline message next to the existing red asterisk, and calls `ctx().clearFieldError()` (or the field just recomputes on blur) so the highlight clears the moment it's fixed.
  - Required-field stars use `text-error`.
  - **Gotcha in `signStage()`**: `setStageResult()` writes through the store without mutating the `stage` object the click handler holds, so after auto-accepting a non-inspection stage `signStage()` re-fetches the live stage before `canSignStage()`; checking the stale object skips every other requirement.
- **Fit-Up Insp** — fixed, non-interactive **Type: Fit-Up Inspection** / **Layer: Fit** droplists at the top, one per line (same layout as the Type dropdown other inspector stages use, disabled with a single option each since there's only one value), then the verification grid against fabrication data, Release-to-welding checkbox.
- **Records Retention Review's embedded "Signoff History"** — same pattern as the History screen: one row per sign-off event (When, Who, Stage — Action with an expand chevron, Result badge), collapsed by default, with its own **Expand all / Collapse all**. Expanding shows the fields recorded at that sign-off. Local to `SignoffPanelComponent` (`expandedRecords`/`toggleRecord`/`toggleAllRecords`), not wired to the History screen's data or state.
- **Gotcha**: `.stage-field`'s `flex: 1 1 160px` is written for the row-based `.stage-inputs` grid, where 160px is a WIDTH basis. Reused inside a `flex flex-col` wrapper (e.g. Review's own layout), that same value becomes a HEIGHT basis and forces ~160px of dead space below short content. Don't use `.stage-field` inside a column-flex container; use a plain `<div>` (see Admin > Banner's Banner Message field).
- **Deprogress** — reverse the last signed stage with a required comment.
- **Correct** (`work-history/correct-stage-dialog.component.ts`) — fix a value already recorded on a *currently signed* stage without deprogressing it or touching routing.
  - Offered per-stage (not just the job's last stage, unlike Deprogress: `correctableKeys()` in `weld-record/work-history/history-rows.ts` tracks the latest Sign-off-section `HistoryEntry` per `(jobId, stageId)`, requiring the live stage to still be `signed` and that entry to not itself be a deprogress).
  - Scope is the stage's own `fields`/`signoffFields` (via `fieldsShown()`/`isUserEditable()`, same filters the live signoff panel uses) plus the job's References (`app-references`) — never `result`/`inspectionType`/`signoffType`/Decision, which the dialog doesn't render at all.
  - Individual field keys that fed a routing decision at the original signoff are shown **disabled with an explanation** rather than omitted: `ROUTING_LOCKED_FIELD_KEYS`/`isRoutingLockedField()` (`weld-record/signoff-definition/stage-rules.ts`) is the single source of truth — Repair's `repairType`/`allowableThicknessExceeded`, Fit-Up Insp's `releaseToWelding`, Fit's `deferTack` — enforced both in the dialog and again in `SignoffService.correctStage()` (defense in depth).
  - Requires a reason; logs a `HistoryEntry` "<Routing> - Corrected <fields>" carrying the reason and a `from`/`to` diff per changed field, alongside the normal full-field snapshot.
  - `HistoryEntry.stageId` (set by `signStage()`/`deprogress()`/`correctStage()` and by `seededWorkflow()`) lets Correct find the live stage a Work History row belongs to.
  - A select field offers a blank "Select" option only when it's empty, so a correction can't blank a required field.
  - `HistoryEntry.changes`/`reason` (formatted with `displayValue()`) let the action text name the changed fields (e.g. "Root NDT 5X/VT — Corrected Weld Color"), and the expanded row leads with an old → new line per change before the full snapshot.
  - **Person-search assist**: Probationary/Oversight Inspector use `app-person-search-input` (text mode) in the Correct dialog too, not just the live signoff panel — `PERSON_SEARCH_FIELDS` in `correct-stage-dialog.component.ts` is the (currently 2-entry) list of which field keys get it.
- **Makeup** (`weld-record/makeup/`, `weld-record/makeup/makeup-grants.ts`) — `noMike` joke toggle, currently `false` (real page shown); see [Demo toggles](#demo-toggles-flipped-often). someone **below** the foreman level granted temporary "makeup" (acting-foreman) status for a set period: `MakeupGrant { personId, startDate, endDate }`.
  - Its own nav entry in the Weld Record menu (not under Admin — routine foreman use, not admin config) and its own flat, inline-editable grid, not Admin > Groups' list-into-detail: the audience setting makeup is different from the one managing Groups' permission matrix and is used to a grid, and there's nothing per row to justify a detail panel.
  - Person picker is a search typeahead (`searchPeople`, same pattern as Work History's person filter) filtered to exclude anyone already titled `'Foreman'` — deliberately `PEOPLE`/`title` (AD-sourced identity in the real system), not the app's own `Role` type, which is per-stage routing, not who someone is.
  - **Each person gets `ANNUAL_MAKEUP_DAYS` (90) makeup days per calendar year**, tracked by summing `daySpan()` (inclusive day count) across their grants whose start date falls in that year; `daysRemaining()` is checked both on add and on every inline date edit (`updateDates()`), rejecting a span that would exceed what's left — the grid's own "Days remaining" column and the add-row's live preview both call the same function so the number can't drift from what's actually enforced.
  - **UI-only, explicitly not wired to anything**: the app has no concept of "who's logged in as which specific person" (only a role *filter*, e.g. Pipe Search's `selectedRole`), and there's no time-boxed AD group membership at this org to hang real enforcement off of — so this is set up and reviewable but doesn't grant any actual access, same demo-aid honesty as Admin > Groups' permission matrix (also unenforced, mocking what AD groups would really do).
  - **Search + sort, not hide-inactive**: a name/id/title search box filters the grid, and active grants sort to the top (`filteredGrants()`) — inactive ones stay in the list, sorted below, so search can still reach them rather than disappearing once expired. ~20 seed grants (`DEFAULT_GRANTS`) so the list/search/sort actually has something to exercise.
- **Then go to rules**: `StageTemplate.thenRules` stores ordered rules in Routing Settings, using the Reject rule editor and condition fields. `matchingThenRule()` selects the first match after an accepted signoff; `routeSignoff()` uses `routeBack()` for the same or an earlier routing, and `moveRouting()` for a later routing. No match continues in order. Each return writes Routing History; `WorkflowStage.repeats` counts only a routing's own rule returning to itself.
  - Seeded: Fit / Weld Build-Up → Fit; Layer / Interim Layer and blank NDT Each Layer → Layer; each Layer NDT / Layer was Interim Layer → Layer. Both regular and NQC NDT rows have the rule. Layer gets only the inspection selected by NDT Each Layer; Root and Final keep VT plus any additional inspection.
  - A Type's **Signs routing** (`RoutingSignoffType.signsStep`, Admin > Signoff Types, `typeSignsStep()`): picked on an earlier routing, signing with it is that routing's signoff (`signedAsStep`): `signAsStep()` signs that routing with the values (History entry and `stageId` are that routing's), passes the routings between (`required: false`), and the source routing shows signed when it has an earlier signoff in History, otherwise it is passed. Blank = the routing it's picked on. It's a setting rather than a name match because one Type can be on several routings (VT on Root, Layer and Final NDT).
  - Seeded: Final Weld signs `final-weld` (on Layer it's the Final Weld signoff; on Final Weld itself it signs that routing as usual). Layer NDT is included only when NDT Each is set; the Included when rules select 5X/VT, MT/PT or RT/UT, and `jobNdtSteps()` supplies the allowed method(s).
  - History names a signoff on a Type other than the routing's own after the Type (Weld Build-Up); the Joint Details NDT labels live in `data/ndt-labels.ts` (`NDT_LABELS`), used by every screen that shows them.
  - Only Fit moves Fit on to Tack. The routing's chosen Type is `WorkflowStage.signoffType` (its options `typeOptions`).
  - **Root inspection** — NDT Root VT or 5X controls the question and both answer choices. Root's configured Also signs rule records the matching inspection when Root is signed with Yes. Admin > Signoff Types maintains the conditions, routing and Type. Regular and NQC targets resolve on the joint; both signoffs share one Deprogress action.

### My Assignments, History, Weld Planning
- My Assignments is **first** in the Weld Record nav dropdown (it's the most common thing a tech opens).
  - Column widths: Routing fixed at 8rem, Specific Location `1fr`.
  - Expandable list (XREFID, Hull, Drawing, Joint, Routing, **Location** = shop (`getShops()`, same pool as Fabrication's Location) — or **'Ship'** for the couple of records below, **Specific Location** = bay/rack within it, Assignment # (6-digit, no prefix), WICC Date, **Source** — demo-only, which upstream system the assignment came from, keyed off role via `SOURCES_BY_ROLE` in `assignments.ts`: Fitting SWIMS, Welding EWICC, Foreman EWR, Inspector/NQC Inspector a random mix of SAIL/NCS, O63/O04 Records EWR).
  - Row click toggles an expanded panel below it (chevron indicator) showing Assigned By, Assigned Date, Job Description, and — for Welding assignments only — Filler Metal Type/Size and WTN (`Assignment.details`, demo-only stand-ins for fields eWICC would actually hand off; not built out for other roles yet).
  - A Charge field renders as a real **Code 39 (3 of 9) barcode** (`barcodeElements()` in `my-assignments.component.ts`: narrow/wide bar-and-space patterns per the ISO/IEC 16388 character set, wrapped in `*` start/stop characters), centered with the charge number underneath it.
  - The separate "Details" button still navigates to the job page.
  - A demo-only **role filter dropdown** (red-outlined `select-error` + an inline "Demo role:" label, defaults to **Welding**) filters by `assignedRoles`; also a keyword filter, banner, horizontal scroll on narrow windows (`min-width: 62rem`).
  - `expirationDate` is seeded 0-6 days out (always within a week). No "Assigned To" column.
  - **XREFID is blanked on ~25% of rows** (`i % 4 === 0`, same pattern as Weld Planning's records) to mimic real imperfect data; the Details button therefore looks the job up by **hull + drawing + joint** (the true identity key), never by the assignment's own `jobId` copy, which may be blank.
  - A blank XREFID does **not** by itself mean shipboard work — most such records still track to a shop/bay like any other assignment.
  - Only **two** assignments (`assignments.ts`, `toShip()`) get the shipboard-location treatment (picked among assignments whose joint is on the Ship; Deck/Frame/P-S-CL/Usage are read live from the joint, see Ship Locations above): Location = 'Ship', and the expanded row shows **Deck / Frame / P/S/CL / Usage** instead of Specific Location, on its own second line (`class="w-full ..."`) below Assigned By/Date/Job Description/details/Charge, which always ends the first line since it's unconditional and Deck/Frame/etc. only render for these two records.
  - One is guaranteed to be the earliest-due Welding assignment (so it's visible near the top of the default view); the other is picked from elsewhere among the blank-XREFID records for variety.
  - **Per-column filters**: the table uses `th[appSortHeader]` with `filter="text"` on each data column, same as the other tables.
- **Assignment generation** (`generateAssignments()` in `assignments.ts`): role is assigned directly per entry (`ROLE_ROUTINGS`, one or more real routing labels per role for variety) with a fixed `PER_ROLE = 7` count for every role. Source (`SOURCES_BY_ROLE`) is assigned by `nextSource()`, cycling deterministically through a role's source pool instead of a random pick, so a role with more than one upstream system (Inspector/NQC Inspector: SAIL and NCS) is guaranteed at least one assignment from each rather than leaving it to chance.
- History: leftmost icon-only chevron column (expand/collapse), then **Routing, Action**, When, Who, **Value**, XREFID, Hull, Drawing, Joint, Order, **Deprogress**, then a trailing details-button column (small primary icon button, same pattern as My Assignments'; XREFID is plain text, not a link, to avoid accidental clicks; opening it sets `?from=history` so Back/sign-off returns to History instead of the Pipe Welding table, via `backDestination()` in `joint-page.component.ts`).
  - Identity columns (XREFID/Hull/Drawing/Joint/Order) are sized to their real fixed-length content in `ch` units, not a blanket rem width.
  - Every column has its own filter via `appSortHeader` (text, or a multiselect for Routing) alongside the top-bar Person/XREFID/search filters — the filter inputs show a small filter icon instead of placeholder text, which would clip in the narrow identity columns.
  - Filters: person typeahead; **a job box that matches XREFID, drawing, joint or order** (not hull); and a right-hand **Search all** box covering every column and the sign-off field values.
  - **It records what was input at each sign-off**: a sign-off row expands (per row, or **Expand all / Collapse all** for every sign-off matching the filters) to every editable field the user was shown, with its value at that moment, blanks included; each field row repeats the sign-off's When, Who, Routing, XREFID, Hull, Drawing and Joint in muted text so it reads on its own (`HistoryEntry.inputs`, built by `snapshotInputs()` in `weld-record/signoff-definition/stage-display.ts`, from the job page's `signoffSnapshot()`).
  - Read-only/derived fields (PH/IP limits, overrides, locked Weld Process, disabled fields) are not listed. Per-field edits (sections Stages/Fabrication) are still logged but **hidden** here.
  - **Person filter is a typeahead** (`searchPeople`: first/last name prefixes in any order, or id). CSV has one line per field, including Drawing/Joint/Order alongside XREFID/Hull. Each entry carries `whoId`/`whoTitle`, stamped in `withHistory` via `stampWho()`.
  - **`routing` is the stage the action was *for*, not what it moved to afterward**: `WorkflowStore.withHistory()` derives it from `currentRoutingLabel(prev.stages)` (pre-update state), so a `'Fit — Signed off'` entry records `'Fit'`, not the next stage. `seededWorkflow()`'s entries use `routing: s.label`.
  - **No Old value column**: the entries that set `from` (Stages/Fabrication) are filtered out of `allActivity()`.
  - **Routing filter sorts by workflow order**, not alphabetically (`routingOrder` in `work-history.component.ts`: each stage's first-appearance index across every trade's `getTemplates()`); anything not a real stage (e.g. `'All stages complete'`) sorts to the end.
  - **Deprogress is offered only on a job's last sign-off still in effect** (`deprogressable`: whole history, independent of filter/sort; a deprogress cancels the sign-off before it; a job with undo entries instead offers it on the sign-off its newest `SignoffUndo.historyWhen` belongs to; must match the live workflow's last signed stage, when the live workflow has a signed stage to compare against). Clicking it opens the shared **confirm modal** (`ConfirmService.textInput`) for the required reason.
  - **Seeded history**: Work History reads every joint's own seeded history via `WorkflowStore.everyWorkflow()`; `signedStageCount()` seeds 0 signed routings only for joints still on their first routing (Pre-Fit, or Fit when there is no Pre-Fit).
- Weld Planning: separate weld-joint data (`WeldJoint`; list/form/detail/mass edit/advanced search; the admin page has only Joint Designs) with its own `hull` field.
  The create/edit form has no title, WPS, PWHT, assignee, estimated hours, description or notes (the data fields still exist and show on the detail page & CSV for seeded joints).
  - Joint is a free-text field in system-joint format (e.g. `ST-J10005`, see Terminology), not a dropdown.
  - Its NDT requirements are the same seven fields as the weld record's joint details (`NDT_FIELDS` in `data/weld-planning.ts`: RT Root/Final, NDT Root/Each/Final, UT, VT; each blank, `X` or `5X`).
  - Note: Weld Planning uses these `X`/`5X` markers; Weld Record's own NDT Root/Each/Final and RT Root/Final use the real values (see "NDT routing"). Material 2 is labelled plainly (no "(Filler)").
  - The form, detail, admin and mass-edit pages fill the content area like every other screen (no centred max-width box).
  **Advanced Search** (`weld-planning-search`, route `/weld-planning/search`) mirrors the Job Advanced Search screen but scoped to `WeldJoint`: its own filter fields (`weld-planning-filter-schema.ts`, one value per field, each turned into one `shared/filter-engine.ts` condition so both screens match the same way), saved variants and result-column picker, both persisted under their own `STORAGE` keys (`weldPlanningFilterVariants`, `weldPlanningResultColumns`) so they don't collide with the Job Advanced Search screen's saved state.

## Data schema

### WorkflowStage (per stage)

```ts
{
  id: string;                    // e.g. 'fit', 'tack', 'root-weld'
  label: string;
  required: boolean;
  role: string;                  // e.g. 'Fitting', 'Welding', 'Inspector' ('|' separates several)
  inputs: Record<string, string>;
  signoffInputs: Record<string, string>;
  result: 'sat' | 'unsat' | null;
  signed: boolean;
  signedAt: string | null;
  rejectToStage: string;
  signoffType: string;           // the Type picked, 'standard' when blank or the routing has none (same pick as inspectionType)
  inspectionType: string;        // the Type picked, blank until chosen when its options have no default
  typeOptions?: StageOption[];
  decisionLabel?: string;
}
```

### HistoryEntry

The one record of every sign-off, deprogress and correction. History and Records Review both show it
(`historyRows()` in `weld-record/work-history/history-rows.ts`); nothing else keeps a second copy.
An expanded sign-off also lists the Fabrication fields that changed since the joint's previous sign-off
(`fabChanges`, compared from each sign-off's `fabInputs`; the first sign-off against blank, and a Refit or
Routing entry that blanked fit-up data starts the comparison from blank again). Seeded sign-offs carry
`fabInputs` too.

```ts
{ when: string; who: string; whoId?: string; whoTitle?: string;
  section: 'Stages' | 'Sign-off' | 'References' | 'Fabrication' | 'Release' | 'Refit' | 'Routing' | 'Deviation' | 'Foreman Override' | 'Engineering Override';
  action: string; from?: string; to?: string;
  routing: string;               // routing label at time of change
  inputs?: { label: string; value: string }[];      // sign-off entries: every editable field + value at sign-off
  fabInputs?: { label: string; value: string }[];   // fabrication data then: every sign-off, and a Cut's Refit entry (the data it reset)
  stageId?: string;              // set by signStage/deprogress/correctStage
  changes?: { key: string; label: string; from: string; to: string }[]; reason?: string;   // 'corrected' entries
}
```

### JobWorkflow (per job, persisted)

```ts
{ jobId: string; technician: string; stages: WorkflowStage[]; references: Reference[];
  conditionCode: string; conditionCount: number; history: HistoryEntry[];
  fabricationData: Record<string, string>;   // cross-stage fit-up fields; editable only while the current routing's template has fabricationEditable (fabricationEditable() in weld-record/routing/current-routing.ts, read live from Admin > Routing Settings; built-in = Pre-Fit through Fit-Up Insp)
  refitNumber?: string;    // set by each Cut
  repairNumber?: string;   // set by each new Repair round
  deviations?: Deviation[]; // accepted at sign-off: { id, stageId, stageLabel, items: {kind, label, entered, required}[], reason, who, when, status: 'open' | 'dispositioned' | 'withdrawn', holdStageId?, disposition?: { comments, routeTo, routeToLabel, who, when } }
}
```
Job records aren't persisted, so `WorkflowStore.load()` copies `refitNumber`/`repairNumber` onto the job (`job.refitNumber`/`job.repairNumber`) — that's what Joint Details, search and filters read.

### Job

```ts
{
  id: string;          // internal key, 5-char alphanumeric, always populated, unique — never shown
  xrefid: string;      // user-facing XREFID; mirrors id, but blank on ~25% of jobs
  ship: string;        // 3-digit, e.g. 692 — stable per hull, shown above Hull in Joint Details
  hull: string;        // S/T/D/N + 4 digits, e.g. S7234 — shared by many jobs
  // identity: id  OR  (hull + drawing + joint), each unique — xrefid is display-only, not an identity key
  trade: string;       // 'Welding'
  technician: string;
  drawing: string; drawingRev: string; joint: string; jointDesign: string; weldType: string;
  pipeSize: string; wallThickness: string;
  materialType1: string; materialType2: string; mcl1: string; mcl2: string;
  // materialType1/2 use MATERIALS_1/MATERIALS_2 (jobs.ts, exported) -- same codes as Weld Engineering's
  // Procedure.baseMetal1Type/baseMetal2Type (data/procedures.ts), matched by gwpOptionsForMaterials()
  joiningItem: string; joinToItem: string;   // 1 letter + 8 digits + hyphen + 2 digits, e.g. S12341001-14; comma-separated in affectedItems
  sequenceNumber: string; order: string; engineeringNotes: string;
  wps: string; ndt: string; pwht: string;   // ndt: general free text, doesn't drive routing
  nInd: string;        // Nuclear Indicator: 1, 2 or 3
  mcl1/mcl2: 'STD' | 'MC-I';                 // MC-I requires traceability
  ndtRoot/ndtEach/ndtFinal: '5X' | 'MT' | 'MT/PT' | 'PT' | 'UT' | 'VT';   // each phase's NDT (ROUTING.md)
  rtRoot/rtFinal: '' | '10' | '100' | '360' | '60' | '75' | 'NA';       // a degree adds an RT routing
  refitNumber, repairNumber: string;         // '00'-style counters, bumped by Cut / each Repair
  // ... plus the remaining NDT and additional data fields
}
```

## Data patterns

- **Job identity** — hulls repeat by design. Any new seed data or import must keep `id` unique and `(hull, drawing, joint)` unique; pickers and labels should show all three, not the hull alone.
- **Seeded workflows** are deterministic per job id and pre-sign random leading stages, each with its Sign-off History entry; only joints still on their first routing (Pre-Fit, or Fit when the joint has no Pre-Fit) start with no history.
- **Nuclear Indicator** '1'/'2'/'3' drives weld-position visibility, pre-fit visibility and who signs Fit-Up Insp and NDT, through **NQC rows** (`weld-record/routing/step-ids.ts`): each `NQC_SPLIT_STEP_IDS` routing has a twin template `nqc-<id>` (`WELDING_STEPS` in `welding-steps.ts`, label `NQC <label>`, displayName = the regular label, role NQC Inspector).
  - `DEFAULT_STEP_CONDITIONS` adds `N Ind. is 1 or 2` to the NQC row's rules and `is not 1 or 2` to the regular row's; `DEFAULT_REJECT_RULES` copies the regular row's to the NQC row; `signoff-types.ts` seeds an NQC row per NDT row.
  - Code that reads the phase or method from a routing id uses `baseStepId()`; code that jumps to a built-in routing (`${phase}-ndt-utrt`, reject targets) goes through `stepOnJoint()`, which finds whichever twin the joint has.
  - Excavation NDT's NQC Inspector role is still set in code (`excavationNdtStageFor()`).
  - **Display Name** (`StageTemplate.displayName`, Routing Settings column): `buildStages()` sets the joint's `label` to `displayName || label`, so the joint, routing bar, Pipe Welding and History show it; the Routing name (`label` on the template) is what rules and condition fields use.
- **NDT routing** (plain-language version with the chart: ROUTING.md) — each phase's NDT routings come from its **Joint Details** values (routing inclusion rules in `step-conditions.ts` and Type enable rules in `signoff-definition/signoff-types.ts`): **NDT Root + RT Root** → Root, **NDT Each** → Layer, **NDT Final + RT Final** → Final.
  - The general `job.ndt` field doesn't drive routing.
  - Root and Final, in 5X/VT, MT/PT, RT/UT order: **VT is always required**, or 5X instead when the NDT value is 5X; MT, PT or UT adds that routing offering only that method; MT/PT adds the MT/PT routing with a choice; an **RT degree** (10/100/360/60/75, not blank or NA) adds the RT/UT routing offering only RT.
  - Layer gets one routing selected by `ndtEach`: VT/5X, MT/PT or UT, with no additional VT. Blank NDT Each Layer means no Layer NDT.
  - Type always starts blank. Valid NDT Root/Each/Final values: 5X, MT, MT/PT, PT, UT, VT (`NDT_REQUIREMENT_VALUES`, `jobs.ts`; NA is invalid, Root/Final blank falls back to VT, and Layer may be blank for no NDT). Valid RT Root/Final values: blank, 10, 100, 360, 60, 75, NA.
  - Real data never has UT with an RT degree for the same phase; seed data follows that, and if it happened the RT/UT routing would offer both. A single-option Type on an inspection stage still starts blank and must be picked (see Type dropdown above).
  - Root's "Did you perform 5X" question only shows when NDT Root is 5X. Joint Details shows all five values as stored.
  - **Records Review UNSAT** follows its Reject routes to (Admin > Routing Settings), which defaults to Records Review itself. An UNSAT whose reject target (or matching reject rule) is the routing itself is recorded but the stage stays unsigned, so the joint stays there (`rejectsToItself` in `routeSignoff()`).
- **Repair** is inserted dynamically on every NDT rejection (no limit); role Foreman. See the Signoff panel's Repair/Excavation NDT bullets above and ROUTING.md.
- **Affected Items** — `joiningItem`/`joinToItem` with `affectedItems` stored as a comma-separated string (`affected-item` component).
  - Each picked item's MIC line reads the real MIC from `fabricationData.id1`/`id2`; its "MIC verified" checkbox (saved as `micVerified1`/`micVerified2`) follows the definition fields `affectedMicVerified1`/`affectedMicVerified2` (catalog, `ownComponent`; default Show when part 1 / part 2 requires traceability, required): `affectedMicRule()` (`shown-fields.ts`) gives shown/required for both the component and `stageFieldErrors()`.
  - Repair's Allowable Thickness Exceeded shows by its catalog Show when "the rejected phase has an RT/UT routing" (stage property `REJECTED_PHASE_UTRT_KEY`, `condition-context.ts`; pickable in the condition editor as "Rejected phase has RT/UT").
- **MIC** values are hyphenated codes such as `250C-1500-290-5` (`seededMic`).
- **Material Type 1/2 codes** (`MATERIALS_1`/`MATERIALS_2`, `jobs.ts`) — one `NN-LETTERS` numbering scheme (`02-CS`, `12-SS304`, `65-CUNI`, ...), not real AISI/AWS designations: `NN` groups by family and is shared across both lists (1x = stainless, 6x = nonferrous) so a base metal and its typical filler read as part of one system; the letters stay recognizable (real alloy chemistry/grade abbreviations) rather than reusing raw industry codes.
  - `material-classification.ts`'s `DEFAULT_ENTRIES` and Weld Planning's own local `MATERIALS_1`/`MATERIALS_2` copies (`data/weld-planning.ts`, `weld-planning-form.component.ts`) use the same codes; keep them in routing.
- **Trades** — Welding is the only trade. `getTemplates()` ignores other trades in a save, and reads back only the settings Routing Settings offers (`deserializeStage()`), so a setting no longer offered drops out. `addTestJob()` makes a blank Welding job (N Ind. 1, routing starts at Pre-Fit). `Job.trade` (always `'Welding'`) and the templates/Admin > Routing Settings rows keyed by trade (`Welding:<stageId>`) are kept so saved admin settings keep loading; removing them means a storage reset.
- **Work package** — `Hull-Compartment-Detail`, e.g. `S7234-FWD-D03` (`workPackageFor()` in `jobs.ts`; compartments FWD/MID/AFT/ENG/CGO/HAB, details D01–D12).
- **Fit-Up Release** routes to role **Foreman**. A handful of seeded jobs (about 7 of 480) sit at this stage awaiting a Foreman: Fit-Up Insp is signed with "Release to welding" unchecked, so Fit-Up Release is required and is the job's current routing. The Pipe Welding role filter checks the first unsigned **required** stage (the same rule as `currentRoutingLabel` / `activeStageId`), not just the first unsigned stage.
- **Deferred Tack** — its own routing and its own Signoff Type (`deferred-tack`, with its own definition seeded with Tack's fields); same behavior as Tack (`WELD_STAGE_FIELDS`, WTN overrides, weld-card layout). It sits after Fit-Up Release, is included when Fit signs with Defer Tack = yes (its Included when), and its Display Name is Tack, so the joint and routing bar show Tack while its Type records that it was deferred.

## Layout & styling

- `html { font-size: 112.5% }` in `styles.scss` scales everything (all sizes are rem). Small Tailwind/DaisyUI sizes and dimmed/disabled contrast are overridden at the end of `styles.scss` ("Readability overrides").
- `.signoff-panel` uses one text size (`--signoff-text`) for everything except bold headings.
- `.layout` — `height: 100vh; flex column`; `.topnav` sticky, 3rem, `z-index: 50`; `.content-body` scrolls; `.table-page-wrap` fixes the header/filters and scrolls the table.
- Theming: 32 DaisyUI themes; default `light`; app tokens (`--app-bg`, `--app-surface`, `--app-border`, `--app-text-muted`) track the active theme. `--app-border` is a mix of the theme's text colour (25%), not `base-300`, because `base-300` is nearly the panel colour in dark themes and borders vanished; change it in one place to retune every border. Toasts use `color-mix()` with theme variables.
- Shared components: ToastHost, ConfirmDialog (native `<dialog>`, password), TablePager, MultiselectDropdown, SortHeader.

## Deviations

Rules in plain language: ROUTING.md "Deviations".
- **What's acceptable** (`detectDeviations()`, `weld-record/joint-page/rules/deviations.ts`): Actual PH/IP outside its requirement pair (`isActualOutOfRange()`, NC = no limit), a failed Qualification Check (SELF's quals vs the WPS), and a Filler Metal Type/Size not on the WPS (skipped while "Only Consumable Insert used as filler" locks them). Actual out of range is not a field error: the field shows a live warning instead (`fieldWarning()`, amber). Actual Min > Max stays a hard stop.
- **Report Deviation** (`JointOverridesService.reported`, keyed by stage id): typed text, not persisted until signing, dropped on leaving like any unsigned input (the leave-page guard counts it). While a stage has one, `stageFieldOptions()` gives Filler Metal Type/Size the full list and WTN changes stop clearing them; removing the last report puts back the external system's GWP/WTN/filler (see "External assignment").
  - **Sign flow**: `signStage()` runs the hard validation first; if `stageDeviations()` finds anything, it opens `DeviationAcceptDialogComponent` (items, required reason, password) instead of the confirm. Accepting calls `DeviationService.record()` then `routeSignoff()`; additional signoffs are skipped since the joint is now held.
- **Hold**: `heldAt(stage)` makes every stage except the deviated one(s) non-editable (`editable()`, `inputsEditable()`, `signBlockers()`); the signoff panel shows `holdNote()`.
- **Engineering Hold**: `signStage(..., engineeringHold = true)` (from `acceptDeviations()`) calls `insertEngineeringHold()` (`weld-record/routing/added-steps.ts`): a runtime stage `engineering-hold[-n]` (`ENGINEERING_HOLD_STAGE`, role Engineering, no fields) right after the signed stage, with `routingFrom` on it.
  - `Deviation.holdStageId` names it (`nextEngineeringHoldId()` in `record()`). `routeBack()` treats hold stages like Repair rounds (signed = kept as a record); the WorkflowStore rebuild check ignores them. No routing preview on it.
  - `deprogressWorkflow()` marks an open deviation `withdrawn` when its hold stage is gone.
- **Release** (`DeviationService.disposition(job, comments, targetId)`, from `weld-record/engineering-release/engineering-release.component.ts`, which the signoff panel shows on an unsigned hold routing instead of Signoff; Pipe Welding's role droplist has `Engineering` (in `ROLES`) to list held joints): signs every unsigned hold (who Engineering, inputs `comments`/`routeTo`), sets open deviations `dispositioned` with `disposition`, writes a 'Deviation' History entry, then `RoutingService.moveWithHistory()` (shared with Admin > Routing Override; `moveRouting()` in weld-record/routing/route-changes.ts: back = `routeBack()`, forward = `setRoutingFrom()`, clears undo).
  - Both entries record routing "Engineering Hold" (`withHistory()`'s optional `routing`).
- **Reject-rule hold**: reject target `ENGINEERING_HOLD_TARGET` ('engineering-hold', routing-conditions.ts) makes `routeSignoff()` call `insertEngineeringHold(stages, id, rejectHoldReason(st, rule))` instead of Repair/route-back; the hold's `inputs.holdReason` drives `holdNote()` when no deviation is open, and `disposition()` releases it without one ('Sign-off' History entry).
  - Built-in `DEFAULT_REJECT_RULES` on the three NDT MT/PT routings (PT + that phase's weld routing GMAW); `rejectRulesEdited` on a saved template says Admin > Routing Settings saved its rules, otherwise the built-in ones apply (so older saves pick them up).
- **Seeds**: `seededWorkflow()` puts ~5 joints (`SEEDED_HOLD_EVERY`, last signed routing a welding routing) on hold via `seededDeviation()`: Actual PH Max = PH Max + 15.
- Not covered: Work History's Correct can still change an Actual PH/IP after signing without a deviation.

## External assignment

Emulates an external system that sets a welding routing's **GWP, WTN, Filler Metal Type and Filler Metal Size** after doing its own validity checks.
- **Picks** (`data/weld-assignment.ts`, `assignedInputs()`): one GWP per joint from those qualified for its base metals; WTN per routing, preferring one whose quals the SELF holds; filler type/size per routing from the WPS's allowed lists. Chosen by a hash of job id + stage id, so they're stable across visits. Also sets what the WPS drives (Weld Process, PH/IP, NC actuals), same as picking by hand. Filler is skipped while "Only Consumable Insert used as filler" owns it.
- **When**: `JointPageComponent.assignAndSnapshot()` runs `WeldAssignmentService.applyAll()` on every unsigned routing with a GWP field before the load snapshot (so it isn't an unsaved edit), overwriting whatever was there. Also re-applied when Fit switches to Weld Build-Up, when the Consumable Insert checkbox is unchecked (no override), and when a routing's last Foreman Override is removed. Routings blanked by a route-back fill again on the next visit.
- **Locked**: `assignedLocked()` (joint page) → signoff panel `isLocked()` shows the four as disabled droplists, like Weld Process (GWP/WTN descriptions still show under them). A Foreman Override on the routing enables them with the full lists.
- **Engineering override**: `isEngineeringEntryJoint(job)` = the system sends nothing (hash of job id, 1 in 5, plus joints with no GWP qualified for their base metals; 126 of 509 seeded).
  - `applyAll()` sets `WorkflowStage.engineeringEntry` on their unsigned welding routings, the first time blanking `ENGINEERING_ENTRY_KEYS` (GWP, WTN, Weld Process, PH/IP Min/Max, Filler Type/Size; filler kept while Consumable Insert owns it) and NC actuals.
  - On such a routing `stageFieldOptions()` makes GWP/WTN/filler plain text inputs, and the "Filled from the WTN" rules don't hold, so Weld Process can be picked and PH/IP typed (text boxes taking a number or NC: `typedRequirementBlur()` normalizes nc->NC and the actuals' NC fill rule sets/clears them, `typedRequirementError()` flags anything else), `assignedLocked()` is false, and `detectDeviations()` skips off-list checks.
  - History and Correct include those fields (`isUserEditable()`). Seeded routings signed before the flag keep their droplist display.
- **Engineering override reason + saving**: joint page `engineeringReason` (per stage).
  - `engineeringEdit()` wraps the blur/select handlers: the first change to an `ENGINEERING_ENTRY_KEYS` field with no reason applies the value, then asks (`askEngineeringReason()`); Cancel restores the routing's inputs from before.
  - `engineeringEdits()` = those keys changed since the load snapshot (plus Actuals made/unmade NC).
  - `ngOnDestroy()` collects them before `discardUnsignedEdits()`, then `recordEngineering()` -> `EngineeringOverrideService.record()` re-applies them and writes one 'Engineering Override' History entry (Reason + each value).
  - `recordOverrides()` (before every sign) records it too. The leave-page guard (`hasUnsavedEdits()`) ignores them.
  - `assignedLocked()` on an engineeringEntry routing = `engineeringLocked()`: saved (snapshot) non-blank value and no reason this visit; `engineeringOverrideAvailable()` shows the panel's Engineering Override button, which asks for a reason and unlocks.
- **Foreman Override switched off**: `FOREMAN_OVERRIDE_ENABLED = false` hides the button; the service and joint-page code are kept so it can be turned back on.
- Not covered: Work History's Correct can still change them after signing.

## Gotchas

- **Fabrication select labels**: `Location` and `Revised Joint Design` options exist only at runtime (`withRuntimeOptions()` in `joint-page`); the static `FABRICATION_FIELDS` entries have none. Any place that shows a fabrication value (e.g. Fit-Up Insp verification grid) must resolve its label through that helper, or it shows the raw stored code (`c-18` instead of `C-18`).
- **Joint design lookup**: jobs and weld planning store a joint design's *label* (`C-18`), while Revised Joint Design stores its *code* (`c-18`). `getJointDesign()` (`joint-designs.ts`) matches either, case-insensitively; matching only one would stop a job's own joint design triggering Consumable Insert/Backing Ring requirements or the Pre-Fit stage. Seed labels live once in `JOINT_DESIGN_LABELS`; `jobs.ts` and `data/weld-planning.ts` use it.
- **Joint design descriptions**: `JointDesignEntry.description` (made-up generic text, editable in Admin > Joint Designs) rides on `jointDesignOptions()` as `detail`. Revised Joint Design's open droplist shows "C-18 · description"; the closed box shows only the code (same `select-overlay-label` overlay as GWP/WTN, `FabricationComponent.hasDetails()`), and unlike GWP there's no description line under the field.
- **Consumable insert vs filler metal choices**: they share `FILLER_METAL_TYPE_OPTIONS` / `FILLER_METAL_SIZE_OPTIONS` (`procedures.ts`) because "Only Consumable Insert used as filler" copies the Fit stage's insert type/size into the filler fields. If the two lists ever differ, a copied value that is missing from the filler list renders as a blank select. Keep them one list.
- **Filler metal option values**: `procedures.ts`'s `FILLER_METAL_TYPE_OPTIONS`/`FILLER_METAL_SIZE_OPTIONS` (lowercase `value`, e.g. `'mil-70s-3'`) are the one list Weld Engineering's procedures, Weld Record's filler fields and Pre-Fit/Fit's Consumable Insert all use (`workflow/welding-steps.ts` imports them).
- **Weld Build-Up** reads its own Type form directly. Type changes clear values without copying field definitions; switching back to Fit reads the Fit form.
  - It runs through the same filter as the normal path, so N Ind./traceability-gated fields (`weldPosition`, `consumableInsertId`, `backingRingId`) stay gated.
- **One `showIf` rule**: `showIfMet()` (`weld-record/signoff-definition/stage-display.ts`) is the only place a field's `showIf` is resolved; field visibility (`visibleStageFields()`), blanking now-hidden values (`hiddenFieldsWithValues()`) and History/Correct (`fieldsShown()`, `weld-record/signoff-definition/shown-fields.ts`) all use it. `inspectionType` and `result` live on the stage itself, not in `stage.inputs`; reading them from `stage.inputs` makes every Type-gated field (Degree of RT, Defect Code, the Penetrant fields, Weld Color) blank itself the moment it's set.
- **Field labels in History**: a sign-off entry's `inputs` come from `snapshotInputs()` and a correction's `changes` from `labelFor(stage, key)` (both `weld-record/signoff-definition/stage-display.ts`), never from raw `stage.inputs` keys. A raw key such as `consumableInsertType` showing in History or Records Review means something bypassed them.

### Signoff Type availability conditions

`AvailableType.enableWhen` in `signoff-definition/signoff-types.ts` stores Joint Details rules per Type
per routing. `signoffTypeOptions(stageId, job)` evaluates them using the routing condition engine;
`buildStages()` uses the result, including an empty list, before choosing a default. The admin editor
is `admin-signoff-types/type-enable-conditions.component.ts`. Excavation's Type source and material
exceptions remain separate from ordinary Type availability.

Returning inspection Type is available in Enable when conditions. It records the inspection Type
of the routing that sent work back. The default 5X option also enables when the returning Type is
5X, covering the excavation material exception without overriding the configured Type list.
Repair creation and seeded Excavation NDT use the same configured availability/source resolver as
live routing. The old NDT method-filter helpers and the hardcoded return-to-5X option override are removed.

### Admin page introductions

Every admin page has a brief explanation directly below its title. Keep it to one short sentence
(or two when a related setup action matters). Signoff Types reminds admins to update Signoff Types
By Routing and Signoff Type Forms after adding or changing Types.

### Weld Colors
Admin > Weld Colors maintains the inspection color list in `data/weld-colors.ts`. The field catalog reads options at runtime so signoff forms and condition pickers share the saved list. The admin table and CSV expose one Color column. New entries use the color text as their stored value; existing internal values remain compatible with saved rules and signoffs. Existing values remain visible if a color is removed. Saved colors persist across workflow cache resets.
