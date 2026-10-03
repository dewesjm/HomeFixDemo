/* Admin > Penetrant: the penetrant type/manufacturer pairs MT/PT steps offer (localStorage) */
import { STORAGE } from './storage-keys';

export interface PenetrantEntry {
  type: string;
  manufacturer: string;
}

const DEFAULT_PENETRANTS: PenetrantEntry[] = [
  { type: 'Type I - Fluorescent', manufacturer: 'Magnaflux' },
  { type: 'Type II - Visible', manufacturer: 'Sherwin-Williams' },
  { type: 'Type III - Water Washable', manufacturer: 'NDT Systems' },
  { type: 'Type IV - Post Emulsifiable', manufacturer: 'Research Institute' },
  { type: 'Type I - Fluorescent', manufacturer: 'NDT Systems' },
  { type: 'Type II - Visible', manufacturer: 'Magnaflux' },
];

export function getPenetrants(): PenetrantEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE.penetrants);
    return raw ? JSON.parse(raw) : DEFAULT_PENETRANTS;
  } catch { return DEFAULT_PENETRANTS; }
}

export function setPenetrants(entries: PenetrantEntry[]) {
  localStorage.setItem(STORAGE.penetrants, JSON.stringify(entries));
}

const toOption = (v: string) => ({ label: v, value: v });
export function penetrantManufacturerOptions(): { label: string; value: string }[] {
  return Array.from(new Set(getPenetrants().map(p => p.manufacturer))).map(toOption);
}
export function penetrantTypeOptions(): { label: string; value: string }[] {
  return Array.from(new Set(getPenetrants().map(p => p.type))).map(toOption);
}
