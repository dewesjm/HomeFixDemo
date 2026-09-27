import { Pipe, PipeTransform } from '@angular/core';

/* One date format for the whole app: 09/26/2026 3:04 PM, or 09/26/2026 where only the date matters. */

type DateInput = Date | string | number | null | undefined;

function toDate(v: DateInput): Date | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  /* a bare 'yyyy-mm-dd' is a calendar date: parse it as local, or it shows a day early west of UTC */
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(v: DateInput): string {
  const d = toDate(v);
  return d ? `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}` : '';
}

export function formatDateTime(v: DateInput): string {
  const d = toDate(v);
  if (!d) return '';
  const h = d.getHours() % 12 || 12;
  return `${formatDate(d)} ${h}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

@Pipe({ name: 'appDate', standalone: true })
export class AppDatePipe implements PipeTransform {
  transform(v: DateInput): string { return formatDate(v); }
}

@Pipe({ name: 'appDateTime', standalone: true })
export class AppDateTimePipe implements PipeTransform {
  transform(v: DateInput): string { return formatDateTime(v); }
}
