import { DefectCodeEntry } from '../../../data/defect-codes';

export function validDefectCode(entry: DefectCodeEntry, others: DefectCodeEntry[]): boolean {
  return !!entry.type && !!entry.code.trim() && !others.some(other =>
    other.type === entry.type && other.code.trim().toUpperCase() === entry.code.trim().toUpperCase());
}
