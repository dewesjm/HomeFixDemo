/* Joint Design lookup with consumable-insert / backing-ring requirements */
import { STORAGE } from './storage-keys';
import { signal, computed } from '@angular/core';

import { DEFAULT_JOINT_DESIGNS, type JointDesignEntry } from './joint-design-seed';

export type { JointDesignEntry } from './joint-design-seed';

const STORAGE_KEY = STORAGE.jointDesigns;

function load(): JointDesignEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_JOINT_DESIGNS;
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
