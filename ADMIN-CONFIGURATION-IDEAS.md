# Weld Record admin configuration ideas

Reference notes from the admin configuration evaluation. These are ideas for review, not queued implementation work. Scope is Weld Record only; Weld Planning and Weld Engineering configuration are outside the current scope.

## Allowable repair thickness

A candidate for an engineering-owned admin table. `allowableThicknessAmount()` in `src/app/weld-record/routing/added-steps.ts` currently selects 3/8 inch for Nuclear Indicator 1 and 3/16 inch otherwise, with the text "or 20% of material thickness, which is less". The code identifies the Non-nuclear fallback as unreviewed.

Potential configuration: Nuclear Indicator, absolute thickness limit, percentage limit, and explanatory text. Review the intended values before implementing. The current value is guidance displayed beside the exceeded checkbox; making it configurable does not by itself add an automatic thickness calculation.

## Signoff field catalog and reusable option lists

Under discussion. Signoff Type Forms already configure which existing fields appear, their layout, and their conditions. The field catalog itself remains code-defined in `src/app/weld-record/signoff-definition/field-catalog.ts`.

Possible extensions:

- Maintain ordinary field definitions (label, control type, unit, help text) through admin configuration.
- Create new ordinary fields and then select them in Signoff Type Forms.
- Maintain other reusable option lists where Weld Record owns those values. Weld Colors is implemented below; Backing Ring Type is likely externally owned.

Specialized fields such as GWP/WTN, Qualification Check, References, and Affected Item have dedicated behavior. Editing a field definition does not create new workflow behavior or integrations. Keep their behavior in code unless a separate requirement justifies configuration.

Shared engineering reference lists used by Weld Record may warrant future coordination with their owning system; no Weld Engineering work is proposed here.

## Fabrication form definitions — long term

Low priority because fabrication is currently consistent. Potential future configuration includes field layout, required flags, and visibility rules, plus consolidating the separate Fit-required fabrication list. No current implementation requested.

## Makeup policy — lower priority

Potential settings for the fixed 90-day annual allowance and how usage is assigned to a year. Only pursue if business policy needs to change; no current implementation requested.

## Existing configuration and implementation boundaries

Routing, Signoff Type Forms, qualifications, material classification/traceability, inspection procedures, defect codes, penetrants, locations, and weld positions already have configuration. Prefer extending their existing owners over adding overlapping editors.

Groups already has an admin table, but its permissions are mocked rather than enforced. Identity and permission enforcement is separate work. People are intended to come from an external directory.

For any future configuration, consider stable field/code IDs, deactivation instead of deleting referenced values, configuration change history, and explicit behavior for existing joints and historical signoffs. History preservation, record identity, and repair numbering remain application mechanics.

## Implemented: Weld Colors
Weld Record now has Admin > Weld Colors for maintaining color names and codes. Backing Ring Type is likely externally owned; leave its list alone pending that integration.

