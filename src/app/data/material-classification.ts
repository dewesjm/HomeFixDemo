/* Material classification configuration — which base material codes count as non-ferrous or
   austenitic. Currently used for one rule: a Weld Repair whose original rejection was a PT UNSAT
   requires 5X instead of PT on the material-type-1/2 non-ferrous-or-austenitic materials commonly
   can't be effectively penetrant-tested through a weld repair the same way. Admin > Material
   Classification manages this table; same load/save/add/remove shape as data/mcl-traceability.ts. */
import { STORAGE } from './storage-keys';
import { signal } from '@angular/core';

export interface MaterialClassificationEntry {
  code: string;                       /* e.g. '02CS', 'SS-304', 'AL-1010' -- Job.materialType1/2 values */
  nonFerrousOrAustenitic: boolean;
}

const LS_KEY = STORAGE.materialClassification;

/* Best-guess seed, UNREVIEWED -- same caveat as jobs.ts's MATERIALS_1 codes, several of which were
   invented to match style (see ARCHITECTURE.md). Duplex stainless (DS-2205) is a mixed
   austenitic/ferritic structure, defaulted to false here since it isn't purely austenitic; the
   admin table is exactly how this gets corrected without a code change. */
const DEFAULT_ENTRIES: MaterialClassificationEntry[] = [
  { code: '02CS', nonFerrousOrAustenitic: false },     /* Carbon Steel */
  { code: 'SS-304', nonFerrousOrAustenitic: true },    /* austenitic stainless */
  { code: 'SS-316', nonFerrousOrAustenitic: true },    /* austenitic stainless */
  { code: '40-AS', nonFerrousOrAustenitic: false },    /* alloy steel */
  { code: '11CI', nonFerrousOrAustenitic: false },     /* cast iron */
  { code: 'TI-6400', nonFerrousOrAustenitic: true },   /* titanium -- non-ferrous */
  { code: 'AL-1010', nonFerrousOrAustenitic: true },   /* aluminum -- non-ferrous */
  { code: '30-CUNI', nonFerrousOrAustenitic: true },   /* copper-nickel -- non-ferrous */
  { code: '60-INC', nonFerrousOrAustenitic: true },    /* Inconel / nickel alloy -- non-ferrous */
  { code: 'DS-2205', nonFerrousOrAustenitic: false },  /* duplex stainless -- mixed, see note above */
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
  const updated = [...current, { code, nonFerrousOrAustenitic: false }];
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
