/* Look up a joint by XREFID and/or hull, drawing, joint, and follow it through every stage of each
   kept load: its raw line, converted values, processed outcome, merge action and error log entries. */
import { ConvertedRow, RawLine } from './convert';
import { ProcessedRow } from './rules';
import { WeldJointRow } from './merge';
import { ErrorLogEntry, LoadData } from './loads';
import { FieldKey, recordKey } from './layout';

export interface LookupQuery {
  xrefid: string;
  hull: string;
  drawing: string;
  joint: string;
}

export interface StageTrace {
  load: LoadData;
  raw?: RawLine;
  converted?: ConvertedRow;
  processed?: ProcessedRow;
  weldJoint?: WeldJointRow;
}

export interface LookupResult {
  key: string;
  xrefid: string;
  hull: string;
  drawing: string;
  joint: string;
  traces: StageTrace[];
  errors: ErrorLogEntry[];
}

const QUERY_FIELDS: (keyof LookupQuery)[] = ['xrefid', 'hull', 'drawing', 'joint'];
const norm = (v: string | undefined) => (v ?? '').trim().toUpperCase();

export function isBlankQuery(q: LookupQuery): boolean {
  return QUERY_FIELDS.every(f => !norm(q[f]));
}

/* every filled-in field must match exactly (any case); blank fields match anything */
export function matchesQuery(values: Partial<Record<FieldKey, string>>, q: LookupQuery): boolean {
  return !isBlankQuery(q) && QUERY_FIELDS.every(f => !norm(q[f]) || norm(values[f]) === norm(q[f]));
}

export function lookupRecords(q: LookupQuery, loads: LoadData[], errors: ErrorLogEntry[]): LookupResult[] {
  const found = new Map<string, Partial<Record<FieldKey, string>>>();
  for (const load of loads) {
    for (const v of [...load.converted.map(r => r.values), ...load.weldJoints.map(j => j.values)]) {
      if (matchesQuery(v, q) && !found.has(recordKey(v))) found.set(recordKey(v), v);
    }
  }

  return [...found].map(([key, v]) => {
    const traces = loads.map(load => {
      const converted = load.converted.find(r => recordKey(r.values) === key);
      return {
        load,
        converted,
        raw: converted && load.raw.find(l => l.lineNo === converted.lineNo),
        processed: converted && load.processed.find(r => r.lineNo === converted.lineNo),
        weldJoint: load.weldJoints.find(j => j.key === key),
      };
    });
    return {
      key,
      xrefid: v.xrefid ?? '', hull: v.hull ?? '', drawing: v.drawing ?? '', joint: v.joint ?? '',
      traces,
      errors: errors.filter(e => recordKey(e) === key),
    };
  });
}
