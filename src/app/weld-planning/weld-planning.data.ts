/* Weld Planning - Data Layer
   Self-contained data module for the Weld Planning system.
   All data is persisted to localStorage (no backend).
   Storage keys live in data/storage-keys.ts. */
import { STORAGE } from '../data/storage-keys';
import {
  jointNumbers, WELD_TYPES, PIPE_SIZES, WALL_THICKNESSES, MATERIALS_1, MATERIALS_2,
  NDT_REQUIREMENT_VALUES, RT_ROOT_WEIGHTS, RT_FINAL_WEIGHTS
} from '../data/jobs';
import { RT_DEGREE_OPTIONS } from '../data/workflow';
import { signal } from '@angular/core';
import { CsvColumn } from '../data/export-csv';
import { JOINT_DESIGN_LABELS } from '../data/joint-designs';

/* ── Joints ── */
export type JointStatus = 'development' | 'locked' | 'unlocked';

export const JOINT_STATUS_OPTIONS: { label: string; value: JointStatus }[] = [
  { label: 'Development', value: 'development' },
  { label: 'Locked', value: 'locked' },
  { label: 'Unlocked', value: 'unlocked' },
];

export type JointPriority = 'low' | 'medium' | 'high' | 'critical';

export type JointType = 'pipe' | 'structural';

export const JOINT_TYPE_OPTIONS: { label: string; value: JointType }[] = [
  { label: 'Pipe', value: 'pipe' },
  { label: 'Structural', value: 'structural' },
];

/* NDT requirements, the same seven fields as the weld record's joint details, with the weld record's
   own values: RT Root/Final = degree of RT, NDT Root/Each/Final = NDT method. UT and VT have no
   stored requirement on the weld record, so they keep blank/X/5X for now. Blank = not set yet. */
const RT_MARKS = ['', ...RT_DEGREE_OPTIONS.map(o => o.value)];
const NDT_METHOD_MARKS = ['', ...NDT_REQUIREMENT_VALUES];
export const NDT_MARKS = ['', 'X', '5X'];
export const NDT_FIELDS = [
  { key: 'rtRoot', label: 'RT Root', options: RT_MARKS }, { key: 'rtFinal', label: 'RT Final', options: RT_MARKS },
  { key: 'ndtRoot', label: 'NDT Root', options: NDT_METHOD_MARKS }, { key: 'ndtEach', label: 'NDT Each', options: NDT_METHOD_MARKS },
  { key: 'ndtFinal', label: 'NDT Final', options: NDT_METHOD_MARKS },
  { key: 'ut', label: 'UT', options: NDT_MARKS }, { key: 'vt', label: 'VT', options: NDT_MARKS },
] as const;

export interface WeldJoint {
  id: string;
  hull: string;
  joint: string;
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
  rtRoot: string;
  rtFinal: string;
  ndtRoot: string;
  ndtEach: string;
  ndtFinal: string;
  ut: string;
  vt: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Seed data pools ── */
const JOINT_DESIGNS = JOINT_DESIGN_LABELS;
/* pipe size, wall thickness and material pools are the weld record's (data/jobs.ts) */
const HULLS = ['K1001', 'K1002', 'K1003', 'K1004', 'K1005'];
/* joint = system-joint, e.g. ST-10005; each number repeats only 1-3 times, same generator as Weld Record's jobs */
const SEED_COUNT = 160;
const JOINTS_POOL = jointNumbers(SEED_COUNT, 11);

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

function generateSeededJoints(count = SEED_COUNT): WeldJoint[] {
  const rand = seeded(12345);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const pickWeighted = (weights: [string, number][]): string => {
    let r = rand() * weights.reduce((sum, [, w]) => sum + w, 0);
    for (const [v, w] of weights) if ((r -= w) < 0) return v;
    return weights[weights.length - 1][0];
  };
  const out: WeldJoint[] = [];

  for (let i = 0; i < count; i++) {
    const statuses: JointStatus[] = ['development', 'locked', 'unlocked'];
    const priorities: JointPriority[] = ['low', 'medium', 'high', 'critical'];
    const types: JointType[] = ['pipe', 'structural'];
    const jt = i % 3 === 0 ? 'structural' : pick(types);
    const createdAt = new Date(Date.now() - Math.floor(rand() * 60) * 24 * 60 * 60 * 1000);
    /* same rule as the weld record's seed: no RT degree for a phase whose NDT is UT */
    const ndtRoot = pick(NDT_REQUIREMENT_VALUES);
    const ndtFinal = pick(NDT_REQUIREMENT_VALUES);

    out.push({
      id: i % 4 === 0 ? '' : makeId(i + 1),
      hull: pick(HULLS),
      joint: JOINTS_POOL[i % JOINTS_POOL.length],
      description: `${jt} weld joint for ${pick(JOINT_DESIGNS)} connection`,
      status: pick(statuses),
      priority: pick(priorities),
      jointType: jt,
      drawing: `${i % 3 === 0 ? 'S' : 'H'}7${String(111000 + i * 37).padStart(6, '0')}`,   /* letter + 7 digits */
      drawingRev: pick(['A', 'B', 'C', 'D']),
      jointDesign: pick(JOINT_DESIGNS),
      weldType: pick(WELD_TYPES),
      pipeSize: jt === 'pipe' ? pick(PIPE_SIZES) : '',
      wallThickness: jt === 'pipe' ? pick(WALL_THICKNESSES) : '',
      materialType1: pick(MATERIALS_1),
      materialType2: pick(MATERIALS_2),
      ndtRoot, ndtEach: pick(NDT_REQUIREMENT_VALUES), ndtFinal,
      rtRoot: ndtRoot === 'UT' ? '' : pickWeighted(RT_ROOT_WEIGHTS),
      rtFinal: ndtFinal === 'UT' ? '' : pickWeighted(RT_FINAL_WEIGHTS),
      ut: pick(NDT_MARKS), vt: pick(NDT_MARKS),
      notes: i % 4 === 0 ? 'Standard GWP per WPS' : '',
      createdBy: 'System',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
  }
  return out;
}

/* ── localStorage persistence ── */
const LS_KEY = STORAGE.weldJoints;

function loadWeldJoints(): WeldJoint[] {
  const hullPool = [...HULLS];
  const jointPool = [...JOINTS_POOL];
  const pickFrom = <T>(arr: T[], idx: number): T => arr[idx % arr.length];

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const statusMap: Record<string, JointStatus> = {
        'planned': 'development', 'in-progress': 'development', 'completed': 'unlocked',
        'on-hold': 'locked', 'cancelled': 'locked',
      };
      return parsed.map((j: any, i: number) => ({
        ...j,
        jointType: j.jointType || 'pipe',
        hull: j.hull || pickFrom(hullPool, i),
        joint: j.joint || pickFrom(jointPool, i),
        status: statusMap[j.status] || j.status || 'development',
      }));
    }
  } catch { /* ignore */ }
  const seeded = generateSeededJoints();
  persistWeldJoints(seeded);
  return seeded;
}

function persistWeldJoints(joints: WeldJoint[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(joints)); } catch { /* */ }
}

/* ── Reactive store ── */
export const weldJoints = signal<WeldJoint[]>(loadWeldJoints());

export function addWeldJoint(joint: Omit<WeldJoint, 'id' | 'createdAt' | 'updatedAt'>): WeldJoint {
  const now = new Date().toISOString();
  const newJoint: WeldJoint = {
    ...joint,
    id: makeId(Date.now()),
    createdAt: now,
    updatedAt: now,
  };
  weldJoints.update(list => {
    const next = [...list, newJoint];
    persistWeldJoints(next);
    return next;
  });
  return newJoint;
}

export function updateWeldJoint(id: string, updates: Partial<WeldJoint>): void {
  weldJoints.update(list => {
    const next = list.map(j => j.id === id ? { ...j, ...updates, updatedAt: new Date().toISOString() } : j);
    persistWeldJoints(next);
    return next;
  });
}

export function deleteWeldJoint(id: string): void {
  weldJoints.update(list => {
    const next = list.filter(j => j.id !== id);
    persistWeldJoints(next);
    return next;
  });
}

export function getWeldJoint(id: string): WeldJoint | undefined {
  return weldJoints().find(j => j.id === id);
}

/* ── Admin: Joint Design options (persisted to localStorage) ── */
const ADMIN_DESIGNS_KEY = STORAGE.adminJointDesigns;

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

/* ── CSV Export columns ── */
export const WELD_JOINT_CSV_COLUMNS: CsvColumn<WeldJoint>[] = [
  { header: 'XREFID', value: r => r.id },
  { header: 'Hull', value: r => r.hull },
  { header: 'Joint', value: r => r.joint },
  { header: 'Type', value: r => r.jointType },
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
  ...NDT_FIELDS.map(f => ({ header: f.label, value: (r: WeldJoint) => r[f.key] })),
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
    'hull', 'joint', 'description',
    'status', 'priority', 'jointType', 'drawing', 'drawingRev',
    'jointDesign', 'weldType', 'pipeSize', 'wallThickness',
    'materialType1', 'materialType2', ...NDT_FIELDS.map(f => f.key),
    'notes'
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
  XLSX.writeFile(wb, 'weld-planning-import-template.xlsx');
}
