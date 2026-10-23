/* The separate step after Processed: compare the processed rows with the file-sourced joints already
   in the weld joint table, by hull + drawing + joint. Adds new joints, updates changed ones, and
   removes ones gone from the file unless the joint has weld record data. */
import { ProcessedRow } from './rules';
import { FieldKey, LAYOUT, fieldLabel, recordKey } from './layout';

export type MergeAction = 'Added' | 'Updated' | 'Unchanged' | 'Removed' | 'Kept';

export interface WeldJointRow {
  key: string;
  values: Record<FieldKey, string>;
  hasWeldRecordData: boolean;
  /* true when the joint isn't on any line of this file (Removed, or Kept for its weld record data) */
  missingFromFile: boolean;
  action: MergeAction;
  /* set on Kept rows only */
  keptBecause?: 'Not converted' | 'Weld record data';
  detail: string;
}

/* what the merge compares; dates the vendor stamps on every change aren't joint data */
const COMPARED_FIELDS = LAYOUT.map(f => f.key).filter(k => k !== 'changedDate');

export function mergeIntoWeldJoints(
  processed: ProcessedRow[],
  before: Record<FieldKey, string>[],
  protectedKeys: Set<string>,
): WeldJointRow[] {
  const incoming = new Map<string, ProcessedRow>();
  for (const r of processed) if (r.outcome === 'Included') incoming.set(recordKey(r.values), r);
  const existing = new Map(before.map(v => [recordKey(v), v]));
  const out: WeldJointRow[] = [];

  for (const [key, row] of incoming) {
    const old = existing.get(key);
    const hasWeldRecordData = protectedKeys.has(key);
    if (!old) {
      out.push({ key, values: row.values, hasWeldRecordData, missingFromFile: false, action: 'Added', detail: `New in file (line ${row.lineNo})` });
      continue;
    }
    const changed = COMPARED_FIELDS.filter(k => (old[k] ?? '') !== (row.values[k] ?? ''));
    out.push(changed.length
      ? { key, values: row.values, hasWeldRecordData, missingFromFile: false, action: 'Updated', detail: changed.map(k => `${fieldLabel(k)}: "${old[k]}" -> "${row.values[k]}"`).join('; ') }
      : { key, values: row.values, hasWeldRecordData, missingFromFile: false, action: 'Unchanged', detail: '' });
  }

  for (const [key, old] of existing) {
    if (incoming.has(key)) continue;
    const hasWeldRecordData = protectedKeys.has(key);
    const row = processed.find(r => recordKey(r.values) === key);
    /* a line that couldn't be converted is still in the file, so the joint keeps its previous values */
    if (row?.outcome === 'Not converted') {
      out.push({ key, values: old, hasWeldRecordData, missingFromFile: false, action: 'Kept', keptBecause: 'Not converted', detail: `Line ${row.lineNo} could not be converted; previous values kept` });
      continue;
    }
    const missingFromFile = !row;
    const why = row ? `Not included in Processed: ${row.reason} (line ${row.lineNo})` : 'No longer in the file';
    out.push(hasWeldRecordData
      ? { key, values: old, hasWeldRecordData, missingFromFile, action: 'Kept', keptBecause: 'Weld record data', detail: `${why}; has weld record data, so it is not removed` }
      : { key, values: old, hasWeldRecordData, missingFromFile, action: 'Removed', detail: why });
  }
  return out;
}
