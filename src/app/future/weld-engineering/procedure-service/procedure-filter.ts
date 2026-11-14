/* The condition findProcedures() matches: field key -> value, all of which must hold. A key is a
   header field (gwp, wtn, title, weldProcess, ...) or a section field key. Matching ignores case:
   one value must equal it, a list must contain it, a Min / Max range must include it (a number) and a
   qualification requirement must name it. A procedure without the field's section never matches. */
import type { Procedure } from '../../../data/procedures';
import { findField, type ProcedureSection } from '../procedure-sections';
import { sectionValue, isQuals, isRange } from '../procedure-field-values';
import { qualsIn } from '../../../weld-record/qualifications-logic/qual-requirements';
import type { ProcedureHeader } from './procedure-record';

export type ProcedureFilter = Record<string, string>;

/* header fields a filter can use; status is its own option, not a filter key */
export const FILTER_HEADER_KEYS: (keyof ProcedureHeader)[] =
  ['gwp', 'wtn', 'title', 'revision', 'effectiveDate', 'weldProcess', 'processType', 'application'];

const same = (a: unknown, b: string) => String(a).trim().toLowerCase() === b.trim().toLowerCase();

/* a message when a filter key can't be used, '' when every key can */
export function filterProblem(filter: ProcedureFilter, sections: ProcedureSection[]): string {
  for (const key of Object.keys(filter)) {
    if (key === 'status') return 'Pick a status with the status option, not the filter.';
    if (FILTER_HEADER_KEYS.includes(key as keyof ProcedureHeader)) continue;
    const field = findField(key, sections);
    if (!field) return `No header or procedure field has the key ${key}.`;
    if (field.type === 'override') return `${field.label} (${key}) can't be filtered on: it's a group of parts.`;
    if (field.type === 'range' && isNaN(Number(filter[key]))) return `${field.label} (${key}) is a range: filter it with a number.`;
  }
  return '';
}

function valueMatches(p: Procedure, key: string, wanted: string, sections: ProcedureSection[]): boolean {
  if (FILTER_HEADER_KEYS.includes(key as keyof ProcedureHeader)) return same(p[key as keyof ProcedureHeader], wanted);
  const v = sectionValue(p, key, sections);
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.some(item => same(item, wanted));
  if (isRange(v)) {
    const n = Number(wanted);
    return (v.min === null || n >= v.min) && (v.max === null || n <= v.max) && (v.min !== null || v.max !== null);
  }
  if (isQuals(v)) return qualsIn(v).some(q => same(q, wanted));
  return typeof v === 'string' || typeof v === 'number' ? same(v, wanted) : false;
}

/* true when every condition in the filter holds; check filterProblem() first */
export function matchesFilter(p: Procedure, filter: ProcedureFilter, sections: ProcedureSection[]): boolean {
  return Object.entries(filter).every(([key, wanted]) => valueMatches(p, key, wanted, sections));
}
