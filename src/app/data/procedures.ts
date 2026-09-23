/* Weld Engineering - Procedures data layer
   Self-contained data module for the Weld Engineering "Procedure Lookup" system.
   All data is persisted to localStorage (no backend). Storage keys live in data/storage-keys.ts.
   Kept separate from Weld Record's WTN maps in joint-page.component.ts for now (see ARCHITECTURE.md);
   integrating them is a deliberate future step, not done here. */
import { STORAGE } from './storage-keys';
import { signal } from '@angular/core';
import { CsvColumn } from './export-csv';
import { getWeldPositions } from './workflow';

export type ProcedureStatus = 'active' | 'draft' | 'retired';

export const PROCEDURE_STATUS_OPTIONS: { label: string; value: ProcedureStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Retired', value: 'retired' },
];

/* same four WTN codes used across Weld Record (workflow.ts, joint-page.component.ts, assignments.ts) */
export const WTN_POOL = ['07:11.5-3', '07:12.0-1', '08:14.2-2', '09:10.8-4'];
export const WELD_PROCESSES = ['SMAW', 'GTAW', 'GMAW', 'FCAW'];
export const PROCESS_TYPES = ['Manual', 'Semi-Automatic', 'Machine', 'Automatic'];
export const BASE_METAL_TYPES = ['Carbon Steel', 'Low Alloy Steel', 'Stainless Steel', 'Duplex Stainless', 'Nickel Alloy', 'Aluminum'];
/* same filler metal choices as Weld Record's stage fields (workflow.ts METAL_TYPE_OPTIONS) */
export const FILLER_METAL_TYPES = ['E6010', 'E6013', 'E7018', 'ER70S-6', 'ER80S-D2', 'ENiCrMo-3'];
export const JOINT_TYPES = ['Groove', 'Fillet', 'Plug', 'Edge'];
export const BACKING_OPTIONS = ['None', 'Backing Strip', 'Consumable Insert', 'Gas Backing'];
export const WELD_PROGRESSIONS = ['N/A', 'Uphill', 'Downhill'];
export const CURRENT_TYPES = ['AC', 'DCEP', 'DCEN'];

export interface RevisionNote {
  wpsRev: string;
  date: string;    /* ISO date */
  note: string;
  by: string;
}

/* The PDF (procedure-pdf.ts) is laid out as: Revision Record, then 1. Base Metal, 2. Joint Design,
   3. Welding Position, 4. Filler Metal, 5. Welder Qualifications, 6. Preheat & Interpass Temperatures,
   7. Equipment, 8. Gas, 9. Heat Input, 10. Parameters, 11. Heat Treatment. Fields below are grouped
   the same way. */
export interface Procedure {
  id: string;               /* 'W-123' -- the lookup key, user-facing, shown as "WPS" */
  title: string;
  status: ProcedureStatus;
  wtns: string[];            /* applicable WTNs */
  weldProcess: string;
  gwp: string;               /* governing WPS identifier, same concept as Weld Record's "GWP" field (workflow.ts weldProcedure) */
  wpsRev: string;
  effectiveDate: string;     /* ISO date */
  processType: string;

  /* 1. Base Metal */
  baseMetal1Type: string;
  baseMetal2Type: string;
  baseMetalThicknessMin: string;
  baseMetalThicknessMax: string;

  /* 2. Joint Design */
  jointType: string;
  grooveAngle: string;
  rootOpening: string;
  backing: string;

  /* 3. Welding Position */
  weldPosition: string;
  weldProgression: string;

  /* 4. Filler Metal */
  fillerMetalType: string;
  fillerMetalClassification: string;
  fillerMetalSizeRange: string;

  /* 5. Welder Qualifications -- see qualificationsRequired below */

  /* 6. Preheat & Interpass Temperatures */
  phMin: string; phMax: string; ipMin: string; ipMax: string;               /* 'NC' = no limit, blank = not set */
  overridePhMin: string; overridePhMax: string; overrideIpMin: string; overrideIpMax: string; overrideNote: string;

  /* 7. Equipment */
  currentType: string;
  powerSource: string;

  /* 8. Gas */
  shieldingGas: string;
  gasFlowRate: string;
  backingGas: string;

  /* 9. Heat Input */
  heatInputMin: string;
  heatInputMax: string;

  /* 10. Parameters */
  amperageRange: string;
  voltageRange: string;
  travelSpeedRange: string;

  /* 11. Heat Treatment */
  pwhtTemp: string;
  pwhtTime: string;

  rules: string[];
  conditions: string[];
  qualificationsRequired: string[];
  /* required whenever a change is saved to a procedure that is (or was) Active -- see
     requiresRevisionNote() in procedure-form.component.ts. Shown at the top of the PDF as "Revision Record". */
  revisionHistory: RevisionNote[];
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
const REVISION_NOTE_POOL = [
  'Updated preheat requirements per engineering review.',
  'Corrected filler metal size range.',
  'Added qualification requirement per updated code edition.',
  'Clarified applicable WTNs.',
  'Revised interpass temperature limits.',
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

    const id = `W-${100 + i}`;
    const effectiveDate = new Date(createdAt.getTime() + Math.floor(rand() * 30) * 24 * 60 * 60 * 1000);
    const status = pick(statuses);
    const wpsRev = String(Math.floor(rand() * 4));
    const revisionHistory: RevisionNote[] = status !== 'draft'
      ? Array.from({ length: Number(wpsRev) }, (_, revIndex) => ({
          wpsRev: String(revIndex + 1),
          date: new Date(createdAt.getTime() + (revIndex + 1) * 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          note: pick(REVISION_NOTE_POOL),
          by: 'System',
        }))
      : [];
    out.push({
      id,
      title: `${pick(WELD_PROCESSES)} procedure for ${pick(['pipe', 'structural'])} joints`,
      status,
      wtns: pickSome(WTN_POOL, rand, 1, 2),
      weldProcess: pick(WELD_PROCESSES),
      gwp: id,
      wpsRev,
      effectiveDate: effectiveDate.toISOString().slice(0, 10),
      processType: pick(PROCESS_TYPES),
      baseMetal1Type: pick(BASE_METAL_TYPES),
      baseMetal2Type: pick(BASE_METAL_TYPES),
      baseMetalThicknessMin: `${(0.125 + rand() * 0.25).toFixed(3)}"`,
      baseMetalThicknessMax: `${(0.5 + rand() * 1.5).toFixed(3)}"`,
      jointType: pick(JOINT_TYPES),
      grooveAngle: `${30 + Math.floor(rand() * 45)}°`,
      rootOpening: `${(rand() * 0.1875).toFixed(3)}"`,
      backing: pick(BACKING_OPTIONS),
      weldPosition: pick(getWeldPositions()).code,
      weldProgression: pick(WELD_PROGRESSIONS),
      fillerMetalType: pick(FILLER_METAL_TYPES),
      fillerMetalClassification: pick(FILLER_METAL_TYPES),
      fillerMetalSizeRange: pick(['1/16" - 3/32"', '3/32" - 1/8"', '1/8" - 5/32"']),
      phMin: rand() < 0.15 ? 'NC' : String(100 + Math.floor(rand() * 60)),
      phMax: String(160 + Math.floor(rand() * 60)),
      ipMin: rand() < 0.15 ? 'NC' : String(80 + Math.floor(rand() * 40)),
      ipMax: String(120 + Math.floor(rand() * 60)),
      overridePhMin: hasOverride ? String(90 + Math.floor(rand() * 40)) : '',
      overridePhMax: hasOverride ? String(150 + Math.floor(rand() * 60)) : '',
      overrideIpMin: hasOverride ? String(70 + Math.floor(rand() * 40)) : '',
      overrideIpMax: hasOverride ? String(110 + Math.floor(rand() * 60)) : '',
      overrideNote: hasOverride ? `Approved deviation per WPS-${String(1 + Math.floor(rand() * 20)).padStart(3, '0')}` : '',
      currentType: pick(CURRENT_TYPES),
      powerSource: pick(['Constant Current', 'Constant Voltage']),
      shieldingGas: pick(['100% Argon', '75% Ar / 25% CO2', '100% CO2', 'N/A']),
      gasFlowRate: `${20 + Math.floor(rand() * 20)} CFH`,
      backingGas: pick(['100% Argon', 'None']),
      heatInputMin: String(20 + Math.floor(rand() * 10)),
      heatInputMax: String(40 + Math.floor(rand() * 20)),
      amperageRange: `${80 + Math.floor(rand() * 40)}-${160 + Math.floor(rand() * 80)} A`,
      voltageRange: `${16 + Math.floor(rand() * 4)}-${24 + Math.floor(rand() * 6)} V`,
      travelSpeedRange: `${4 + Math.floor(rand() * 3)}-${8 + Math.floor(rand() * 4)} in/min`,
      pwhtTemp: pick(['N/A', `${1100 + Math.floor(rand() * 100)}°F`]),
      pwhtTime: pick(['N/A', `${1 + Math.floor(rand() * 3)} hr`]),
      rules: pickSome(RULE_POOL, rand, 2, 4),
      conditions: pickSome(CONDITION_POOL, rand, 1, 3),
      qualificationsRequired: pickSome(QUALIFICATION_POOL, rand, 1, 2),
      revisionHistory,
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
  { header: 'WPS', value: r => r.id },
  { header: 'WPS Rev', value: r => r.wpsRev },
  { header: 'Effective Date', value: r => r.effectiveDate },
  { header: 'GWP', value: r => r.gwp },
  { header: 'Title', value: r => r.title },
  { header: 'Status', value: r => r.status },
  { header: 'WTNs', value: r => r.wtns.join('; ') },
  { header: 'Weld Process', value: r => r.weldProcess },
  { header: 'Process Type', value: r => r.processType },
  { header: 'Base Metal 1 Type', value: r => r.baseMetal1Type },
  { header: 'Base Metal 2 Type', value: r => r.baseMetal2Type },
  { header: 'Base Metal Thickness Min', value: r => r.baseMetalThicknessMin },
  { header: 'Base Metal Thickness Max', value: r => r.baseMetalThicknessMax },
  { header: 'Joint Type', value: r => r.jointType },
  { header: 'Groove Angle', value: r => r.grooveAngle },
  { header: 'Root Opening', value: r => r.rootOpening },
  { header: 'Backing', value: r => r.backing },
  { header: 'Weld Position', value: r => r.weldPosition },
  { header: 'Weld Progression', value: r => r.weldProgression },
  { header: 'Filler Metal Type', value: r => r.fillerMetalType },
  { header: 'Filler Metal Classification', value: r => r.fillerMetalClassification },
  { header: 'Filler Metal Size Range', value: r => r.fillerMetalSizeRange },
  { header: 'PH Min', value: r => r.phMin },
  { header: 'PH Max', value: r => r.phMax },
  { header: 'IP Min', value: r => r.ipMin },
  { header: 'IP Max', value: r => r.ipMax },
  { header: 'Current Type', value: r => r.currentType },
  { header: 'Power Source', value: r => r.powerSource },
  { header: 'Shielding Gas', value: r => r.shieldingGas },
  { header: 'Gas Flow Rate', value: r => r.gasFlowRate },
  { header: 'Backing Gas', value: r => r.backingGas },
  { header: 'Heat Input Min', value: r => r.heatInputMin },
  { header: 'Heat Input Max', value: r => r.heatInputMax },
  { header: 'Amperage Range', value: r => r.amperageRange },
  { header: 'Voltage Range', value: r => r.voltageRange },
  { header: 'Travel Speed Range', value: r => r.travelSpeedRange },
  { header: 'PWHT Temp', value: r => r.pwhtTemp },
  { header: 'PWHT Time', value: r => r.pwhtTime },
  { header: 'Rules', value: r => r.rules.join('; ') },
  { header: 'Conditions', value: r => r.conditions.join('; ') },
  { header: 'Qualifications Required', value: r => r.qualificationsRequired.join('; ') },
  { header: 'Revision History', value: r => r.revisionHistory.map(rv => `Rev ${rv.wpsRev} (${rv.date}): ${rv.note}`).join('; ') },
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
  const headers = [
    'id', 'title', 'status', 'wtns', 'weldProcess', 'gwp', 'wpsRev', 'effectiveDate', 'processType',
    'baseMetal1Type', 'baseMetal2Type', 'baseMetalThicknessMin', 'baseMetalThicknessMax',
    'jointType', 'grooveAngle', 'rootOpening', 'backing',
    'weldPosition', 'weldProgression',
    'fillerMetalType', 'fillerMetalClassification', 'fillerMetalSizeRange',
    'phMin', 'phMax', 'ipMin', 'ipMax',
    'currentType', 'powerSource',
    'shieldingGas', 'gasFlowRate', 'backingGas',
    'heatInputMin', 'heatInputMax',
    'amperageRange', 'voltageRange', 'travelSpeedRange',
    'pwhtTemp', 'pwhtTime',
    'rules', 'conditions', 'qualificationsRequired'
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
  XLSX.writeFile(wb, 'procedures-import-template.xlsx');
}
