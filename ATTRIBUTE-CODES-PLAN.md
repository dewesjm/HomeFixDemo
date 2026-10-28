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
| Conflicts | User selected “Stop and explain the conflict.” | Chosen demo policy, recorded separately from the original proposal. Superseded for the configuration move by gap 7 (assume conflicts never occur). |
| Follow-up | Preserve assumptions/questions alongside user answers; avoid a large batch of questions. | Keep this register; ask one focused clarification at a time. |
| IA phase follow-up | User first tentatively suggested Root + Final if each has accessibility, asked about Layer, then said “I would assume it's for all 3.” | Latest provisional demo choice: Root, Layer and Final. Original Final-only assumption is retained below; this is not engineering confirmation. |
| Independent signoff data | User emphasized that every signoff must have completely separate data. | Type, result, inputs, signoff inputs, completion records and the ID access/visibility answer are independent per signoff. There is no joint-level access fact. |
| PU and Final RT / MT | 2026-10-26: when PU is present, Final RT and Final MT are not applicable; UT and PT are done instead. | Recorded as an assumption for the configuration move (A12). Not yet built: current code still retains RT and MT. |
| GV and GTA | 2026-10-26: user believes the Weld Process field will specify GTAW. | GV applies per phase from the recorded Weld Process: Root NDT when Root was GTAW, Final NDT when Final Weld was GTAW. Replaces the GTA-only joint field in the configuration move. Tentative ("I believe"). |
| SI and shop joints | 2026-10-26: a shop joint is any joint whose Fabrication Location is not a shipboard value; shipboard vs shop is the Shipboard column in Admin > Locations. | Replaces the Joint location category field in the configuration move. Conditions need a "Fabrication Location is shipboard" fact. |
| RX clashes | 2026-10-26: with RX, Root MT/PT offers PT only (MT not applicable) and Final UT/RT offers RT only (UT not applicable). | No new routing. User: the code's method replacing the other method on the same routing is "probably the default"; each remaining code is still reviewed one by one. |
| BP and an existing Root MT/PT | 2026-10-26: user is not sure a joint with BP would already have NDT Root MT or PT; likely BP appears where NDT Root is 5X and an MT or PT is also needed. User will check real data. | Open, no default chosen. BP's Root 5X (replacing VT) and adding Root MT/PT with PT and MT offered are not in question. |
| IA and an existing PT/MT | 2026-10-26: user leans toward one signoff covering both: the phase's existing PT/MT signoff answers ID accessible = Yes and counts for IA, with no new routing. The code is very vague. | Tentative; follow up with the end users. Where the phase has no MT/PT routing, IA adds one. |
| RI alternatives | 2026-10-26: user leans toward Final UT/RT offering RT (at least 60) or PT (with accessible = Yes), inspector picks, since PT of ID is effectively a substitute. Existing Final RT of 60 or more covers RI. | Tentative; end users must answer. Depends on gaps 4, 5 and 6. |
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
| A07 | PR phase | SUPERSEDED 2026-10-27, see Code-by-code review. Was: On each Root/Final UT/RT obligation, access Yes allows "Attribute inspection not required" in place of RT. Root PT (ID, access Yes) is allowed as an alternative to the normal Root VT/5X obligation, without adding mandatory PT. Other existing Root inspections remain. | Root versus Final PT; which RT phases; does PT replace VT or satisfy a different obligation? |
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
| A19 | RI | Final obligation satisfied by RT of at least 60 degrees or by ID PT with access Yes. Access No leaves RT60 as the valid method for this added obligation. Independent baseline inspections remain; a stricter existing RT also satisfies RI. Configuration-move leaning (2026-10-26): Final UT/RT offers RT (60+) or PT (with accessible = Yes); end users must confirm. | Phase, “and/or” semantics, accessibility and whether RI is intended to replace baseline RT. |
| A20 | BP | Separate Root 5X and Root PT or MT obligations; normal VT is replaced by 5X. Other Root methods remain. | Applicable PT versus MT selection rules and retained methods. |
| A21 | PT/MT | Offer explicit PT and MT alternatives unless a stricter baseline obligation already fixes one. Inspector selects the applicable Type; material suitability is not guessed. | Authoritative material/procedure eligibility. |
| A22 | Obligation completion | One method satisfies each alternative obligation. Distinct required methods need separate routing/signoff records. Identical requirements merge; a stricter singleton can satisfy a broader alternative. ID-scoped work does not merge into a generic inspection unless the obligation explicitly permits it. | Whether one record may satisfy additional overlapping obligations, and whether RI needs a deliberate “both” mode. |
| A23 | RT degree | Values are plain numeric degrees, consistent with the existing app. Enforce at least the resolved minimum, including LR/RI 60; preserve a higher independent baseline RT minimum. Alternatives such as PT do not require RT fields. | Confirm “60” is degrees and whether exactly 60 is intended. |
| A24 | Order | Within each phase use visual, surface, then volumetric owner groups; additional obligations sharing a group follow in deterministic order. No independent engineering order is inferred. | Required order and interaction with admin reordering. |
| A25 | Conflicts | Block all signoff/preview progression for explicit VT-only versus required nonvisual attributes, GV versus Root PT/MT, and PR versus RX RT. Slot order never selects a winner. Permitted alternatives alone do not create conflicts. Configuration move (2026-10-26): user assumes these combinations never occur; no conflict blocking is configured. | Confirm these combinations never occur; otherwise confirm precedence; demo blocking policy was selected by user. |
| A26 | Baseline | Start from the currently included/required NDT routings and their enabled Types. Apply attribute additions/removals afterward. Baseline method alternatives remain alternatives. Retain unaffected requirements. | How future custom admin inclusion/Type rules should constrain mandatory attribute additions. |
| A27 | Configuration | Attribute meanings are fixed, isolated functions for this demo. Existing templates own personas, reject/Then-go destinations and shared Type forms. “Has attribute code (any slot)” is available in routing conditions; no new attribute-rule admin screen. | Whether production meanings should become editable settings. |
| A28 | Regular/NQC | Use the indicator's regular or NQC template and configured persona for every added obligation; behavior is otherwise identical. | Attribute-specific nuclear exceptions. |
| A29 | Repairs | UNSAT follows existing configured rejection logic. Store the exact failed obligation ID and performed Type; Grind/Excavation return to that obligation. Preserve configured PT-to-5X Excavation exceptions and returning 5X availability. | Whether substitute eligibility changes on repairs or repeats. |
| A30 | Reset/Deprogress | Route-back, Cut and each Layer repeat rebuild blank choices from the same resolver. Deprogress restores the previous workflow snapshot and blanks unsigned values using the same obligation set. Earlier History remains. | No legacy-data migration needed for demo; confirm any future production policy separately. |
| A31 | Forward routing | Ordinary configured forward destinations cannot skip intervening unsigned attribute obligations. Deliberate Admin Routing Override retains its existing skip semantics. Final Weld selected on Layer retains the existing bypass of interim Layer inspections. | Should attributes constrain deliberate overrides or Final Weld-on-Layer behavior? |
| A32 | Additional signoffs | Automatic Additional Signoffs cannot complete attribute inspection obligations; require their own explicit performed inspection records. | Which automatic combinations, if any, are legitimately equivalent? |
| A33 | Display | Compact keyboard-focusable attribute badges in Joint Details expose exact supplied messages on hover/focus and accessible labels; expanded details retain code + full message. Raw Joint Details NDT source values remain visible; routing labels show resolved choices. | Preferred final presentation and whether to show a separate source-versus-effective summary. |
| A34 | Demo seeds | Ordinary random seeds in Weld Record and Weld Planning use informational codes only, so no seeded joint has conflicting progression codes. AC001 through AC013 isolate one progression code each, start fresh, alternate regular/NQC and use Shop and GTA-only Yes facts to exercise conditions; ID access is answered at each signoff. Baseline Root PT, Layer PT, Final MT and RT100 are illustrative. | These are examples, not real engineering records. |
| A35 | Persistence | Workflow version 2.10.62 resets demo caches. Obligation identity, allowed methods, scope and minimum degrees persist with stages; extra IDs retain their template owner. No migration of existing signed work. | None for this demo; source-system semantics remain open. |

## Moving attribute rules into admin configuration

Built 2026-10-27 as Option B (see "Built: Attribute Code Exceptions" below). The review notes in this section are kept for reference.

**Decided 2026-10-27: a separate Attribute Code Exceptions admin table (Option B), not clauses in the main tables.** One row per code and routing, applied after the normal routing is built, with five effect kinds: add a routing, drop a routing, change the Types a routing offers, a Type allowed only with ID accessible Yes/No on that signoff, and a minimum RT degree. Routing Settings, Signoff Types By Routing and Signoff Type Forms keep their rules and data; the only additions there are a possible read-only cross-reference note and a "Fabrication Location is shipboard" condition choice. The user may revisit clauses in the main tables (Option A) after seeing it. Answered 2026-10-27: (1) the joint's RT degree check (at least RT Degree Root/Final) becomes a visible, editable default rule on the RT form in Signoff Type Forms, and an RT signoff must meet the highest of that and any applicable code minimum; (2) RX sets no minimum by default (the earlier 100 was a demo assumption, A14), but its exceptions row has a configurable Minimum RT; (3) a read-only cross-reference note on Routing Settings and Signoff Types By Routing rows lists the codes that change each routing and links to the exceptions table. Layer has no RT/UT routing (removed 0140eee); LR's RT is a Type on Layer MT/PT. Gap answers below still hold for what each code does; where they name a main-table location (gap 4 RT form rules, gap 5 Enable when), that location moves to the exceptions table.

| Gap | Need | Status |
|---|---|---|
| 1 | Shop/Field and GTA as condition facts (SI, GV). | Reviewed. GTA: recorded Weld Process (GTAW) per phase. Shop: Fabrication Location with Shipboard = No (Admin > Locations). Both extra joint fields are dropped. Routing and Type conditions must be able to read Weld Process and the Location's Shipboard flag. |
| 2 | Attribute-code matching across all four slots in Signoff Type Forms and Type Exceptions conditions. | No decision needed: "Has attribute code" matches any slot everywhere conditions are used. |
| 3 | A second inspection of the same kind in one phase. | PU reviewed: no new routing. PU includes Final MT/PT (PT only, MT not applicable) and Final UT/RT (UT only, RT not applicable). Planned seeds: Included when and Enable when conditions for PU, and the PU demo example adjusted to match. RX reviewed: same pattern (Root PT only, Final RT only). Probable default: a code's method replaces the other method on the same routing. BP: Root 5X replaces VT; Root MT/PT added with PT or MT; behavior when NDT Root already names MT or PT is waiting on the user's real data. IA: leaning toward the existing PT/MT signoff covering it (no new routing); follow up with end users. RI: leaning toward Final UT/RT offering RT (60+) or PT (with accessible = Yes); end users must confirm. Gap 3 conclusion so far: no code needs a second routing in a phase; inserted routings stay the fallback if BP, IA or RI answers require one. |
| 4 | Configurable minimum RT degree (LR, RI, RX). | Reviewed 2026-10-26: Signoff Type Forms, RT form, gets ordered minimum-value rules on Degree of RT Performed (for example, when has code LR, at least 60). The current "at least the joint's RT Degree Root/Final" check becomes the default rule there, visible and editable. |
| 5 | Type valid only with a specific answer on the same signoff (ID accessible). | Reviewed 2026-10-26: Signoff Types By Routing Enable when can read the signoff's own answers, starting with ID accessible. On routings where a Type depends on it, ID accessible is asked above the Type picker; answering narrows the Type list, and changing it clears a Type no longer allowed. Open question: is asking ID accessible above Type the right layout? Accepted for now. |
| 6 | ID Types. | Reviewed 2026-10-26: no ID Types. ID means the joint can be accessed, recorded by the signoff's accessible answer (gap 5). Types stay plain PT, MT, VT and RT. Assumed for now: a "Not required" Type lets the inspector close a routing that a code makes unnecessary once accessible is answered (for example PR with access Yes on Root RT, IA with access No). Talking point for end users: how is it supposed to work when the accessible answer makes an inspection unnecessary? Asking accessible on an earlier signoff so the routing drops off (like Defer Tack) was considered and is probably not the way to go. |
| 7 | Configurable conflict blocking with a message. | Reviewed 2026-10-26: assumption that conflicting codes (for example FC or BJ with PU, RX or RI) never appear together on a joint, so no conflict-blocking configuration is built. Supersedes the earlier "stop and explain" choice for the configuration move. To confirm with end users. |
| 8 | Forward-skip and Additional Signoffs guarantees. | Reviewed 2026-10-26: dropped. Attribute-driven routings behave like every other routing; configured Then go to and Additional Signoffs rules decide. |
| 9 | Remove the fixed resolver; seed all 13 codes as default configuration. | Done 2026-10-27: Attribute Code Exceptions seeds. |

## Configuration review: questions and answers (2026-10-26)

Each question asked while reviewing the gaps above, with the options offered and the user's answer.

1. **Gap 3, how to add a second inspection of the same kind in a phase:** (A) inserted routings added by a Then go to rule, or (B) numbered routings with a new Phase setting. User asked whether PU even needs one, since PT and UT are already separate routings. Answer: PU needs no new routing; it is Included when on Final MT/PT and Final UT/RT with Types restricted. A/B was not chosen; inserted routings stay the fallback.
2. **PU when the joint already has Final RT:** (1) UT only, RT not applicable; (2) inspector picks UT or RT; (3) both, needing a second routing. Answer: 1. Adjust seed data to match.
3. **GV, how to know a joint is a GTA weld:** (1) recorded Weld Process on Root/Final Weld, per phase; (2) a GTA-only field on the joint. Answer: the Weld Process field will specify GTAW (option 1, tentative).
4. **SI, how to know a joint is a shop joint:** (1) Shop/Field value on the joint; (2) derive from recorded data; (3) ask on the signoff. Answer: derive it: a shop joint's Fabrication Location is not a shipboard value (Shipboard column, Admin > Locations).
5. **PU when NDT Final Weld is MT:** (1) PT only, MT not applicable; (2) inspector picks; (3) both. Answer: 1.
6. **RX when NDT Root is MT or NDT Final Weld is UT:** (1) code's method replaces the other; (2) inspector picks; (3) both. Also: make (1) the general rule? Answer: 1 for RX, and probably the default, but review each code one by one.
7. **BP when NDT Root already names MT or PT:** (1) keep the joint's method; (2) inspector picks PT or MT. Answer: unsure the situation is real (likely NDT Root is 5X); user will check real data. Open.
8. **IA when the phase already has a PT/MT:** (1) one signoff covers both; (2) separate signoffs. Answer: leans 1; very vague, follow up with end users.
9. **RI when the joint has no Final RT:** (1) RT only; (2) RT (60+) or PT on Final UT/RT, inspector picks; (3) leave open. Answer: leans 2 since PT is effectively a substitute; end users must answer.
10. **Gap 4, where minimum RT degree lives:** (1) Signoff Type Forms RT form, minimum-value rules; (2) Signoff Types By Routing. Answer: 1.
11. **Gap 5, a Type valid only with an answer on the same signoff:** (1) Signoff Type Forms "must be" rule; (2) Enable when reads the signoff's own answers. Answer: 2. Follow-up, is asking accessible above Type acceptable? Answer: for now yes; document as an open question.
12. **Gap 6, separate ID Types:** (1) PT/MT/VT (ID) Types; (2) plain Types plus the accessible answer. Answer: ID just means the joint can be accessed; no ID Types.
13. **Not required Type, or ask accessible earlier so the routing drops off:** Answer: assume a Not required Type for now. Talking point: how is it supposed to work? The earlier-signoff alternative is probably not the way to go.
14. **Gap 7, conflicting codes:** (1) Blocked when rules per routing; (2) one list of conflicting pairs. Answer: neither; assume no such scenario exists, document it and confirm.
15. **Gap 8, attribute-only protections (forward rules can't skip, Additional Signoffs can't sign):** (1) drop them; (2) apply to all routings. Answer: 1; that hard-coding should not exist in the first place.

## Code-by-code review (started 2026-10-27, NEXT TASK)

Go through every code, work out together what we think it means (reading the message, real joint data and how the routing works), then take the open points back to the end users to confirm. Record each conclusion here and change its seeded rows to match.

| Code | Status | Conclusion |
|---|---|---|
| PR | Concluded 2026-10-27 (to confirm with end users) | "PT ROOT IF ID-VT / NO RT": root means the weld's root (inside surface), not the Root routing. Real PR joints all have NDT Final = PT and RT Final = 60. Final MT/PT with "ID is accessible" Yes means Final RT/UT is not required (it drops off); No means Final RT/UT applies as normal. Root is not affected by PR. ID accessible is required on Final MT/PT for PR joints. |
| IA | Partly discussed 2026-10-27 | "PT/MT ID IF ACCESS": PT/MT is done either way; accessible Yes = PT/MT of the ID, No = PT/MT done normally. ID accessible is required on the added MT/PT, to record which. No "not required" outcome. Phases (Root, Layer, Final) and the existing-MT/PT case still to review. 2026-10-28: real IA joints have RT Root = NA, RT Final = 60, 360 or NA, NDT Root mostly 5X (a couple NA), NDT Final always MT or PT. So the current rows add a Root MT/PT the data does not call for, and never ask ID accessible on the existing Final MT/PT. Left unchanged until end users answer (user). |
| PM | Concluded 2026-10-27 (to confirm with end users) | "FINAL PT MAY BE SUBSTITUTED FOR MT": NDT Final = MT, but PT may be done instead. Final MT/PT offers PT as well as MT; the inspector signs one, never both. No effect when NDT Final is already PT or MT/PT, and never adds a Final MT/PT routing. Seed already matched. |
| FC | Concluded 2026-10-27 (to confirm with end users) | "FINAL PT NOT REQUIRED "VT" ONLY ON FINAL": real FC joints have a mix of PT and VT in NDT Final. Even when NDT Final = PT, only Final VT is required: Final MT/PT drops, Final VT/5X is added if missing and offers VT only. Final RT/UT also drops (reading "only" as nothing else on Final). Seed already matched. |
| BJ | Concluded 2026-10-28 (to confirm with end users) | "[material type] BRAZED JOINT (OPTO) "VT" ONLY ON FINAL": same as FC. Final VT is required (Final VT/5X added if missing, VT only); every other Final inspection is disallowed and drops (Final MT/PT, Final RT/UT). Root and Layer unchanged. Not used in real data, but kept: the app may need to handle unused codes anyway (user). Seed already matched. |
| SI | Discussed 2026-10-28, open (to ask end users) | "SHOP JTS ONLY-ID INSP-LIEU RT": real SI joints all have RT Final = 60 and NDT Final = PT, which suggests Final but is not conclusive. Current seed unchanged: on shop joints (Fabrication Location not shipboard) with that phase's RT Degree set, Root and Final UT/RT each offer VT as an extra Type, needing ID accessible Yes; RT stays available. |
| IR | Discussed 2026-10-28, open (to ask end users) | "PT/MT ID IN LIEU OF RT IF ACCESSIBLE": real IR joints have NDT Final pretty much always PT. Current seed unchanged: Root and Final UT/RT (when that phase's RT Degree is set) offer PT and MT next to RT/UT; PT/MT can be signed only with ID accessible Yes, No leaves RT. Whether a second PT happens (Final MT/PT then PT again at UT/RT) is settled by whether PT is selectable at UT/RT (user). |
| LR | Concluded 2026-10-28 (to confirm with end users) | "ALLOW 60 DEG RT IN LIEU OF INTERMEDIATE LAYER PT": RT is allowed as a substitute in Layer NDT MT/PT and requires 60 degrees or higher (user's notes). Not used in real data. Seed already matched: Layer MT/PT offers RT next to PT when NDT Each Layer is PT or MT/PT, RT minimum 60, each layer chosen separately. |
| GV | Discussed 2026-10-28, open (to ask end users) | "GTA WELDS:VT ONLY ROOT & FINAL (5XROOT/1XFINAL)": user's reading: GTAW process; only 5X allowed on Root NDT, only VT on Final NDT. Real GV joints: no Each Layer inspection, NDT Final always PT, NDT Root usually 5X, sometimes NA. Current seed unchanged: each phase checks its own Weld Process (Root Weld / Final Weld GTAW); Root VT/5X added if missing offering 5X only, Final VT/5X added if missing offering VT only; Root and Final MT/PT and UT/RT drop regardless of NDT settings (so the data's Final PT drops); Layer untouched. User is fairly confident GV does override the NDT settings (2026-10-28). |
| PU | Concluded 2026-10-28 (to confirm with end users) | "PT & UT REQUIRED ON FINAL": Final PT and Final UT are both required. Final MT/PT is added if missing and offers PT only; Final UT/RT is added if missing and offers UT only, so MT and RT are dropped and disallowed even when the joint data calls for them (end users to confirm). Final VT unchanged; PT before UT by normal routing order. Not used in real data. Seed already matched. |
| RX | Concluded 2026-10-28 (to confirm with end users) | "ROOT PT AND FINAL XRAY REQD": Root PT and Final RT are inserted regardless of NDT settings. Root MT/PT is added if missing and offers PT only; Final UT/RT is added if missing and offers RT only, so Root MT and Final UT are dropped and disallowed (end users to confirm). No Final RT degree minimum (end users to say what is required). Not used in real data. Seed already matched. |
| RI | Discussed 2026-10-28, open (to ask end users) | "60 RT AND/OR PT OF ID REQUIRED": user's data: NDT Final always PT, RT Final always 60 or NA, RT Root always NA or 60, NDT Root 5X. Current seed unchanged: Final UT/RT added if missing, offering only RT (60 or higher) and PT (needs ID accessible Yes), inspector signs one; Final MT/PT unchanged, so a joint with NDT Final PT could get a second PT. "And" would need two signoffs, since one signoff moves the routing on; where RT Final = 60 the joint already has Final MT/PT (PT) and Final UT/RT (RT 60). PT signoff only accepting ID accessible Yes is acceptable (user). User leans toward option B (2026-10-28), no code change for now: like PR, Final MT/PT asks ID accessible; Yes skips Final UT/RT, No requires Final UT/RT as RT 60 or higher (added if RT Final is NA). Option A is the current seed (choice at Final UT/RT, risks a second PT). Used in real data (user 2026-10-28, correcting the 2026-10-27 unused list). |
| BP | Concluded 2026-10-28 (to confirm with end users) | "BOTH 5X AND PT/MT ROOT REQ'D": not used in real data. User's reading: 5X is required, VT disallowed; Root PT/MT is inserted regardless of NDT settings. Seed already matched (Root VT/5X added if missing, 5X only; Root MT/PT added if missing, offering PT and MT). No code change. |

### Questions to take to end users

The user runs these down later. Add to this list as each code is reviewed.

- **PR:** confirm the whole reading above (Final MT/PT with ID accessible Yes waives Final RT/UT; Root not affected).
- **IA:** Is accessible is only a question on PT/MT, so I'm not sure what this means? If they answer no its not accessible is that just the only requirement for the signoff? Do they still have to signoff? Do any other inspections get affected?
- **PM:** any limits on when PT may stand in for MT (material, procedure), or can PT always be used on a PM joint?
- **FC:** does "VT only on Final" also waive Final RT/UT when the joint calls for them, or only the PT? Check whether any FC joints have RT Final set (not NA) or UT.
- **BJ:** what [material type] stands for and what OPTO means; does brazing change anything outside Final (Root, Layer), or do brazed joints follow the welding routings at all?
- **PU:** PT and UT are required, are MT/RT dropped and disallowed if normally required by data?
- **SI:** If it's a shop location, a VT is substitutable for RT? Is this for root, final, or both? Is it just a normal VT? Does the routing still go to VT/5X to NDT UT/RT and then VT is selectable there?
- **RX:** Root PT and Final RT are inserted regardless of NDT settings. What Final RT degree is required? Does this drop and disallow root mt and final UT if they exist?
- **IR:** If this code exists, then in NDT UT/RT they can select PT or MT? And it will force yes in the is accessible field? Is this for final only?
- **GV:** Is this referring to GTAW process type? Only 5X is allowed on root NDT, only VT is allowed final NDT. Does that mean no MT/PT/RT/UT regardless of the NDT settings? Assuming layer has no inspection? Data suggests no each layer inspection, PT is always NDT final value (so is there no PT because of the attribute code?) NDT root is usually 5x, sometimes NA. The code overrides this?
- **RI:** Is this on root? Final? How are we supposed to account for and/or? Routing will progress on signoff how would we do an OR, the system either skips RT or doesn't, right? Force yes if PT is selected, have RT available as option accepting 60+? Can autoskip if ID is accessible on PT
- **BP:** confirm the reading above (Root 5X required and VT disallowed; Root PT/MT inserted regardless of NDT settings).
- **LR:** confirm the reading above (RT of 60 degrees or higher may be signed instead of PT in Layer NDT MT/PT).

Note: the two-letter codes are made-up placeholders. The user recognises codes by their message text, so name a code by its message when discussing it.

### Codes not used (found 2026-10-27; kept, user 2026-10-28)

The user found these are not used at all in the real data (RI was listed too, but the user confirmed 2026-10-28 that it IS used):

- BJ: [material type] BRAZED JOINT (OPTO) "VT" ONLY ON FINAL (its rows duplicated FC's, which IS used)
- PU: PT & UT REQUIRED ON FINAL
- RX: ROOT PT AND FINAL XRAY REQD
- BP: BOTH 5X AND PT/MT ROOT REQ'D
- LR: ALLOW 60 DEG RT IN LIEU OF INTERMEDIATE LAYER PT (found 2026-10-28; the minimum RT effect below is still used by RI)

Review (no changes made): removing them does not simplify the Attribute Code Exceptions machinery. Every effect they use (add/drop routing, Only/Add Types, Type needs ID accessible, minimum RT) is still used by a code in use (IA and GV add and drop, PM/SI/IR/LR add Types, SI/IR use ID accessible rules, LR minimum RT). It does remove open questions: RI's RT and/or PT either-or with 60 minimum, PU's and RX's "MT/UT not applicable" assumptions, BP's 5X plus MT/PT, and BJ's duplicate of FC. It leaves a cleaner pattern: the codes in use mostly waive or swap an inspection (PR, SI, IR replace RT; PM PT for MT; LR RT for Layer PT; FC and GV VT only); IA is the only one that adds one. Removing would mean 20 seeded rows (10 plus NQC copies), their demo jobs among AC001-AC013, and probably their entries in the attribute code list.


The "Attribute inspection not required" Type was removed 2026-10-27: with these readings no code leaves a routing with nothing to inspect.

## Built: Attribute Code Exceptions (2026-10-27)

The fixed resolver is gone; Admin > Attribute Code Exceptions holds all 13 codes as seeded rows (ROUTING.md lists them). Choices made while building that the user has not reviewed:

- **IA** rows add Root, Layer and Final MT/PT only where the joint's NDT Root / Each Layer / Final Weld has no MT or PT, offering PT, MT or "Attribute inspection not required" (that one needs ID accessible No). A joint that already has MT/PT in the phase is unchanged (its PT/MT signoff covers IA, per the leaning).
- **IA and Layer**: because IA can add Layer MT/PT, two seeded Then go to rules in Routing Settings gained "Has attribute code (any slot) is not IA": Layer's (Interim Layer + blank NDT Each Layer -> Layer) and Layer VT/5X's (regular and NQC). Without it the joint would loop back to Layer before reaching the added Layer MT/PT.
- **PR**: on Root and Final RT/UT only when that phase's RT Degree is set (not blank or NA); RT needs ID accessible No and "not required" needs Yes (the previous demo behavior). Root VT/5X adds PT needing Yes.
- **SI**: Applies when Fabrication Location is shipboard is No AND that phase's RT Degree is set; VT needs Yes.
- **IR**: only when that phase's RT Degree is set.
- **LR**: only when NDT Each Layer is PT or MT/PT.
- **BP**: Root MT/PT is added and offers PT and MT on top of what it had (open question 7 is still open; this is inspector-picks).
- **GV**: VT 1X / 5X magnification labels are gone; GV rows read the Root and Final Weld's recorded Weld Process (GTAW).
- **FC/BJ** Final VT and **RI** Final RT minimum 60 as before; RX has no minimum (decision 2).
- **Added NQC-split routings** go on as the NQC or regular row whose Included when N Ind. clauses match the joint (regular when neither does).
- **NQC rows:** a regular routing and its NQC row are separate entries in the table, edited separately (user decision 2026-10-27; no use case yet, may come later). Every seed on an NQC-split routing has an NQC copy reading the NQC rows' answers.
- **NQC rows:** a table row covers the regular routing and its NQC row by default. Its NQC rows setting can limit it to the regular row only or the NQC row only (added 2026-10-27 at the user's request, so the pair can be separated if needed). All seeds cover both.
- **"Fabrication Location is shipboard"** is offered only in the exceptions table's Applies when, not in the other tables' condition pickers (it needs the Fabrication values, which those rules don't read).
- **Joint location category** and **GTA-only weld** joint fields are removed (gap 1), along with the Joint Details conflict and "current requirements retained" notes (gap 7).

## Verification and code ownership

- Table, seeds and storage: weld-record/attribute-codes/attribute-code-exceptions.ts; admin page: weld-record/admin/admin-attribute-code-exceptions/.
- Effects on a joint (build, re-check as answers come in, Type narrowing): weld-record/attribute-codes/exception-effects.ts; ID accessible check: attribute-validation.ts.
- RT minimum (RT form rule + code minimum): weld-record/signoff-definition/rt-degree-minimum.ts.
- Messages and provisional identifiers: data/attribute-codes.ts; lookup descriptions: data/characteristics.ts.
- Verified 2026-10-27: type-check clean, production build succeeds, unit suite 539/539. Headless browser: the new page, its edit mode, the notes on Routing Settings (14 routings) and Signoff Types By Routing, and AC001 (PR) at Root NDT RT/UT showing ID accessible above Type and narrowing the Types. Not clicked through by hand.
