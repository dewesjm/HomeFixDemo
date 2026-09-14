/* Joint Design lookup with consumable-insert / backing-ring requirements */
import { signal, computed } from '@angular/core';

export interface JointDesignEntry {
  code: string;
  label: string;
  requiresConsumableInsert: boolean;
  requiresBackingRing: boolean;
}

const STORAGE_KEY = 'homefix:joint-designs:v1';

const DEFAULTS: JointDesignEntry[] = [
  { code: 'bj-g', label: 'BJ-G', requiresConsumableInsert: true,  requiresBackingRing: false },
  { code: 'bj-s', label: 'BJ-S', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'fj-g', label: 'FJ-G', requiresConsumableInsert: true,  requiresBackingRing: false },
  { code: 'fj-s', label: 'FJ-S', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'lj-g', label: 'LJ-G', requiresConsumableInsert: true,  requiresBackingRing: false },
  { code: 'lj-s', label: 'LJ-S', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'cj-g', label: 'CJ-G', requiresConsumableInsert: false, requiresBackingRing: true },
  { code: 'cj-s', label: 'CJ-S', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'ej-g', label: 'EJ-G', requiresConsumableInsert: false, requiresBackingRing: true },
  { code: 'ej-s', label: 'EJ-S', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'tj-g', label: 'TJ-G', requiresConsumableInsert: true,  requiresBackingRing: true },
  { code: 'tj-s', label: 'TJ-S', requiresConsumableInsert: false, requiresBackingRing: false },
];

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

export function getJointDesign(code: string): JointDesignEntry | undefined {
  return jointDesigns().find(j => j.code === code);
}

export function setJointDesigns(entries: JointDesignEntry[]) {
  jointDesigns.set(entries);
  persist(entries);
}
