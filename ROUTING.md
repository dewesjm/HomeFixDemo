# Weld Record routing rules

This is the plain-language version of how a Welding joint moves through its routing and what has to be filled in at each step. It describes how the demo behaves today. The code references are in [ARCHITECTURE.md](ARCHITECTURE.md).

Last updated 2026-10-06.

## How routing works

- A joint's routing is an ordered list of steps. The **current routing** is the first required step that isn't signed off yet.
- Steps are signed in order. A step can't be signed until every required step before it is signed.
- Each step is signed by one role (Fitting, Welding, Foreman, Inspector and so on). Inspection steps go to the **NQC Inspector** instead of the Inspector when the joint's Nuclear Indicator is 1 or 2.
- **Nothing is ever unsigned or reopened** (user's rule, 2026-09-25). When something sends the joint back (a failed inspection, a Repair choice, a Cut), the **current routing is set back** to that step and the joint proceeds along the path as normal from there: every step from that point on comes up blank and is signed again as a new signoff. Earlier signoffs stay exactly as they were in the records and History. This applies to every current and future "goes back to" rule unless it says otherwise. Going back to Fit or earlier also blanks the fit-up (fabrication) data. Work History gets one row, "<Step> — Routed back to <step>", which keeps the fit-up data it blanked.
- Every signoff is kept as a record, including ones on steps the joint later went back past, or reversed by Deprogress. Nothing is deleted.
- **Deprogress** (Work History) reverses the joint's most recent signoff and **everything that signoff did**: a Repair it added, Repair #, a route-back, a Cut (earlier signoffs, fit-up data and Refit # come back), Defer Tack and so on. The deprogressed step and every step after it come up blank. A comment is required. There is no "reopen": the only way back is Deprogress or a route-back.
- **Admin > Routing Override** changes a joint's current routing to any step. Nothing is marked signed. Going back works like any route-back (that step and every step after it come up blank). Going forward only moves the current routing: the steps before it stay as they are (unsigned ones are simply passed), and the joint carries on from the new step. The joint is found by typing its Hull, Drawing and Joint exactly, and a Reason for change is required; the Routing History entry records it.
- **Admin > Routing Settings** sets, per step: its order, when a joint gets it ("Included when"), where an UNSAT goes ("Reject routes to", plus reject rules), who signs it, and **Fabrication editable**. A condition compares a field with "is", "is not" or "contains" (typed text, any case). The fields are every Joint Details field and every earlier step's own answers (for example Root NDT VT/5X's Weld Color); a reject rule can also use the rejected step's own answers. Fields with a fixed list offer checkboxes; the others take a typed value. An earlier step's answer is blank until that step is signed, so a step that depends on one is always on the joint and turns on or off as it's signed.
- **Repeatable Types** (Admin > Signoff Type Availability): a step's Type option can be repeatable. Signing with it records the signoff and History, but does nothing to the routing: the step stays unsigned and current, on the same routing bar step. Each option says whether the next signoff keeps the values or starts blank. Built in: Interim Layer (keeps values) and Weld Build-Up (starts blank). Signing with a Type that isn't repeatable completes the step.
- **Fabrication editable**: the Fabrication fields can be changed while the current step has it checked. Built in, that's Prep through Fit-Up Insp, so the fields lock once Fit-Up Insp is signed. A change applies straight away, including to joints already in progress. Repair and Excavation NDT steps, and a finished joint, always lock them. Correct does not change Fabrication fields.

## The path

| # | Step | Signed by | Included when | What happens on signoff |
|---|---|---|---|---|
| 1 | Pre-Fit | NQC Inspector | Nuclear Indicator is 1 or 2, or the joint design calls for a consumable insert or backing ring | Moves on to Fit |
| 2 | Fit | Fitting | Always | Type is **Fit** or **Weld Build-Up**. **Weld Build-Up** is repeatable: it's recorded, Fit stays the current routing and comes up blank for the next one. **Fit** moves on to Tack. If **Defer Tack** is checked, Tack is skipped and Deferred Tack is added after Fit-Up Release |
| 3 | Tack | Welding | Unless Defer Tack was checked at Fit | Moves on to Fit-Up Insp |
| 4 | Fit-Up Insp | Foreman or Inspector | Always | **SAT**: moves on. **UNSAT**: back to Fit (Fit, Tack and Fit-Up Insp come up blank, and so does the fit-up data). If **Release to welding** is unchecked, Fit-Up Release becomes required |
| 5 | Fit-Up Release | Foreman | Only when Fit-Up Insp didn't release to welding | Moves on |
| 6 | Deferred Tack | Welding | Only when Defer Tack was checked at Fit | Same form as Tack |
| 7 | Root | Welding | Always | Moves on to Root NDT |
| 8 | Root NDT | Inspector | Always (see the NDT chart) | See "When an NDT step fails" |
| 9 | Layer | Welding | Always | **Interim Layer** is repeatable: recorded, but the joint stays on Layer with its values kept. **Final Layer**: moves on to Layer NDT |
| 10 | Layer NDT | Inspector | Always (see the NDT chart) | See "When an NDT step fails" |
| 11 | Final Weld | Welding | Always | Moves on to Final NDT |
| 12 | Final NDT | Inspector | Always (see the NDT chart) | See "When an NDT step fails" |
| 13 | Records Review | O63 Records or O04 Records | Always. **O63** when the joint has SFFF, DSS-AAA or SS data; **O04** otherwise | **SAT**: moves on to Sold. **UNSAT**: recorded, but the joint stays in Records Review (what UNSAT should do is not decided yet) |
| 14 | Sold | Same Records group as step 13 | Always | The joint is closed. Everything locks; only Deprogress can reverse it |

A Repair step (and sometimes an Excavation NDT step) is added to the path whenever an NDT step fails. See below.

## NDT steps

Each phase (Root, Layer, Final) gets its NDT steps from the joint's **Joint Details** values:

| Phase | NDT value | RT degree |
|---|---|---|
| Root | NDT Root | RT Root |
| Layer | NDT Each | (none) |
| Final | NDT Final | RT Final |

**VT is always required, unless 5X is required instead.** The NDT value can add one more step:

| NDT value | Steps, in order |
|---|---|
| VT | VT |
| 5X | 5X (instead of VT) |
| MT | VT, then MT/PT offering only MT |
| PT | VT, then MT/PT offering only PT |
| MT/PT | VT, then MT/PT with the inspector choosing MT or PT |
| UT | VT, then RT/UT offering only UT |

- **RT:** a degree in RT Root or RT Final (10, 100, 360, 60 or 75) adds a RT/UT step offering only RT for that phase, after the others. Blank or NA adds nothing. A joint never has UT and an RT degree for the same phase.
- **Type is never pre-filled:** every inspection step's Type starts on "Select the inspection performed…", even when only one method is offered, so the inspector always picks what was performed.
- **Valid values:** NDT Root, NDT Each and NDT Final take 5X, MT, MT/PT, PT, UT or VT. Blank and NA are not valid. RT Root and RT Final take blank, 10, 100, 360, 60, 75 or NA.
- **The general NDT field** in Joint Details doesn't affect routing.
- **Root 5X question:** when NDT Root is 5X, the Root step asks "Did you perform 5X inspection and was it successful?". Answering yes signs the Root 5X step automatically when Root itself is signed.

## When an NDT step fails

**Any NDT step that comes back UNSAT adds a new Repair step right after it.** There is no limit on the number of repairs.

- Each repair is its own step: Repair, then Repair 2, Repair 3 and so on. Earlier repairs stay as signed records.
- **Repair #** goes up by one with each new Repair.
- Repair is signed by the **Foreman**.
- **Routing bar:** a repair shows as one plain **Repair** dot right after the NDT step that failed (plus **Excavation NDT** after a Weld Repair) only while it is open. Once it's resolved (Grind Only, Cut, thickness exceeded, or Excavation NDT passing) both dots go away. A failed Excavation NDT brings the Repair dot back. History keeps the round numbers (Repair 2, Repair 3).

When the Repair step is signed, where the joint goes depends on what was chosen:

| Choice on the Repair step | Where the joint goes |
|---|---|
| **Allowable thickness exceeded** (checked) | Back to that phase's RT/UT step. This wins over the Repair Code. The checkbox only shows when that phase has a RT/UT step |
| **Grind Only** | Back to the NDT step that failed |
| **Weld Repair** | An **Excavation NDT** step is added right after the Repair (see below) |
| **Cut** | The joint starts over from Fit (see below) |

**Allowable Thickness** is shown on the Repair step: 3/8" when the Nuclear Indicator is 1, and 3/16" when it's 2 or 3.

### Excavation NDT (after a Weld Repair)

- It requires **the same inspection that failed**. For example, if PT failed, Excavation NDT offers only PT.
- **Exception:** if PT failed and Material Type 1 or 2 is non-ferrous or austenitic (Admin > Material Classification), Excavation NDT is **5X instead of PT**.
- **UNSAT:** back to its own Repair step, which comes up blank. No new Repair is added. The same Excavation NDT comes back when the Repair is signed as Weld Repair again.
- **SAT:** back to the NDT step that originally failed. With the PT exception above, it goes to that phase's VT/5X step instead, with **5X allowed** (normally that step offers only VT).

### Cut

A Cut means the joint is redone from scratch:

- The current routing goes back to **Fit**, and every step from Fit onward starts fresh, as on a new joint.
- All earlier signoffs stay in the records and History. Earlier Repair steps stay as signed records.
- **Refit #** goes up by one. Work History gets a row reading "Cut — routed back to Fit", with the new Refit number.
- Fit-up (fabrication) data is reset to blank. The Refit row in Work History keeps what it was ("Fabrication before the Cut").

## What's required to sign each step

Required fields are marked with a red `*`. Signoff is always clickable: a failed attempt highlights everything still missing.

**Pre-Fit and Fit**
- **Consumable insert:** Type and Size when the joint design calls for one. The MIC too when MCL 1 or MCL 2 is **MC-I**.
- **Backing ring:** Type when the joint design calls for one. The MIC too when MCL 1 or MCL 2 is MC-I.
- **Fit only, fit-up data:** Location, Drawing Rev and Actual Thickness. Some Locations add more location fields (Deck, Frame, P/S/CL, Usage). MIC 1 and MIC 2 are needed only when that member's MCL is MC-I.

**Fit as Weld Build up**
- The weld fields below, plus at least one **Affected Item**.
- **MIC verified** for each affected item whose MCL is MC-I.

**Weld steps (Tack, Deferred Tack, Root, Layer, Final Weld)**
- GWP and WTN. These (and Filler Metal Type and Size) are filled in for you, standing in for an external system that has already checked them, and can't be changed. Weld Process, the PH/IP limits and any override limits fill in from the WTN.
- **Engineering override:** on some joints (about 1 in 4 in the demo) the external system sends nothing. There, GWP, WTN, Weld Process, PH/IP Min/Max and Filler Metal Type/Size start blank and are typed in by hand (Weld Process is still a droplist). A PH/IP requirement takes a number or NC; NC makes its Actual NC and locked, just like an NC from the WTN.
  - The first value typed asks for a reason ("Give the reason for this engineering override. It is recorded against every value set on this step."); Cancel takes the value back out.
  - Engineering doesn't sign, so these values are **kept when leaving the joint** (every other unsigned edit is still dropped), and History gets one "Engineering Override" entry: the reason and each value set. Signing in the same visit records it too.
  - Values saved on an earlier visit are locked. The **Engineering Override** button on the step asks for a reason again and opens them; the new values get their own History entry. Nothing typed there counts as off the WPS. Who may do this isn't enforced (no roles).
- Actual PH Min, Actual PH Max, Actual IP Min and Actual IP Max. A value outside its requirement limits is a **deviation** (see below), not a hard stop. If a requirement is NC (no limit), its matching actual is set to NC automatically and cannot be edited. An Actual Min can't be higher than its Actual Max (hard stop).
- Filler Metal Type, Size and MIC (MIC is typed in). On Root only, **Only Consumable Insert used as filler** copies these from Fit and locks them.
- Weld Position, only when the Nuclear Indicator is 1.
- Layer also needs Interim Layer or Final Layer chosen.

**Fit-Up Insp**
- Every verification box checked against the fit-up data.
- Any fit-up data errors fixed.
- SAT or UNSAT.

**NDT steps (including Excavation NDT)**
- Type (unless locked), Procedure Used for Inspection (only the procedures listed for that Type on Admin > Inspection Procedures), and SAT or UNSAT.
- Probationary Inspector and Oversight Inspector, when "Has Probationary Inspector" is checked.
- Portion of Weld Inspected, when "Partial" is checked.
- RT: Degree of RT Performed must be at least the RT Root or RT Final requirement (plain number of degrees; NA counts as none). Defect Code is needed when RT is UNSAT.

**Repair**
- Repair Code (Grind Only, Weld Repair or Cut).

**Records Review**
- SAT or UNSAT.

## Deviations

Two things can be signed anyway, as accepted deviations. Everything else above stays a hard stop.
- An Actual PH/IP value outside its requirement limits.
- A failed Qualification Check (welding steps, and the inspection steps that check quals).

When a step has any deviation, Signoff opens an acceptance screen instead of the usual confirm: each deviation with what was entered and what was required, a required reason, and the password. Accepting records the deviation (History shows a "Deviation created" entry with the reason and each item) and signs the step.

**Engineering Hold:** signing with a deviation adds an **Engineering Hold** step right after the step it was accepted on, and that becomes the current routing (role: Engineering). No later step can be signed, and a banner on the weld record says why. The hold step has no Signoff button; it has Engineering's release form instead (below).

**Releasing it:** Pipe Welding's role droplist has **Engineering**, which lists every joint on Engineering Hold. On the joint, the Engineering Hold step shows the deviation details (entered vs required, reason, who accepted it and when), then **Comments** (required) and **Set routing to** (any step on the joint; it starts on the first step not yet signed). **Signoff** (the normal Signoff button and password confirm; it takes you back to the list, like any signoff) then:
- signs the Engineering Hold step (by Engineering, with the comments and the routing chosen) and marks the deviation dispositioned;
- sets the current routing to the chosen step, the same way Admin > Routing Override does: going back works like any route-back (that step and every step after it come up blank), going forward skips the steps in between;
- the joint carries on normally from there.

**Nothing is deleted:** the deviation, the signed hold step and every signoff stay on record. History gets "<Step> - Deviation dispositioned" (with the comments and routing) and "Routing set to X (Engineering)" or "Routed back to X (Engineering)", both recorded at Engineering Hold.

**Deprogress:** before Engineering releases it, deprogressing the sign-off that accepted the deviation removes its Engineering Hold; the deviation stays on record as withdrawn. After release, Deprogress can't reach back past it (same as Admin > Routing Override).

**From a reject rule:** Admin > Routing Settings reject rules can send an UNSAT to **Engineering Hold** instead of Repair or a route-back. Built in: on Root, Layer and Final NDT MT/PT, "This step: Type is PT and <that phase's weld step>: Weld Process is GMAW" goes to Engineering Hold instead of Repair (Root NDT checks Root, Layer NDT checks Layer, Final NDT checks Final Weld). No deviation is involved: the hold keeps its reason (for example "Root NDT MT/PT was UNSAT (Type is PT, and Root: Weld Process is GMAW)"), the banner shows it, and Signoff releases it the same way (History: "Engineering Hold - Signed off"). Engineering can't pick Repair, since the joint has none (user's decision: the hold is instead of Repair).

**Seeded:** five demo joints start on Engineering Hold for a deviation (an Actual PH Max over the range, accepted at Tack, Root, Layer or Final Weld), and two for a PT failure on a GMAW weld.

## Foreman Override

**Turned off 2026-10-01** (button hidden, `FOREMAN_OVERRIDE_ENABLED` in data/workflow/weld-fields.ts); blank values are handled by the engineering override above instead. How it worked when on:

**Foreman Override** (on welding steps and Fit as a Weld Build-Up, on the right, away from Signoff) records work done outside the procedure, in the person's own words. The pop-up asks them to "Describe the deviation and why it is necessary".
- While a step has an override, GWP (and so WTN), Filler Metal Type and Filler Metal Size can be picked from the full lists instead of being filled in for you. A GWP, type or size the WPS doesn't allow shows the warning "Foreman override".
- Overrides are listed under the button and can be removed until the step is signed. Removing the last one puts the filled-in values back. Leaving the joint without signing drops them.
- Signing records the override in History ("Foreman Override" entry), along with any value it allowed that the WPS doesn't. It is **not** a deviation and doesn't put the joint on hold.

**MCL values:** MCL 1 and MCL 2 are **STD** or **MC-I**. MC-I requires traceability (the MIC fields above); STD doesn't.

## Not decided yet

- **Records Review UNSAT:** what it should do. For now it's recorded and the joint stays in Records Review.
