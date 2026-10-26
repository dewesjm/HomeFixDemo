# Attribute-code routing exceptions — demo implementation and clarification register

All 13 progression-affecting attributes are collected. Demo implementation is authorized using explicit assumptions; their real-world meanings still need clarification. Codes below are two-character planning identifiers, not actual source-system codes; the first character is a letter and the second is usually a letter. FC is retained from the supplied notes as a provisional identifier. Actual source-system code mapping remains unconfirmed. This document is the single reference for messages, original interpretations, user comments, executable demo assumptions and unanswered questions.

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

## Original interpretations and questions — retained for comparison

These notes preserve the original discussion. The implementation register below states the demo choices and records subsequent user comments separately; an implemented assumption is not a confirmed engineering requirement.

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
- **Lifecycle and configuration:** originally open: configuration versus fixed rules, regular/NQC applicability, changes to existing joints, signed-record preservation, Repair/Excavation returns and Deprogress. See the implementation register for the authorized demo defaults.

## Implementation approach

This document is the single reference for all 13 collected attributes, interpretations and implementation discussion. The table preserves supplied intent; assumptions are not confirmed requirements.

Use a shared inspection-requirement resolver in plain feature rule functions. Start with normal joint inspection requirements, apply applicable attributes, and produce required inspections and permitted alternatives. Routing construction, Type availability, validation and preview should consume the same resolved result.

- **Added obligations:** PU, RX and BP require separate completed inspections; selecting one Type cannot satisfy two obligations.
- **Permitted substitutions:** PM, SI, IR and LR allow an alternative to satisfy a specific original obligation. Keep the original obligation until a valid alternative is selected and completed; permission does not require both methods.
- **Restricted inspections:** FC, BJ and GV narrow methods for their applicable phases, subject to explicit conflict decisions.
- **Conditional or alternative obligations:** PR, IA and RI need phase, access and choice semantics resolved before executable rules can be specified.

Reuse existing routing inclusion and Type configuration where it fits. Consider a "Has attribute code" condition checking all four attribute fields together rather than requiring slot-specific rules. Keep code/description lookup separate from behavior; do not parse message text to infer executable rules.

Check support for shop/field identity, recorded ID accessibility, magnification and 60-degree RT. Missing accessibility must remain unknown rather than being treated as inaccessible. Record the selected substitute and which obligation its completed inspection satisfies.

Conflicting attributes block signoff with an explanation; list order does not determine precedence. The provisional demo choices below permit implementation while keeping engineering questions open.

## User comments and decisions — recorded alongside assumptions

| Topic | User comment or decision | Status / effect |
|---|---|---|
| Scope | These 13 are all codes that affect joint progression. | Complete collected list; no additional codes presumed. |
| Authorization | Implement using assumptions and document every assumption for clarification. | Demo implementation authorized; engineering meanings remain provisional. |
| Existing data | Demo only; effects on existing signed joints do not matter. Adjust seeded data as needed. | Use normal demo cache reset; no signed-joint migration work. |
| ID | User does not know what ID means. | Preserve the literal term ID; do not present inside diameter as confirmed. |
| GTA | User thinks GTA means GTAW and considers this sensible, but is unsure. | GTAW remains a working assumption, not a confirmed definition. |
| PT/MT | The performed PT or MT must be specified. | Explicit Type selection; never a combined PT/MT completion record. |
| PR visibility | User guesses no routing effect when ID is not visible. | Apply PR only with access/visibility Yes; retain this as a tentative interpretation. |
| LR | Allows RT rather than requiring it; user assumes every interim layer is allowed that alternative. | PT remains offered; RT60 is independently offered on each applicable interim-layer inspection. |
| Conflicts | User selected “Stop and explain the conflict.” | Chosen demo policy, recorded separately from the original proposal. |
| Follow-up | Preserve assumptions/questions alongside user answers; avoid a large batch of questions. | Keep this register; ask one focused clarification at a time. |
| IA phase follow-up | User first tentatively suggested Root + Final if each has accessibility, asked about Layer, then said “I would assume it's for all 3.” | Latest provisional demo choice: Root, Layer and Final. Original Final-only assumption is retained below; this is not engineering confirmation. |
| Independent signoff data | User emphasized that every signoff must have completely separate data. | Type, result, inputs, signoff inputs, completion records and the ID access/visibility answer are independent per signoff. There is no joint-level access fact. |
| PU and Final RT / MT | 2026-10-26: when PU is present, Final RT and Final MT are not applicable; UT and PT are done instead. | Recorded as an assumption for the configuration move (A12). Not yet built: current code still retains RT and MT. |
| GV and GTA | 2026-10-26: user believes the Weld Process field will specify GTAW. | GV applies per phase from the recorded Weld Process: Root NDT when Root was GTAW, Final NDT when Final Weld was GTAW. Replaces the GTA-only joint field in the configuration move. Tentative ("I believe"). |
| SI and shop joints | 2026-10-26: a shop joint is any joint whose Fabrication Location is not a shipboard value; shipboard vs shop is the Shipboard column in Admin > Locations. | Replaces the Joint location category field in the configuration move. Conditions need a "Fabrication Location is shipboard" fact. |
| RX clashes | 2026-10-26: with RX, Root MT/PT offers PT only (MT not applicable) and Final UT/RT offers RT only (UT not applicable). | No new routing. User: the code's method replacing the other method on the same routing is "probably the default"; each remaining code is still reviewed one by one. |
| BP and an existing Root MT/PT | 2026-10-26: user is not sure a joint with BP would already have NDT Root MT or PT; likely BP appears where NDT Root is 5X and an MT or PT is also needed. User will check real data. | Open, no default chosen. BP's Root 5X (replacing VT) and adding Root MT/PT with PT and MT offered are not in question. |
| IA and an existing PT/MT | 2026-10-26: user leans toward one signoff covering both: the phase's existing PT/MT signoff answers ID accessible = Yes and counts for IA, with no new routing. The code is very vague. | Tentative; follow up with the end users. Where the phase has no MT/PT routing, IA adds one. |
| RI alternatives | 2026-10-26: user leans toward Final UT/RT offering RT (at least 60) or PT (ID, ID accessible = Yes), inspector picks, since PT of ID is effectively a substitute. Existing Final RT of 60 or more covers RI. | Tentative; end users must answer. Depends on gaps 4, 5 and 6. |
| ID meaning | 2026-10-26: user reads ID as simply whether the joint is able to be accessed; it is not a separate inspection or object. | ID is the per-signoff accessible answer only. No ID Types or (ID) labels; Types stay plain PT, MT, VT and RT. |

## Executable demo assumptions and open questions

Every row below is a demo assumption unless explicitly identified above as a user decision. Defaults are reproducible and are not a certification of the source messages.

| ID | Topic | Implemented demo assumption | Clarification still needed |
|---|---|---|---|
| A01 | Code identity | PR, PM, FC, BJ, PU, SI, RX, IA, IR, LR, GV, RI and BP are executable provisional identifiers. Exact, trimmed, case-insensitive matching across all four slots; duplicate codes apply once. | Actual source-system mapping. |
| A02 | Other codes | Unknown and informational codes display their lookup text but have no built-in progression effect. | None for collected scope. |
| A03 | ID | Store/display literal ID without expanding it. Scope is recorded in the obligation and selected Type label. User reading (2026-10-26): ID means the joint can be accessed; the configuration move drops ID scope labels. | What does ID mean, and what portion of an inspection does it identify? |
| A04 | Access / visibility | Each affected signoff requires its own Yes/No answer to "Inner surface of the weld / ID is accessible", representing both accessibility and visibility. Methods that depend on access (PR, SI, IA, IR, RI) are valid only with the matching answer on that signoff; signing is blocked until it is answered. | Should visibility and accessibility be separate answers? Is an Unknown answer needed? |
| A05 | Context source | Shop/Field and GTA-only are job data, not inferred from engineering notes, dimensions, material, actual signoffs or code-message text; blank is Unknown. ID access is answered per signoff (A04). Weld Planning exposes these fields; its data remains independent of Weld Record, as before. | Source-system fields and integration/mapping. |
| A06 | GTA | A GTA-only Yes fact stands for GTAW throughout the applicable weld. No/Unknown retains normal routing; mixed-process work is treated as not GTA-only. | GTA meaning, mixed-process behavior and whether actual process signoffs should determine applicability. |
| A07 | PR phase | On each Root/Final UT/RT obligation, access Yes allows "Attribute inspection not required" in place of RT. Root PT (ID, access Yes) is allowed as an alternative to the normal Root VT/5X obligation, without adding mandatory PT. Other existing Root inspections remain. | Root versus Final PT; which RT phases; does PT replace VT or satisfy a different obligation? |
| A08 | PR inactive | With access No on that signoff, PR makes no change; RT remains required. | Confirm the user's tentative guess. |
| A09 | PM | Final PT can satisfy the same obligation as Final MT; inspector explicitly chooses one. Existing independently required PT need not be repeated. | Any material or procedure restrictions on substitution? |
| A10 | FC | Final VT at 1X only; remove normal Final MT/PT/UT/RT. Root and Layer remain unchanged. | Does “only” override independently required RT/UT? Is 1X correct? |
| A11 | BJ | Same Final effect as FC. Presence of BJ establishes brazed/material applicability; no extra material predicate is guessed. Supplied material placeholder and OPTO remain literal. | Material list, OPTO meaning, extra applicability and VT magnification. |
| A12 | PU | Final PT on Final MT/PT and Final UT on Final UT/RT, with normal VT retained. User assumption (2026-10-26): Final RT and Final MT are not applicable when PU is present, so those routings offer UT only and PT only. Current code still retains RT and MT until the configuration move. | Confirm RT and MT are not required with PU. |
| A13 | SI | On Shop joints, ID VT with access Yes may satisfy Root RT or Final RT separately. Field/Unknown location retains RT; access No on the signoff requires RT. Normal VT remains its own obligation because ID scope is distinct. | Which phase, whether visibility is necessary, and whether one VT record may satisfy normal VT too. |
| A14 | RX | Require Root PT and Final RT; retain other normal requirements. Final RT uses the existing numeric degree, or 100 degrees if absent/NA. User assumption (2026-10-26): Root MT and Final UT are not applicable when RX is present, so those routings offer PT only and RT only. Current code still retains them. | Required Final RT coverage/degree; confirm MT/UT are not required with RX. |
| A15 | IA | Original assumption: Final only. Latest user provisional choice: Root, Layer and Final each get an IA obligation with its own signoff. Access Yes requires an explicit ID PT or MT; access No records "Attribute inspection not required" and leaves the baseline unchanged. Configuration-move leaning (2026-10-26): an existing PT/MT signoff in the phase covers IA when ID accessible = Yes; no separate routing. Follow up with the end users. | Confirm all-three-phase interpretation, method/material restrictions and inaccessible/unknown behavior; see independent-data follow-up above. |
| A16 | IR | ID PT or MT with access Yes may substitute for each Root/Final RT obligation. RT remains offered. Access No requires RT. | Phase and optional versus automatic substitution. |
| A17 | LR | Only an existing Layer PT obligation gains RT of at least 60 degrees as an alternative. It creates no inspection when Layer PT is absent. Each interim-layer cycle resets its choice and needs its own inspection; no RT is mandatory. | Confirm a separate substitute per layer and exact versus minimum 60-degree coverage. |
| A18 | GV | GTA-only Yes restricts Root to 5X and Final to VT at 1X. Layer requirements remain. Magnification is part of the required method/record label, not a separate editable measurement. | Does it remove Layer inspections? Is a measured magnification field needed? |
| A19 | RI | Final obligation satisfied by RT of at least 60 degrees or by ID PT with access Yes. Access No leaves RT60 as the valid method for this added obligation. Independent baseline inspections remain; a stricter existing RT also satisfies RI. Configuration-move leaning (2026-10-26): Final UT/RT offers RT (60+) or PT (ID); end users must confirm. | Phase, “and/or” semantics, accessibility and whether RI is intended to replace baseline RT. |
| A20 | BP | Separate Root 5X and Root PT or MT obligations; normal VT is replaced by 5X. Other Root methods remain. | Applicable PT versus MT selection rules and retained methods. |
| A21 | PT/MT | Offer explicit PT and MT alternatives unless a stricter baseline obligation already fixes one. Inspector selects the applicable Type; material suitability is not guessed. | Authoritative material/procedure eligibility. |
| A22 | Obligation completion | One method satisfies each alternative obligation. Distinct required methods need separate routing/signoff records. Identical requirements merge; a stricter singleton can satisfy a broader alternative. ID-scoped work does not merge into a generic inspection unless the obligation explicitly permits it. | Whether one record may satisfy additional overlapping obligations, and whether RI needs a deliberate “both” mode. |
| A23 | RT degree | Values are plain numeric degrees, consistent with the existing app. Enforce at least the resolved minimum, including LR/RI 60; preserve a higher independent baseline RT minimum. Alternatives such as PT do not require RT fields. | Confirm “60” is degrees and whether exactly 60 is intended. |
| A24 | Order | Within each phase use visual, surface, then volumetric owner groups; additional obligations sharing a group follow in deterministic order. No independent engineering order is inferred. | Required order and interaction with admin reordering. |
| A25 | Conflicts | Block all signoff/preview progression for explicit VT-only versus required nonvisual attributes, GV versus Root PT/MT, and PR versus RX RT. Slot order never selects a winner. Permitted alternatives alone do not create conflicts. | Confirm engineering precedence; demo blocking policy was selected by user. |
| A26 | Baseline | Start from the currently included/required NDT routings and their enabled Types. Apply attribute additions/removals afterward. Baseline method alternatives remain alternatives. Retain unaffected requirements. | How future custom admin inclusion/Type rules should constrain mandatory attribute additions. |
| A27 | Configuration | Attribute meanings are fixed, isolated functions for this demo. Existing templates own personas, reject/Then-go destinations and shared Type forms. “Has attribute code (any slot)” is available in routing conditions; no new attribute-rule admin screen. | Whether production meanings should become editable settings. |
| A28 | Regular/NQC | Use the indicator's regular or NQC template and configured persona for every added obligation; behavior is otherwise identical. | Attribute-specific nuclear exceptions. |
| A29 | Repairs | UNSAT follows existing configured rejection logic. Store the exact failed obligation ID and performed Type; Grind/Excavation return to that obligation. Preserve configured PT-to-5X Excavation exceptions and returning 5X availability. | Whether substitute eligibility changes on repairs or repeats. |
| A30 | Reset/Deprogress | Route-back, Cut and each Layer repeat rebuild blank choices from the same resolver. Deprogress restores the previous workflow snapshot and blanks unsigned values using the same obligation set. Earlier History remains. | No legacy-data migration needed for demo; confirm any future production policy separately. |
| A31 | Forward routing | Ordinary configured forward destinations cannot skip intervening unsigned attribute obligations. Deliberate Admin Routing Override retains its existing skip semantics. Final Weld selected on Layer retains the existing bypass of interim Layer inspections. | Should attributes constrain deliberate overrides or Final Weld-on-Layer behavior? |
| A32 | Additional signoffs | Automatic Additional Signoffs cannot complete attribute inspection obligations; require their own explicit performed inspection records. | Which automatic combinations, if any, are legitimately equivalent? |
| A33 | Display | Compact keyboard-focusable attribute badges in Joint Details expose exact supplied messages on hover/focus and accessible labels; expanded details retain code + full message. Raw Joint Details NDT source values remain visible; routing labels show resolved choices. | Preferred final presentation and whether to show a separate source-versus-effective summary. |
| A34 | Demo seeds | Ordinary random seeds retain informational codes. AC001 through AC013 isolate one progression code each, start fresh, alternate regular/NQC and use Shop and GTA-only Yes facts to exercise conditions; ID access is answered at each signoff. Baseline Root PT, Layer PT, Final MT and RT100 are illustrative. | These are examples, not real engineering records. |
| A35 | Persistence | Workflow version 2.10.62 resets demo caches. Obligation identity, allowed methods, scope and minimum degrees persist with stages; extra IDs retain their template owner. No migration of existing signed work. | None for this demo; source-system semantics remain open. |

## Moving attribute rules into admin configuration

Planned, not built. Attribute behavior should be configured in the admin tables (Routing Settings Included when, Signoff Types By Routing Enable when, Signoff Type Forms) instead of the fixed resolver in weld-record/attribute-codes/. Gaps are being reviewed with the user one at a time; no changes until reviewed.

| Gap | Need | Status |
|---|---|---|
| 1 | Shop/Field and GTA as condition facts (SI, GV). | Reviewed. GTA: recorded Weld Process (GTAW) per phase. Shop: Fabrication Location with Shipboard = No (Admin > Locations). Both extra joint fields are dropped. Routing and Type conditions must be able to read Weld Process and the Location's Shipboard flag. |
| 2 | Attribute-code matching across all four slots in Signoff Type Forms and Type Exceptions conditions. | No decision needed: "Has attribute code" matches any slot everywhere conditions are used. |
| 3 | A second inspection of the same kind in one phase. | PU reviewed: no new routing. PU includes Final MT/PT (PT only, MT not applicable) and Final UT/RT (UT only, RT not applicable). Planned seeds: Included when and Enable when conditions for PU, and the PU demo example adjusted to match. RX reviewed: same pattern (Root PT only, Final RT only). Probable default: a code's method replaces the other method on the same routing. BP: Root 5X replaces VT; Root MT/PT added with PT or MT; behavior when NDT Root already names MT or PT is waiting on the user's real data. IA: leaning toward the existing PT/MT signoff covering it (no new routing); follow up with end users. RI: leaning toward Final UT/RT offering RT (60+) or PT (ID); end users must confirm. Gap 3 conclusion so far: no code needs a second routing in a phase; inserted routings stay the fallback if BP, IA or RI answers require one. Inserted routings remain the candidate where two inspections are truly needed. |
| 4 | Configurable minimum RT degree (LR, RI, RX). | Reviewed 2026-10-26: Signoff Type Forms, RT form, gets ordered minimum-value rules on Degree of RT Performed (for example, when has code LR, at least 60). The current "at least the joint's RT Degree Root/Final" check becomes the default rule there, visible and editable. |
| 5 | Type valid only with a specific answer on the same signoff (ID accessible). | Reviewed 2026-10-26: Signoff Types By Routing Enable when can read the signoff's own answers, starting with ID accessible. On routings where a Type depends on it, ID accessible is asked above the Type picker; answering narrows the Type list, and changing it clears a Type no longer allowed. Open question: is asking ID accessible above Type the right layout? Accepted for now. |
| 6 | ID Types. | Reviewed 2026-10-26: no ID Types. ID means the joint can be accessed, recorded by the signoff's accessible answer (gap 5). Types stay plain PT, MT, VT and RT. Assumed for now: a "Not required" Type lets the inspector close a routing that a code makes unnecessary once accessible is answered (for example PR with access Yes on Root RT, IA with access No). Talking point: the alternative is asking accessible on an earlier signoff in the phase (such as Root VT) so the routing's Included when drops it, like Defer Tack; that needs no extra Type but moves the answer away from the inspection it affects. |
| 7 | Configurable conflict blocking with a message. | Not yet reviewed. |
| 8 | Forward-skip and Additional Signoffs guarantees: generic or dropped. | Not yet reviewed. |
| 9 | Remove the fixed resolver; seed all 13 codes as default configuration. | After gaps 1-8. |

## Verification and code ownership

- Messages and provisional identifiers: data/attribute-codes.ts; lookup descriptions: data/characteristics.ts.
- Applicability/conflicts: weld-record/attribute-codes/attribute-context.ts.
- Pure requirement resolution: weld-record/attribute-codes/inspection-requirements.ts.
- Stage construction: weld-record/attribute-codes/attribute-stages.ts, called by buildStages.
- Per-obligation validation: weld-record/attribute-codes/inspection-validation.ts, shared by UI validation and routeSignoff (including preview).
- Per-code, workflow and rendered message tests sit alongside these modules.
- Verified 2026-10-26: type-check clean, production build succeeds, full unit suite 554/554 passing. Not browser-verified.
