/* Weld Planning - Data Layer
   Self-contained data module for the Weld Planning system.
   All data is persisted to localStorage (no backend).
   Keys prefixed with "wp:" to avoid collision with Pipe Welding system. */
import { signal } from '@angular/core';
import { CsvColumn } from '../data/export-csv';

/* ── Joint Planning ── */
export type JointStatus = 'development' | 'locked' | 'unlocked';

export const JOINT_STATUS_OPTIONS: { label: string; value: JointStatus }[] = [
  { label: 'Development', value: 'development' },
  { label: 'Locked', value: 'locked' },
  { label: 'Unlocked', value: 'unlocked' },
];

export type JointPriority = 'low' | 'medium' | 'high' | 'critical';

export const JOINT_PRIORITY_OPTIONS: { label: string; value: JointPriority }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

export type JointType = 'pipe' | 'structural';

export const JOINT_TYPE_OPTIONS: { label: string; value: JointType }[] = [
  { label: 'Pipe', value: 'pipe' },
  { label: 'Structural', value: 'structural' },
];

export interface JointPlan {
  id: string;
  jointNumber: string;
  projectNumber: string;
  joint: string;
  title: string;
  description: string;
  status: JointStatus;
  priority: JointPriority;
  jointType: JointType;
  drawing: string;
  drawingRev: string;
  jointDesign: string;
  weldType: string;
  pipeSize: string;
  wallThickness: string;
  materialType1: string;
  materialType2: string;
  wps: string;
  ndt: string;
  pwht: string;
  assignedTo: string;
  estimatedHours: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
const TECHNICIANS = ['Mike R.', 'Sara L.', 'Tom B.', 'Dave K.', 'Priya N.', 'Luis G.', 'Emma W.'];
const PROJECTS = ['PRJ-001', 'PRJ-002', 'PRJ-003', 'PRJ-004', 'PRJ-005'];
const JOINTS_POOL = ['J-001', 'J-002', 'J-003', 'J-004', 'J-005', 'J-006', 'J-007', 'J-008'];

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
    const statuses: JointStatus[] = ['development', 'locked', 'unlocked'];
    const priorities: JointPriority[] = ['low', 'medium', 'high', 'critical'];
    const types: JointType[] = ['pipe', 'structural'];
    const jt = i % 3 === 0 ? 'structural' : pick(types);
    const createdAt = new Date(Date.now() - Math.floor(rand() * 60) * 24 * 60 * 60 * 1000);

    out.push({
      id: makeId(i + 1),
      jointNumber: `JP-${String(1000 + i).slice(1)}`,
      projectNumber: pick(PROJECTS),
      joint: pick(JOINTS_POOL),
      title: `Joint Plan ${String.fromCharCode(65 + (i % 26))}-${i}`,
      description: `${jt} weld joint plan for ${pick(JOINT_DESIGNS)} connection`,
      status: pick(statuses),
      priority: pick(priorities),
      jointType: jt,
      drawing: `DWG-${100 + i}`,
      drawingRev: pick(['A', 'B', 'C', 'D']),
      jointDesign: pick(JOINT_DESIGNS),
      weldType: pick(WELD_TYPES),
      pipeSize: jt === 'pipe' ? pick(PIPE_SIZES) : '',
      wallThickness: jt === 'pipe' ? pick(WALL_THICKNESSES) : '',
      materialType1: pick(MATERIALS_1),
      materialType2: pick(MATERIALS_2),
      wps: pick(WPS_POOL),
      ndt: pick(NDT_POOL),
      pwht: pick(PWHT_POOL),
      assignedTo: pick(TECHNICIANS),
      estimatedHours: Math.round((0.5 + rand() * 16) * 10) / 10,
      notes: i % 4 === 0 ? 'Standard weld procedure per WPS' : '',
      createdBy: 'System',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
  }
  return out;
}

/* ── localStorage persistence ── */
const LS_KEY = 'wp:joint-plans:v1';

function loadJointPlans(): JointPlan[] {
  const projPool = [...PROJECTS];
  const jointPool = [...JOINTS_POOL];
  const pickFrom = <T>(arr: T[], idx: number): T => arr[idx % arr.length];

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.map((j: any, i: number) => ({
        ...j,
        jointType: j.jointType || 'pipe',
        projectNumber: j.projectNumber || pickFrom(projPool, i),
        joint: j.joint || pickFrom(jointPool, i),
      }));
    }
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

/* ── Bulk import ── */
export function importJointPlans(rows: Record<string, string>[]): number {
  const now = new Date().toISOString();
  const newJoints: JointPlan[] = rows.map((row, idx) => ({
    id: (row['id'] as string) || makeId(Date.now() + idx),
    jointNumber: (row['jointNumber'] || row['joint_number'] || '') as string,
    projectNumber: (row['projectNumber'] || row['project_number'] || '') as string,
    joint: (row['joint'] || '') as string,
    title: (row['title'] || 'Untitled') as string,
    description: (row['description'] || '') as string,
        status: (row['status'] || 'development') as JointStatus,
    priority: (row['priority'] || 'medium') as JointPriority,
    jointType: (row['jointType'] || row['joint_type'] || 'pipe') as JointType,
    drawing: (row['drawing'] || '') as string,
    drawingRev: (row['drawingRev'] || row['drawing_rev'] || '') as string,
    jointDesign: (row['jointDesign'] || row['joint_design'] || '') as string,
    weldType: (row['weldType'] || row['weld_type'] || '') as string,
    pipeSize: (row['pipeSize'] || row['pipe_size'] || '') as string,
    wallThickness: (row['wallThickness'] || row['wall_thickness'] || '') as string,
    materialType1: (row['materialType1'] || row['material_1'] || '') as string,
    materialType2: (row['materialType2'] || row['material_2'] || '') as string,
    wps: (row['wps'] || '') as string,
    ndt: (row['ndt'] || '') as string,
    pwht: (row['pwht'] || '') as string,
    assignedTo: (row['assignedTo'] || row['assigned_to'] || '') as string,
    estimatedHours: parseFloat(row['estimatedHours'] || row['estimated_hours'] || '0') || 0,
    notes: (row['notes'] || '') as string,
    createdBy: 'Import',
    createdAt: (row['createdAt'] || row['created_at'] || now) as string,
    updatedAt: now,
  }));
  let count = 0;
  jointPlans.update(list => {
    const next = [...list, ...newJoints];
    count = newJoints.length;
    persistJointPlans(next);
    return next;
  });
  return count;
}

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
  { header: 'ID', value: r => r.id },
  { header: 'Joint #', value: r => r.jointNumber },
  { header: 'Project', value: r => r.projectNumber },
  { header: 'Joint', value: r => r.joint },
  { header: 'Type', value: r => r.jointType },
  { header: 'Title', value: r => r.title },
  { header: 'Status', value: r => r.status },
  { header: 'Priority', value: r => r.priority },
  { header: 'Drawing', value: r => r.drawing },
  { header: 'Drawing Rev', value: r => r.drawingRev },
  { header: 'Joint Design', value: r => r.jointDesign },
  { header: 'Weld Type', value: r => r.weldType },
  { header: 'Pipe Size', value: r => r.pipeSize },
  { header: 'Wall Thickness', value: r => r.wallThickness },
  { header: 'Material 1', value: r => r.materialType1 },
  { header: 'Material 2', value: r => r.materialType2 },
  { header: 'WPS', value: r => r.wps },
  { header: 'NDT', value: r => r.ndt },
  { header: 'PWHT', value: r => r.pwht },
  { header: 'Assigned To', value: r => r.assignedTo },
  { header: 'Est. Hours', value: r => r.estimatedHours },
  { header: 'Notes', value: r => r.notes },
];

/* ── CSV Import: parse CSV text into row objects ── */
export function parseCsvImport(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
  return lines.slice(1).map(line => {
    const cells = line.split(',').map(c => c.trim().replace(/['"]/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { if (cells[i]) row[h] = cells[i]; });
    return row;
  });
}

/* ── XLSX Import ── */
export async function parseXlsxImport(file: File): Promise<Record<string, string>[]> {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
}

/* ── XLSX Template Download ── */
export async function downloadXlsxTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const headers = [
    'jointNumber', 'projectNumber', 'joint', 'title', 'description',
    'status', 'priority', 'jointType', 'drawing', 'drawingRev',
    'jointDesign', 'weldType', 'pipeSize', 'wallThickness',
    'materialType1', 'materialType2', 'wps', 'ndt', 'pwht',
    'assignedTo', 'estimatedHours', 'notes'
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
  XLSX.writeFile(wb, 'weld-planning-import-template.xlsx');
}
