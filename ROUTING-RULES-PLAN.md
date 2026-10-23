# Routing rules plan

Part 1 is built. Part 2 remains planned, pending review. ROUTING.md describes current behavior.
Both parts are decided. Part 1 is built first; Part 2 builds on it.

## Part 1: "Then go to" rules replace Repeatable (built)

### How it works

- By default a joint goes in order: after a signoff, the current routing is the next routing number
  whose conditions are met. This is what happens today, and most routings need nothing more.
- Admin > Routing Settings gets a **Then go to** column: rules of the form
  *When [conditions] → go to [routing]*, using the same editor as Reject rules.
  - Checked after a signoff that isn't rejected (a SAT, or a routing with no SAT/UNSAT).
  - The first matching rule wins. No match = in order, as above.
  - Conditions can use Joint Details, this signoff's Type and answers, and answers from other
    routings (e.g. Consumable Insert).
  - The target can be the routing itself, an earlier one or a later one.
    - Itself or earlier: a route-back, so the joint goes there and everything from there on comes
      up blank (never un-signed).
    - Later: routings in between are passed, as with Routing Override.
- Rejects are unchanged: Reject rules and Reject routes to.
- Nothing about looping is left in the code. Every loop is a rule that shows in Routing Settings.

### Starting rules

| Routing | When | Go to |
|---|---|---|
| Fit | Type is Weld Build-Up | Fit |
| Layer | Type is Interim Layer, and NDT Each Layer is blank | Layer |
| Each Layer NDT routing | Layer's Type is Interim Layer | Layer |

- When NDT Each Layer has a value, Layer's own rule doesn't match, so the Layer NDT routing comes up next
  and its rule brings the joint back to Layer. Only one Layer NDT routing is on any joint: NDT Each Layer selects its method(s), with no extra VT for MT, PT, MT/PT or UT. Root and Final NDT keep their existing requirements.
- A Repair after a Layer NDT reject returns to that NDT; when the NDT passes, its rule fires.
- Final Weld on Layer matches no rule, so the joint goes on in order. Signs step still makes it
  Final Weld's signoff.

### What goes away

- The Repeatable column on Admin > Signoff Types.
- `typeRepeatable`, `repeatsThroughNdt` and `repeatReturnStep` (type-routing.ts, signoff-routing.ts).
  The `repeats` count stays and counts how often a routing's own rule sent the joint back to it.

### Also in the build

- The routing preview's "Why" names the rule that fired.
- ROUTING.md, the Change Log, and the Routing Settings / Signoff Types page blurbs.
- Storage versions bumped; saved Routing Settings and Signoff Types reset to the new seeds.

## Part 2: Repair, Excavation NDT and Engineering Hold in the tables

### Today

All coded in routing/signoff-routing.ts:

- An NDT UNSAT adds a numbered Repair round after the NDT. The Repair remembers the phase, the NDT
  routing that rejected it and the inspection.
- Repair signed:
  - Allowable thickness exceeded → that phase's UT/RT
  - Grind → the NDT that rejected it
  - Cut → Fit
  - Weld Repair → adds Excavation NDT
- Excavation NDT:
  - Its Type is the rejecting inspection, except PT on non-ferrous/austenitic material
    (Material Type 1 or 2), which becomes 5X.
  - It has its own combined form: every NDT field, each shown only for its own Type.
  - SAT → the NDT that rejected it, or that phase's VT/5X when 5X replaced PT.
  - UNSAT → its own Repair.

### Plan

1. **Added routings.** Routing Settings gets a section for routings that are added rather than numbered:
   Repair, Excavation NDT, Engineering Hold. Each has Reject rules and Then go to rules like any routing.
2. **"Add" targets.** Rule targets include *add Repair*, *add Excavation NDT* and *add Engineering Hold*,
   which insert that routing right after this one. (Reject rules can already add Repair and Engineering Hold.)
3. **"Where it came from" targets.** The NDT a Repair goes back to differs on every joint, so the target
   list gets entries relative to the reject:
   - **Rejecting NDT**: the NDT routing that added this Repair.
   - **Rejecting phase's UT/RT** and **Rejecting phase's VT/5X**: that routing in the phase (Root, Layer
     or Final) whose NDT rejected the joint, so one rule covers all three phases.
4. **Excavation NDT's Type** comes from the rejecting inspection, set on Signoff Types By Routing.
5. **PT → 5X** is a visible rule, not code. It may live in one exceptions table together with the
   attribute code exceptions (waiting on the user's attribute code list).
6. **Excavation NDT's form.** It loads the rejecting Type's form (PT failed → PT's form), and its own
   combined form is removed. The fields shown are the same as today. The difference is there's one PT
   form to maintain instead of two copies.
7. **Repair # and Refit #** stay in the code and aren't shown in admin: a reject that adds a Repair
   raises Repair #, a Cut raises Refit #.

### Starting rules

| Routing | When | Go to |
|---|---|---|
| Repair | Allowable thickness exceeded is Yes | Rejecting phase's UT/RT |
| Repair | Repair Type is Grind | Rejecting NDT |
| Repair | Repair Type is Cut | Fit |
| Repair | Repair Type is Weld Repair | add Excavation NDT |
| Excavation NDT | its Type was changed to 5X from PT | Rejecting phase's VT/5X |
| Excavation NDT | (no condition) | Rejecting NDT |

Excavation NDT's UNSAT keeps Reject routes to = its own Repair. The thickness rule is listed
first so it wins over the Repair Type, as today.

Engineering Hold is added by a Reject rule or an accepted deviation, and Engineering sets where the
joint goes; it moves into the Added routings section but its behavior doesn't change.
