/* Weld Engineering - Procedures data layer
   Self-contained data module for the Weld Engineering "Procedure Lookup" system.
   All data is persisted to localStorage (no backend). Storage keys live in data/storage-keys.ts.

   A GWP (Governing WPS) groups several specific WPS documents, one per WTN -- e.g. GWP W-101 covers
   WTN 05.5-1, 05.5-2 and 05.5A-3, each its own Procedure row / PDF. gwpOptions() and wtnOptionsForGwp()
   below are the source of truth Weld Record's GWP/WTN stage fields cascade from (workflow.ts,
   joint-page.component.ts) -- see ARCHITECTURE.md. */
import { STORAGE } from './storage-keys';
import { signal } from '@angular/core';
import { CsvColumn } from './export-csv';
import { getWeldPositions } from './workflow';
import { MATERIALS_1, MATERIALS_2 } from './jobs';

export type ProcedureStatus = 'active' | 'draft' | 'retired';

export const PROCEDURE_STATUS_OPTIONS: { label: string; value: ProcedureStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Retired', value: 'retired' },
];

export const WELD_PROCESSES = ['SMAW', 'GTAW', 'GMAW', 'FCAW'];
export const PROCESS_TYPES = ['Manual', 'Semiautomatic', 'Machine', 'Automatic'];
/* free-text "for ..." that ends the plain-text description (procedureDescription below); these are
   only placeholder values for the seed data */
export const APPLICATIONS = ['Surface Structure', 'Structural Steel', 'Process Piping', 'Pressure Piping', 'Storage Tanks', 'Equipment Supports', 'Heat Exchangers'];
/* same base material codes as Job.materialType1/materialType2 (jobs.ts) -- a GWP's base metal
   pair is fixed per GWP and matched against a job's Material Type 1/2 to filter its GWP droplist */
export const BASE_METAL_1_TYPES = MATERIALS_1;
export const BASE_METAL_2_TYPES = MATERIALS_2;
/* MIL-spec filler metal designations, e.g. MIL-80S-50 -- used for the free-text Classification field.
   Distinct from FILLER_METAL_TYPE_OPTIONS below, which are the same designations in Weld Record's
   AWS-style {label, value} shape (workflow.ts METAL_TYPE_OPTIONS) -- a WPS's fillerMetalTypes/
   fillerMetalSizes list which of those option VALUES are valid for that WPS. */
export const FILLER_METAL_TYPES = ['MIL-70S-3', 'MIL-70S-6', 'MIL-80S-50', 'MIL-80S-D2', 'MIL-90S-B3', 'MIL-100S-1'];
export const FILLER_METAL_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'MIL-70S-3', value: 'mil-70s-3' }, { label: 'MIL-70S-6', value: 'mil-70s-6' },
  { label: 'MIL-80S-50', value: 'mil-80s-50' }, { label: 'MIL-80S-D2', value: 'mil-80s-d2' },
  { label: 'MIL-90S-B3', value: 'mil-90s-b3' }, { label: 'MIL-100S-1', value: 'mil-100s-1' },
];
export const FILLER_METAL_SIZE_OPTIONS: { label: string; value: string }[] = [
  { label: '1/16"', value: '1/16' }, { label: '3/32"', value: '3/32' }, { label: '1/8"', value: '1/8' },
  { label: '5/32"', value: '5/32' }, { label: '3/16"', value: '3/16' }, { label: '1/4"', value: '1/4' },
];
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
  id: string;               /* 'W-101-2' -- the lookup key, user-facing, shown as "WPS". One row/PDF per GWP+WTN pair. */
  title: string;
  status: ProcedureStatus;
  wtn: string;               /* the single WTN this specific WPS document covers, e.g. '05.5-1' */
  weldProcess: string;
  gwp: string;               /* Governing WPS -- groups multiple Procedure rows, one per WTN (workflow.ts weldProcedure) */
  wpsRev: string;
  effectiveDate: string;     /* ISO date */
  processType: string;
  application: string;       /* free text, e.g. 'Surface Structure' */

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

  /* 4. Filler Metal -- fillerMetalTypes/fillerMetalSizes are the valid FILLER_METAL_TYPE_OPTIONS/
     FILLER_METAL_SIZE_OPTIONS values for this WPS; Weld Record's Filler Metal Type/Size fields
     (workflow.ts) filter to these once GWP+WTN resolve to this Procedure (see
     fillerMetalTypeOptionsForProcedure/fillerMetalSizeOptionsForProcedure below) */
  fillerMetalTypes: string[];
  fillerMetalClassification: string;
  fillerMetalSizes: string[];

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

/* A WTN family looks like '05.5', optionally lettered ('05.5A') for a variant sharing the same
   GWP -- e.g. GWP W-101 covers WTN 05.5-1, 05.5-2 and 05.5A-3. */
function generateWtnsForGwp(rand: () => number, count: number): string[] {
  const section = String(1 + Math.floor(rand() * 14)).padStart(2, '0');
  const sub = 1 + Math.floor(rand() * 9);
  const family = `${section}.${sub}`;
  const wtns: string[] = [];
  for (let n = 1; n <= count; n++) {
    const letter = rand() < 0.25 ? String.fromCharCode(65 + Math.floor(rand() * 3)) : '';
    wtns.push(`${family}${letter}-${n}`);
  }
  return wtns;
}

/* Every (Material Type 1, Material Type 2) combination a job can have gets 1-3 GWPs, so it has at
   least one applicable GWP (and, per generateProcedures below, at least one of each GWP's WPS rows
   has override values populated). */
function materialCombos(): [string, string][] {
  const combos: [string, string][] = [];
  for (const m1 of BASE_METAL_1_TYPES) {
    for (const m2 of BASE_METAL_2_TYPES) {
      combos.push([m1, m2]);
    }
  }
  return combos;
}

function generateProcedures(): Procedure[] {
  const rand = seeded(777);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const out: Procedure[] = [];
  const combos = materialCombos();

  let gwpNumber = 101;
  combos.forEach(([baseMetal1Type, baseMetal2Type]) => {
    const gwpCount = 1 + Math.floor(rand() * 3);
    for (let g = 0; g < gwpCount; g++) {
      const gwp = `W-${gwpNumber++}`;
      const wtnCount = 2 + Math.floor(rand() * 3);
      const wtns = generateWtnsForGwp(rand, wtnCount);
      /* guarantee at least one WPS under this GWP has override values, rather than leaving it to chance */
      const overrideRowIndex = Math.floor(rand() * wtns.length);
      /* process and application are the same across a GWP's WPS rows so the GWP has one description;
         filler metal varies per WTN */
      const weldProcess = pick(WELD_PROCESSES);
      const processType = pick(PROCESS_TYPES);
      const application = pick(APPLICATIONS);

      wtns.forEach((wtn, n) => {
        const createdAt = new Date(Date.now() - Math.floor(rand() * 400) * 24 * 60 * 60 * 1000);
        const hasOverride = n === overrideRowIndex || rand() < 0.3;
        const statuses: ProcedureStatus[] = ['active', 'active', 'active', 'draft', 'retired']; /* mostly active */

        const id = `${gwp}-${n + 1}`;
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
        const fillerMetalTypes = pickSome(FILLER_METAL_TYPE_OPTIONS.map(o => o.value), rand, 1, 3);
        out.push({
          id,
          title: `${weldProcess} procedure for ${application.toLowerCase()}`,
          status,
          wtn,
          weldProcess,
          gwp,
          wpsRev,
          effectiveDate: effectiveDate.toISOString().slice(0, 10),
          processType,
          application,
          baseMetal1Type,
          baseMetal2Type,
          baseMetalThicknessMin: `${(0.125 + rand() * 0.25).toFixed(3)}"`,
          baseMetalThicknessMax: `${(0.5 + rand() * 1.5).toFixed(3)}"`,
          jointType: pick(JOINT_TYPES),
          grooveAngle: `${30 + Math.floor(rand() * 45)}°`,
          rootOpening: `${(rand() * 0.1875).toFixed(3)}"`,
          backing: pick(BACKING_OPTIONS),
          weldPosition: pick(getWeldPositions()).code,
          weldProgression: pick(WELD_PROGRESSIONS),
          fillerMetalTypes,
          /* matches the first allowed filler type, so the description names a filler this WPS allows */
          fillerMetalClassification: FILLER_METAL_TYPE_OPTIONS.find(o => o.value === fillerMetalTypes[0])!.label,
          fillerMetalSizes: pickSome(FILLER_METAL_SIZE_OPTIONS.map(o => o.value), rand, 1, 3),
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
      });
    }
  });
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

/* true when a procedure has any preheat/interpass override values set -- shared by the PDF
   (procedure-pdf.ts) and Weld Record's stage fields (joint-page.component.ts) */
export function hasOverride(p: Procedure): boolean {
  return !!(p.overridePhMin || p.overridePhMax || p.overrideIpMin || p.overrideIpMax || p.overrideNote);
}

/* ── GWP/WTN cascade -- source of truth for Weld Record's GWP/WTN stage fields (workflow.ts,
   joint-page.component.ts). A GWP groups several Procedure rows, one per WTN. ── */
export function gwpOptions(): { label: string; value: string }[] {
  const distinct = Array.from(new Set(procedures().map(p => p.gwp))).sort();
  return distinct.map(g => ({ label: g, value: g }));
}

/* Plain-text description, e.g. "Semiautomatic GTAW of 02-CS and 01-E60 using MIL-70S-6 for Surface
   Structure". Blank parts are left out. The GWP version drops the filler, which varies per WTN. */
export function procedureDescription(p: Procedure | undefined, includeFiller = true): string {
  if (!p) return '';
  const metals = [p.baseMetal1Type, p.baseMetal2Type].filter(Boolean).join(' and ');
  return [
    [p.processType, p.weldProcess].filter(Boolean).join(' '),
    metals && `of ${metals}`,
    includeFiller && p.fillerMetalClassification && `using ${p.fillerMetalClassification}`,
    p.application && `for ${p.application}`,
  ].filter(Boolean).join(' ');
}

/* a GWP's description comes from its first WPS row (seeded rows share process and application) */
export function gwpDescription(gwp: string): string {
  return procedureDescription(procedures().find(p => p.gwp === gwp), false);
}

export function wtnDescription(gwp: string, wtn: string): string {
  return procedureDescription(getProcedureByGwpWtn(gwp, wtn));
}

const withDescription = (code: string, description: string) => description ? `${code} · ${description}` : code;

/* GWP droplist filtered to whichever GWPs are qualified for a job's base metal pair -- a GWP's
   base metal 1/2 (fixed per GWP, see materialCombos() above) must match the job's Material Type
   1/2 (Job.materialType1/materialType2, jobs.ts). */
export function gwpOptionsForMaterials(materialType1: string, materialType2: string): { label: string; value: string }[] {
  if (!materialType1 || !materialType2) return [];
  const distinct = Array.from(new Set(
    procedures()
      .filter(p => p.baseMetal1Type === materialType1 && p.baseMetal2Type === materialType2)
      .map(p => p.gwp)
  )).sort();
  return distinct.map(g => ({ label: withDescription(g, gwpDescription(g)), value: g }));
}

export function wtnOptionsForGwp(gwp: string): { label: string; value: string }[] {
  if (!gwp) return [];
  return procedures()
    .filter(p => p.gwp === gwp)
    .map(p => ({ label: withDescription(p.wtn, procedureDescription(p)), value: p.wtn }));
}

export function getProcedureByGwpWtn(gwp: string, wtn: string): Procedure | undefined {
  if (!gwp || !wtn) return undefined;
  return procedures().find(p => p.gwp === gwp && p.wtn === wtn);
}

/* Filler Metal Type/Size cascade -- same shape as the GWP/WTN cascade above, but keyed off the
   Procedure a GWP+WTN pair already resolved to (getProcedureByGwpWtn), not off GWP/WTN directly.
   Unlike weldProcess/PH/IP, filler metal stays user-selected among these options rather than
   auto-populated -- a WPS commonly allows more than one valid filler type/size. */
export function fillerMetalTypeOptionsForProcedure(p: Procedure | undefined): { label: string; value: string }[] {
  if (!p) return [];
  return FILLER_METAL_TYPE_OPTIONS.filter(o => p.fillerMetalTypes.includes(o.value));
}

export function fillerMetalSizeOptionsForProcedure(p: Procedure | undefined): { label: string; value: string }[] {
  if (!p) return [];
  return FILLER_METAL_SIZE_OPTIONS.filter(o => p.fillerMetalSizes.includes(o.value));
}

/* every distinct WTN across all GWPs -- for demo data (assignments.ts) that just needs a plausible WTN */
export function allWtns(): string[] {
  return Array.from(new Set(procedures().map(p => p.wtn)));
}

/* ── CSV Export columns (Admin > Manage Procedures) ── */
export const PROCEDURE_CSV_COLUMNS: CsvColumn<Procedure>[] = [
  { header: 'WPS', value: r => r.id },
  { header: 'WPS Rev', value: r => r.wpsRev },
  { header: 'Effective Date', value: r => r.effectiveDate },
  { header: 'GWP', value: r => r.gwp },
  { header: 'Title', value: r => r.title },
  { header: 'Status', value: r => r.status },
  { header: 'WTN', value: r => r.wtn },
  { header: 'Weld Process', value: r => r.weldProcess },
  { header: 'Process Type', value: r => r.processType },
  { header: 'Application', value: r => r.application },
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
  { header: 'Filler Metal Types', value: r => r.fillerMetalTypes.join('; ') },
  { header: 'Filler Metal Classification', value: r => r.fillerMetalClassification },
  { header: 'Filler Metal Sizes', value: r => r.fillerMetalSizes.join('; ') },
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
    'id', 'title', 'status', 'wtn', 'weldProcess', 'gwp', 'wpsRev', 'effectiveDate', 'processType', 'application',
    'baseMetal1Type', 'baseMetal2Type', 'baseMetalThicknessMin', 'baseMetalThicknessMax',
    'jointType', 'grooveAngle', 'rootOpening', 'backing',
    'weldPosition', 'weldProgression',
    'fillerMetalTypes', 'fillerMetalClassification', 'fillerMetalSizes',
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
