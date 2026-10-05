/* Fabrication: the cross-step data section on a Welding joint (location, MICs, drawing rev...) */
import { jointDesignOptions } from '../joint-designs';
import { isShipboardLocation, shopOptions } from '../shops';
import { SignoffInput } from './types';

export interface FabricationField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  placeholder?: string;
  options?: { label: string; value: string; detail?: string }[];
  unit?: string;
  fullWidth?: boolean;
  row: 1 | 2 | 3 | 4 | 5;
  /* shown only when another field has a value, or when Location is a Shipboard location */
  showIf?: { key: string; notEmpty: true } | { shipboardLocation: true };
  required?: boolean;
}

export const FABRICATION_FIELDS: FabricationField[] = [
  // Line 1: Location and Specific Location
  { key: 'location', label: 'Location', type: 'select', row: 1, required: true, options: shopOptions() },
  { key: 'specificLocation', label: 'Specific Location', type: 'text', placeholder: 'e.g. Bay 3, Rack 12', row: 1 },
  // Line 2: Deck, Frame, P/S/CL, and Usage (shown when Location is marked Shipboard in Admin > Locations); options come from
  // Admin > Ship Locations for the joint's hull at runtime (shipLocationOptions in ship-locations.ts)
  { key: 'deck', label: 'Deck', type: 'select', row: 2, showIf: { shipboardLocation: true }, required: true },
  { key: 'frame', label: 'Frame', type: 'select', row: 2, showIf: { shipboardLocation: true }, required: true, placeholder: 'Pick a Deck first' },
  { key: 'pscl', label: 'P/S/CL', type: 'select', row: 2, showIf: { shipboardLocation: true }, required: true },
  { key: 'usage', label: 'Usage', type: 'select', row: 2, showIf: { shipboardLocation: true }, required: true, placeholder: 'Pick Deck, Frame and P/S/CL first' },
  // Line 3: MIC 1 and MIC 2 -- only present in the fields list (see data/joint-form/fabrication-form.ts
  // fabricationFieldsShown()) when that joint member's MCL requires traceability, so required is unconditional here
  { key: 'id1', label: 'MIC 1', type: 'text', row: 3, required: true },
  { key: 'id2', label: 'MIC 2', type: 'text', row: 3, required: true },
  // Line 4: Drawing Rev (Execution) and Actual Thickness
  { key: 'drawingRev', label: 'Drawing Rev (Execution)', type: 'text', row: 4, required: true },
  { key: 'actualThickness', label: 'Actual Thickness', type: 'text', unit: 'in', row: 4, required: true },
  // Line 5: W.E. Memo, Revised Joint Design, and Change Number
  { key: 'weldMemo', label: 'W.E. Memo', type: 'text', row: 5 },
  { key: 'revisedJointDesign', label: 'Revised Joint Design', type: 'select', row: 5,
    options: [] },
  { key: 'changeNumber', label: 'ER/IR Number', type: 'text', row: 5,
    showIf: { key: 'revisedJointDesign', notEmpty: true }, required: true },
];

/* whether a field's showIf is met by the joint's fabrication data */
export function fabricationFieldVisible(f: FabricationField, fab: Record<string, string>): boolean {
  if (!f.showIf) return true;
  if ('shipboardLocation' in f.showIf) return isShipboardLocation(fab['location']);
  return !!(fab[f.showIf.key] ?? '').trim();
}

/* fabrication data as it stood at some moment (e.g. a sign-off) — every field, blanks included, with
   Location/Revised Joint Design resolved to their display label the same way the live form does */
export function fabricationSnapshot(fab: Record<string, string>): SignoffInput[] {
  return FABRICATION_FIELDS
    .filter(f => fabricationFieldVisible(f, fab))
    .map(f => {
      const options = f.key === 'location' ? shopOptions()
        : f.key === 'revisedJointDesign' ? jointDesignOptions()
        : f.options;
      const raw = fab[f.key] ?? '';
      const value = options?.find(o => o.value === raw)?.label ?? raw;
      return { label: f.label, value };
    });
}

/* every Fabrication field blank: a joint sent back to Fit or earlier starts its fit-up data over */
export function blankFabricationData(): Record<string, string> {
  return Object.fromEntries(FABRICATION_FIELDS.map(f => [f.key, '']));
}
