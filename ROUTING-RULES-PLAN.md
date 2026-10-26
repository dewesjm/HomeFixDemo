# Routing rules configuration — completed

Both implementation parts are complete. This file summarizes the delivered scope; it does not queue work. [ROUTING.md](ROUTING.md) is the current behavior reference.

## Accepted-signoff routing

Routing Settings provides ordered **Then go to** rules, using the same condition editor as Reject rules. The first matching rule wins; no match continues in routing order.

- A destination at the current or an earlier routing performs a route-back: subsequent routings start fresh and prior records remain in History.
- A later destination passes the intervening routings without marking them signed.
- Conditions can use Joint Details, the current signoff's Type and answers, and other routings' recorded answers.
- Then go to rules replace the former Repeatable setting. The repeat counter records returns to the same routing.

Starting rules return Fit to Fit for Weld Build-Up, Layer to Layer for Interim Layer without Layer NDT, and Layer NDT to Layer after an Interim Layer signoff. Layer NDT selects one method group without adding an extra VT routing. Root and Final retain their separate VT/5X requirements.

## Inserted routings and relative destinations

Repair, Excavation NDT, and Engineering Hold appear in the **Inserted routings** section of Routing Settings. They use the same editable accepted and reject rules as numbered routings.

Targets can add Repair, Excavation NDT, or Engineering Hold, or resolve relative to the current repair round: Rejecting NDT, Rejecting phase's UT/RT, Rejecting phase's VT/5X, and Own Repair. Resolution selects the joint's regular or NQC row.

| Routing | Starting condition | Destination |
|---|---|---|
| Repair | Allowable thickness exceeded | Rejecting phase's UT/RT |
| Repair | Grind Only | Rejecting NDT |
| Repair | Cut | Fit |
| Repair | Weld Repair | Add Excavation NDT |
| Excavation NDT | PT was replaced by 5X | Rejecting phase's VT/5X |
| Excavation NDT | Otherwise accepted | Rejecting NDT |
| Excavation NDT | Rejected | Own Repair |

Excavation's Type source and ordered material exceptions are configured on Signoff Types By Routing. The default PT-to-5X exception applies to either member classified as non-ferrous or austenitic. Excavation uses the selected inspection Type's shared form.

Repair numbering, Cut/Refit numbering, record preservation, reset mechanics, and Engineering release remain application responsibilities. Routing preview runs the real routing logic without saving.

## Deferred input

Attribute-code requirements are being collected in [ATTRIBUTE-CODES-PLAN.md](ATTRIBUTE-CODES-PLAN.md), using provisional identifiers instead of actual source-system codes. All 13 collected attributes, interpretations and the proposed implementation direction are consolidated there; proposed effects include unresolved assumptions. Do not infer or implement exceptions from this completed plan; no attribute implementation is queued.

## Recorded validation

Part 1 passed 368 unit tests; Part 2 passed 391. Both passed production builds and TypeScript unused-code checks. These are historical results, not current coverage figures. Later field-definition consolidation is summarized in [FIELD-DEFINITIONS-PLAN.md](FIELD-DEFINITIONS-PLAN.md).
