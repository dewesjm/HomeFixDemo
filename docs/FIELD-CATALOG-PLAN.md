# One field catalog plan

**Status: BUILT 2026-11-09.** Kept as a record of the decisions; `catalogs/field-catalog.ts` and `catalogs/field-choices.ts` are the current implementation. File names below (`form-field-catalog.ts`, `condition-catalog.ts`, `joint-facts.ts`, `stage-templates.ts`) are from before the build and no longer exist.

Starting point: commits `7f25026` and `5fb296f`, which put `form-field-catalog.ts` and `condition-catalog.ts` side by side in `src/app/weld-record/catalogs/` and folded `joint-facts.ts` into the condition catalog. Baseline is 599 passing tests.

## Why

To the user, this is one list of things available for configuration. Today it is spread across two catalogs with confusing names, plus the Fabrication list. Replace the two catalogs with one list, where each entry says where its value comes from.

## Decisions (user)

1. **One list**, with a **Source** on every entry. Source is how the user thinks of it. Do not call it Type: Type already means Text, Droplist and so on.
2. **Four Sources:** Joint Details, Calculated, Fabrication, Signoff Form.
3. **File size is not a concern, logical separation is.** One file, in sections by Source.
4. **Fabrication fields are available as options in the list, but the Fabrication form does not build its fields from the list.** See "Fabrication" below for how this is applied.
5. **Special cases are defined in the catalog**, as settings on their rows.
6. **Labels:** the Joint Details field stays `Drawing Rev`. The Fabrication field becomes `Drawing Rev Execution` (today `Drawing Rev (Execution)`).
7. **Droplists are grouped logically by Source and state the Source.** Today's mixed order does not need to be kept.

## Target layout

```
catalogs/field-catalog.ts     the entry type and the one list, sections by Source
  Joint Details               Pipe Size, MCL 1, Drawing Rev ...
  Calculated                  Controlled Material ..., each calculation beside its row
  Fabrication                 mapped from FABRICATION_FIELDS
  Signoff Form                Consumable Insert Type, Comments ...
  FIELD_CATALOG = all four sections
catalogs/field-choices.ts     per-routing generated fields and what each screen offers
```

**The separation rule: the catalog says what a field is; other code decides when it is used.**

| In the catalog | Outside the catalog |
|---|---|
| Key, label, Source, allowed values, how to read or calculate it | Which fields each admin screen offers (`field-choices.ts`) |
| Input type and a form field's default show/required rules | Generating per-routing rule fields (`field-choices.ts`) |
| Flags and fixed keys for special cases | Fabrication behavior, such as which hulls have Usage (`fabrication/`) |
| | Applying form rules (`signoff-definition/`) |

Suggested entry shape, to be settled while building:

```ts
type FieldSource = 'Joint Details' | 'Calculated' | 'Fabrication' | 'Signoff Form';

interface CatalogEntry {
  key: string;
  label: string;
  source: FieldSource;
  /* the rule side: ConditionCatalogField's values, get, valueLabel, yesText, noText, stepAnswer */
  /* the input side, on Signoff Form rows: CatalogField's type, options, default rules and flags */
}
```

Use a union by `source` if that stops rows carrying properties that mean nothing for their Source.

## Sources for today's entries

| Today | Source |
|---|---|
| `JOINT_DETAILS_TEXT`, `nInd`, `ss`, `sfff`, `dssAaa`, `weldType`, NDT and RT rows, `ut`, `vt` | Joint Details |
| `attributeCodes`, `material.*`, `jdInsert`, `jdRing`, `controlledMaterial`, `part1Traceability`, `part2Traceability` | Calculated, from the joint only |
| `fabricationShipboard`, `consumableInsertRequired`, `backingRingRequired`, `revisedJointDesignEntered` | Calculated, depends on Fabrication (`stepAnswer: true`) |
| `fab.<key>` rows | Fabrication |
| Every row of today's `FIELD_CATALOG` | Signoff Form |

## Fabrication

`fabrication/fabrication-fields.ts` stays the definition of the Fabrication form. The dependency runs one way: the catalog maps `FABRICATION_FIELDS` into its Fabrication section, as `FABRICATION_CONDITION_FIELDS` does today, and the Fabrication form never imports the catalog. This also avoids writing each label twice. `adaptive-search/filter-schema.ts` also uses `FABRICATION_FIELDS` and can stay as it is.

## Special cases, on their rows

- **Defer Tack and Release to welding:** one Signoff Form row each, plus a setting holding the fixed rule key (`fitDeferTack`, `inspReleaseToWelding`), the routing ids it reads and its rule label. Built-in rules depend on those keys. This replaces `FIXED_ANSWER_FIELDS`, `FIXED_STEP_ANSWERS` and `FIXED_KEY`.
- **Own-component rows** (`ownComponent`: Type, Inspection Results, References, Signoff History, Affected Item): stay rows with their flag.
- **`ownFormSteps` and `signoffValue`:** stay on their rows.

Only generated entries are not written as rows: per-routing `step.<stageId>.<key>`, `self.<key>` and a routing's Type. They depend on which fields admin put on each routing, and they are built from catalog rows in `field-choices.ts`.

## What each screen must keep offering

Admins can pick the same fields as today. Only the droplist grouping and the Source shown change (see "Droplist grouping").

| Screen | Offers today | New filter |
|---|---|---|
| Signoff Type to Routing, personas (`JOINT_DETAIL_FIELDS`) | Joint Details and joint-only Calculated | Joint Details, plus Calculated without `stepAnswer` |
| Signoff Type Forms clauses (`JOINT_AND_FABRICATION_FIELDS`) | Joint Details, all Calculated, Fabrication | All except Signoff Form |
| Signoff Type Forms field picker, additional signoffs (`FIELD_CATALOG`) | Form fields | Signoff Form only |
| Routing Settings (`ROUTING_CONDITION_FIELDS`, `stepAnswerFieldsBefore`, `stageConditionFields`) | The above, fixed answers, earlier routings, This routing | Same, generated from the list |
| Qualifications, Advanced Search (`allStepAnswerFields`) | Every routing's answers | Same, generated from the list |
| Attribute Code Exceptions (`exception-text.ts`) | Its own subset | Unchanged |

Note that a plain "Source is Joint Details" filter is wrong for the first row: it must also include joint-only Calculated rows, and must exclude the Fabrication-dependent ones.

## Droplist grouping

After building, the user asked for the Source prefix on every droplist that uses the catalog, headed or not (`fieldChoiceLabel` in `field-choices.ts`), and each is wide enough for its full names.

Calculated rows show under Joint Details or Fabrication today. They move to their own Calculated group.

- **Droplists with headings** (Routing Settings via `admin-routing/condition-editing.ts`, Qualifications): the Source is the heading. Order: This routing, Joint Details, Calculated, Fabrication, Earlier routings. Choices that aren't catalog rows keep their current names.
- **Flat searchable lists** (Signoff Type Forms clauses via `condition-choices.ts`): the Source starts each name, as in `Calculated: Controlled Material`. Fabrication rows already start with the word, so don't double it. Same order, with `This form` first and the non-field clauses (Routing ID matches and so on) last, as today.
- Fields inside a group keep their order from the list.
- `Signoff Form` as a heading applies only where those rows are offered directly. Per-routing answers keep the `Earlier routings` and `This routing` names, because those say which routing's answer is meant.

## Traps

- **Name collision:** `FIELD_CATALOG` means form fields only today. In the new file it means all four Sources. Its two callers outside `catalogs/` (`admin-signoff-type-definition.component.ts`, `additional-signoffs-editor.component.ts`) need the Signoff Form rows, and `lookupCatalogField` (11 files) must keep returning only Signoff Form rows. Export a separate `FORM_FIELDS`.
- **Circular import:** today's form catalog reads `ENGINEERING_OVERRIDE_KEY` and `REJECTED_PHASE_UTRT_KEY` from `signoff-definition/condition-context.ts` while its list is being created, and that file reads the condition catalog. Merged, this becomes a cycle that can leave those values undefined. Move the two constants to a small file of their own first.
- **Registered functions:** `registerRoutingFields` and `registerStepTemplates` exist to avoid import cycles with `stage-templates.ts`. Keep them working.
- **Saved settings:** keep every existing key, including the `fab.` prefix, so no stored data converts. `drawingRev` (Joint Details) and `fab.drawingRev` are different fields and stay distinct through that prefix.
- **`source: 'jointDetail'`** on saved conditions (`field-conditions.ts`) is also used for Fabrication-dependent facts such as `consumableInsertRequired`. The name is misleading, but changing it touches saved data. Not part of this work unless the user asks.

## Build order

1. **Drawing Rev label**, on its own commit, with a Change Log line:
   - `fabrication/fabrication-fields.ts:39` label, and its comment at line 38
   - `fabrication/fabrication.component.html:78` comment
   - `catalogs/form-field-catalog.ts:237`, which becomes `Drawing Rev Execution verified`
   - specs that expect the old label, such as `history-rows-fabrication.spec.ts`
   - check whether history entries already saved under the old label need handling
   - `fabrication/fabrication-form.ts:73`, the short name in `FIT_REQUIRED_FABRICATION`, also becomes `Drawing Rev Execution`, with `fabrication-form.spec.ts:78` and `sign-validation.spec.ts:33`. This text feeds `signProblems()`, which only decides whether signing is allowed; it is not displayed.
   - the new label is two characters shorter than the old one, so it should not add a line. The user asked that it not wrap, so look at the Fabrication panel and the Fit-Up Insp verify row in a browser.
2. Before merging, record each screen's list (keys, labels, order, group) so it can be compared afterward.
3. Move the two constants out of `condition-context.ts`.
4. Create `field-catalog.ts` and `field-choices.ts`, moving entries across, and update imports. `FormField` is imported by 20 files; keep the type name. Delete both old catalog files. Merge `condition-catalog.spec.ts` into a new spec.
5. Add tests: keys are unique across the list; each Source's rows have what that Source needs; each screen offers the same keys as the recording from step 2, with the order and names following "Droplist grouping".
6. Update docs (below), commit, and stop for review.

## Verify

- `npx tsc --noEmit -p tsconfig.app.json` and `-p tsconfig.spec.json`, from the repo root
- `npx ng build`. The NG8102 warnings in `when-group-editor.component.html` already exist.
- `npx ng test --watch=false --browsers=ChromeHeadless`
- Load the built app from `dist/welding/browser` with fallback to `index.html`, in headless Chrome, and check for console errors on: `/pipe-search`, `/jobs/D1034/S731-5003/FO-10939`, `/admin/routing`, `/admin/attribute-code-exceptions`, `/admin/signoff-types`, `/admin/signoff-fields`, `/admin/qualifications`
- Open each condition editor's droplist in a browser. The earlier work on these editors was never browser-checked.

## Docs to update when built

- `ARCHITECTURE.md`: the `catalogs/` entry in the folder tree, and the catalog references near "Configurable field system", the field-type note and the Fit/Pre-Fit signoff note
- `TEST-COVERAGE-PLAN.md`, `ADMIN-CONFIGURATION-IDEAS.md`, `FIELD-DEFINITIONS-PLAN.md`: path mentions
- Comments that name either old catalog file
- `data/changelog.ts`: the label change and the droplist grouping; the merge itself has no other user-facing effect
- `AGENTS.md`: remove the queue item. `Tasks.md`: tick it off. Mark this plan BUILT.
