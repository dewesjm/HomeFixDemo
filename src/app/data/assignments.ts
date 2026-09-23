/* Mock assignments data — simulates work items assigned from an external system */
import { JOBS } from './jobs';
import { getShops } from './workflow';
import { allWtns } from './procedures';

export interface Assignment {
  id: string;
  assignmentNumber: string;
  jobId: string;
  hull: string;
  drawing: string;
  joint: string;
  trade: string;
  routing: string;
  location: string;           /* shop, same list as Fabrication's Location field; 'Ship' when there's no XREFID (see below) */
  specificLocation: string;   /* bay/rack within the shop, same idea as Fabrication's Specific Location */
  /* shipboard location — only set when jobId is blank: an XREFID-less assignment isn't tracked
     against a shop/bay, it's physically aboard the ship, so it's found by deck/frame position instead */
  deck: string;
  frame: string;
  pscl: string;    /* P / S / CL -- one field, same as Fabrication's own P/S/CL droplist */
  usage: string;   /* compartment usage/purpose, short code */
  assignedRoles: string[];
  source: string;   /* demo only: which external system the assignment came from, by role */
  dueDate: string;
  expirationDate: string;   /* seeded 0-6 days out, so always within a week */
  assignedDate: string;
  assignedBy: string;
  jobDescription: string;
  charge: string;   /* demo only: barcoded charge number, shown as a barcode in the expanded row */
  /* demo only: role-specific fields eWICC (or whichever source system) would actually carry;
     we're not building those systems, just showing a few of the fields they'd hand off */
  details: { label: string; value: string }[];
}

/* demo only: shows that different roles get assigned from different upstream systems.
   Inspector and NQC Inspector draw from either of two systems, so each shows a mix. */
export const SOURCES_BY_ROLE: Record<string, string[]> = {
  'Fitting': ['SWIMS'],
  'Welding': ['EWICC'],
  'Foreman': ['EWR'],
  'Inspector': ['SAIL', 'NCS'],
  'NQC Inspector': ['SAIL', 'NCS'],
  'O63 Records': ['EWR'],
  'O04 Records': ['EWR'],
  'View': ['ERP'],
};

const ASSIGNEES = ['J. Carter', 'M. Nguyen', 'R. Patel', 'S. Williams', 'T. Garcia', 'A. Singh', 'K. Brown', 'L. Chen'];

/* demo only, standing in for what eWICC would send over -- same MIL-spec designations as Weld
   Record's own Filler Metal Type/Size (METAL_TYPE_OPTIONS/METAL_SIZE_OPTIONS in data/workflow.ts),
   not duplicated as options here since this is just a random pick, not a real cascade */
const FILLER_METAL_TYPES = ['MIL-70S-3', 'MIL-70S-6', 'MIL-80S-50', 'MIL-80S-D2', 'MIL-90S-B3', 'MIL-100S-1'];
const FILLER_METAL_SIZES = ['1/16"', '3/32"', '1/8"', '5/32"', '3/16"', '1/4"'];

/* Location = shop, same pool as Fabrication's Location field; Specific Location = where within it */
const SPECIFIC_LOCATIONS = ['Bay 1, Rack 3', 'Bay 2, Rack 7', 'Bay 3, Rack 1', 'Bay 4, Rack 12', 'Bay 5, Rack 5', 'Cell 2, Line B', 'Pad C, Yard 1', 'Yard 1, Row 4'];

/* shipboard location, used instead of shop/bay when there's no XREFID -- compartment-number style
   codes (e.g. "2 150 P HAB"), not descriptive text; P/S/CL and Usage reuse Fabrication's own
   pscl/usage option sets (workflow.ts FABRICATION_FIELDS) rather than a separate invented pool,
   Usage abbreviated to a short code instead of the full label. 2026-09-23, replacing earlier
   descriptive placeholders ('1st Platform', 'Fr 156', 'Fuel Oil Tank', a separate CL offset field). */
const DECKS = ['01', '02', '03', '1', '2', '3', '4'];
const FRAMES = ['12', '26', '45', '60', '88', '104', '130', '150', '156', '172'];
const PSCL_OPTIONS = ['P', 'S', 'CL'];
const USAGE_POOL = ['GALY', 'LIVE', 'HAB', 'ENGR', 'CARGO', 'DK', 'TANK', 'MACH', 'OTHR'];

const JOB_DESCRIPTIONS = [
  'Main deck framing, structural butt weld', 'Bulkhead penetration, pipe-to-shell weld', 'Hull plating seam, longitudinal joint',
  'Foundation bracket, fillet weld to deck', 'Ballast tank baffle, structural tee joint', 'Piping spool, header to reducer',
  'Superstructure frame, corner weld', 'Engine room grating support weld', 'Shell plate insert, repair weld',
];

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateAssignments(): Assignment[] {
  const rand = seeded(42);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const assignments: Assignment[] = [];
  const shops = getShops();

  const rolesByRouting: Record<string, string[]> = {
    'Pre-Fit': ['NQC Inspector'],
    'Fit': ['Fitting'],
    'Tack': ['Welding'],
    /* picked per assignment below, split between the two roles rather than both at once */
    'Fit-Up Release': ['Foreman'],
    'Deferred Tack': ['Welding'],
    'Root': ['Welding'],
    'Root NDT UT/RT': ['NQC Inspector'],
    'Root NDT MT/PT': ['NQC Inspector'],
    'Root NDT VT/5X': ['NQC Inspector'],
    'Layer': ['Welding'],
    'Layer NDT UT/RT': ['NQC Inspector'],
    'Layer NDT VT/5X': ['NQC Inspector'],
    'Layer NDT MT/PT': ['NQC Inspector'],
    'Final Weld': ['Welding'],
    'Final NDT UT/RT': ['NQC Inspector'],
    'Final NDT MT/PT': ['NQC Inspector'],
    'Final NDT VT/5X': ['NQC Inspector'],
    'O63 Review': ['O63 Records'],
    'O04 Review': ['O04 Records'],
  };

  /* explicit routing mix (rather than a flat random pick across all 19 routings) so every role
     the demo cares about — including the rarer ones like Fitting and O63/O04 Records — ends up
     with a handful of assignments instead of maybe zero or one */
  const ROUTING_SEQUENCE = [
    ...Array(8).fill('Tack'), ...Array(4).fill('Root'), ...Array(4).fill('Layer'), ...Array(4).fill('Final Weld'), ...Array(2).fill('Deferred Tack'),   // Welding
    ...Array(4).fill('Pre-Fit'), ...Array(3).fill('Root NDT UT/RT'), ...Array(3).fill('Layer NDT VT/5X'), ...Array(3).fill('Final NDT MT/PT'),          // NQC Inspector
    ...Array(4).fill('Fit'),               // Fitting
    ...Array(4).fill('Fit-Up Insp'),        // Inspector (+ Foreman)
    ...Array(2).fill('Fit-Up Release'),     // Foreman
    ...Array(2).fill('O63 Review'), ...Array(2).fill('O04 Review'),   // O63/O04 Records
  ];
  /* seeded shuffle so the mix above doesn't render in the same block order every time */
  for (let i = ROUTING_SEQUENCE.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ROUTING_SEQUENCE[i], ROUTING_SEQUENCE[j]] = [ROUTING_SEQUENCE[j], ROUTING_SEQUENCE[i]];
  }

  for (let i = 0; i < ROUTING_SEQUENCE.length; i++) {
    const job = pick(JOBS);
    const routing = ROUTING_SEQUENCE[i];
    const dayOffset = Math.floor(rand() * 14);
    const due = new Date(Date.now() + dayOffset * 86400000);
    const assigned = new Date(Date.now() - Math.floor(rand() * 7) * 86400000);
    const expires = new Date(Date.now() + ((i * 3) % 7) * 86400000);
    const assignedRoles = routing === 'Fit-Up Insp' ? [pick(['Inspector', 'Foreman'])] : (rolesByRouting[routing] || ['View']);
    const primaryRole = assignedRoles[0];
    const xrefidBlank = i % 4 === 0;   /* XREFID blank ~25% of the time, same as Weld Planning's records */

    assignments.push({
      id: `A${String(i + 1).padStart(3, '0')}`,
      assignmentNumber: String(i + 1).padStart(6, '0'),
      jobId: xrefidBlank ? '' : job.id,
      hull: job.hull,
      drawing: job.drawing,
      joint: job.joint,
      trade: job.trade,
      routing,
      /* a blank XREFID doesn't by itself mean "on the ship" — most still track to a shop/bay
         like any other assignment; only a couple of examples get the shipboard treatment below */
      location: pick(shops),
      specificLocation: pick(SPECIFIC_LOCATIONS),
      deck: '',
      frame: '',
      pscl: '',
      usage: '',
      assignedRoles,
      source: pick(SOURCES_BY_ROLE[primaryRole] ?? ['ERP']),
      dueDate: due.toISOString().slice(0, 10),
      expirationDate: expires.toISOString().slice(0, 10),
      assignedDate: assigned.toISOString().slice(0, 10),
      assignedBy: pick(ASSIGNEES),
      jobDescription: pick(JOB_DESCRIPTIONS),
      charge: String(100000000 + Math.floor(rand() * 900000000)),
      details: primaryRole === 'Welding' ? [
        { label: 'Filler Metal Type', value: pick(FILLER_METAL_TYPES) },
        { label: 'Filler Metal Size', value: pick(FILLER_METAL_SIZES) },
        { label: 'WTN', value: pick(allWtns()) },
      ] : [],
    });
  }

  /* just a couple of shipboard-location examples, not every XREFID-blank record: one guaranteed
     near the top of the default My Assignments view (Welding role, sorted by due date), one more
     picked from elsewhere among the blank-XREFID records for variety */
  const toShip = (a: Assignment) => {
    a.jobId = '';
    a.location = 'Ship';
    a.specificLocation = '';
    a.deck = pick(DECKS);
    a.frame = pick(FRAMES);
    a.pscl = pick(PSCL_OPTIONS);
    a.usage = pick(USAGE_POOL);
  };
  const earliestWelding = [...assignments]
    .filter(a => a.assignedRoles.includes('Welding'))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  if (earliestWelding) toShip(earliestWelding);
  const anotherBlank = assignments.find(a => !a.jobId && a !== earliestWelding && a.deck === '');
  if (anotherBlank) toShip(anotherBlank);

  return assignments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export const ASSIGNMENTS = generateAssignments();
