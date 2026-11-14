/* Weld Engineering - Procedures data layer
   Self-contained data module for the Weld Engineering "Procedure Lookup" system.
   All data is persisted to localStorage (no backend). Storage keys live in data/storage-keys.ts.

   A GWP (General Weld Procedure) is the overarching procedure; its WTNs are specific branches of it,
   one Procedure row / PDF each -- e.g. GWP W-101 covers WTN 05.5-1, 05.5-2 and 05.5A-3. GWP+WTN
   identifies a row. Other systems (Weld Record, Weld
   Planning) read these rows only through future/weld-engineering/procedure-service/procedure-usage.ts -- see
   docs/ARCHITECTURE.md. */
import { STORAGE } from './storage-keys';
import { signal } from '@angular/core';
import { getWeldPositions } from './weld-positions';
import { MATERIAL_TYPES } from './jobs';
import {
  SEEDED_SECTION_IDS, JOINT_TYPES, BACKING_OPTIONS, WELD_PROGRESSIONS, CURRENT_TYPES,
  type ExtraFields, type OverrideValue
} from '../future/weld-engineering/procedure-sections';
import type { QualGroup } from '../weld-record/qualifications-logic/qual-requirements';

export type ProcedureStatus = 'active' | 'draft' | 'retired';

export const PROCEDURE_STATUS_OPTIONS: { label: string; value: ProcedureStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Retired', value: 'retired' },
];

export const WELD_PROCESSES = ['SMAW', 'GTAW', 'GMAW', 'FCAW'];
export const PROCESS_TYPES = ['Manual', 'Semiautomatic', 'Machine', 'Automatic'];
/* free-text "for ..." that ends the plain-text description in the procedure usage service; these are
   only placeholder values for the seed data */
const APPLICATIONS = ['Surface Structure', 'Structural Steel', 'Process Piping', 'Pressure Piping', 'Storage Tanks', 'Equipment Supports', 'Heat Exchangers'];
/* same base material codes as Job.materialType1/materialType2 (jobs.ts) -- a GWP's base metal
   pair is fixed per GWP and matched against a job's Material Type 1/2 to filter its GWP droplist */
export const BASE_METAL_1_TYPES = MATERIAL_TYPES;
export const BASE_METAL_2_TYPES = MATERIAL_TYPES;
/* MIL-spec filler metal designations, e.g. MIL-80S-50 -- the choices of the Classification field.
   Distinct from FILLER_METAL_TYPE_OPTIONS below, which are the same designations in Weld Record's
   AWS-style {label, value} shape, also used for Pre-Fit/Fit's Consumable Insert -- a WTN's
   fillerMetalTypes/fillerMetalSizes section fields list which of those option VALUES are valid for it. */
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

interface RevisionNote {
  revision: string;
  date: string;    /* ISO date */
  note: string;
  by: string;
}

/* The header fields are fixed. Everything in a numbered section (Base Metal, Filler Metal, Welder
   Qualifications, ...) is defined in Admin > Procedure Sections (future/weld-engineering/
   procedure-sections.ts) and its value is kept in extraFields. */
export interface Procedure {
  title: string;
  status: ProcedureStatus;
  wtn: string;               /* the WTN this row is, e.g. '05.5-1'; GWP+WTN is the row's key */
  weldProcess: string;
  gwp: string;               /* General Weld Procedure -- groups multiple Procedure rows, one per WTN (Weld Record's weldProcedure field) */
  revision: string;
  effectiveDate: string;     /* ISO date */
  processType: string;
  application: string;       /* free text, e.g. 'Surface Structure' */

  rules: string[];
  conditions: string[];
  /* values for every section field, keyed by field key; blank values aren't stored */
  extraFields: ExtraFields;
  /* which sections this procedure has (ProcedureSection.id), ticked on its edit form; values of
     sections not ticked stay in extraFields, hidden */
  sectionIds: string[];
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
  'Filler metal shall match base metal chemistry per GWP.',
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

/* Fisher-Yates shuffle: always draws pool.length - 1 values from rand. A random sort comparator
   would not: how often the browser calls it varies between runs, which shifts every value seeded after it. */
function pickSome<T>(pool: T[], rand: () => number, min: number, max: number): T[] {
  const count = min + Math.floor(rand() * (max - min + 1));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
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
   least one applicable GWP (and, per generateProcedures below, at least one of each GWP's WTNs
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

/* sample Welder Qualifications, drawn from their own seeded sequence (keyed by GWP and the WTN's
   position) so they don't shift the other seeded values; about a quarter of WTNs require nothing */
const REQUIRED_QUALS_POOL: QualGroup[] = [
  { op: 'all', items: [] },
  { op: 'all', items: ['WELD412'] },
  { op: 'any', items: ['WELD427', 'WELD403'] },
  { op: 'all', items: ['WELD412', { op: 'any', items: ['WELD427', 'WELD403'] }] },
  { op: 'all', items: ['WELD458'] },
  { op: 'any', items: ['WELD431', 'WELD466'] },
  { op: 'all', items: [] },
  { op: 'all', items: ['WELD419'] },
];
function seedRequiredQuals(key: string): QualGroup {
  let n = 0;
  for (const ch of key) n = (n * 31 + ch.charCodeAt(0)) % 100000;
  const g = REQUIRED_QUALS_POOL[Math.floor(seeded(n)() * REQUIRED_QUALS_POOL.length)];
  return JSON.parse(JSON.stringify(g));
}

function generateProcedures(): Procedure[] {
  const rand = seeded(777);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const seedOverride = (): OverrideValue => ({
    phMin: pick(['50', '60', '100', '150']),
    phMax: pick(['250', '300', '350']),
    ipMin: pick(['50', '60', '100']),
    ipMax: pick(['250', '300', '350']),
    note: `Approved deviation #${String(1 + Math.floor(rand() * 20)).padStart(3, '0')}`,
  });
  const out: Procedure[] = [];
  const combos = materialCombos();

  let gwpNumber = 101;
  combos.forEach(([baseMetal1Type, baseMetal2Type]) => {
    const gwpCount = 1 + Math.floor(rand() * 3);
    for (let g = 0; g < gwpCount; g++) {
      const gwp = `W-${gwpNumber++}`;
      const wtnCount = 2 + Math.floor(rand() * 3);
      const wtns = generateWtnsForGwp(rand, wtnCount);
      /* guarantee at least one WTN under this GWP has override values, rather than leaving it to chance */
      const overrideRowIndex = Math.floor(rand() * wtns.length);
      /* process and application are the same across a GWP's WTNs so the GWP has one description;
         filler metal varies per WTN */
      const weldProcess = pick(WELD_PROCESSES);
      const processType = pick(PROCESS_TYPES);
      const application = pick(APPLICATIONS);

      wtns.forEach((wtn, n) => {
        const createdAt = new Date(Date.now() - Math.floor(rand() * 400) * 24 * 60 * 60 * 1000);
        const hasOverride = n === overrideRowIndex || rand() < 0.3;
        const statuses: ProcedureStatus[] = ['active', 'active', 'active', 'draft', 'retired']; /* mostly active */

        const effectiveDate = new Date(createdAt.getTime() + Math.floor(rand() * 30) * 24 * 60 * 60 * 1000);
        const status = pick(statuses);
        const revision = String(Math.floor(rand() * 4));
        const revisionHistory: RevisionNote[] = status !== 'draft'
          ? Array.from({ length: Number(revision) }, (_, revIndex) => ({
              revision: String(revIndex + 1),
              date: new Date(createdAt.getTime() + (revIndex + 1) * 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              note: pick(REVISION_NOTE_POOL),
              by: 'System',
            }))
          : [];
        const fillerMetalTypes = pickSome(FILLER_METAL_TYPE_OPTIONS.map(o => o.value), rand, 1, 3);
        out.push({
          title: `${weldProcess} procedure for ${application.toLowerCase()}`,
          status,
          wtn,
          weldProcess,
          gwp,
          revision,
          effectiveDate: effectiveDate.toISOString().slice(0, 10),
          processType,
          application,
          extraFields: {
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
            /* matches the first allowed filler type, so the description names a filler this WTN allows */
            fillerMetalClassification: FILLER_METAL_TYPE_OPTIONS.find(o => o.value === fillerMetalTypes[0])!.label,
            fillerMetalSizes: pickSome(FILLER_METAL_SIZE_OPTIONS.map(o => o.value), rand, 1, 3),
            requiredQuals: seedRequiredQuals(`${gwp}-${n + 1}`),
            /* round values only (real limits are clean numbers like 60, 200, 300); every min pool
               value is below every max pool value */
            phMin: rand() < 0.15 ? 'NC' : pick(['50', '60', '100', '150', '200']),
            phMax: pick(['250', '300', '350', '400']),
            ipMin: rand() < 0.15 ? 'NC' : pick(['50', '60', '100', '150']),
            ipMax: pick(['250', '300', '350', '400']),
            ...(hasOverride ? { override: seedOverride() } : {}),
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
          },
          sectionIds: [...SEEDED_SECTION_IDS],
          rules: pickSome(RULE_POOL, rand, 2, 4),
          conditions: pickSome(CONDITION_POOL, rand, 1, 3),
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
    if (raw) return JSON.parse(raw) as Procedure[];
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

/* true when p is the GWP+WTN row */
export function isProcedure(p: Procedure, gwp: string, wtn: string): boolean {
  return p.gwp === gwp && p.wtn === wtn;
}

/* how messages and pages name one row, e.g. 'GWP W-101 / WTN 05.5-1' */
export function procedureName(p: Pick<Procedure, 'gwp' | 'wtn'>): string {
  return `GWP ${p.gwp} / WTN ${p.wtn}`;
}

export function updateProcedure(gwp: string, wtn: string, updates: Partial<Procedure>): void {
  procedures.update(list => {
    const next = list.map(p => isProcedure(p, gwp, wtn) ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p);
    persistProcedures(next);
    return next;
  });
}

export function deleteProcedure(gwp: string, wtn: string): void {
  procedures.update(list => {
    const next = list.filter(p => !isProcedure(p, gwp, wtn));
    persistProcedures(next);
    return next;
  });
}

export function getProcedure(gwp: string, wtn: string): Procedure | undefined {
  if (!gwp || !wtn) return undefined;
  return procedures().find(p => isProcedure(p, gwp, wtn));
}
/* every distinct WTN across all GWPs -- for demo data (assignments.ts) that just needs a plausible WTN */
export function allWtns(): string[] {
  return Array.from(new Set(procedures().map(p => p.wtn)));
}
