/* Material classification configuration -- flags on base material codes, each driving one rule:
   - non-ferrous or austenitic: a Weld Repair whose original rejection was a PT UNSAT requires 5X
     instead of PT on these materials, which commonly can't be effectively penetrant-tested through
     a weld repair the same way.
   - titanium: VT shows a required Weld Color when either Material Type is titanium.
   Admin > Material Classification manages this table; same load/save/add/remove shape as
   data/mcl-traceability.ts. */
import { STORAGE } from './storage-keys';
import { signal } from '@angular/core';

export interface MaterialClassificationEntry {
  code: string;                       /* e.g. '02-CS', '12-SS304', '63-AL10' -- Job.materialType1/2 values */
  nonFerrousOrAustenitic: boolean;
  titanium: boolean;
}

export type MaterialFlag = 'nonFerrousOrAustenitic' | 'titanium';

const LS_KEY = STORAGE.materialClassification;

/* Best-guess seed, UNREVIEWED -- same caveat as jobs.ts's MATERIAL_TYPES codes (an invented NN-LETTERS
   numbering scheme, see jobs.ts). Duplex stainless (25-DS2205) is a
   mixed austenitic/ferritic structure, defaulted to false here since it isn't purely austenitic;
   the admin table is exactly how this gets corrected without a code change. */
const DEFAULT_ENTRIES: MaterialClassificationEntry[] = [
  { code: '02-CS', nonFerrousOrAustenitic: false, titanium: false },      /* Carbon Steel */
  { code: '12-SS304', nonFerrousOrAustenitic: true, titanium: false },    /* austenitic stainless */
  { code: '13-SS316', nonFerrousOrAustenitic: true, titanium: false },    /* austenitic stainless */
  { code: '04-AS', nonFerrousOrAustenitic: false, titanium: false },      /* alloy steel */
  { code: '06-CI', nonFerrousOrAustenitic: false, titanium: false },      /* cast iron */
  { code: '60-TICP', nonFerrousOrAustenitic: true, titanium: true },     /* commercially pure titanium -- non-ferrous */
  { code: '61-TI64', nonFerrousOrAustenitic: true, titanium: true },     /* titanium alloy -- non-ferrous */
  { code: '62-TI12', nonFerrousOrAustenitic: true, titanium: true },     /* titanium alloy -- non-ferrous */
  { code: '63-AL10', nonFerrousOrAustenitic: true, titanium: false },     /* aluminum -- non-ferrous */
  { code: '65-CUNI', nonFerrousOrAustenitic: true, titanium: false },     /* copper-nickel -- non-ferrous */
  { code: '67-IN625', nonFerrousOrAustenitic: true, titanium: false },    /* Inconel / nickel alloy -- non-ferrous */
  { code: '25-DS2205', nonFerrousOrAustenitic: false, titanium: false },  /* duplex stainless -- mixed, see note above */
];

function load(): MaterialClassificationEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
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

export function addMaterialCode(code: string) {
  const current = materialClassification();
  if (current.some(e => e.code === code)) return;
  const updated = [...current, { code, nonFerrousOrAustenitic: false, titanium: false }];
  save(updated);
  materialClassification.set(updated);
}

export function removeMaterialCode(code: string) {
  const updated = materialClassification().filter(e => e.code !== code);
  save(updated);
  materialClassification.set(updated);
}

export function isNonFerrousOrAustenitic(code: string): boolean {
  return materialClassification().find(e => e.code === code)?.nonFerrousOrAustenitic ?? false;
}

export function isTitanium(code: string): boolean {
  return materialClassification().find(e => e.code === code)?.titanium ?? false;
}

/* a titanium joint: either side's base material is flagged titanium */
export function isTitaniumJoint(job: { materialType1: string; materialType2: string }): boolean {
  return isTitanium(job.materialType1) || isTitanium(job.materialType2);
}
