# Weld Record routing rules

This is the plain-language version of how a Welding joint moves through its routing and what has to be filled in at each routing. It describes how the demo behaves today. The code references are in [ARCHITECTURE.md](ARCHITECTURE.md).

Last updated 2026-10-23.


## Terms

- **Routing**: a status the joint is in (Pre-Fit, Fit, Tack, Root, Root NDT 5X/VT, …). Each is a row on Admin > Routing Settings and a box on the routing bar.
- **Signoff Type** (Type): what gets signed in a routing (Fit, Weld Build-Up, VT, 5X, Interim Layer, Final Weld, …). Listed on Admin > Signoff Types; Admin > Signoff Types By Routing says which routings offer which; each has its own form on Admin > Signoff Type Forms.
- **Display Name**: what the joint and its routing bar call a routing (Routing Settings), so two routings can show the same name.

## How routing works

- A joint's routing is an ordered list of routings. The **current routing** is the first required routing that isn't signed off yet.
- Routings are signed in order. A routing can't be signed until every required routing before it is signed.
- Each routing is signed by one role (Fitting, Welding, Foreman, Inspector and so on), its **Persona** in Admin > Routing Settings.
- **NQC rows:** Fit-Up Insp and every NDT routing have two rows in Routing Settings: the NQC row (for example **NQC Root NDT 5X/VT**), included when Nuclear Indicator is 1 or 2 and signed by the **NQC Inspector**, and the regular row, included when it isn't. A joint gets one of the two. Both have the same **Display Name** (Root NDT 5X/VT), so the joint and its routing bar look the same either way; only who signs differs. Each NQC NDT row also has its own Signoff Types By Routing row and starts with the regular row's reject rules. Excavation NDT is in Added routings and remaps Inspector to NQC Inspector on N Ind 1 or 2 joints.
- **Nothing is ever unsigned or reopened** (user's rule, 2026-09-25). When something sends the joint back (a failed inspection, a Repair choice, a Cut), the **current routing is set back** to that routing and the joint proceeds along the path as normal from there: every routing from that point on comes up blank and is signed again as a new signoff. Earlier signoffs stay exactly as they were in the records and History. This applies to every current and future "goes back to" rule unless it says otherwise. Going back to Fit or earlier also blanks the fit-up (fabrication) data. Work History gets one row, "<Routing> — Routed back to <routing>", which keeps the fit-up data it blanked.
- Every signoff is kept as a record, including ones on routings the joint later went back past, or reversed by Deprogress. Nothing is deleted.
- **Deprogress** (Work History) reverses the joint's most recent signoff and **everything that signoff did**: a Repair it added, Repair #, a route-back, a Cut (earlier signoffs, fit-up data and Refit # come back), Defer Tack and so on. The deprogressed routing and every routing after it come up blank. A comment is required. There is no "reopen": the only way back is Deprogress or a route-back.
- **Admin > Routing Override** changes a joint's current routing to any routing. Nothing is marked signed. Going back works like any route-back (that routing and every routing after it come up blank). Going forward only moves the current routing: the routings before it stay as they are (unsigned ones are simply passed), and the joint carries on from the new routing. The joint is found by typing its Hull, Drawing and Joint exactly, and a Reason for change is required; the Routing History entry records it.
- **Admin > Routing Settings** sets, per routing: its order, when a joint gets it ("Included when"), where an accepted signoff goes ("Then go to" rules), where an UNSAT goes ("Reject routes to", plus reject rules; a routing whose Reject routes to is itself records the UNSAT and the joint stays there), who signs it (**Persona**), and **Fabrication editable**. **Routing** is the routing's name in rules (Included when, reject rules, condition fields); **Display Name** is what the joint, its routing bar, Pipe Welding and History show (blank = the Routing name). A condition compares a field with "is", "is not" or "contains" (typed text, any case). The fields are every Joint Details field and every earlier routing's own answers (for example Root NDT 5X/VT's Weld Color); a reject or Then go to rule can also use this signoff's own answers. Fields with a fixed list offer checkboxes; the others take a typed value. An earlier routing's answer is blank until that routing is signed, so a routing that depends on one is always on the joint and turns on or off as it's signed.
- **Types** (Admin > Signoff Types): a routing is where the joint is; its Types (Admin > Signoff Types By Routing) are what can be signed there, and each Type has its own Signoff Type Form. Picking a different Type clears the form and loads that Type's fields.
- **Then go to** (Admin > Routing Settings): after an accepted signoff (SAT, or no SAT/UNSAT choice), the first matching rule selects the next routing. No match means continue in order. Rules can use Joint Details, this signoff's Type and answers, and signed answers from other routings. The same or an earlier target starts that routing and everything after it fresh, including fabrication data when returning to Fit or earlier. A later target passes the routings in between without signing them. Reject rules and Reject routes to still handle UNSAT. The routing preview's Why names the rule that matched.
- **Signs routing** (Admin > Signoff Types): a Type can name the routing it signs. Picked on an earlier routing, signing with it is that routing's signoff: the later routing is signed with the values, and the routings between are passed. Blank means it signs the routing it's picked on. Built in: **Final Weld** signs Final Weld, so Final Weld picked on Layer is the Final Weld signoff.
- **Fabrication editable**: the Fabrication fields can be changed while the current routing has it checked. Built in, that's Prep through Fit-Up Insp, so the fields lock once Fit-Up Insp is signed. A change applies straight away, including to joints already in progress. Repair and Excavation NDT routings, and a finished joint, always lock them. Correct does not change Fabrication fields.
- Every routing's sign-off form, its fields and their layout, comes from Admin > Signoff Type Forms. Sold is never signed: the joint is closed once it gets there.

The starting Then go to rules are Fit / Type is Weld Build-Up → Fit; Layer / Type is Interim Layer and NDT Each Layer is blank → Layer; each Layer NDT / Layer's Type is Interim Layer → Layer. The `repeats` count records only a routing's own rule returning it to itself.

## The path

| # | Routing | Signed by | Included when | What happens on signoff |
|---|---|---|---|---|
| 1 | Pre-Fit | NQC Inspector | Nuclear Indicator is 1 or 2, or the joint design calls for a consumable insert or backing ring | Moves on to Fit |
| 2 | Fit | Fitting | Always | Type is **Fit** or **Weld Build-Up**. **Weld Build-Up** matches Fit's Then go to rule: the signoff is recorded, then Fit and everything after it start fresh, including fabrication data. Fit starts with its default Type, Fit. **Fit** moves on to Tack. If **Defer Tack** is checked, Tack is skipped and Deferred Tack is added after Fit-Up Release |
| 3 | Tack | Welding | Unless Defer Tack was checked at Fit | Moves on to Fit-Up Insp |
| 4 | Fit-Up Insp | Foreman or Inspector; NQC Inspector on its NQC row | Always (NQC row when Nuclear Indicator is 1 or 2, regular row otherwise) | **SAT**: moves on. **UNSAT**: back to Fit (Fit, Tack and Fit-Up Insp come up blank, and so does the fit-up data). If **Release to welding** is unchecked, Fit-Up Release becomes required |
| 5 | Fit-Up Release | Foreman | Only when Fit-Up Insp didn't release to welding | Moves on |
| 6 | Deferred Tack | Welding | Only when Defer Tack was checked at Fit | Shown as **Tack** on the joint and its routing bar (its Display Name); its Type is **Deferred Tack**, so the record shows the Tack was deferred. Its own Signoff Type Form, seeded with Tack's fields |
| 7 | Root | Welding | Always | Moves on to Root NDT |
| 8 | Root NDT | Inspector; NQC Inspector on its NQC rows | Always (see the NDT chart; NQC rows when Nuclear Indicator is 1 or 2) | See "When an NDT routing fails" |
| 9 | Layer | Welding | Always | Type is **Interim Layer** or **Final Weld**. **Interim Layer** is recorded, then Layer NDT comes up when NDT Each Layer is set. Its Then go to rule returns the joint to Layer after SAT. With NDT Each Layer blank, Layer's own rule returns directly to Layer. Every return starts Layer and everything after it fresh. **Final Weld** shows the Final Weld fields and is the Final Weld signoff: Final Weld is signed and the joint moves on to Final NDT. Layer then shows signed if it had an Interim Layer, otherwise it drops off the routing bar |
| 10 | Layer NDT | Inspector; NQC Inspector on its NQC rows | Only when NDT Each Layer is set (see the NDT chart; NQC rows when Nuclear Indicator is 1 or 2); after each Interim Layer | See "When an NDT routing fails". Passing goes back to Layer |
| 11 | Final Weld | Welding | Always | Signed by Layer's Final Weld. If the joint is ever routed to it directly, signing it moves on to Final NDT |
| 12 | Final NDT | Inspector; NQC Inspector on its NQC rows | Always (see the NDT chart; NQC rows when Nuclear Indicator is 1 or 2) | See "When an NDT routing fails" |
| 13 | Records Review | O63 Records or O04 Records | Always. **O63** when the joint has SFFF, DSS-AAA or SS data; **O04** otherwise | **SAT**: moves on to Sold. **UNSAT**: goes where its Reject routes to says (Admin > Routing Settings). The default is Records Review itself: the UNSAT is recorded and the joint stays in Records Review |
| 14 | Sold | Same Records group as routing 13 | Always | The joint is closed. Everything locks; only Deprogress can reverse it |

A Repair routing (and sometimes an Excavation NDT routing) is added to the path whenever an NDT routing fails. See below.

## NDT routings

Each phase (Root, Layer, Final) gets its NDT routings from the joint's **Joint Details** values:

| Phase | NDT value | RT degree |
|---|---|---|
| Root | NDT Root | RT Degree Root |
| Layer | NDT Each Layer (blank = no Layer NDT) | (none) |
| Final | NDT Final Weld | RT Degree Final |

**Root and Final:** VT is always required, unless 5X is required instead. The NDT value can add one more routing:

| NDT value | Routings, in order |
|---|---|
| VT | VT |
| 5X | 5X (instead of VT) |
| MT | VT, then MT/PT offering only MT |
| PT | VT, then MT/PT offering only PT |
| MT/PT | VT, then MT/PT with the inspector choosing MT or PT |
| UT | VT, then RT/UT offering only UT |

**Layer:** NDT Each Layer selects exactly one routing. Blank gives no Layer NDT; VT or 5X gives 5X/VT offering only that method; MT, PT or MT/PT gives MT/PT offering the specified method(s); UT gives RT/UT offering only UT. No extra Layer VT is added for MT, PT, MT/PT or UT. Each Layer NDT routing, including its NQC row, starts with a Then go to rule: when Layer was signed as Interim Layer, go to Layer. A Repair returns to the rejecting NDT as before; that NDT's SAT then applies its rule.

- **RT:** a degree in RT Degree Root or RT Degree Final (10, 100, 360, 60 or 75) adds a RT/UT routing offering only RT for that phase, after the others. Blank or NA adds nothing. A joint never has UT and an RT degree for the same phase.
- **Type is never pre-filled:** every inspection routing's Type starts on "Select the inspection performed…", even when only one method is offered, so the inspector always picks what was performed.
- **Valid values:** NDT Root, NDT Each Layer and NDT Final Weld take 5X, MT, MT/PT, PT, UT or VT. Blank and NA are not valid (a blank NDT Each Layer means no Layer NDT). RT Degree Root and RT Degree Final take blank, 10, 100, 360, 60, 75 or NA.
- **The general NDT field** in Joint Details doesn't affect routing.
- **Root inspection question:** when NDT Root is VT or 5X (Show when on Admin > Signoff Type Forms, Root), both the question and its answer choices name that method. Answering Yes also signs the corresponding Root inspection as SAT when Root is signed, using the matching Also signs rule on Admin > Signoff Types. The rules select VT for NDT Root VT and 5X for NDT Root 5X, including NQC rows. Answering alone signs nothing.

## Added routings and relative rule targets

Admin > Routing Settings separates numbered routings from **Added routings**: Repair, Excavation NDT and Engineering Hold. Added routings are inserted during work, rather than included in every new joint. Their Reject rules and Then go to rules use the same editor as numbered routings. The first matching rule wins; a rule with no conditions always matches.

Targets include **Add Repair**, **Add Excavation NDT** (on Repair), and **Add Engineering Hold**, plus destinations relative to a repair round: **Rejecting NDT**, **Rejecting phase’s UT/RT**, **Rejecting phase’s VT/5X**, and **Own Repair**. These resolve to the joint’s own regular or NQC routing and the correct repair round. Repair # and Cut’s Refit # remain automatic bookkeeping.

The tables below describe the starting rules. Editing those rules changes the destinations, including the routing preview. Engineering Hold keeps its Engineering release form: Engineering chooses the destination there.

## When an NDT routing fails

**Any NDT routing that comes back UNSAT adds a new Repair routing right after it.** There is no limit on the number of repairs.

- Each repair is its own routing: Repair, then Repair 2, Repair 3 and so on. Earlier repairs stay as signed records.
- **Repair #** goes up by one with each new Repair.
- Repair is signed by the **Foreman**.
- **Routing bar:** a repair shows as one plain **Repair** dot right after the NDT routing that failed (plus **Excavation NDT** after a Weld Repair) only while it is open. Once it's resolved (Grind Only, Cut, thickness exceeded, or Excavation NDT passing) both dots go away. A failed Excavation NDT brings the Repair dot back. History keeps the round numbers (Repair 2, Repair 3).

When the Repair routing is signed, where the joint goes depends on what was chosen:

| Choice on the Repair routing | Where the joint goes |
|---|---|
| **Allowable thickness exceeded** (checked) | Back to that phase's RT/UT routing. This wins over the Repair Code. The checkbox only shows when that phase has a RT/UT routing (by default; it's the field's Show when rule on Admin > Signoff Type Forms) |
| **Grind Only** | Back to the NDT routing that failed |
| **Weld Repair** | An **Excavation NDT** routing is added right after the Repair (see below) |
| **Cut** | The joint starts over from Fit (see below) |

**Allowable Thickness** is shown on the Repair routing: 3/8" when the Nuclear Indicator is 1, and 3/16" when it's 2 or 3.

### Excavation NDT (after a Weld Repair)

- It requires **the same inspection that failed**. For example, if PT failed, Excavation NDT offers only PT.
- **Type exception (editable on Admin > Signoff Types By Routing):** if PT failed and Material Type 1 or 2 is non-ferrous or austenitic (Admin > Material Classification), Excavation NDT is **5X instead of PT**.
- **Form:** after Type is picked, Excavation NDT loads that inspection Type’s shared Signoff Type Form (PT, 5X, MT, VT, UT or RT). There is no separate Excavation NDT form. RT and UT include their shared References field.
- **UNSAT:** back to its own Repair routing, which comes up blank. No new Repair is added. The same Excavation NDT comes back when the Repair is signed as Weld Repair again.
- **SAT:** back to the NDT routing that originally failed. With the PT exception above, it goes to that phase's 5X/VT routing instead, with **5X allowed** (normally that routing offers only VT).

### Cut

A Cut means the joint is redone from scratch:

- The current routing goes back to **Fit**, and every routing from Fit onward starts fresh, as on a new joint.
- All earlier signoffs stay in the records and History. Earlier Repair routings stay as signed records.
- **Refit #** goes up by one. Work History gets a row reading "Cut — routed back to Fit", with the new Refit number.
- Fit-up (fabrication) data is reset to blank. The Refit row in Work History keeps what it was ("Fabrication before the Cut").

## What's required to sign each routing

Each field’s label, type and options come from the field catalog. Its Signoff Type Form selects the fields and their rules; routings carry only recorded values. Defer Tack on Fit is a checkbox. A custom routing needs an offered Type and Type form to show fields.

Required fields are marked with a red `*`. Signoff is always clickable: a failed attempt highlights everything still missing.

**Pre-Fit and Fit**
- **Consumable insert:** Type and Size when the joint design calls for one. The MIC too when MCL 1 or MCL 2 is **MC-I**.
- **Backing ring:** Type when the joint design calls for one. The MIC too when MCL 1 or MCL 2 is MC-I.
- **Fit only, fit-up data:** Location, Drawing Rev and Actual Thickness, and no Fabrication errors. Fit-Up Insp can't be signed while a Fabrication value has an error. Some Locations add more location fields (Deck, Frame, P/S/CL, Usage). MIC 1 and MIC 2 are needed only when that member's MCL is MC-I.

**Fit as Weld Build up**
- The weld fields below, plus at least one **Affected Item**.
- **MIC verified** for each affected item whose MCL is MC-I (by default: Admin > Signoff Type Forms, Weld Build-Up, Affected Item MIC 1 / MIC 2 verified).

**Weld routings (Tack, Deferred Tack, Root, Layer, Final Weld)**
- GWP and WTN. These (and Filler Metal Type and Size) are filled in for you, standing in for an external system that has already checked them, and can't be changed. Weld Process, the PH/IP limits and any override limits fill in from the WTN.
- **Engineering override:** on some joints (about 1 in 4 in the demo) the external system sends nothing. There, GWP, WTN, Weld Process, PH/IP Min/Max and Filler Metal Type/Size start blank and are typed in by hand (Weld Process is still a droplist). A PH/IP requirement takes a number or NC; NC makes its Actual NC and locked, just like an NC from the WTN.
  - The first value typed asks for a reason ("Give the reason for this engineering override. It is recorded against every value set on this signoff."); Cancel takes the value back out.
  - Engineering doesn't sign, so these values are **kept when leaving the joint** (every other unsigned edit is still dropped), and History gets one "Engineering Override" entry: the reason and each value set. Signing in the same visit records it too.
  - Values saved on an earlier visit are locked. The **Engineering Override** button on the routing asks for a reason again and opens them; the new values get their own History entry. Nothing typed there counts as off the WPS. Who may do this isn't enforced (no roles).
- Actual PH Min, Actual PH Max, Actual IP Min and Actual IP Max. A value outside its requirement limits is a **deviation** (see below), not a hard stop. If a requirement is NC (no limit), its matching actual is set to NC automatically and cannot be edited. An Actual Min can't be higher than its Actual Max (hard stop).
- Filler Metal Type, Size and MIC (MIC is typed in). On Root only, **Only Consumable Insert used as filler** copies these from Fit and locks them.
- Weld Position, only when the Nuclear Indicator is 1.
- Layer also needs Interim Layer or Final Weld chosen; Final Weld shows the Final Weld fields.

**Fit-Up Insp**
- Every verification box checked against the fit-up data.
- Any fit-up data errors fixed.
- SAT or UNSAT.

**NDT routings (including Excavation NDT)**
- Type (unless locked), Procedure Used for Inspection (only the procedures listed for that Type on Admin > Inspection Procedures), and SAT or UNSAT.
- Probationary Inspector and Oversight Inspector, when "Has Probationary Inspector" is checked.
- Portion of Weld Inspected, when "Partial" is checked.
- RT: Degree of RT Performed must be at least the RT Degree Root or RT Degree Final requirement (plain number of degrees; NA counts as none). Defect Code is needed when RT is UNSAT.

**Repair**
- Repair Code (Grind Only, Weld Repair or Cut).

**Records Review**
- SAT or UNSAT.

## Deviations

Two things can be signed anyway, as accepted deviations. Everything else above stays a hard stop.
- An Actual PH/IP value outside its requirement limits.
- A failed Qualification Check (welding routings, and the inspection routings whose Signoff Type Form lists Qualification Check).

When a routing has any deviation, Signoff opens an acceptance screen instead of the usual confirm: each deviation with what was entered and what was required, a required reason, and the password. Accepting records the deviation (History shows a "Deviation created" entry with the reason and each item) and signs the routing.

**Engineering Hold:** signing with a deviation adds an **Engineering Hold** routing right after the routing it was accepted on, and that becomes the current routing (role: Engineering). No later routing can be signed, and a banner on the weld record says why. The hold routing has no Signoff button; it has Engineering's release form instead (below).

**Releasing it:** Pipe Welding's role droplist has **Engineering**, which lists every joint on Engineering Hold. On the joint, the Engineering Hold routing shows the deviation details (entered vs required, reason, who accepted it and when), then **Comments** (required) and **Set routing to** (any routing on the joint; it starts on the first routing not yet signed). **Signoff** (the normal Signoff button and password confirm; it takes you back to the list, like any signoff) then:
- signs the Engineering Hold routing (by Engineering, with the comments and the routing chosen) and marks the deviation dispositioned;
- sets the current routing to the chosen routing, the same way Admin > Routing Override does: going back works like any route-back (that routing and every routing after it come up blank), going forward skips the routings in between;
- the joint carries on normally from there.

**Nothing is deleted:** the deviation, the signed hold routing and every signoff stay on record. History gets "<Routing> - Deviation dispositioned" (with the comments and routing) and "Routing set to X (Engineering)" or "Routed back to X (Engineering)", both recorded at Engineering Hold.

**Deprogress:** before Engineering releases it, deprogressing the sign-off that accepted the deviation removes its Engineering Hold; the deviation stays on record as withdrawn. After release, Deprogress can't reach back past it (same as Admin > Routing Override).

**From a reject rule:** Admin > Routing Settings reject rules can send an UNSAT to **Engineering Hold** instead of Repair or a route-back. Built in: on Root, Layer and Final NDT MT/PT, "This routing: Type is PT and <that phase's weld routing>: Weld Process is GMAW" goes to Engineering Hold instead of Repair (Root NDT checks Root, Layer NDT checks Layer, Final NDT checks Final Weld). No deviation is involved: the hold keeps its reason (for example "Root NDT MT/PT was UNSAT (Type is PT, and Root: Weld Process is GMAW)"), the banner shows it, and Signoff releases it the same way (History: "Engineering Hold - Signed off"). Engineering can't pick Repair, since the joint has none (user's decision: the hold is instead of Repair).

**Seeded:** five demo joints start on Engineering Hold for a deviation (an Actual PH Max over the range, accepted at Tack, Root, Layer or Final Weld), and two for a PT failure on a GMAW weld.

## Foreman Override

**Turned off 2026-10-01** (button hidden, `FOREMAN_OVERRIDE_ENABLED` in weld-record/signoff-definition/weld-fields.ts); blank values are handled by the engineering override above instead. How it worked when on:

**Foreman Override** (on welding routings and Fit as a Weld Build-Up, on the right, away from Signoff) records work done outside the procedure, in the person's own words. The pop-up asks them to "Describe the deviation and why it is necessary".
- While a routing has an override, GWP (and so WTN), Filler Metal Type and Filler Metal Size can be picked from the full lists instead of being filled in for you. A GWP, type or size the WPS doesn't allow shows the warning "Foreman override".
- Overrides are listed under the button and can be removed until the routing is signed. Removing the last one puts the filled-in values back. Leaving the joint without signing drops them.
- Signing records the override in History ("Foreman Override" entry), along with any value it allowed that the WPS doesn't. It is **not** a deviation and doesn't put the joint on hold.

**MCL values:** MCL 1 and MCL 2 are **STD** or **MC-I**. MC-I requires traceability (the MIC fields above); STD doesn't.

## Signoff Type enable conditions

Admin > Signoff Types By Routing stores an **Enable when** condition for each offered Type.
No conditions means always enabled; any rule can match, with all its Joint Details conditions matching.
Root, Layer and Final NDT (including NQC rows) start with conditions selecting VT unless the phase requires
5X, 5X only for a 5X requirement, MT/PT as specified, UT for UT, and RT for a required RT degree.
These saved conditions control Type availability instead of a separate hardcoded method filter.
A Type whose condition does not match cannot be picked, including a configured default. No enabled
Types leaves the routing unable to sign. Excavation NDT retains its rejecting-inspection source and
ordered material exceptions, including the PT to 5X exception.

Returning inspection Type is available in Enable when conditions. It records the inspection Type
of the routing that sent work back. The default 5X option also enables when the returning Type is
5X, covering the excavation material exception without overriding the configured Type list.
Repair creation and seeded Excavation NDT use the same configured availability/source resolver as
live routing. The old NDT method-filter helpers and the hardcoded return-to-5X option override are removed.

## Additional signoffs
Admin > Signoff Types keeps Signs routing and adds Also signs rules. Each additional rule selects a routing, the inspection/signoff Type to record there, and an AND/OR condition using the existing condition editor. Matching rules sign eligible later required unsigned routings already on the joint; unavailable Types and missing targets are ignored. No intervening routing is skipped. Rejects, route-backs, and accepted deviations entering Engineering Hold do not apply additional signoffs. Additional signoffs create their own History entries and share the originating signoff's Deprogress action. Existing field values on the additional routing are retained; missing procedure or inspection data is not invented.
