/* Material flags used by inspection conditions and qualification rules. */
import { STORAGE } from './storage-keys';
import { signal } from '@angular/core';

export interface MaterialClassificationEntry {
  code: string;                       /* e.g. '02-CS', '12-SS304', '63-AL10' -- Job.materialType1/2 values */
  nonFerrous: boolean;
  austenitic: boolean;
  titanium: boolean;
}

export type MaterialFlag = 'nonFerrous' | 'austenitic' | 'titanium';

const LS_KEY = STORAGE.materialClassification;

/* Best-guess seed, UNREVIEWED -- same caveat as jobs.ts's MATERIAL_TYPES codes (an invented NN-LETTERS
   numbering scheme, see jobs.ts). Duplex stainless (25-DS2205) is a
   mixed austenitic/ferritic structure, defaulted to false here since it isn't purely austenitic;
   the admin table is exactly how this gets corrected without a code change. */
const DEFAULT_ENTRIES: MaterialClassificationEntry[] = [
  { code: '02-CS', nonFerrous: false, austenitic: false, titanium: false },      /* Carbon Steel */
  { code: '12-SS304', nonFerrous: false, austenitic: true, titanium: false },    /* austenitic stainless */
  { code: '13-SS316', nonFerrous: false, austenitic: true, titanium: false },    /* austenitic stainless */
  { code: '04-AS', nonFerrous: false, austenitic: false, titanium: false },      /* alloy steel */
  { code: '06-CI', nonFerrous: false, austenitic: false, titanium: false },      /* cast iron */
  { code: '60-TICP', nonFerrous: true, austenitic: false, titanium: true },     /* commercially pure titanium -- non-ferrous */
  { code: '61-TI64', nonFerrous: true, austenitic: false, titanium: true },     /* titanium alloy -- non-ferrous */
  { code: '62-TI12', nonFerrous: true, austenitic: false, titanium: true },     /* titanium alloy -- non-ferrous */
  { code: '63-AL10', nonFerrous: true, austenitic: false, titanium: false },     /* aluminum -- non-ferrous */
  { code: '65-CUNI', nonFerrous: true, austenitic: false, titanium: false },     /* copper-nickel -- non-ferrous */
  { code: '67-IN625', nonFerrous: true, austenitic: false, titanium: false },    /* Inconel / nickel alloy -- non-ferrous */
  { code: '25-DS2205', nonFerrous: false, austenitic: false, titanium: false },  /* duplex stainless -- mixed, see note above */
];

function load(): MaterialClassificationEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw).map(normalizeMaterialClassification);
  } catch { /* ignore */ }
  return [...DEFAULT_ENTRIES];
}

function save(entries: MaterialClassificationEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}

export const materialClassification = signal<MaterialClassificationEntry[]>(load());

export function setMaterialClassification(entries: MaterialClassificationEntry[]) {
  save(entries);
  materialClassification.set(entries);
}

export function isTitanium(code: string): boolean {
  return materialClassification().find(e => e.code === code)?.titanium ?? false;
}

/* Split saved combined flags using the known material classification. Unknown custom codes
   retain their combined eligibility as non-ferrous until classified by an administrator. */
export function normalizeMaterialClassification(entry: Pick<MaterialClassificationEntry, 'code' | 'titanium'> & Partial<MaterialClassificationEntry> & { nonFerrousOrAustenitic?: boolean }): MaterialClassificationEntry {
  const known = DEFAULT_ENTRIES.find(e => e.code === entry.code);
  const legacy = entry.nonFerrousOrAustenitic ?? false;
  return { code: entry.code, nonFerrous: entry.nonFerrous ?? (legacy && !known?.austenitic),
    austenitic: entry.austenitic ?? (legacy && !!known?.austenitic), titanium: entry.titanium };
}

export function hasMaterialFlag(job: { materialType1: string; materialType2: string }, flag: MaterialFlag): boolean {
  return [job.materialType1, job.materialType2].some(code => materialClassification().some(e => e.code === code && e[flag]));
}

/* a titanium joint: either side's base material is flagged titanium */
export function isTitaniumJoint(job: { materialType1: string; materialType2: string }): boolean {
  return isTitanium(job.materialType1) || isTitanium(job.materialType2);
}
