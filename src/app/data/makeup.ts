/* Makeup status — someone below the foreman level temporarily granted authority to act as the
   foreman. UI-only for now: nothing else in the app reads this to actually change what a person
   can do (see ARCHITECTURE.md/[[project-no-identity-session-model]]) — this just lets it be set up
   and reviewed, the same demo-aid honesty as Admin > Teams (AD groups/permissions are also just
   mocked there, not enforced). Same load/save/add/remove shape as material-classification.ts. */
import { STORAGE } from './storage-keys';
import { signal } from '@angular/core';

export interface MakeupGrant {
  id: string;
  personId: string;      /* Person.id -- who is granted makeup (acting-foreman) status */
  startDate: string;     /* ISO date, yyyy-mm-dd */
  endDate: string;       /* ISO date, yyyy-mm-dd -- required, no open-ended grants */
}

/* Each person gets this many makeup days per calendar year, across all their grants. */
export const ANNUAL_MAKEUP_DAYS = 90;

const LS_KEY = STORAGE.makeup;

/* Demo seed: one currently-active grant, one already expired for contrast. */
const DEFAULT_GRANTS: MakeupGrant[] = [
  { id: 'mk1', personId: 'E10231', startDate: '2026-09-15', endDate: '2026-09-30' },
  { id: 'mk2', personId: 'E20413', startDate: '2026-08-01', endDate: '2026-08-14' },
];

function load(): MakeupGrant[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_GRANTS.map(g => ({ ...g }));
}

function save(grants: MakeupGrant[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(grants));
}

export const makeupGrants = signal<MakeupGrant[]>(load());

export function setMakeupGrants(grants: MakeupGrant[]) {
  save(grants);
  makeupGrants.set(grants);
}

export function addMakeupGrant(personId: string, startDate: string, endDate: string): string {
  const id = 'mk' + Date.now();
  setMakeupGrants([...makeupGrants(), { id, personId, startDate, endDate }]);
  return id;
}

export function removeMakeupGrant(id: string) {
  setMakeupGrants(makeupGrants().filter(g => g.id !== id));
}

export function updateMakeupGrant(id: string, patch: Partial<Pick<MakeupGrant, 'startDate' | 'endDate'>>) {
  setMakeupGrants(makeupGrants().map(g => (g.id === id ? { ...g, ...patch } : g)));
}

export function isGrantActive(g: MakeupGrant, today = new Date().toISOString().slice(0, 10)): boolean {
  return g.startDate <= today && today <= g.endDate;
}

/* inclusive day count, e.g. the same day start/end is 1 day */
export function daySpan(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00').getTime();
  const end = new Date(endDate + 'T00:00:00').getTime();
  return Math.max(0, Math.round((end - start) / 86400000) + 1);
}

/* days already used this calendar year across a person's other grants (by start date's year),
   optionally excluding one grant (the one currently being edited) */
export function daysUsed(personId: string, year: number, grants: MakeupGrant[], excludeGrantId?: string): number {
  return grants
    .filter(g => g.personId === personId && g.id !== excludeGrantId && new Date(g.startDate + 'T00:00:00').getFullYear() === year)
    .reduce((sum, g) => sum + daySpan(g.startDate, g.endDate), 0);
}

export function daysRemaining(personId: string, year: number, grants: MakeupGrant[], excludeGrantId?: string): number {
  return ANNUAL_MAKEUP_DAYS - daysUsed(personId, year, grants, excludeGrantId);
}
