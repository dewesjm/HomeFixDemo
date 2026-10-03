/* The filter engine both Advanced Searches use (Weld Record's data/filter-schema.ts and Weld Planning's
   weld-planning-filter-schema.ts): stacked conditions per field, how they match a cell, and chip text.
   A field's conditions combine like this: the "include" ones (contains, is, starts with, is blank,
   between, greater/less than) are OR'd, the "exclude" ones (does not contain, is not, is not blank)
   must all hold. Different fields are AND'd. */

export type FieldKind = 'text' | 'list' | 'number' | 'date';

/* what the engine needs to know about a field: the row key it reads, its label (chips) and kind */
export interface MatchField {
  key: string;
  label: string;
  kind: FieldKind;
}

export type Op = 'contains' | 'notContains' | 'is' | 'isNot' | 'startsWith' | 'blank' | 'notBlank' | 'between' | 'gt' | 'lt';

export interface Condition {
  op: Op;
  value: string;          /* typed text / number / yyyy-mm-dd; 'between' start */
  to: string;             /* 'between' end */
  values: string[];       /* list fields: is / is not any of these */
}

export type FilterValues = Record<string, Condition[]>;

export const OPS_BY_KIND: Record<FieldKind, Op[]> = {
  text: ['contains', 'notContains', 'is', 'isNot', 'startsWith', 'blank', 'notBlank'],
  list: ['is', 'isNot', 'contains', 'notContains', 'blank', 'notBlank'],
  number: ['between', 'gt', 'lt'],
  date: ['between', 'gt', 'lt'],
};

export function opLabel(op: Op, kind: FieldKind): string {
  switch (op) {
    case 'contains': return 'contains';
    case 'notContains': return 'does not contain';
    case 'is': return 'is';
    case 'isNot': return 'is not';
    case 'startsWith': return 'starts with';
    case 'blank': return 'is blank';
    case 'notBlank': return 'is not blank';
    case 'between': return 'between';
    case 'gt': return kind === 'date' ? 'after' : 'greater than';
    case 'lt': return kind === 'date' ? 'before' : 'less than';
  }
}

const EXCLUDES: Op[] = ['notContains', 'isNot', 'notBlank'];
export const isExclude = (op: Op) => EXCLUDES.includes(op);
export const needsNoValue = (op: Op) => op === 'blank' || op === 'notBlank';

export function newCondition(kind: FieldKind): Condition {
  return { op: OPS_BY_KIND[kind][0], value: '', to: '', values: [] };
}

/* a condition with nothing filled in yet doesn't filter */
export function isActive(c: Condition, kind: FieldKind): boolean {
  if (needsNoValue(c.op)) return true;
  if (kind === 'list' && (c.op === 'is' || c.op === 'isNot')) return c.values.length > 0;
  if (c.op === 'between') return !!c.value || !!c.to;
  return !!c.value.trim();
}

export const activeConditions = (field: MatchField, conds: Condition[] | undefined) =>
  (conds ?? []).filter(c => isActive(c, field.kind));

/* a date as the yyyy-mm-dd a date condition holds ('' for none) */
export function isoDay(d: unknown): string {
  if (!d) return '';
  const x = new Date(d as string | number | Date);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/* ── Matching ── */

const day = (iso: string) => (iso ? new Date(iso + 'T00:00:00').getTime() : NaN);
const DAY_MS = 24 * 3600 * 1000;

function matches(c: Condition, kind: FieldKind, cell: any): boolean {
  if (kind === 'number' || kind === 'date') {
    const v = kind === 'date' ? (cell ? new Date(cell).getTime() : NaN) : Number(cell);
    const n = (s: string) => (kind === 'date' ? day(s) : Number(s));
    if (Number.isNaN(v)) return false;
    switch (c.op) {
      case 'between':
        if (c.value && v < n(c.value)) return false;
        if (c.to) return kind === 'date' ? v < n(c.to) + DAY_MS : v <= n(c.to);
        return true;
      case 'gt': return kind === 'date' ? v >= n(c.value) + DAY_MS : v > n(c.value);
      case 'lt': return v < n(c.value);
      default: return false;
    }
  }
  const text = String(cell ?? '').trim().toLowerCase();
  const typed = c.value.trim().toLowerCase();
  switch (c.op) {
    case 'contains': return text.includes(typed);
    case 'notContains': return !text.includes(typed);
    case 'startsWith': return text.startsWith(typed);
    case 'blank': return !text;
    case 'notBlank': return !!text;
    case 'is':
    case 'isNot': {
      const hit = kind === 'list' ? c.values.some(v => v.trim().toLowerCase() === text) : text === typed;
      return c.op === 'is' ? hit : !hit;
    }
    default: return false;
  }
}

export function fieldMatches(field: MatchField, conds: Condition[] | undefined, cell: any): boolean {
  const active = activeConditions(field, conds);
  if (!active.length) return true;
  const includes = active.filter(c => !isExclude(c.op));
  const excludes = active.filter(c => isExclude(c.op));
  return (!includes.length || includes.some(c => matches(c, field.kind, cell)))
    && excludes.every(c => matches(c, field.kind, cell));
}

export function applyFilters<R>(rows: R[], fields: MatchField[], values: FilterValues): R[] {
  const used = fields.filter(f => activeConditions(f, values[f.key]).length);
  if (!used.length) return rows;
  return rows.filter(r => used.every(f => fieldMatches(f, values[f.key], (r as Record<string, unknown>)[f.key])));
}

/* chip text, e.g. Hull: contains "K7" or starts with "S", and not "S9" */
export function chipLabel(field: MatchField, conds: Condition[]): string {
  const one = (c: Condition) => {
    const label = opLabel(c.op, field.kind);
    if (needsNoValue(c.op)) return label;
    if (field.kind === 'list' && (c.op === 'is' || c.op === 'isNot')) return `${label} ${c.values.join(', ')}`;
    if (c.op === 'between') return `${label} ${c.value || '…'} and ${c.to || '…'}`;
    return `${label} "${c.value.trim()}"`;
  };
  const active = activeConditions(field, conds);
  const inc = active.filter(c => !isExclude(c.op)).map(one).join(' or ');
  const exc = active.filter(c => isExclude(c.op)).map(one).join(', and ');
  return `${field.label}: ${[inc, exc].filter(Boolean).join(', and ')}`;
}
