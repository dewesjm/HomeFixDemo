import type { MakeupGrant } from '../../data/makeup-grants';

const ANNUAL_MAKEUP_DAYS = 90;
export const MAKEUP_TITLES = ['Fitter', 'Welder', 'Fitter and Welder'];

export function makeupDate(date = new Date()): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-');
}

export function validMakeupDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00');
  return Number.isFinite(date.getTime()) && makeupDate(date) === value;
}

/* Active = today is inside the dates, Upcoming = starts later, Inactive = already ended */
export type GrantStatus = 'Active' | 'Upcoming' | 'Inactive';
export function grantStatus(g: MakeupGrant, today = makeupDate()): GrantStatus {
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
