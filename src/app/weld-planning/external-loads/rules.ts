/* Stage 3, Processed: business rules decide which converted rows go on to the weld joints.
   Every row is kept with its outcome, so the page can say why a row didn't make it. */
import { ConvertedRow } from './convert';
import { FieldKey, STATUS_LABELS } from './layout';

export type ProcessOutcome = 'Included' | 'Excluded' | 'Not converted';

export interface ProcessedRow {
  lineNo: number;
  values: Record<FieldKey, string>;
  outcome: ProcessOutcome;
  /* blank when included */
  reason: string;
  detail: string;
}

/* statuses that keep a row out of the weld joints */
export const EXCLUDED_STATUSES = ['CN', 'SP'];

export function processRow(row: ConvertedRow): ProcessedRow {
  const base = { lineNo: row.lineNo, values: row.values };
  if (row.errors.length) {
    return { ...base, outcome: 'Not converted', reason: 'Conversion error', detail: row.errors.map(e => e.message).join('; ') };
  }
  if (row.values.workBy === 'V') {
    return { ...base, outcome: 'Excluded', reason: 'Vendor Joint', detail: 'Work By = V (Vendor)' };
  }
  if (EXCLUDED_STATUSES.includes(row.values.status)) {
    const label = STATUS_LABELS[row.values.status] ?? row.values.status;
    return { ...base, outcome: 'Excluded', reason: 'Excluded by status', detail: `Status = ${row.values.status} (${label})` };
  }
  return { ...base, outcome: 'Included', reason: '', detail: '' };
}
