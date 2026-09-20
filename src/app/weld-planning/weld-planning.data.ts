/* Weld Planning - Data Layer
   Self-contained data module for the Weld Planning system.
   All data is persisted to localStorage (no backend).
   Keys prefixed with "wp:" to avoid collision with Pipe Welding system. */
import { signal, computed } from '@angular/core';
import { CsvColumn } from '../data/export-csv';

/* ── Joint Planning ── */
export type JointStatus = 'planned' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';

export const JOINT_STATUS_OPTIONS: { label: string; value: JointStatus }[] = [
  { label: 'Planned', value: 'planned' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'On Hold', value: 'on-hold' },
  { label: 'Cancelled', value: 'cancelled' },
];

export type JointPriority = 'low' | 'medium' | 'high' | 'critical';

export const JOINT_PRIORITY_OPTIONS: { label: string; value: JointPriority }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

export interface JointPlan {
  id: string;
  jointNumber: string;
  title: string;
  description: string;
  status: JointStatus;
  priority: JointPriority;
  jointDesign: string;
  weldType: string;
  pipeSize: string;
  wallThickness: string;
  materialType1: string;
  materialType2: string;
  wps: string;
  ndt: string;
  pwht: string;
  drawing: string;
  drawingRev: string;
  location: string;
  assignedTo: string;
  scheduledDate: string;
  estimatedHours: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  pipeWeldJobId?: string;
}

/* ── Seed data pools ── */
const JOINT_DESIGNS = ['BJ-G', 'BJ-S', 'FJ-G', 'FJ-S', 'LJ-G', 'LJ-S', 'CJ-G', 'CJ-S', 'EJ-G', 'EJ-S', 'TJ-G', 'TJ-S'];
const WELD_TYPES = ['SMAW', 'GMAW', 'GTAW', 'FCAW'];
const PIPE_SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"', '6"', '8"', '10"', '12"'];
const WALL_THICKNESSES = ['0.065"', '0.083"', '0.109"', '0.120"', '0.134"', '0.154"', '0.188"', '0.219"', '0.250"'];
const MATERIALS_1 = ['Carbon Steel', 'Stainless Steel 304', 'Stainless Steel 316', 'Alloy Steel', 'Aluminum'];
const MATERIALS_2 = ['E6010', 'E7018', 'ER70S-6', '308L SS', '316L SS'];
const WPS_POOL = ['WPS-001', 'WPS-002', 'WPS-003', 'WPS-004', 'WPS-005'];
const NDT_POOL = ['Visual only', 'VT + UT', 'VT + RT', 'VT + MT', 'VT + PT', 'VT + 5X'];
const PWHT_POOL = ['None', 'Required - 600C/2hr', 'Required - 620C/1hr', 'Pending review'];
const LOCATIONS = ['Shop A', 'Shop B', 'Building 4', 'Field - Onsite', 'Drydock Bay 1', 'Drydock Bay 2'];
const TECHNICIANS = ['Mike R.', 'Sara L.', 'Tom B.', 'Dave K.', 'Priya N.', 'Luis G.', 'Emma W.'];

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeId(seed: number): string {
  const rand = seeded(seed * 31 + 7);
  let code = '';
  for (let j = 0; j < 5; j++) code += ID_CHARS[Math.floor(rand() * ID_CHARS.length)];
  return code;
}

function generateSeededJoints(count = 80): JointPlan[] {
  const rand = seeded(12345);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const out: JointPlan[] = [];

  for (let i = 0; i < count; i++) {
    const statuses: JointStatus[] = ['planned', 'in-progress', 'completed', 'on-hold', 'cancelled'];
    const priorities: JointPriority[] = ['low', 'medium', 'high', 'critical'];
    const dayOffset = Math.floor(rand() * 120) - 30;
    const scheduledDate = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
    const createdAt = new Date(Date.now() - Math.floor(rand() * 60) * 24 * 60 * 60 * 1000);

    out.push({
      id: makeId(i + 1),
      jointNumber: `JP-${String(1000 + i).slice(1)}`,
      title: `Joint Plan ${String.fromCharCode(65 + (i % 26))}-${i}`,
      description: `Weld joint plan for ${pick(PIPE_SIZES)} ${pick(JOINT_DESIGNS)} connection`,
      status: pick(statuses),
      priority: pick(priorities),
      jointDesign: pick(JOINT_DESIGNS),
      weldType: pick(WELD_TYPES),
      pipeSize: pick(PIPE_SIZES),
      wallThickness: pick(WALL_THICKNESSES),
      materialType1: pick(MATERIALS_1),
      materialType2: pick(MATERIALS_2),
      wps: pick(WPS_POOL),
      ndt: pick(NDT_POOL),
      pwht: pick(PWHT_POOL),
      drawing: `DWG-${100 + i}`,
      drawingRev: pick(['A', 'B', 'C', 'D']),
      location: pick(LOCATIONS),
      assignedTo: pick(TECHNICIANS),
      scheduledDate: scheduledDate.toISOString(),
      estimatedHours: Math.round((0.5 + rand() * 16) * 10) / 10,
      notes: i % 4 === 0 ? 'Standard weld procedure per WPS' : '',
      createdBy: 'System',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      pipeWeldJobId: i % 3 === 0 ? makeId(i + 500) : undefined,
    });
  }
  return out;
}

/* ── localStorage persistence ── */
const LS_KEY = 'wp:joint-plans:v1';

function loadJointPlans(): JointPlan[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const seeded = generateSeededJoints();
  persistJointPlans(seeded);
  return seeded;
}

function persistJointPlans(joints: JointPlan[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(joints)); } catch { /* */ }
}

/* ── Reactive store ── */
export const jointPlans = signal<JointPlan[]>(loadJointPlans());

export function addJointPlan(joint: Omit<JointPlan, 'id' | 'createdAt' | 'updatedAt'>): JointPlan {
  const now = new Date().toISOString();
  const newJoint: JointPlan = {
    ...joint,
    id: makeId(Date.now()),
    createdAt: now,
    updatedAt: now,
  };
  jointPlans.update(list => {
    const next = [...list, newJoint];
    persistJointPlans(next);
    return next;
  });
  return newJoint;
}

export function updateJointPlan(id: string, updates: Partial<JointPlan>): void {
  jointPlans.update(list => {
    const next = list.map(j => j.id === id ? { ...j, ...updates, updatedAt: new Date().toISOString() } : j);
    persistJointPlans(next);
    return next;
  });
}

export function deleteJointPlan(id: string): void {
  jointPlans.update(list => {
    const next = list.filter(j => j.id !== id);
    persistJointPlans(next);
    return next;
  });
}

export function getJointPlan(id: string): JointPlan | undefined {
  return jointPlans().find(j => j.id === id);
}

/* ── Stats (computed) ── */
export const jointPlanStats = computed(() => {
  const all = jointPlans();
  return {
    total: all.length,
    planned: all.filter(j => j.status === 'planned').length,
    inProgress: all.filter(j => j.status === 'in-progress').length,
    completed: all.filter(j => j.status === 'completed').length,
    onHold: all.filter(j => j.status === 'on-hold').length,
    cancelled: all.filter(j => j.status === 'cancelled').length,
  };
});

/* ── Admin: Joint Design options (persisted to localStorage) ── */
const ADMIN_DESIGNS_KEY = 'wp:admin-joint-designs:v1';

export interface AdminJointDesign {
  code: string;
  label: string;
  active: boolean;
}

const DEFAULT_ADMIN_DESIGNS: AdminJointDesign[] = JOINT_DESIGNS.map(d => ({
  code: d.toLowerCase().replace(/[^a-z0-9]/g, '-'),
  label: d,
  active: true,
}));

export const adminJointDesigns = signal<AdminJointDesign[]>(loadAdminDesigns());

function loadAdminDesigns(): AdminJointDesign[] {
  try {
    const raw = localStorage.getItem(ADMIN_DESIGNS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return DEFAULT_ADMIN_DESIGNS;
}

export function persistAdminJointDesigns(designs: AdminJointDesign[]) {
  adminJointDesigns.set(designs);
  try { localStorage.setItem(ADMIN_DESIGNS_KEY, JSON.stringify(designs)); } catch { /* */ }
}

/* ── Admin: NDT options ── */
const ADMIN_NDT_KEY = 'wp:admin-ndt:v1';

export const adminNdtOptions = signal<string[]>(loadAdminNdt());

function loadAdminNdt(): string[] {
  try {
    const raw = localStorage.getItem(ADMIN_NDT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return [...NDT_POOL];
}

export function persistAdminNdtOptions(opts: string[]) {
  adminNdtOptions.set(opts);
  try { localStorage.setItem(ADMIN_NDT_KEY, JSON.stringify(opts)); } catch { /* */ }
}

/* ── Admin: PWHT options ── */
const ADMIN_PWHT_KEY = 'wp:admin-pwht:v1';

export const adminPwhtOptions = signal<string[]>(loadAdminPwht());

function loadAdminPwht(): string[] {
  try {
    const raw = localStorage.getItem(ADMIN_PWHT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return [...PWHT_POOL];
}

export function persistAdminPwhtOptions(opts: string[]) {
  adminPwhtOptions.set(opts);
  try { localStorage.setItem(ADMIN_PWHT_KEY, JSON.stringify(opts)); } catch { /* */ }
}

/* ── CSV Export columns ── */
export const JOINT_PLAN_CSV_COLUMNS: CsvColumn<JointPlan>[] = [
  { header: 'Joint #', value: r => r.jointNumber },
  { header: 'Title', value: r => r.title },
  { header: 'Status', value: r => r.status },
  { header: 'Priority', value: r => r.priority },
  { header: 'Joint Design', value: r => r.jointDesign },
  { header: 'Weld Type', value: r => r.weldType },
  { header: 'Pipe Size', value: r => r.pipeSize },
  { header: 'Wall Thickness', value: r => r.wallThickness },
  { header: 'Material 1', value: r => r.materialType1 },
  { header: 'Material 2', value: r => r.materialType2 },
  { header: 'WPS', value: r => r.wps },
  { header: 'NDT', value: r => r.ndt },
  { header: 'PWHT', value: r => r.pwht },
  { header: 'Drawing', value: r => r.drawing },
  { header: 'Location', value: r => r.location },
  { header: 'Assigned To', value: r => r.assignedTo },
  { header: 'Scheduled', value: r => r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString() : '' },
  { header: 'Est. Hours', value: r => r.estimatedHours },
  { header: 'Notes', value: r => r.notes },
];
