# Field definitions consolidation — completed

Reference for completed work. This file does not queue implementation. See [ARCHITECTURE.md](ARCHITECTURE.md) for current details.

## Result

- The field catalog defines each field's label, control type, and option source.
- Signoff Type Forms selects the fields for each Type and controls layout, visibility, required rules, disabled rules, and prepopulation.
- Routings store recorded values and offer Types; they do not carry copied field definitions.
- Forms, validation, condition pickers, History, and corrections use the same catalog and Type definitions.
- Defer Tack is a checkbox. Required checkboxes must be checked, rather than merely contain text.
- Disabled welding override fields remain available behind their existing feature flag.

## Code ownership

| Concern | Source |
|---|---|
| Field definitions | [field-catalog.ts](src/app/weld-record/signoff-definition/field-catalog.ts) |
| Type forms and persistence | [step-field-config.ts](src/app/weld-record/signoff-definition/step-field-config.ts) |
| Catalog fields selected by a Type | [form-fields.ts](src/app/weld-record/signoff-definition/form-fields.ts) |
| Evaluated visibility and requirements | [shown-fields.ts](src/app/weld-record/signoff-definition/shown-fields.ts) |
| Workflow persistence and legacy data handling | [workflow-store.service.ts](src/app/weld-record/services/workflow-store.service.ts) |

The original duplicate per-routing field lists and fallback readers were removed. Storage versions and exact implementation history belong in Git; current storage keys are in [storage-keys.ts](src/app/data/storage-keys.ts).

## Recorded validation

At completion, 401 unit tests, the production build, and TypeScript unused-code checks passed. This is a historical result, not a claim about the current test count or coverage.
