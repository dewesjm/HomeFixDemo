/* Flat rows for the External Loads tables: one object per row, one property per column. */
import { ErrorLogEntry, LoadData, LoadRun } from './loads';
import { FieldKey, STATUS_LABELS, WORK_BY_LABELS } from './layout';

export type FlatRow = Record<string, string | number | Date | null>;

const codeLabel = (code: string, labels: Record<string, string>) => (code ? `${code} (${labels[code] ?? 'unknown'})` : '');

function fields(values: Record<FieldKey, string>): FlatRow {
  return {
    ...values,
    status: codeLabel(values.status, STATUS_LABELS),
    workBy: codeLabel(values.workBy, WORK_BY_LABELS),
  };
}

export function convertedRows(load: LoadData): FlatRow[] {
  return load.converted.map(r => ({
    lineNo: r.lineNo,
    ...fields(r.values),
    errors: r.errors.map(e => e.message).join('; '),
  }));
}

export function processedRows(load: LoadData): FlatRow[] {
  return load.processed.map(r => ({
    lineNo: r.lineNo,
    outcome: r.outcome,
    reason: r.reason,
    detail: r.detail,
    ...fields(r.values),
  }));
}

export function weldJointRows(load: LoadData): FlatRow[] {
  return load.weldJoints.map(j => ({
    action: j.action,
    ...fields(j.values),
    weldRecordData: j.hasWeldRecordData ? 'Yes' : 'No',
    detail: j.detail,
  }));
}

export function runRows(runs: LoadRun[]): FlatRow[] {
  return runs.map(r => ({
    id: r.id,
    status: r.status,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    linesReceived: r.linesReceived,
    checks: r.checks.map(c => `${c.passed ? 'Passed' : 'FAILED'}: ${c.name} (${c.detail})`).join('; '),
    dataKept: r.dataKept ? 'Yes' : 'No',
    note: r.note,
  }));
}

export function errorRows(entries: ErrorLogEntry[]): FlatRow[] {
  return entries.map(e => ({ ...e, lineNo: e.lineNo }));
}
