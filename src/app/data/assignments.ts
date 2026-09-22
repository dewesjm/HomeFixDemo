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
  dueDate: string;
  expirationDate: string;   /* seeded 0-6 days out, so always within a week */
  assignedDate: string;
  assignedBy: string;
  notes: string;
}

const ROUTINGS = [
  'Pre-Fit', 'Fit', 'Tack', 'Fit-Up Insp', 'Fit-Up Release', 'Deferred Tack',
  'Root', 'Root NDT UT/RT', 'Root NDT MT/PT', 'Root NDT VT/5X',
  'Layer', 'Layer NDT UT/RT', 'Layer NDT VT/5X', 'Layer NDT MT/PT',
  'Final Weld', 'Final NDT UT/RT', 'Final NDT MT/PT', 'Final NDT VT/5X',
  'Review',
];

const ASSIGNEES = ['J. Carter', 'M. Nguyen', 'R. Patel', 'S. Williams', 'T. Garcia', 'A. Singh', 'K. Brown', 'L. Chen'];

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
    'Fit-Up Insp': ['Inspector', 'Foreman'],
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

  for (let i = 0; i < 36; i++) {
    const job = pick(JOBS);
    const routing = pick(ROUTINGS);
    const dayOffset = Math.floor(rand() * 14);
    const due = new Date(Date.now() + dayOffset * 86400000);
    const assigned = new Date(Date.now() - Math.floor(rand() * 7) * 86400000);
    const expires = new Date(Date.now() + ((i * 3) % 7) * 86400000);

    assignments.push({
      id: `A${String(i + 1).padStart(3, '0')}`,
      assignmentNumber: `ASN-${String(i + 1).padStart(3, '0')}`,
      jobId: i % 4 === 0 ? '' : job.id,   /* XREFID blank ~25% of the time, same as Weld Planning's records */
      hull: job.hull,
      drawing: job.drawing,
      joint: job.joint,
      trade: job.trade,
      routing,
      location: pick(shops),
      specificLocation: pick(SPECIFIC_LOCATIONS),
      assignedRoles: rolesByRouting[routing] || ['View'],
      dueDate: due.toISOString().slice(0, 10),
      expirationDate: expires.toISOString().slice(0, 10),
      assignedDate: assigned.toISOString().slice(0, 10),
      assignedBy: pick(ASSIGNEES),
      notes: rand() < 0.3 ? pick(['Priority client', 'Rework required', 'Awaiting materials', '']) : '',
    });
  }

  return assignments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export const ASSIGNMENTS = generateAssignments();
