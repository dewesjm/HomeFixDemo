/* Admin > Defect Codes: the codes an NDT step's Defect Code droplist offers, per inspection Type.
   Only RT steps show Defect Code; the Type column lets other Types have codes later. Stored in localStorage. */
import { STORAGE } from './storage-keys';

export interface DefectCodeEntry {
  type: string;          /* RT, UT, MT, PT, VT or 5X (INSPECTION_TYPES) */
  code: string;
  description: string;
}

const DEFAULT_DEFECT_CODES: DefectCodeEntry[] = [
  { type: 'RT', code: 'PO', description: 'Porosity' },
  { type: 'RT', code: 'SI', description: 'Slag Inclusion' },
  { type: 'RT', code: 'LF', description: 'Lack of Fusion' },
  { type: 'RT', code: 'IP', description: 'Incomplete Penetration' },
  { type: 'RT', code: 'CR', description: 'Crack' },
  { type: 'RT', code: 'UC', description: 'Undercut' },
];

export function getDefectCodes(): DefectCodeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE.defectCodes);
    return raw ? JSON.parse(raw) : DEFAULT_DEFECT_CODES;
  } catch { return DEFAULT_DEFECT_CODES; }
}

export function setDefectCodes(entries: DefectCodeEntry[]) {
  localStorage.setItem(STORAGE.defectCodes, JSON.stringify(entries));
}

/* droplist options for a step's Type (stage.inspectionType, e.g. 'rt'), value = the code; every code when no Type is picked yet */
export function defectCodeOptions(inspectionType = ''): { label: string; value: string }[] {
  const t = inspectionType.toUpperCase();
  const seen = new Set<string>();
  return getDefectCodes()
    .filter(e => (!t || e.type === t) && !seen.has(e.code) && seen.add(e.code))
    .map(e => ({ label: `${e.code} - ${e.description}`, value: e.code }));
}
