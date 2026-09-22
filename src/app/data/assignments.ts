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
  location: string;           /* shop, same list as Fabrication's Location field */
  specificLocation: string;   /* bay/rack within the shop, same idea as Fabrication's Specific Location */
  assignedRoles: string[];
  source: string;   /* demo only: which external system the assignment came from, by role */
  dueDate: string;
  expirationDate: string;   /* seeded 0-6 days out, so always within a week */
  assignedDate: string;
  assignedBy: string;
  notes: string;
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
const WTNS = ['WTN-101', 'WTN-102', 'WTN-103', 'WTN-201'];

/* Location = shop, same pool as Fabrication's Location field; Specific Location = where within it */
const SPECIFIC_LOCATIONS = ['Bay 1, Rack 3', 'Bay 2, Rack 7', 'Bay 3, Rack 1', 'Bay 4, Rack 12', 'Bay 5, Rack 5', 'Cell 2, Line B', 'Pad C, Yard 1', 'Yard 1, Row 4'];

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

    assignments.push({
      id: `A${String(i + 1).padStart(3, '0')}`,
      assignmentNumber: String(i + 1).padStart(6, '0'),
      jobId: i % 4 === 0 ? '' : job.id,   /* XREFID blank ~25% of the time, same as Weld Planning's records */
      hull: job.hull,
      drawing: job.drawing,
      joint: job.joint,
      trade: job.trade,
      routing,
      location: pick(shops),
      specificLocation: pick(SPECIFIC_LOCATIONS),
      assignedRoles,
      source: pick(SOURCES_BY_ROLE[primaryRole] ?? ['ERP']),
      dueDate: due.toISOString().slice(0, 10),
      expirationDate: expires.toISOString().slice(0, 10),
      assignedDate: assigned.toISOString().slice(0, 10),
      assignedBy: pick(ASSIGNEES),
      notes: rand() < 0.3 ? pick(['Priority client', 'Rework required', 'Awaiting materials', '']) : '',
      details: primaryRole === 'Welding' ? [
        { label: 'Filler Metal Type', value: pick(FILLER_METAL_TYPES) },
        { label: 'Filler Metal Size', value: pick(FILLER_METAL_SIZES) },
        { label: 'WTN', value: pick(WTNS) },
      ] : [],
    });
  }

  return assignments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export const ASSIGNMENTS = generateAssignments();
