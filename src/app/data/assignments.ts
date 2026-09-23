/* Mock assignments data — simulates work items assigned from an external system */
import { JOBS } from './jobs';
import { getShops, seededWorkflow, currentRoutingLabel } from './workflow';
import { allWtns } from './procedures';

export interface Assignment {
  id: string;
  assignmentNumber: string;
  jobId: string;
  hull: string;
  drawing: string;
  joint: string;
  trade: string;
  /* no stored routing: My Assignments shows the linked job's live current routing, so it can't drift
     from what the joint page shows (see my-assignments.component.ts routingFor) */
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

  /* one or more real routing labels a role's assignments draw from, for variety within the role's
     own block -- role is assigned directly per entry below, not derived from the routing label, so
     every role (including the rarer ones like Inspector/Fitting/O63/O04 Records) gets an even,
     guaranteed count instead of some being a random coin-flip off another role's block (Inspector
     used to only exist as a 50/50 split of Fit-Up Insp with Foreman -- easy to end up with just
     one, or none). 2026-09-23, per the user: every role should land in the 5-10 range. */
  const ROLE_ROUTINGS: Record<string, string[]> = {
    'Welding': ['Tack', 'Root', 'Layer', 'Final Weld', 'Deferred Tack'],
    'NQC Inspector': ['Pre-Fit', 'Root NDT UT/RT', 'Layer NDT VT/5X', 'Final NDT MT/PT'],
    'Fitting': ['Fit'],
    'Inspector': ['Fit-Up Insp'],
    'Foreman': ['Fit-Up Insp', 'Fit-Up Release'],
    'O63 Records': ['O63 Records Review'],
    'O04 Records': ['O04 Records Review'],
  };
  /* each role gets its own random count in [5, 10] (not a flat number) -- deterministic since rand()
     is seeded, so the mix varies role to role the way real assignment volume would */
  const ROUTING_SEQUENCE: { role: string; routing: string }[] = [];
  for (const [role, routings] of Object.entries(ROLE_ROUTINGS)) {
    const count = 5 + Math.floor(rand() * 6);   // 5-10 inclusive
    for (let j = 0; j < count; j++) {
      ROUTING_SEQUENCE.push({ role, routing: routings[j % routings.length] });
    }
  }
  /* seeded shuffle so the mix above doesn't render in the same block order every time */
  for (let i = ROUTING_SEQUENCE.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ROUTING_SEQUENCE[i], ROUTING_SEQUENCE[j]] = [ROUTING_SEQUENCE[j], ROUTING_SEQUENCE[i]];
  }

  /* alternates a role's sources deterministically (not a random pick) so a role with more than one
     upstream system -- Inspector/NQC Inspector, SAIL and NCS -- is guaranteed to show at least one
     assignment from each, not left to chance with only PER_ROLE picks */
  const roleSourceIndex: Record<string, number> = {};
  const nextSource = (role: string): string => {
    const pool = SOURCES_BY_ROLE[role] ?? ['ERP'];
    const idx = (roleSourceIndex[role] ?? 0) % pool.length;
    roleSourceIndex[role] = idx + 1;
    return pool[idx];
  };

  /* jobs grouped by the routing they're seeded at, so an assignment lands on a job actually at
     that step instead of a random one; a label no job is seeded at (e.g. Deferred Tack) falls back
     to any job at one of the role's other routings */
  const jobsAtRouting = new Map<string, typeof JOBS>();
  for (const j of JOBS) {
    if (j._fresh) continue;
    const label = currentRoutingLabel(seededWorkflow(j).stages);
    jobsAtRouting.set(label, [...(jobsAtRouting.get(label) ?? []), j]);
  }
  const jobFor = (role: string, routing: string) => {
    const exact = jobsAtRouting.get(routing);
    if (exact?.length) return pick(exact);
    const nearby = ROLE_ROUTINGS[role].flatMap(r => jobsAtRouting.get(r) ?? []);
    return nearby.length ? pick(nearby) : pick(JOBS);
  };

  for (let i = 0; i < ROUTING_SEQUENCE.length; i++) {
    const { role: primaryRole, routing } = ROUTING_SEQUENCE[i];
    const job = jobFor(primaryRole, routing);
    const dayOffset = Math.floor(rand() * 14);
    const due = new Date(Date.now() + dayOffset * 86400000);
    const assigned = new Date(Date.now() - Math.floor(rand() * 7) * 86400000);
    const expires = new Date(Date.now() + ((i * 3) % 7) * 86400000);
    const assignedRoles = [primaryRole];
    const xrefidBlank = i % 4 === 0;   /* XREFID blank ~25% of the time, same as Weld Planning's records */

    assignments.push({
      id: `A${String(i + 1).padStart(3, '0')}`,
      assignmentNumber: String(i + 1).padStart(6, '0'),
      jobId: xrefidBlank ? '' : job.id,
      hull: job.hull,
      drawing: job.drawing,
      joint: job.joint,
      trade: job.trade,
      /* a blank XREFID doesn't by itself mean "on the ship" — most still track to a shop/bay
         like any other assignment; only a couple of examples get the shipboard treatment below */
      location: pick(shops),
      specificLocation: pick(SPECIFIC_LOCATIONS),
      deck: '',
      frame: '',
      pscl: '',
      usage: '',
      assignedRoles,
      source: nextSource(primaryRole),
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
