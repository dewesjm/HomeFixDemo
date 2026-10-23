# Field definitions plan

Planned, not built. Do this after Part 1 of ROUTING-RULES-PLAN.md is committed and reviewed. Both
touch the condition pickers in `weld-record/routing/step-conditions.ts`.

## The problem

Every field is defined twice:

1. **The field catalog**, [field-catalog.ts](src/app/weld-record/signoff-definition/field-catalog.ts):
   each field's label, type (text, number, select, checkbox, radio) and options. Admin > Signoff Type
   Forms picks from it and sets which fields each Type uses and their rules.
2. **Old per-routing field lists**: each routing's `fields` / `signoffFields`, written in code before
   Signoff Type Forms existed, each with its own label, type and options.

Some screens read the first and some read the second, and they've drifted apart. The bug that showed
it: on Fit, **Defer Tack is a text box**. The catalog says checkbox, but Fit's Insert / Ring /
Defer Tack row is drawn from the old list, where it's `type: 'text'` (`data/welding-steps.ts:61`).

## The goal

- The catalog is the **only** place a field is defined: label, type and options.
- Signoff Type Forms is the **only** place that says which fields a Type uses, and their rules.
- A routing doesn't list fields at all. It only offers Types (Signoff Types By Routing), and the
  Type's form decides the fields.
- The old lists, and everything reading them, are removed entirely, not left as a fallback, so
  there is no second source to get confused by.

## Where the old lists are defined (remove)

| Location | What |
|---|---|
| `data/welding-steps.ts` | every routing's `fields` / `signoffFields`, `insertAndBackingRingFields()` (Fit/Pre-Fit, incl. Defer Tack as text), `recordsReviewFields()` |
| `weld-record/signoff-definition/weld-fields.ts` | `WELD_STAGE_FIELDS`, `WELD_OVERRIDE_FIELDS` (move anything still needed into the catalog) |
| `weld-record/routing/ndt.ts` | `NDT_COMMON_FIELDS` and each NDT kind's `fields` (lines 12-75), copied onto NDT stages (line 123) |
| `weld-record/routing/added-steps.ts` | `REPAIR_STAGE.fields` (line 28), Excavation NDT's copied NDT fields (line 65), Engineering Hold's empty lists |
| `weld-record/model/workflow-types.ts` | `fields` / `signoffFields` on `WorkflowStage` and `StageTemplate`, and the `StageField` / `SignoffField` types if nothing else needs them |

## Where they're copied onto joints (remove)

| Location | What |
|---|---|
| `weld-record/routing/build-stages.ts:27-40` | copies the template lists onto each new stage, adds the weld override fields |
| `weld-record/services/workflow-store.service.ts:146-185` | on load, refreshes every saved stage's `fields` / `signoffFields` from the templates, and Repair's from `REPAIR_STAGE` |
| `weld-record/routing/route-changes.ts:82, 105, 145` | the undo snapshot strips and restores the lists |
| `weld-record/routing/stage-templates.ts:69` | built-in templates' lists |
| `weld-record/admin/admin-routing/admin-routing.component.ts:170` | an added routing gets empty lists |
| `weld-record/joint-page/rules/type-change.ts:18-19` | a Type change copies the routing's own lists |
| `weld-record/joint-page/rules/unsaved-edits.ts:14` | copies the lists when keeping unsaved edits |

## What reads them (switch to the catalog + the Type's form)

**The joint page form**
- `signoff-definition/shown-fields.ts:84` `visibleSignoffFields()`: Fit / Pre-Fit's Insert, Ring
  and Defer Tack row. It takes the field from `stage.signoffFields`, so the old type wins.
  **This is the Defer Tack bug.** Used by `signoff-panel/definition-form.component.ts:101`,
  `joint-page/joint-page.component.ts:285`, `joint-page/rules/fit-signoff.ts:11` and sign validation.
- `joint-page/rules/stage-form.ts:49` `visibleStageFields()` and `shown-fields.ts:71`
  `fieldsShown()`: fall back to `stage.fields` for a routing without a form.
- `signoff-definition/signoff-parts.ts:35` `withComments()`.
- `signoff-panel/signoff-context.ts`, `signoff-panel/verify-grid.component.ts`: take
  `StageField` / `SignoffField` (switch to the catalog field type).

**Saving, History and Correct**
- `signoff-definition/stage-display.ts:22-50`: field labels and History snapshot values.
- `services/signoff.service.ts:137`: looks up a field definition when recording the signoff.
- `work-history/correct-stage-dialog.component.ts:50-125`: Correct's field lists.
- `joint-page/signoff-form-edits.service.ts:43, 134` and `signoff-form-errors.service.ts:55`.
- `services/routing.service.ts:17-27`: `setStageInput` takes a `StageField`.

**Field rules and lookups**
- `joint-page/joint-overrides.service.ts:105-196`: Engineering Override's field lookups.
- `joint-page/rules/deviations.ts:28-80`: deviation checks look up fields.
- `joint-page/rules/weld-cascade.ts:20`.
- `signoff-definition/field-fill.ts:16, 27` and `field-locks.ts:18`: check `stage.fields` for the key.
- `data/weld-assignment.ts:20, 57` and `services/weld-assignment.service.ts:43`: "does this step
  record a WTN / GWP".

**Condition pickers**
- `routing/step-conditions.ts:147-148` `answersOf()`: the routing condition, Reject and Then go to
  pickers list each routing's answers from the old lists. They should list the fields of the Types
  that routing offers. `step-conditions.ts:337` reads them too.
- `qualifications/qual-conditions.ts:66-81`: the qualification condition picker lists every
  routing's fields from the old lists. It would offer Defer Tack as free text.

**Seed data**
- `data/seeded-workflow.ts:45-51, 136-150`: picks demo values by the old field types.

## Admin change

Signoff Type Forms' Fields list shows each field's type (Text, Number, Droplist, Checkbox, Radio),
read-only. Types stay fixed in the catalog: changing a field's type would misread values already
saved on joints.

## Also in the build

- Storage versions and `CURRENT_VERSION` bumped. Saved joints carry their old copied lists; they
  are dropped on load.
- A Change Log line ("Defer Tack on Fit is a checkbox again"; "Signoff Type Forms shows each field's type").
- ARCHITECTURE.md updated where it describes stage fields.
- Unit tests: Defer Tack renders and validates as a checkbox; the condition pickers list a Type's
  form fields; nothing reads `fields` / `signoffFields` (they no longer exist).
