/* Makeup status — someone below the foreman level temporarily granted authority to act as the
   foreman. UI-only for now: nothing else in the app reads this to actually change what a person
   can do (see ARCHITECTURE.md/[[project-no-identity-session-model]]) — this just lets it be set up
   and reviewed, the same demo-aid honesty as Admin > Groups (AD groups/permissions are also just
   mocked there, not enforced). Same load/save/add/remove shape as material-classification.ts. */
import { STORAGE } from './storage-keys';
import { signal } from '@angular/core';

export interface MakeupGrant {
  id: string;
  personId: string;      /* Person.id -- who is granted makeup (acting-foreman) status */
  startDate: string;     /* ISO date, yyyy-mm-dd */
  endDate: string;       /* ISO date, yyyy-mm-dd -- required, no open-ended grants */
  changedBy: string;     /* who last added or edited the grant; 'User' for edits made in the demo (no login) */
}

/* Each person gets this many makeup days per calendar year, across all their grants. */
export const ANNUAL_MAKEUP_DAYS = 90;

const LS_KEY = STORAGE.makeup;

/* Demo seed: enough rows (~20) to actually exercise search/sort, a mix of active, upcoming and inactive across
   both years, all below-foreman people (never a Foreman -- see the component's search filter). */
const DEFAULT_GRANTS: MakeupGrant[] = [
  { id: 'mk1', personId: 'E10231', startDate: '2026-10-06', endDate: '2026-10-17', changedBy: 'J. Johnson' },
  { id: 'mk2', personId: 'E10232', startDate: '2026-10-05', endDate: '2026-10-12', changedBy: 'D. Kim' },
  { id: 'mk3', personId: 'E10233', startDate: '2026-01-05', endDate: '2026-01-10', changedBy: 'D. Whitfield' },
  { id: 'mk4', personId: 'E10234', startDate: '2026-10-01', endDate: '2026-10-14', changedBy: 'B. Miller' },
  { id: 'mk5', personId: 'E10235', startDate: '2026-06-01', endDate: '2026-06-10', changedBy: 'J. Martinez' },
  { id: 'mk6', personId: 'E10236', startDate: '2025-11-01', endDate: '2025-11-10', changedBy: 'P. Anderson' },
  { id: 'mk7', personId: 'E10237', startDate: '2026-09-01', endDate: '2026-09-14', changedBy: 'J. Johnson' },
  { id: 'mk8', personId: 'E20411', startDate: '2026-03-01', endDate: '2026-03-05', changedBy: 'D. Kim' },
  { id: 'mk9', personId: 'E20412', startDate: '2026-10-08', endDate: '2026-10-20', changedBy: 'D. Whitfield' },
  { id: 'mk10', personId: 'E20413', startDate: '2026-08-01', endDate: '2026-08-14', changedBy: 'B. Miller' },
  { id: 'mk11', personId: 'E20414', startDate: '2026-02-10', endDate: '2026-02-20', changedBy: 'J. Martinez' },
  { id: 'mk12', personId: 'E20415', startDate: '2026-10-13', endDate: '2026-10-24', changedBy: 'P. Anderson' },
  { id: 'mk13', personId: 'E20416', startDate: '2026-05-01', endDate: '2026-05-03', changedBy: 'J. Johnson' },
  { id: 'mk14', personId: 'E20417', startDate: '2026-07-01', endDate: '2026-07-10', changedBy: 'D. Kim' },
  { id: 'mk15', personId: 'E20418', startDate: '2026-04-01', endDate: '2026-04-05', changedBy: 'D. Whitfield' },
  { id: 'mk16', personId: 'E30502', startDate: '2026-09-01', endDate: '2026-09-10', changedBy: 'B. Miller' },
  { id: 'mk17', personId: 'E30503', startDate: '2026-09-23', endDate: '2026-10-10', changedBy: 'J. Martinez' },
  { id: 'mk18', personId: 'E30504', startDate: '2025-12-01', endDate: '2025-12-15', changedBy: 'P. Anderson' },
  { id: 'mk19', personId: 'E30506', startDate: '2026-09-10', endDate: '2026-09-20', changedBy: 'J. Johnson' },
  { id: 'mk20', personId: 'E30507', startDate: '2026-10-20', endDate: '2026-10-27', changedBy: 'D. Kim' },
  { id: 'mk21', personId: 'E30508', startDate: '2026-01-15', endDate: '2026-01-20', changedBy: 'D. Whitfield' },
  { id: 'mk22', personId: 'E30509', startDate: '2026-09-05', endDate: '2026-09-12', changedBy: 'B. Miller' },
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

function setMakeupGrants(grants: MakeupGrant[]) {
  save(grants);
  makeupGrants.set(grants);
}

export function addMakeupGrant(personId: string, startDate: string, endDate: string): string {
  const id = 'mk' + Date.now();
  setMakeupGrants([...makeupGrants(), { id, personId, startDate, endDate, changedBy: 'User' }]);
  return id;
}

export function removeMakeupGrant(id: string) {
  setMakeupGrants(makeupGrants().filter(g => g.id !== id));
}

export function updateMakeupGrant(id: string, patch: Partial<Pick<MakeupGrant, 'startDate' | 'endDate'>>) {
  setMakeupGrants(makeupGrants().map(g => (g.id === id ? { ...g, ...patch, changedBy: 'User' } : g)));
}

/* Active = today is inside the dates, Upcoming = starts later, Inactive = already ended */
export type GrantStatus = 'Active' | 'Upcoming' | 'Inactive';
export function grantStatus(g: MakeupGrant, today = new Date().toISOString().slice(0, 10)): GrantStatus {
  if (g.endDate < today) return 'Inactive';
  return g.startDate > today ? 'Upcoming' : 'Active';
}

/* inclusive day count, e.g. the same day start/end is 1 day */
export function daySpan(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00').getTime();
  const end = new Date(endDate + 'T00:00:00').getTime();
  return Math.max(0, Math.round((end - start) / 86400000) + 1);
}

/* days already used this calendar year across a person's other grants (by start date's year),
   optionally excluding one grant (the one currently being edited) */
function daysUsed(personId: string, year: number, grants: MakeupGrant[], excludeGrantId?: string): number {
  return grants
    .filter(g => g.personId === personId && g.id !== excludeGrantId && new Date(g.startDate + 'T00:00:00').getFullYear() === year)
    .reduce((sum, g) => sum + daySpan(g.startDate, g.endDate), 0);
}

export function daysRemaining(personId: string, year: number, grants: MakeupGrant[], excludeGrantId?: string): number {
  return ANNUAL_MAKEUP_DAYS - daysUsed(personId, year, grants, excludeGrantId);
}
