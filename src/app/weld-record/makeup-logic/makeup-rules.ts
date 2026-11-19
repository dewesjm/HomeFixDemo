import type { MakeupGrant } from '../../data/makeup-grants';

/* the furthest out a makeup end date can be set, in days from today */
export const MAKEUP_MAX_DAYS_OUT = 60;
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

/* the last date makeup can run to: today plus MAKEUP_MAX_DAYS_OUT */
export function makeupLatestDate(today = new Date()): string {
  const latest = new Date(today.getFullYear(), today.getMonth(), today.getDate() + MAKEUP_MAX_DAYS_OUT);
  return makeupDate(latest);
}
