/* Makeup status — a Foreman temporarily granted authority to act as the foreman and build an ad
   hoc "makeup team" of people assigned to other roles for the duration. UI-only for now: nothing
   else in the app reads this to actually change what a person can do (see ARCHITECTURE.md) — this
   just lets it be set up and reviewed, the same demo-aid honesty as Admin > Teams (AD groups/
   permissions are also just mocked there, not enforced). Same load/save/add/remove shape as
   material-classification.ts. */
import { STORAGE } from './storage-keys';
import { signal } from '@angular/core';
import { Role } from './workflow';

export interface MakeupMember {
  personId: string;
  role: Role;
}

export interface MakeupGrant {
  id: string;
  foremanId: string;     /* Person.id — who is granted makeup (acting-foreman) status */
  startDate: string;     /* ISO date, yyyy-mm-dd */
  endDate: string;       /* ISO date, yyyy-mm-dd — required, no open-ended grants */
  members: MakeupMember[];
}

const LS_KEY = STORAGE.makeup;

/* Demo seed: one currently-active grant, one already expired for contrast. */
const DEFAULT_GRANTS: MakeupGrant[] = [
  {
    id: 'mk1', foremanId: 'E30505', startDate: '2026-09-15', endDate: '2026-09-30',
    members: [
      { personId: 'E10231', role: 'Welding' },
      { personId: 'E10233', role: 'Fitting' },
      { personId: 'E20413', role: 'Inspector' },
    ],
  },
  {
    id: 'mk2', foremanId: 'E30510', startDate: '2026-08-01', endDate: '2026-08-14',
    members: [
      { personId: 'E10236', role: 'Welding' },
    ],
  },
];

function load(): MakeupGrant[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_GRANTS.map(g => ({ ...g, members: [...g.members] }));
}

function save(grants: MakeupGrant[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(grants));
}

export const makeupGrants = signal<MakeupGrant[]>(load());

export function setMakeupGrants(grants: MakeupGrant[]) {
  save(grants);
  makeupGrants.set(grants);
}

export function addMakeupGrant(foremanId: string, startDate: string, endDate: string): string {
  const id = 'mk' + Date.now();
  const updated = [...makeupGrants(), { id, foremanId, startDate, endDate, members: [] }];
  setMakeupGrants(updated);
  return id;
}

export function removeMakeupGrant(id: string) {
  setMakeupGrants(makeupGrants().filter(g => g.id !== id));
}

export function updateMakeupGrant(id: string, patch: Partial<Pick<MakeupGrant, 'foremanId' | 'startDate' | 'endDate'>>) {
  setMakeupGrants(makeupGrants().map(g => (g.id === id ? { ...g, ...patch } : g)));
}

export function addMakeupMember(grantId: string, personId: string, role: Role) {
  setMakeupGrants(makeupGrants().map(g =>
    g.id !== grantId ? g : g.members.some(m => m.personId === personId)
      ? g
      : { ...g, members: [...g.members, { personId, role }] }));
}

export function removeMakeupMember(grantId: string, personId: string) {
  setMakeupGrants(makeupGrants().map(g =>
    g.id !== grantId ? g : { ...g, members: g.members.filter(m => m.personId !== personId) }));
}

export function isGrantActive(g: MakeupGrant, today = new Date().toISOString().slice(0, 10)): boolean {
  return g.startDate <= today && today <= g.endDate;
}
