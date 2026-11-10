# Common sign-off validation: proposal

Status: PROPOSED 2026-11-09. Answers so far: 1a, 3a, 5 dropped (user: a routing the joint hasn't reached can't be signed, not a concern; no change there). 2 leaning a, re-explained; 4 re-explained. Waiting on 2 and 4. Nothing built.

## How it works today

All checks already live in one place: `stageProblems()` in
`src/app/weld-record/joint-page/rules/sign-validation.ts`. Each problem it finds is tagged one of three ways:

- **field**: a red message on one field (`onField`)
- **reason**: a line in the "reasons list" (`listed`)
- **both**

`joint-page.component.ts` `signStage()` then does this on a Signoff click:

1. Shows every **field** problem (red messages) and scrolls to the first one. If there were any, stop.
2. If any **reason** problem exists (`canSignStage()`), stop **silently**.
3. Routing configuration check (`previewSignoff().blocked`): shows a toast "Routing configuration blocks signoff".
4. Deviations: acceptance screen. Otherwise: the password confirm.

The Signoff button is always enabled (decided in 2ce602e: clicking it is how you see what's missing), except
on a joint held by a deviation.

**The reasons list is not drawn anywhere any more.** `signBlockers()` is only used to decide whether to stop.
So any problem that is a "reason" with no drawn field does nothing visible when Signoff is clicked.
(The Tasks.md wording "a line in the reasons list (and Signoff disabled)" is out of date.)

## Inventory: every check and what the user sees

| Check | Routings | Tagged | What the user sees on Signoff |
|---|---|---|---|
| SAT/UNSAT not chosen | any with a decision | both | red on Decision. OK |
| UNSAT with no Reject routes to | any with a decision | both | red on Decision. OK |
| Type not picked | NDT / Type routings | both | red on Type. OK |
| ID accessibility missing or wrong for this Type (attribute codes) | MT/PT etc. with IA rules | both, key `__attributes` | **nothing**: no component draws `__attributes`; the answer is the `idAccessible` field |
| Fit-required Fabrication values blank | Fit | reason "Fabrication: Location, ..." | **nothing new**: the Fabrication panel already shows these red all the time; clicking Signoff does nothing |
| Any Fabrication panel error | Fit | field `__fabrication` | **nothing**: no component draws `__fabrication` |
| Any Fabrication panel error | Fit-Up Insp | reason "Fix the fabrication errors" | **nothing**: silent stop |
| Verify-grid rows unchecked | Fit-Up Insp, Records Review | reason + each row | rows go red. OK (the reason line is unseen) |
| Ordinary required field blank | all | field | red on the field. OK |
| Typed requirement (number format etc.) | all | field | red on the field. OK |
| Actual Min above Max | weld routings | field | red on Max. OK |
| Affected Item / its MIC verified | Weld Build-Up | field | red on Affected Item. OK |
| References required, none attached | per form | field | red under References. OK |
| RT degree below minimum | RT NDT | both | red on Degree of RT. OK |
| Required sign-off fields (Comments etc.) blank | per form | both | red on the field. OK |
| On hold for an open deviation | any | reason (page level) | button disabled, banner explains. OK |
| Earlier routing not signed | a routing past the current one | reason (page level) | silent stop, if the button can be clicked there (to confirm while building) |
| Routing configuration blocks it | any | thrown at sign time | toast, 6 s |

So there are four silent cases: ID accessibility, Fabrication on Fit, Fabrication on Fit-Up Insp, and
(possibly) an earlier routing not signed. Fit and Fit-Up Insp check the same Fabrication errors in two different ways.

## Proposal

One rule: **every problem has a place it is shown, and Signoff never stops without showing something.**

1. **Every problem names where it shows.** In `stageProblems()`, a problem is either on a field that is
   actually drawn on the sign-off form, or a **general** problem with no field. Remove the made-up keys nothing draws:
   - `__attributes` goes on the `idAccessible` field (red under "Inner surface of the weld / ID is accessible").
   - `__fabrication` goes away; Fabrication becomes a general problem (point 3).
2. **A "can't sign yet" box beside the Signoff button**, filled when Signoff is clicked, listing the general
   problems: Fabrication, earlier routing not signed, routing configuration. Field problems stay red on their
   fields, as now, and the page still scrolls to the first one. The box clears its lines as they're fixed (live
   after the first click), and goes away once there are none.
3. **Fabrication is one check, the same on Fit and Fit-Up Insp**: if the Fabrication panel has errors, a
   general problem. Fit's separate "Fabrication: Location, ..." list goes, since the panel already marks
   the same fields red. Which routings check Fabrication stays hard-coded (`built-in-routing-rules.ts`).
4. **`signStage()` has one gate**: build the problem list once; if anything is in it, show fields + box and stop.
   `signBlockers()`/`canSignStage()` fold into that.
5. **A test keeps it honest**: a spec that fails if `stageProblems()` returns a field key that isn't one of the
   step's drawn fields or a known component key (Decision, Type, Affected Item, References, verify rows).

Unchanged: the button stays enabled (2ce602e); the hold still disables it; deviations stay deviations
(Actual PH/IP out of range and a failed Qualification Check sign with acceptance, not blocked).

## Questions for the user (answer by number)

1. **When do required fields show red?**
   a. As now: only after Signoff is clicked, or when you leave the field.
   b. Up front, as soon as the routing opens (every blank required field red from the start).
2. **Where do the general problems (Fabrication, earlier routing, configuration) show?**
   a. A box beside/under Signoff, after the first click (proposal).
   b. A list that's always visible under Signoff, before any click (the old reasons list back).
   c. A toast when Signoff is clicked.
3. **Fabrication wording.** Proposed new text: "Fix the Fabrication fields marked in red".
   a. That one line.
   b. Name the fields: "Fix Fabrication: Location, Actual Thickness".
   c. Other wording (give it).
4. **Routing configuration problems** (e.g. UNSAT with no target, an insertion set up wrong):
   a. Keep the toast at sign time.
   b. Move it into the same box as the other general problems.
5. **Earlier routing not signed:** should Signoff even show on a routing the joint hasn't reached?
   a. Hide the button there.
   b. Show it, and the box says "Sign <current routing> first".

Proposed new message texts (all mine, need approval): "Fix the Fabrication fields marked in red",
"Sign <routing> first". Existing wording is kept everywhere else.

## Build order once answered

1. Re-key `__attributes` and remove `__fabrication`; one Fabrication check (spec updates).
2. One gate in `signStage()`; the general-problems box in the signoff panel.
3. The drawn-keys spec. ROUTING.md and Change Log line. Remove the Tasks.md Cleanup item and the AGENTS.md queue entry.
