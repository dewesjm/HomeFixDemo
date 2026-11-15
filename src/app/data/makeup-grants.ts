import { signal } from '@angular/core';
import { makeupDate } from '../weld-record/makeup-logic/makeup-rules';
import { STORAGE } from './storage-keys';

export interface MakeupGrant {
  id: string;
  personId: string;
  foremanId: string;
  startDate: string;
  endDate: string;
  changedBy: string;
}

function load(): MakeupGrant[] {
  try {
    const raw = localStorage.getItem(STORAGE.makeup);
    if (raw) return JSON.parse(raw);
  } catch { /* Use the sample grant when saved data is unavailable. */ }
  const today = makeupDate();
  return [{
    id: 'mk-demo', personId: 'E10238', foremanId: 'foreman',
    startDate: today, endDate: today, changedBy: 'Morgan',
  }];
}

const grants = signal(load());
export const makeupGrants = grants.asReadonly();

export function refreshMakeupGrants(event: StorageEvent): void {
  if (event.storageArea === localStorage && (event.key === STORAGE.makeup || event.key === null)) {
    grants.set(load());
  }
}

export function saveMakeupGrants(rows: MakeupGrant[]): void {
  localStorage.setItem(STORAGE.makeup, JSON.stringify(rows));
  grants.set(rows);
}
