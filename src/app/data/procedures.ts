/* Weld Engineering - Procedures data layer
   Self-contained data module for the Weld Engineering "Procedure Lookup" system.
   All data is persisted to localStorage (no backend). Storage keys live in data/storage-keys.ts.
   Kept separate from Weld Record's WTN maps in joint-page.component.ts for now (see ARCHITECTURE.md);
   integrating them is a deliberate future step, not done here. */
import { STORAGE } from './storage-keys';
import { signal } from '@angular/core';
import { CsvColumn } from './export-csv';

export type ProcedureStatus = 'active' | 'draft' | 'retired';

export const PROCEDURE_STATUS_OPTIONS: { label: string; value: ProcedureStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Retired', value: 'retired' },
];

/* same four WTN codes used across Weld Record (workflow.ts, joint-page.component.ts, assignments.ts) */
export const WTN_POOL = ['07:11.5-3', '07:12.0-1', '08:14.2-2', '09:10.8-4'];
export const WELD_PROCESSES = ['SMAW', 'GTAW', 'GMAW', 'FCAW'];

export interface Procedure {
  id: string;               /* 'W-123' -- the lookup key, user-facing */
  title: string;
  status: ProcedureStatus;
  wtns: string[];            /* applicable WTNs */
  weldProcess: string;
  phMin: string; phMax: string; ipMin: string; ipMax: string;               /* 'NC' = no limit, blank = not set */
  overridePhMin: string; overridePhMax: string; overrideIpMin: string; overrideIpMax: string; overrideNote: string;
  rules: string[];
  conditions: string[];
  qualificationsRequired: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Seed data pools ── */
const RULE_POOL = [
  'Preheat required for base metal thickness over 1 inch.',
  'Interpass temperature shall not exceed 350°F.',
  'Backing gas required for all root passes.',
  'Visual inspection required prior to any NDT.',
  'Filler metal shall match base metal chemistry per WPS.',
  'PWHT required when specified on the drawing.',
  'Weld sequence shall follow the joint design order.',
  'Tack welds shall be incorporated into the final weld or removed.',
];
const CONDITION_POOL = [
  'Applies to shop welding only.',
  'Applies to field welding only.',
  'Not valid for nuclear-indicator joints without engineering approval.',
  'Requires qualified welder certification on file.',
  'Ambient temperature shall be above 32°F during welding.',
  'Requires wind shielding for outdoor applications.',
];
const QUALIFICATION_POOL = [
  'ASME Section IX welder qualification',
  'AWS D1.1 structural welder certification',
  'Position qualification: 6G',
  'Position qualification: 2G/5G',
  'Nuclear-grade welder certification',
  'Stainless steel qualification endorsement',
];

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pickSome<T>(pool: T[], rand: () => number, min: number, max: number): T[] {
  const count = min + Math.floor(rand() * (max - min + 1));
  const shuffled = [...pool].sort(() => rand() - 0.5);
  return shuffled.slice(0, count);
}

function generateProcedures(count = 100): Procedure[] {
  const rand = seeded(777);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const out: Procedure[] = [];

  for (let i = 0; i < count; i++) {
    const createdAt = new Date(Date.now() - Math.floor(rand() * 400) * 24 * 60 * 60 * 1000);
    const hasOverride = rand() < 0.3;
    const statuses: ProcedureStatus[] = ['active', 'active', 'active', 'draft', 'retired']; /* mostly active */

    out.push({
      id: `W-${100 + i}`,
      title: `${pick(WELD_PROCESSES)} procedure for ${pick(['pipe', 'structural'])} joints`,
      status: pick(statuses),
      wtns: pickSome(WTN_POOL, rand, 1, 2),
      weldProcess: pick(WELD_PROCESSES),
      phMin: rand() < 0.15 ? 'NC' : String(100 + Math.floor(rand() * 60)),
      phMax: String(160 + Math.floor(rand() * 60)),
      ipMin: rand() < 0.15 ? 'NC' : String(80 + Math.floor(rand() * 40)),
      ipMax: String(120 + Math.floor(rand() * 60)),
      overridePhMin: hasOverride ? String(90 + Math.floor(rand() * 40)) : '',
      overridePhMax: hasOverride ? String(150 + Math.floor(rand() * 60)) : '',
      overrideIpMin: hasOverride ? String(70 + Math.floor(rand() * 40)) : '',
      overrideIpMax: hasOverride ? String(110 + Math.floor(rand() * 60)) : '',
      overrideNote: hasOverride ? `Approved deviation per WPS-${String(1 + Math.floor(rand() * 20)).padStart(3, '0')}` : '',
      rules: pickSome(RULE_POOL, rand, 2, 4),
      conditions: pickSome(CONDITION_POOL, rand, 1, 3),
      qualificationsRequired: pickSome(QUALIFICATION_POOL, rand, 1, 2),
      createdBy: 'System',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
  }
  return out;
}

/* ── localStorage persistence ── */
const LS_KEY = STORAGE.procedures;

function loadProcedures(): Procedure[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const seededList = generateProcedures();
  persistProcedures(seededList);
  return seededList;
}

function persistProcedures(list: Procedure[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

/* ── Reactive store ── */
export const procedures = signal<Procedure[]>(loadProcedures());

export function addProcedure(p: Omit<Procedure, 'createdAt' | 'updatedAt'>): Procedure {
  const now = new Date().toISOString();
  const newProcedure: Procedure = { ...p, createdAt: now, updatedAt: now };
  procedures.update(list => {
    const next = [...list, newProcedure];
    persistProcedures(next);
    return next;
  });
  return newProcedure;
}

export function updateProcedure(id: string, updates: Partial<Procedure>): void {
  procedures.update(list => {
    const next = list.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p);
    persistProcedures(next);
    return next;
  });
}

export function deleteProcedure(id: string): void {
  procedures.update(list => {
    const next = list.filter(p => p.id !== id);
    persistProcedures(next);
    return next;
  });
}

export function getProcedure(id: string): Procedure | undefined {
  return procedures().find(p => p.id === id);
}

/* ── CSV Export columns (Admin > Manage Procedures) ── */
export const PROCEDURE_CSV_COLUMNS: CsvColumn<Procedure>[] = [
  { header: 'Procedure', value: r => r.id },
  { header: 'Title', value: r => r.title },
  { header: 'Status', value: r => r.status },
  { header: 'WTNs', value: r => r.wtns.join('; ') },
  { header: 'Weld Process', value: r => r.weldProcess },
  { header: 'PH Min', value: r => r.phMin },
  { header: 'PH Max', value: r => r.phMax },
  { header: 'IP Min', value: r => r.ipMin },
  { header: 'IP Max', value: r => r.ipMax },
  { header: 'Rules', value: r => r.rules.join('; ') },
  { header: 'Conditions', value: r => r.conditions.join('; ') },
  { header: 'Qualifications Required', value: r => r.qualificationsRequired.join('; ') },
];

/* ── CSV/XLSX Import (Admin > Load Procedures) ── */
export function parseProcedureCsvImport(text: string): Record<string, string>[] {
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

export async function parseProcedureXlsxImport(file: File): Promise<Record<string, string>[]> {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
}

export async function downloadProcedureXlsxTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const headers = ['id', 'title', 'status', 'wtns', 'weldProcess', 'phMin', 'phMax', 'ipMin', 'ipMax', 'rules', 'conditions', 'qualificationsRequired'];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
  XLSX.writeFile(wb, 'procedures-import-template.xlsx');
}
