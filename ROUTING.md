# Weld Record routing rules

This is the plain-language version of how a Welding joint moves through its routing and what has to be filled in at each step. It describes how the demo behaves today. The code references are in [ARCHITECTURE.md](ARCHITECTURE.md).

Last updated 2026-09-24.

## How routing works

- A joint's routing is an ordered list of steps. The **current routing** is the first required step that isn't signed off yet.
- Steps are signed in order. A step can't be signed until every required step before it is signed.
- Each step is signed by one role (Fitting, Welding, Foreman, Inspector and so on). Inspection steps go to the **NQC Inspector** instead of the Inspector when the joint's Nuclear Indicator is 1 or 2.
- **Nothing is ever unsigned or reopened** (user's rule, 2026-09-25). When something sends the joint back (a failed inspection, a Repair choice, a Cut), the **current routing is set back** to that step and the joint proceeds along the path as normal from there: every step from that point on comes up blank and is signed again as a new signoff. Earlier signoffs stay exactly as they were in the records and History. This applies to every current and future "goes back to" rule unless it says otherwise. *Being built: Fit-Up Insp UNSAT, Repair (Grind Only / Allowable thickness exceeded), and Excavation NDT SAT and UNSAT still un-sign the target step and keep its old values; Cut already works this way.*
- Every signoff is kept as a record, including ones on steps the joint later went back past, or reversed by Deprogress. Nothing is deleted.
- **Deprogress** (Work History) reverses the joint's most recent signoff. A comment is required.

## The path

| # | Step | Signed by | Included when | What happens on signoff |
|---|---|---|---|---|
| 1 | Pre-Fit | NQC Inspector | Nuclear Indicator is 1 or 2, or the joint design calls for a consumable insert or backing ring | Moves on to Fit |
| 2 | Fit | Fitting | Always | Type is **Fit** or **Weld Build up**. If **Defer Tack** is checked, Tack is skipped and Deferred Tack is added after Fit-Up Release |
| 3 | Tack | Welding | Unless Defer Tack was checked at Fit | Moves on to Fit-Up Insp |
| 4 | Fit-Up Insp | Foreman or Inspector | Always | **SAT**: moves on. **UNSAT**: back to Fit (*being built; today it goes back to Tack*). If **Release to welding** is unchecked, Fit-Up Release becomes required |
| 5 | Fit-Up Release | Foreman | Only when Fit-Up Insp didn't release to welding | Moves on |
| 6 | Deferred Tack | Welding | Only when Defer Tack was checked at Fit | Same form as Tack |
| 7 | Root | Welding | Always | Moves on to Root NDT |
| 8 | Root NDT | Inspector | Always (see the NDT chart) | See "When an NDT step fails" |
| 9 | Layer | Welding | Always | **Interim Layer**: recorded, but the joint stays on Layer. **Final Layer**: moves on to Layer NDT |
| 10 | Layer NDT | Inspector | Always (see the NDT chart) | See "When an NDT step fails" |
| 11 | Final Weld | Welding | Always | Moves on to Final NDT |
| 12 | Final NDT | Inspector | Always (see the NDT chart) | See "When an NDT step fails" |
| 13 | Records Review | O63 Records or O04 Records | Always. **O63** when the joint has SFFF, DSS-AAA or SS data; **O04** otherwise | **SAT**: moves on to Sold. **UNSAT**: recorded, but the joint stays in Records Review (what UNSAT should do is not decided yet) |
| 14 | Sold | Same Records group as step 13 | Always | The joint is closed. Everything locks; only Deprogress can reopen it |

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
| MT | VT, then MT/PT locked to MT |
| PT | VT, then MT/PT locked to PT |
| MT/PT | VT, then MT/PT with the inspector choosing MT or PT |
| UT | VT, then UT/RT locked to UT |

- **RT:** a degree in RT Root or RT Final (10, 100, 360, 60 or 75) adds a UT/RT step locked to RT for that phase, after the others. Blank or NA adds nothing. A joint never has UT and an RT degree for the same phase.
- **Locked:** a locked step's Type dropdown is pre-filled and can't be changed. A note under it says why, for example "Set by NDT Each (MT)".
- **Valid values:** NDT Root, NDT Each and NDT Final take 5X, MT, MT/PT, PT, UT or VT. Blank and NA are not valid. RT Root and RT Final take blank, 10, 100, 360, 60, 75 or NA.
- **The general NDT field** in Joint Details doesn't affect routing.
- **Root 5X question:** when NDT Root is 5X, the Root step asks "Did you perform 5X inspection and was it successful?". Answering yes signs the Root 5X step automatically when Root itself is signed.

## When an NDT step fails

**Any NDT step that comes back UNSAT adds a new Repair step right after it.** There is no limit on the number of repairs.

- Each repair is its own step: Repair, then Repair 2, Repair 3 and so on. Earlier repairs stay as signed records.
- **Repair #** goes up by one with each new Repair.
- Repair is signed by the **Foreman**.

When the Repair step is signed, where the joint goes depends on what was chosen:

| Choice on the Repair step | Where the joint goes |
|---|---|
| **Allowable thickness exceeded** (checked) | Back to that phase's UT/RT step. This wins over the Repair Code. The checkbox only shows when that phase has a UT/RT step |
| **Grind Only** | Back to the NDT step that failed |
| **Weld Repair** | An **Excavation NDT** step is added right after the Repair (see below) |
| **Cut** | The joint starts over from Fit (see below) |

**Allowable Thickness** is shown on the Repair step: 3/8" when the Nuclear Indicator is 1, and 3/16" when it's 2 or 3.

### Excavation NDT (after a Weld Repair)

- It requires **the same inspection that failed**. For example, if PT failed, Excavation NDT is PT, with its Type locked.
- **Exception:** if PT failed and Material Type 1 or 2 is non-ferrous or austenitic (Admin > Material Classification), Excavation NDT is **5X instead of PT**.
- **UNSAT:** back to its own Repair step. No new Repair is added.
- **SAT:** back to the NDT step that originally failed. With the PT exception above, it goes to that phase's VT/5X step instead, with **5X allowed** and pre-selected (normally that step is locked to VT).

### Cut

A Cut means the joint is redone from scratch. Nothing is reopened:

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
- GWP and WTN. Weld Process, the PH/IP limits and any override limits fill in from the WTN.
- Actual PH Min, Actual PH Max, Actual IP Min and Actual IP Max. A value outside its requirement limits is a **deviation** (see below), not a hard stop. If a requirement is NC (no limit), its matching actual is set to NC automatically and cannot be edited. An Actual Min can't be higher than its Actual Max (hard stop).
- Filler Metal Type, Size and MIC. On Root only, **Only Consumable Insert used as filler** copies these from Fit and locks them.
- Weld Position, only when the Nuclear Indicator is 1.
- Layer also needs Interim Layer or Final Layer chosen.

**Fit-Up Insp**
- Every verification box checked against the fit-up data.
- Any fit-up data errors fixed.
- SAT or UNSAT.

**NDT steps (including Excavation NDT)**
- Type (unless locked), Procedure Used for Inspection, and SAT or UNSAT.
- Probationary Inspector and Oversight Inspector, when "Has Probationary Inspector" is checked.
- Portion of Weld Inspected, when "Partial" is checked.
- RT: Degree of RT Performed must match the RT Root or RT Final requirement. Defect Code is needed when RT is UNSAT.

**Repair**
- Repair Code (Grind Only, Weld Repair or Cut).

**Records Review**
- SAT or UNSAT.

## Deviations

Three things can be signed anyway, as accepted deviations. Everything else above stays a hard stop.
- An Actual PH/IP value outside its requirement limits.
- A failed Qualification Check.
- A Filler Metal Type or Size the WPS doesn't allow. These can only be picked after **Report Deviation**, which opens the full filler list for that step.

**Report Deviation** (next to Signoff) records something the app can't detect, in the person's own words. Reports are listed under the button and can be removed until the step is signed; leaving the joint without signing drops them.

When a step has any deviation, Signoff opens an acceptance screen instead of the usual confirm: each deviation with what was entered and what was required, a required reason, and the password. Accepting records the deviation (History shows a "Deviation accepted" entry with the reason and each item) and signs the step.

**Hold:** after that, the joint is on hold. No later step can be signed, and a banner on the weld record says why. The step the deviation was accepted on can still be re-opened and re-signed. Nothing releases a hold yet; dealing with deviations comes later.

**MCL values:** MCL 1 and MCL 2 are **STD** or **MC-I**. MC-I requires traceability (the MIC fields above); STD doesn't.

## Not decided yet

- **Deviations:** who deals with them, what they can decide, and how a held joint is released.
- **Records Review UNSAT:** what it should do. For now it's recorded and the joint stays in Records Review.
