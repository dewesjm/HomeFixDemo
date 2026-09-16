/* Mock assignments data — simulates work items assigned from an external system */
import { JOBS } from './jobs';

export type AssignmentPriority = 'low' | 'normal' | 'high';

export interface Assignment {
  id: string;
  assignmentNumber: string;
  jobId: string;
  jobNumber: string;
  jobTitle: string;
  drawing: string;
  joint: string;
  trade: string;
  step: string;
  hull: string;
  location: string;
  assignedRoles: string[];
  dueDate: string;
  assignedDate: string;
  assignedBy: string;
  notes: string;
}

const STEPS = [
  'Preparation', 'Fit-Up Release', 'Visual Inspection', 'Fit-Up',
  'Fit-Up Inspection', 'Root Pass', 'Hot Pass', 'Fill Pass', 'Cap Pass',
  'NDT Root Pass', 'NDT Final', 'UT', 'MCL Verification', 'Final Sign-off',
];

const ASSIGNEES = ['J. Carter', 'M. Nguyen', 'R. Patel', 'S. Williams', 'T. Garcia', 'A. Singh', 'K. Brown', 'L. Chen'];

const HULLS = ['Hull A', 'Hull B', 'Hull C', 'Hull D', 'Hull E'];
const LOCATIONS = ['Bay 1, Rack 3', 'Bay 2, Rack 7', 'Bay 3, Rack 1', 'Bay 4, Rack 12', 'Bay 5, Rack 5', 'Shop A', 'Shop B', 'Yard 1'];

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

  const rolesByStep: Record<string, string[]> = {
    'Preparation': ['Fitting'],
    'Fit-Up Release': ['Fitting', 'Foreman'],
    'Visual Inspection': ['Inspector'],
    'Fit-Up': ['Fitting'],
    'Fit-Up Inspection': ['Inspector', 'Foreman'],
    'Fabrication': ['Welding', 'Fitting'],
    'NDT Root Pass': ['NQC Inspector'],
    'NDT Each Pass': ['NQC Inspector'],
    'NDT Final': ['NQC Inspector'],
    'UT': ['NQC Inspector'],
    'MCL Verification': ['Inspector', 'Foreman'],
    'Final Sign-off': ['Foreman', 'Records'],
  };

  for (let i = 0; i < 18; i++) {
    const job = pick(JOBS);
    const step = pick(STEPS);
    const dayOffset = Math.floor(rand() * 14);
    const due = new Date(Date.now() + dayOffset * 86400000);
    const assigned = new Date(Date.now() - Math.floor(rand() * 7) * 86400000);

    assignments.push({
      id: `A${String(i + 1).padStart(3, '0')}`,
      assignmentNumber: `ASN-${String(i + 1).padStart(3, '0')}`,
      jobId: job.id,
      jobNumber: job.jobNumber,
      jobTitle: job.title,
      drawing: job.drawing,
      joint: job.joint,
      trade: job.trade,
      step,
      hull: pick(HULLS),
      location: pick(LOCATIONS),
      assignedRoles: rolesByStep[step] || ['View'],
      dueDate: due.toISOString().slice(0, 10),
      assignedDate: assigned.toISOString().slice(0, 10),
      assignedBy: pick(ASSIGNEES),
      notes: rand() < 0.3 ? pick(['Priority client', 'Rework required', 'Awaiting materials', '']) : '',
    });
  }

  return assignments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export const ASSIGNMENTS = generateAssignments();
