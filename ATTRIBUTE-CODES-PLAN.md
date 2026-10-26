# Attribute-code routing exceptions — planning only

Requirements collection is in progress. These are proposed meanings, not implemented behavior or approved build work. Codes below are two-character planning identifiers, not actual source-system codes; the first character is a letter and the second is usually a letter. FC is retained from the supplied notes as a provisional identifier. Actual codes are not needed for this discussion.

Attributes without routing effects still show their translated message. Their individual messages are outside this routing-exception list.

## First five attributes

| Code | Message | Routing Changes |
|---|---|---|
| PR | PT ROOT IF ID-VT / NO RT | No RT required. PT allowed if the final weld ID is visible. |
| PM | FINAL PT MAY BE SUBSTITUTED FOR MT | Final PT may be substituted for MT. |
| FC | FINAL PT NOT REQUIRED "VT" ONLY ON FINAL | Final PT not required; VT only on Final. |
| BJ | [material type] BRAZED JOINT (OPTO) "VT" ONLY ON FINAL | Final PT not required; VT only on Final. |
| PU | PT & UT REQUIRED ON FINAL | Both PT and UT required on Final. |

## Assumptions and questions to resolve

- **PR:** preserve both the supplied message and explanation. They do not yet establish whether PT is at Root or Final, whether ID means inside diameter, or whether "visible" means visually inspectable. PT is described as allowed, not mandatory. Confirm whether No RT applies to Root, Final or both, and what happens when the visibility condition is not met.
- **PM:** substitution is optional, not a requirement to perform both PT and MT. Decide how the choice is recorded and how PT satisfies an otherwise-required Final MT inspection.
- **FC:** provisionally read "VT only on Final" as excluding other Final NDT methods, rather than just removing PT. Confirm how this interacts with independently required UT/RT.
- **BJ:** provisionally has the same Final inspection effect as FC. The material type placeholder, the meaning of OPTO, and any material-specific applicability still need definition; do not infer them.
- **PU:** PT and UT must both be completed; neither substitutes for the other. Provisionally retain the normal Final VT requirement because this message does not say "only". Confirm inspection order and interaction with any RT requirement.
- **Multiple attributes:** precedence and conflicts are undecided, especially VT-only versus PT-and-UT-required. Do not silently choose a winner.
- **Lifecycle and configuration:** decide configuration versus fixed rules, regular/NQC applicability, changes to existing joints, signed-record preservation, Repair/Excavation returns and Deprogress after the requirements are collected. No implementation is authorized by this plan.
