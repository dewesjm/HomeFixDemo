/* Mock assignments data — simulates work items assigned from an external system */
import { JOBS } from './jobs';
import { getShops } from './workflow';

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
  ps: string;      /* Port / Starboard / CL */
  cl: string;      /* offset from centerline */
  usage: string;   /* compartment usage/purpose */
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
  'Records Retention': ['EWR'],
  'View': ['ERP'],
};

const ASSIGNEES = ['J. Carter', 'M. Nguyen', 'R. Patel', 'S. Williams', 'T. Garcia', 'A. Singh', 'K. Brown', 'L. Chen'];

/* demo only: same option lists Weld Planning's welding stages use, standing in for what eWICC would send over */
const FILLER_METAL_TYPES = ['E6010', 'E6013', 'E7018', 'ER70S-6', 'ER80S-D2', 'ENiCrMo-3'];
const FILLER_METAL_SIZES = ['1/16"', '3/32"', '1/8"', '5/32"', '3/16"', '1/4"'];
const WTNS = ['07:11.5-3', '07:12.0-1', '08:14.2-2', '09:10.8-4'];

/* Location = shop, same pool as Fabrication's Location field; Specific Location = where within it */
const SPECIFIC_LOCATIONS = ['Bay 1, Rack 3', 'Bay 2, Rack 7', 'Bay 3, Rack 1', 'Bay 4, Rack 12', 'Bay 5, Rack 5', 'Cell 2, Line B', 'Pad C, Yard 1', 'Yard 1, Row 4'];

/* shipboard location, used instead of shop/bay when there's no XREFID */
const DECKS = ['01 Level', '02 Level', '03 Level', 'Main Deck', '1st Platform', '2nd Platform', '3rd Platform', 'Hold'];
const FRAMES = ['Fr 12', 'Fr 26', 'Fr 45', 'Fr 60', 'Fr 88', 'Fr 104', 'Fr 130', 'Fr 156', 'Fr 172'];
const PS_OPTIONS = ['Port', 'Starboard', 'CL'];
const CL_OFFSETS = ['On CL', "2'-0\"", "4'-6\"", "6'-3\"", "8'-9\"", "11'-0\""];
const USAGE_POOL = ['Void', 'Fuel Oil Tank', 'Ballast Tank', 'Machinery Room', 'Berthing', 'Passageway', 'Magazine', 'Sonar Dome', 'Pump Room'];

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
    'Review': ['Records Retention'],
  };

  /* explicit routing mix (rather than a flat random pick across all 19 routings) so every role
     the demo cares about — including the rarer ones like Fitting and Records Retention — ends up
     with a handful of assignments instead of maybe zero or one */
  const ROUTING_SEQUENCE = [
    ...Array(8).fill('Tack'), ...Array(4).fill('Root'), ...Array(4).fill('Layer'), ...Array(4).fill('Final Weld'), ...Array(2).fill('Deferred Tack'),   // Welding
    ...Array(4).fill('Pre-Fit'), ...Array(3).fill('Root NDT UT/RT'), ...Array(3).fill('Layer NDT VT/5X'), ...Array(3).fill('Final NDT MT/PT'),          // NQC Inspector
    ...Array(4).fill('Fit'),               // Fitting
    ...Array(4).fill('Fit-Up Insp'),        // Inspector (+ Foreman)
    ...Array(2).fill('Fit-Up Release'),     // Foreman
    ...Array(3).fill('Review'),             // Records Retention
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
      location: xrefidBlank ? 'Ship' : pick(shops),
      specificLocation: xrefidBlank ? '' : pick(SPECIFIC_LOCATIONS),
      deck: xrefidBlank ? pick(DECKS) : '',
      frame: xrefidBlank ? pick(FRAMES) : '',
      ps: xrefidBlank ? pick(PS_OPTIONS) : '',
      cl: xrefidBlank ? pick(CL_OFFSETS) : '',
      usage: xrefidBlank ? pick(USAGE_POOL) : '',
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
        { label: 'WTN', value: pick(WTNS) },
      ] : [],
    });
  }

  /* guarantee at least one XREFID-blank (ship-location) example lands near the top of the
     default My Assignments view (Welding role, sorted by due date) */
  const weldingBlankExists = assignments.some(a => a.assignedRoles.includes('Welding') && !a.jobId);
  if (!weldingBlankExists) {
    const earliestWelding = [...assignments]
      .filter(a => a.assignedRoles.includes('Welding'))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    if (earliestWelding) {
      earliestWelding.jobId = '';
      earliestWelding.location = 'Ship';
      earliestWelding.specificLocation = '';
      earliestWelding.deck = pick(DECKS);
      earliestWelding.frame = pick(FRAMES);
      earliestWelding.ps = pick(PS_OPTIONS);
      earliestWelding.cl = pick(CL_OFFSETS);
      earliestWelding.usage = pick(USAGE_POOL);
    }
  }

  return assignments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export const ASSIGNMENTS = generateAssignments();
