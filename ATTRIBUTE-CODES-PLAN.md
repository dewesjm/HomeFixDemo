# Attribute-code routing exceptions — planning only

Requirements collection is in progress. These are proposed meanings, not implemented behavior or approved build work. Codes below are two-character planning identifiers, not actual source-system codes; the first character is a letter and the second is usually a letter. FC is retained from the supplied notes as a provisional identifier. Actual codes are not needed for this discussion.

Attributes without routing effects still show their translated message. Their individual messages are outside this routing-exception list.

## All 13 attributes

| Code | Message | Routing Changes |
|---|---|---|
| PR | PT ROOT IF ID-VT / NO RT | No RT required. PT allowed if the final weld ID is visible. |
| PM | FINAL PT MAY BE SUBSTITUTED FOR MT | Final PT may be substituted for MT. |
| FC | FINAL PT NOT REQUIRED "VT" ONLY ON FINAL | Final PT not required; VT only on Final. |
| BJ | [material type] BRAZED JOINT (OPTO) "VT" ONLY ON FINAL | Final PT not required; VT only on Final. |
| PU | PT & UT REQUIRED ON FINAL | Both PT and UT required on Final. |
| SI | SHOP JTS ONLY-ID INSP-LIEU RT | Allow VT ID inspection instead of RT for shop joints. |
| RX | ROOT PT AND FINAL XRAY REQD | Root PT and Final RT required. |
| IA | PT/MT ID IF ACCESS | PT/MT of the ID if accessible. |
| IR | PT/MT ID IN LIEU OF RT IF ACCESSIBLE | PT/MT of the ID if accessible instead of RT. |
| LR | ALLOW 60 DEG RT IN LIEU OF INTERMEDIATE LAYER PT | Allow 60-degree RT instead of intermediate Layer PT. |
| GV | GTA WELDS:VT ONLY ROOT & FINAL (5XROOT/1XFINAL) | VT Root at 5X and VT Final only; message specifies Final at 1X. |
| RI | 60 RT AND/OR PT OF ID REQUIRED | 60-degree RT and/or PT of the ID required. |
| BP | BOTH 5X AND PT/MT ROOT REQ'D | Both Root VT at 5X and Root PT/MT required. |

## Assumptions and questions to resolve

- **PR:** preserve both the supplied message and explanation. They do not yet establish whether PT is at Root or Final, whether ID means inside diameter, or whether "visible" means visually inspectable. PT is described as allowed, not mandatory. Confirm whether No RT applies to Root, Final or both, and what happens when the visibility condition is not met.
- **PM:** substitution is optional, not a requirement to perform both PT and MT. Decide how the choice is recorded and how PT satisfies an otherwise-required Final MT inspection.
- **FC:** provisionally read "VT only on Final" as excluding other Final NDT methods, rather than just removing PT. Confirm how this interacts with independently required UT/RT.
- **BJ:** provisionally has the same Final inspection effect as FC. The material type placeholder, the meaning of OPTO, and any material-specific applicability still need definition; do not infer them.
- **PU:** PT and UT must both be completed; neither substitutes for the other. Provisionally retain the normal Final VT requirement because this message does not say "only". Confirm inspection order and interaction with any RT requirement.
- **SI:** provisionally an optional substitution of ID VT for the applicable RT, for shop joints only. Confirm phase, how shop joints are identified, and whether accessibility must be confirmed.
- **RX:** require Root PT and Final RT, retaining other requirements unless explicitly removed. Confirm Final RT coverage/degree.
- **IA:** provisionally require ID PT or MT when accessible. Confirm phase, method selection and what applies when inaccessible.
- **IR:** provisionally allow ID PT or MT to satisfy applicable RT when accessible, retaining RT otherwise. Confirm phase and whether substitution is optional or automatic.
- **LR:** provisionally allow 60-degree RT to satisfy intermediate Layer PT. Confirm whether every required Layer PT needs a separate substitute inspection or one RT can satisfy several layers.
- **GV:** provisionally restrict Root and Final to VT at 5X and 1X respectively for GTA welds. This does not independently remove Layer inspections. Confirm mixed-process applicability and how the GTA condition is established.
- **RI:** provisionally either 60-degree RT or ID PT can satisfy the requirement, with both allowed. Confirm whether "and/or" instead depends on access or another condition, and identify the inspection phase.
- **BP:** require two completed obligations: Root VT at 5X, and Root PT or MT. Neither replaces the other. Confirm how PT versus MT is selected.
- **Terminology:** ID = inside diameter, GTA = GTAW, and PT/MT = one applicable method rather than both remain assumptions to confirm.
- **Multiple attributes:** precedence and conflicts are undecided, especially VT-only versus PT-and-UT-required. Do not silently choose a winner.
- **Lifecycle and configuration:** decide configuration versus fixed rules, regular/NQC applicability, changes to existing joints, signed-record preservation, Repair/Excavation returns and Deprogress after the requirements are collected. No implementation is authorized by this plan.

## Proposed implementation direction — not approved build work

This document is the single reference for all 13 collected attributes, interpretations and implementation discussion. The table preserves supplied intent; assumptions are not confirmed requirements.

Use a shared inspection-requirement resolver in plain feature rule functions. Start with normal joint inspection requirements, apply applicable attributes, and produce required inspections and permitted alternatives. Routing construction, Type availability, validation and preview should consume the same resolved result.

- **Added obligations:** PU, RX and BP require separate completed inspections; selecting one Type cannot satisfy two obligations.
- **Permitted substitutions:** PM, SI, IR and LR allow an alternative to satisfy a specific original obligation. Keep the original obligation until a valid alternative is selected and completed; permission does not require both methods.
- **Restricted inspections:** FC, BJ and GV narrow methods for their applicable phases, subject to explicit conflict decisions.
- **Conditional or alternative obligations:** PR, IA and RI need phase, access and choice semantics resolved before executable rules can be specified.

Reuse existing routing inclusion and Type configuration where it fits. Consider a "Has attribute code" condition checking all four attribute fields together rather than requiring slot-specific rules. Keep code/description lookup separate from behavior; do not parse message text to infer executable rules.

Check support for shop/field identity, recorded ID accessibility, magnification and 60-degree RT. Missing accessibility must remain unknown rather than being treated as inaccessible. Record the selected substitute and which obligation its completed inspection satisfies.

Conflicting attributes need an explicit policy; list order must not silently determine precedence. Resolve phase scope, inspection order, configuration ownership and lifecycle questions before implementation. No values are being added to application screens, seed data or the changelog.
