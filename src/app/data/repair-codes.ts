/* Repair Code lookup records. IDs are permanent; retirement preserves saved references. */
import { STORAGE } from './storage-keys';

export interface RepairCode { code: string; name: string; active: boolean }
const DEFAULTS: RepairCode[] = [
  { code: 'grind', name: 'Grind Only', active: true },
  { code: 'weld-repair', name: 'Weld Repair', active: true },
  { code: 'cut', name: 'Cut', active: true },
];

export function getRepairCodes(): RepairCode[] {
  try {
    const raw = localStorage.getItem(STORAGE.repairCodes);
    if (raw) {
      const rows: unknown = JSON.parse(raw);
      if (Array.isArray(rows) && rows.every(r => r && typeof r.code === 'string' &&
        typeof r.name === 'string' && typeof r.active === 'boolean')) return rows;
    }
  } catch { /* Unreadable saved lookups use the built-in choices. */ }
  return DEFAULTS.map(r => ({ ...r }));
}

let version = 0;
export const repairCodesVersion = () => version;

export function setRepairCodes(rows: RepairCode[]): void {
  localStorage.setItem(STORAGE.repairCodes, JSON.stringify(rows));
  version++;
}
