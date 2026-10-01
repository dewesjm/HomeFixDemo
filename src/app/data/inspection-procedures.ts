/* Admin > Inspection Procedures: which procedures an NDT step's "Procedure Used for Inspection"
   offers, per inspection Type. Stored in localStorage. */
import { STORAGE } from './storage-keys';

export interface InspectionProcedureEntry {
  type: string;        /* RT, UT, MT, PT, VT or 5X (INSPECTION_TYPES) */
  procedure: string;
}

/* the NDT steps' Type values, same order as on the steps */
export const INSPECTION_TYPES = ['RT', 'UT', 'MT', 'PT', 'VT', '5X'];

/* the four procedures the droplist always had, each given the types it covers */
const DEFAULT_INSPECTION_PROCEDURES: InspectionProcedureEntry[] = [
  { type: 'RT', procedure: 'ASME Sec V' }, { type: 'RT', procedure: 'SNT-TC-1A' },
  { type: 'UT', procedure: 'ASME Sec V' }, { type: 'UT', procedure: 'SNT-TC-1A' },
  { type: 'MT', procedure: 'ASME Sec V' }, { type: 'MT', procedure: 'AWS D1.1' },
  { type: 'PT', procedure: 'ASME Sec V' }, { type: 'PT', procedure: 'ASTM E165' },
  { type: 'VT', procedure: 'AWS D1.1' }, { type: 'VT', procedure: 'ASME Sec V' },
  { type: '5X', procedure: 'AWS D1.1' }, { type: '5X', procedure: 'ASME Sec V' },
];

export function getInspectionProcedures(): InspectionProcedureEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE.inspectionProcedures);
    return raw ? JSON.parse(raw) : DEFAULT_INSPECTION_PROCEDURES;
  } catch { return DEFAULT_INSPECTION_PROCEDURES; }
}

export function setInspectionProcedures(entries: InspectionProcedureEntry[]) {
  localStorage.setItem(STORAGE.inspectionProcedures, JSON.stringify(entries));
}

/* droplist options for a step's Type (stage.inspectionType, e.g. 'vt'); every procedure when no Type is picked yet */
export function inspectionProcedureOptions(inspectionType = ''): { label: string; value: string }[] {
  const t = inspectionType.toUpperCase();
  const names = getInspectionProcedures().filter(e => !t || e.type === t).map(e => e.procedure);
  return [...new Set(names)].map(p => ({ label: p, value: p }));
}
