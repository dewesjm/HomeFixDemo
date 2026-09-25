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
      'Qualification Check failure message no longer says "Input disabled", and the GWP warning just says "Foreman override".',
      'Create Joint droplists offer the same options as the weld record (RT degrees, NDT methods, pipe size, wall thickness, materials).',
      'Advanced Search column picker and Adapt Filters list the shown items in order; drag them or use the arrows to reorder.',
      'Makeup page is back.',
      'Removed the Re-open button on signed steps (it was never reachable in practice; signing moves on to the next step).',
      'Admin > Routing no longer has the New trade and Add test job buttons.',
    ],
    fixed: [
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
