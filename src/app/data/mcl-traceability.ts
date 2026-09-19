/* MCL traceability configuration — maps MCL values to whether traceability is required */
import { signal } from '@angular/core';

export interface MclTraceabilityEntry {
  mclValue: string;       /* e.g. 'Standard', 'Control 1', 'Control 2' */
  requiresTraceability: boolean;
}

const LS_KEY = 'homefix:mcl-traceability:v1';

const DEFAULT_ENTRIES: MclTraceabilityEntry[] = [
  { mclValue: 'Standard', requiresTraceability: false },
  { mclValue: 'Control 1', requiresTraceability: true },
  { mclValue: 'Control 2', requiresTraceability: true },
];

function load(): MclTraceabilityEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [...DEFAULT_ENTRIES];
}

function save(entries: MclTraceabilityEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}

export const mclTraceability = signal<MclTraceabilityEntry[]>(load());

export function setMclTraceability(entries: MclTraceabilityEntry[]) {
  save(entries);
  mclTraceability.set(entries);
}

export function addMclValue(mclValue: string) {
  const current = mclTraceability();
  if (current.some(e => e.mclValue === mclValue)) return;
  const updated = [...current, { mclValue, requiresTraceability: true }];
  save(updated);
  mclTraceability.set(updated);
}

export function removeMclValue(mclValue: string) {
  const updated = mclTraceability().filter(e => e.mclValue !== mclValue);
  save(updated);
  mclTraceability.set(updated);
}

export function requiresTraceability(mclValue: string): boolean {
  return mclTraceability().find(e => e.mclValue === mclValue)?.requiresTraceability ?? false;
}
