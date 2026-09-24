/* Joint Design lookup with consumable-insert / backing-ring requirements */
import { STORAGE } from './storage-keys';
import { signal, computed } from '@angular/core';

export interface JointDesignEntry {
  code: string;
  label: string;
  requiresConsumableInsert: boolean;
  requiresBackingRing: boolean;
}

const STORAGE_KEY = STORAGE.jointDesigns;

/* Sample codes: C-nn, P-n/P-nn, V-nn. Covers every requirement combination (neither, insert only,
   backing ring only, both). */
const DEFAULTS: JointDesignEntry[] = [
  { code: 'c-18', label: 'C-18', requiresConsumableInsert: true,  requiresBackingRing: false },
  { code: 'c-24', label: 'C-24', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'c-31', label: 'C-31', requiresConsumableInsert: false, requiresBackingRing: true },
  { code: 'c-47', label: 'C-47', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'c-65', label: 'C-65', requiresConsumableInsert: true,  requiresBackingRing: true },
  { code: 'p-9',  label: 'P-9',  requiresConsumableInsert: true,  requiresBackingRing: false },
  { code: 'p-12', label: 'P-12', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'p-4',  label: 'P-4',  requiresConsumableInsert: false, requiresBackingRing: true },
  { code: 'p-27', label: 'P-27', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'p-15', label: 'P-15', requiresConsumableInsert: true,  requiresBackingRing: false },
  { code: 'v-22', label: 'V-22', requiresConsumableInsert: false, requiresBackingRing: true },
  { code: 'v-38', label: 'V-38', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'v-41', label: 'V-41', requiresConsumableInsert: true,  requiresBackingRing: false },
  { code: 'v-56', label: 'V-56', requiresConsumableInsert: false, requiresBackingRing: true },
  { code: 'v-73', label: 'V-73', requiresConsumableInsert: false, requiresBackingRing: false },
];

/* labels are what jobs and weld planning store as a joint's design */
export const JOINT_DESIGN_LABELS = DEFAULTS.map(j => j.label);

function load(): JointDesignEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULTS;
}

function persist(entries: JointDesignEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/* Reactive store — singleton via module-level signals */
export const jointDesigns = signal<JointDesignEntry[]>(load());
export const jointDesignOptions = computed(() =>
  jointDesigns().map(j => ({ label: j.label, value: j.code }))
);

/* Jobs store the label (C-18), Revised Joint Design stores the code (c-18); accept either */
export function getJointDesign(codeOrLabel: string): JointDesignEntry | undefined {
  const key = codeOrLabel.trim().toLowerCase();
  return jointDesigns().find(j => j.code.toLowerCase() === key || j.label.toLowerCase() === key);
}

export function setJointDesigns(entries: JointDesignEntry[]) {
  jointDesigns.set(entries);
  persist(entries);
}
