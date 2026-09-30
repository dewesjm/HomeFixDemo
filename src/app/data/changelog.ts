/* Change Log (Quick Links > Change Log). Plain-language summary for people using the demo, newest
   day first. Add to the top entry (or a new day) with every user-facing change; skip refactors,
   docs, code cleanup and data changes (sample values, formats, droplist option names). */
export interface ChangeLogDay {
  date: string;        /* ISO date */
  added?: string[];
  changed?: string[];
  fixed?: string[];
}

export const CHANGE_LOG: ChangeLogDay[] = [
  {
    date: '2026-09-30',
    fixed: [
      'Pressing Esc on a pop-up (Foreman Override, sign-off, leaving with unsaved changes) now counts as Cancel. Before, the pop-up closed but was left half-open behind the scenes.',
      'Pressing Enter in a pop-up\'s reason or password box no longer goes ahead when the box is empty (the button was already disabled, but Enter skipped that).',
    ],
    added: [
      'Signing a step with a deviation now puts the joint on Engineering Hold (a new step right after it). Pipe Welding\'s role droplist has Engineering, listing every held joint. On the joint, the Engineering Hold step shows the deviation, and Engineering enters comments, picks the step the routing goes to and clicks Signoff (which takes them back to the list). The joint then carries on normally from there, and everything (the deviation, the hold, every signoff and History entry) stays on record. A few demo joints start on hold.',
      'Admin > Routing has an "Included when" column showing which joints get each step (for example, Pre-Fit when N Ind. is 1 or 2 or the Joint Design needs a consumable insert or backing ring). Use the filter button next to it to change the rules; joints built after that follow the new rules. "Restore built-in rules" puts a step back to how it was.',
      'Admin > Routing Order is saved now: drag a row (or use its arrows) to change the order new joints get their steps in. Before, the arrows only moved the row on screen and a refresh put it back.',
      'Admin > Routing has a "Fabrication editable" column: the Fabrication fields can be changed while the current step has it set to Yes. It starts as Yes from Prep through Fit-Up Insp, so the fields still lock once Fit-Up Insp is signed. Changes apply to joints already in progress too.',
      'Admin > Routing conditions can use "contains" with typed text (any case), besides "is" and "is not".',
      'Admin > Routing conditions can use any Joint Details field and any earlier step\'s answers (for example Root NDT VT/5X Weld Color is Straw). A step that depends on another step\'s answer turns on or off once that step is signed.',
      'Admin > Routing reject rules: on a step with a SAT/UNSAT choice, the button in "Reject routes to" lets you send an UNSAT somewhere else when the step\'s own answers (for example Weld Color) or Joint Details match. The first matching rule wins; otherwise the normal target is used.',
    ],
    changed: [
      'Admin > Routing\'s "Included when" and "Reject routes to" buttons now say Edit, so they\'re easier to spot.',
      'Admin > Routing no longer has a Trade column, and the duplicate # column is merged into Order (click the Order heading to sort).',
      'Admin > Signoff Fields is removed (its changes were never saved). The "Configure fields" button on Admin > Routing is turned off for now.',
      'An NDT step\'s "Reject routes to" is now followed when an admin changes it from Repair to an earlier step (before, NDT UNSAT always added a Repair).',
      'The routing preview\'s "Why" for Defer Tack and Release to welding now names the step turned on or off and the rule that did it.',
    ],
  },
  {
    date: '2026-09-27',
    changed: [
      'My Assignments works like the other lists: click a column heading to sort, filter boxes under each heading, and an Export button (downloads a CSV of what you see, including the Assigned By, Assigned Date, Job Description and Charge details). Rows still expand to show their details. The Demo role select no longer has a red border.',
    ],
    fixed: [
      'Tables with filter boxes under their headings (My Assignments, History and others) were wider than needed because each filter box forced its column wide, so you had to scroll sideways. Columns now fit their contents, and Drawing and Joint on My Assignments and History are as wide as on Pipe Welding so their filter boxes are big enough to type in.',
      'My Assignments columns are only as wide as their contents (Source and others were stretched to fill the page); the row buttons sit at the right edge.',
    ],
  },
  {
    date: '2026-09-26',
    added: [
      'Routing preview on every step: under the Signoff button, a "Demo only" note says where the joint will go on signoff (both outcomes on a SAT/UNSAT step until one is picked). Repair and Excavation NDT keep their existing notes.',
      'Admin > Feature Toggles, with a switch to turn the routing preview on or off.',
    ],
    changed: [
      'Import Joints and Load Procedures work and look the same, with normal-size text (the row counts and the "Paste Joints" help text were small). The section headings on the procedure form ("1. Base Metal" and so on) are now real headings instead of faded captions.',
      'Every Admin table now has the same toolbar: a search box, an Export button (downloads a CSV of what you see), and an Add button where rows can be added. Click a column heading to sort by it. This adds search, sorting and Export to Penetrant, Locations, Weld Positions, Routing Options, Quick Links, Teams, Qualifications, Material Traceability, Material Classification and Joint Designs & NDT, and Export to Signoff Fields.',
      'Search boxes are all worded the same way ("Search joints…", "Search procedures…" and so on), and empty lists all use the same wording and look ("No locations yet.", or "No joints match your filters." when filters hide everything).',
      "Page titles match their menu names (Teams, Banner, Attribute Codes, Set Routing, History, Joint Search, Joint Designs & NDT).",
      "Pages no longer have a description line under their title.",
      "The banner message is always a small pill beside the page title (Joint Search showed a full-width bar).",
      "Qualifications, Material Traceability and Material Classification no longer have a Back button, like the other Admin pages.",
      'Dates look the same everywhere: 09/26/2026 3:04 PM, or just 09/26/2026 where the time does not matter (tables, History, exports, filter chips, the printed procedure and this Change Log).',
      'Welding steps now fill in GWP, WTN, Filler Metal Type and Filler Metal Size for you, as if an outside system had already checked them. The droplists are disabled until a Foreman Override is added; removing the override puts them back.',
      'The routing preview now reads "Routing Preview (Demo Only)" and uses a quieter grey box instead of blue.',
      'The routing preview now says why the joint goes where it does (for example Defer Tack, a rejected inspection, or the Repair Code), or "no special conditions" when it just moves on to the next step.',
    ],
    fixed: [
      'Easier to read: My Assignments uses one text size with no faded columns, error messages under fields are the same size as the fields, a locked Revised Joint Design looks like the other locked fields, and the menu arrows and the empty Quick Links message are no longer faded.',
      'My Assignments: the Assignment # column header fits on one line.',
      'Defer Tack at Fit now works: after signing, the joint skips Tack and Deferred Tack is added. Leaving the joint page after a signoff was quietly undoing it (and could also undo a Fit-Up Release being added, or a joint being sent back).',
      'The routing bar no longer shows a skipped Tack next to Deferred Tack.',
      'An Actual PH/IP field set to NC no longer shows a leftover "is required" error from an earlier Signoff attempt.',
      'Sample joints no longer show skipped steps (Deferred Tack, Fit-Up Release) as signed.',
    ],
  },
  {
    date: '2026-09-25',
    added: [
      'Deviations: an Actual PH/IP out of range, a failed Qualification Check, or a filler the WPS doesn\'t allow no longer blocks Signoff. Signoff shows what\'s out of spec and asks for a reason, then the joint is put on hold (no way to release it yet).',
      'Foreman Override button on welding steps (Tack, Root, Layer, Final Weld, and Weld Build-Up at Fit), on the right side away from Signoff. It lets GWP (and so WTN), Filler Metal Type and Filler Metal Size be picked from the full lists. The override and any off-list values it allowed are recorded in the joint History when you sign; it doesn\'t put the joint on hold.',
      'Welder qualifications: every WTN now requires 1-3 quals (WELD4xx codes), and the Qualification Check really checks them. It says "Passed, qualifications ..., active" or lists the quals that are missing.',
      'Admin > Qualifications: choose which quals the Test User has, to try passing and failing the Qualification Check.',
      'Revised Joint Design droplist shows a short description next to each design. Descriptions can be edited in Admin > Joint Designs.',
      'Create Joint (Weld Planning) has the same hulls, joint info, joining, additional data and attribute code fields as the weld record.',
      'Qualification conditions (Admin > Qualifications): "when the joint has X = Y, require qual Z". Starts with Controlled Material = Yes requires CNTRLMTL1 (controlled = MCL 1 or MCL 2 needs traceability in Admin > Material Traceability). The Test User can hold CNTRLMTL1 like any other qual.',
      'Qualification Check runs as soon as a welding or inspection step is open (inspection steps now show it too), checking the joint\'s condition quals (just Passed if none apply), then adds the WTN\'s quals once one is picked. A failure is recorded as a deviation at Signoff.',
      'Change Log (this page), under Quick Links.',
    ],
    changed: [
      'Nothing is ever re-opened. When a joint goes back (Fit-Up Insp UNSAT, Grind Only, Allowable thickness exceeded, Excavation NDT, Cut), the current routing is set back and every step from there comes up blank to be signed again; earlier signoffs stay. Fit-Up Insp UNSAT now goes back to Fit (was Tack), and going back to Fit blanks the fit-up data. History shows a "Routed back to" row.',
      'Deprogress undoes everything the signoff did (an added Repair, a route-back, a Cut and so on), and the step comes up blank. "Re-opened" now reads "Deprogressed".',
      'Foreman Override button no longer shows a tooltip, and its pop-up just says "Describe the deviation and why it is necessary".',
      'Admin > Set Routing just changes the joint\'s current routing, back or forward, and no longer marks steps as signed. Going back blanks that step and everything after it; going forward leaves the steps passed as they are.',
      'Qualification Check failure message no longer says "Input disabled", and the GWP, Filler Metal Type and Filler Metal Size warnings just say "Foreman override".',
      'Shorter field warnings: an Actual PH/IP out of range just says "Out of Range", and a failed Qualification Check no longer adds "Signing will record this as a deviation." Signoff explains the details.',
      'Create Joint droplists offer the same options as the weld record (RT degrees, NDT methods, pipe size, wall thickness, materials).',
      'Advanced Search column picker and Adapt Filters list the shown items in order; drag them or use the arrows to reorder.',
      'Makeup page is back.',
      'Removed the Re-open button on signed steps (it was never reachable in practice; signing moves on to the next step).',
      'Admin > Routing no longer has the New trade and Add test job buttons.',
    ],
    fixed: [
      'History: a deviation now reads "Deviation created" (was "Deviation accepted"). Long dashes shown in the app are now a plain "-" (e.g. "Tack - Deviation created", and "-" for a blank value).',
      'Repair: the Allowable Thickness text and the "exceeded" checkbox are now one line, "Allowable thickness of 3/16 inch or 20% of material thickness, which is less has been exceeded - Volumetric inspection (UT/RT) is required" (3/8 inch for N 250-1500-1). It is hidden when the joint has no UT/RT (the text was left showing on its own).',
      'Dropdowns with a missing required value now get the red outline, like text fields (e.g. Filler Metal Size).',
      'Checkboxes on the procedure edit screen no longer stretch across the page.',
      'The Admin menu no longer runs off the bottom of the screen. It fits the window and scrolls if needed, so Material Classification and Quick Links can be reached.',
    ],
  },
  {
    date: '2026-09-24',
    added: [
      'Every failed NDT sends the joint to a new Repair, with no limit. Each repair has its own Repair #.',
      'Repair Code = Cut starts the joint over from Fit and adds 1 to the Refit #. The old fit-up data stays in History.',
      'GWP and WTN droplists show a plain-text description of each procedure.',
      'NDT steps follow the joint\'s NDT Root, NDT Each (Layer) and NDT Final values. A single method locks the Type droplist.',
      'VT is always required for each phase unless 5X is. A degree in RT Root/Final adds an RT step.',
      'PH/IP actuals are four required fields (Actual PH Min/Max, Actual IP Min/Max). An NC requirement sets its actual to NC.',
      'Top-bar flatten button works for whichever system you\'re in.',
      'Advanced Search is more compact (both Weld Record and Weld Planning).',
      'Person search accepts any mix of name, PERN or ID.',
    ],
    changed: [
      'Repair Code is required to sign off a Repair; Repair no longer asks for Affected Item.',
      'MCL 1/MCL 2 of MC-I requires traceability.',
      '"Only Consumable Insert used as filler" is on Root only.',
      'Weld Type uses one list of valid options everywhere.',
      'Actual Min can\'t be higher than Actual Max. Override Requirements are hidden.',
    ],
    fixed: [
      'Locked fields look locked (grey) in dark themes; editable fields stay dark.',
      'GWP/WTN droplist arrow was hidden.',
      'PH/IP fields widened so labels don\'t wrap and boxes line up.',
      'Qualification Check message was cut off.',
    ],
  },
  {
    date: '2026-09-23',
    added: [
      'GWP groups several WTNs; GWP, WTN, Weld Process, PH/IP and Filler Metal options all come from Weld Engineering\'s procedures.',
      'GWP droplist only shows procedures for the joint\'s Material Type 1/2.',
      'Repair and Excavation NDT routing: Excavation NDT uses the same inspection that rejected the joint.',
      'Admin > Material Classification (non-ferrous/austenitic materials).',
      'Work History "Correct" action to fix a value on a signed step, with a reason.',
      'Makeup: grant acting-foreman access to someone below foreman.',
      'Search assist on Probationary/Oversight Inspector fields.',
      'Per-column filters on My Assignments.',
      'Button to flatten a system\'s menu into the top bar.',
    ],
    changed: [
      'Signoff button is always enabled; a failed signoff highlights every missing required field in red.',
      'Root, Layer and Final NDT run in the order VT/5X, MT/PT, UT/RT.',
      'Interim Layer signoff is recorded, but Layer stays the current routing.',
      'Steps with no SAT/UNSAT choice don\'t show SAT anywhere.',
      'Repair Code is a droplist.',
    ],
    fixed: [
      'Fit weld build-up showed Fit\'s own signoff fields.',
      'RT/MT-PT/VT-5X fields cleared themselves right after being set.',
      'Correct was only offered on the most recent signoff, and let you blank a field.',
      'My Assignments showed stale routing and uneven role counts.',
    ],
  },
  {
    date: '2026-09-22',
    added: [
      'Weld Engineering: Procedure Lookup with a PDF for each procedure, plus Manage and Load Procedures.',
      'Quick Links (admin-maintained shortcuts in the top bar).',
      'History: per-column filters, XREFID/Drawing/Joint/Order columns, and the fabrication data at each signoff.',
      'Advanced Search text filters can say "does not contain".',
      'Records Retention Review split into O63 and O04 steps.',
      'Nuclear Indicator tooltip and attribute code descriptions.',
      'My Assignments: expandable rows, job description and a scannable Charge barcode.',
    ],
    changed: [
      'Weld Assignment renamed Weld Dispatch.',
      'Deprogress asks for its reason in a pop-up.',
      'Unsigned edits are discarded when you leave a joint.',
      'Actual PH/IP accept digits only.',
      'Toasts are bigger and sit at the bottom center.',
    ],
    fixed: [
      'Dropdowns had no visible border in dark mode.',
      'History\'s Routing column showed the step after the action instead of the step it happened at.',
      'Back from a joint opened from History now returns to History.',
      'Deprogress was sometimes hidden when it should show.',
    ],
  },
  {
    date: '2026-09-21',
    added: [
      'Weld Planning Advanced Search.',
      'History groups field edits into expandable rows and records every field\'s value at each signoff.',
      'Person search by first/last name; a person\'s title is recorded as it was at the time.',
      'Expires column on My Assignments.',
      'XREFID filter on Pipe Welding.',
    ],
    changed: [
      'Hull replaces Project everywhere; hulls repeat across jobs.',
      'Inspection and NDT steps require the inspector to choose the Type.',
      'Bigger, higher-contrast text across the app.',
      'Records role renamed Records Retention.',
      'Weld Planning joint form simplified; Joint is free text.',
    ],
    fixed: [
      'Weld build-up fields didn\'t appear right away after choosing the type.',
      'Fabrication Location/Usage were blank.',
      'Picking a WTN took seconds.',
      'Menus now close when you pick a link.',
      'Borders were invisible in some themes.',
    ],
  },
];
