/* Joint Design lookup with consumable-insert / backing-ring requirements */
import { STORAGE } from './storage-keys';
import { signal, computed } from '@angular/core';

export interface JointDesignEntry {
  code: string;
  label: string;
  description: string;   /* plain text shown next to the code in the Revised Joint Design droplist */
  requiresConsumableInsert: boolean;
  requiresBackingRing: boolean;
}

const STORAGE_KEY = STORAGE.jointDesigns;

/* Sample codes: C-nn, P-n/P-nn, V-nn. Covers every requirement combination (neither, insert only,
   backing ring only, both). */
const DEFAULTS: JointDesignEntry[] = [
  { code: 'c-18', label: 'C-18', description: 'Square groove butt with consumable insert', requiresConsumableInsert: true,  requiresBackingRing: false },
  { code: 'c-24', label: 'C-24', description: 'Single-V groove butt, open root', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'c-31', label: 'C-31', description: 'Single-V groove butt on backing ring', requiresConsumableInsert: false, requiresBackingRing: true },
  { code: 'c-47', label: 'C-47', description: 'Double-V groove butt, back gouged', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'c-65', label: 'C-65', description: 'Single-U groove butt with insert and backing ring', requiresConsumableInsert: true,  requiresBackingRing: true },
  { code: 'p-9',  label: 'P-9', description: 'Pipe butt, J-groove with consumable insert',  requiresConsumableInsert: true,  requiresBackingRing: false },
  { code: 'p-12', label: 'P-12', description: 'Pipe fillet, slip-on fitting', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'p-4',  label: 'P-4', description: 'Pipe butt, 37.5° bevel on backing ring',  requiresConsumableInsert: false, requiresBackingRing: true },
  { code: 'p-27', label: 'P-27', description: 'Branch connection, set-on', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'p-15', label: 'P-15', description: 'Pipe butt, 37.5° bevel with consumable insert', requiresConsumableInsert: true,  requiresBackingRing: false },
  { code: 'v-22', label: 'V-22', description: 'Single-bevel T-joint on backing bar', requiresConsumableInsert: false, requiresBackingRing: true },
  { code: 'v-38', label: 'V-38', description: 'Double-bevel T-joint, full penetration', requiresConsumableInsert: false, requiresBackingRing: false },
  { code: 'v-41', label: 'V-41', description: 'Single-bevel corner joint with consumable insert', requiresConsumableInsert: true,  requiresBackingRing: false },
  { code: 'v-56', label: 'V-56', description: 'Single-V plate butt on backing bar', requiresConsumableInsert: false, requiresBackingRing: true },
  { code: 'v-73', label: 'V-73', description: 'Fillet T-joint, welded both sides', requiresConsumableInsert: false, requiresBackingRing: false },
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
  jointDesigns().map(j => ({ label: j.label, value: j.code, detail: j.description ?? '' }))
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
