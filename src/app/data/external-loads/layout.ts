/* Fixed-width layout of the vendor file: each field's position on a line. A generic stand-in
   for the real layout spec, which would be kept as data so a layout change is a data edit. */
export type FieldType = 'text' | 'date' | 'number';

export interface LayoutField {
  key: FieldKey;
  label: string;
  /* 1-based character position where the field starts */
  start: number;
  length: number;
  type: FieldType;
  required?: boolean;
}

export type FieldKey =
  | 'xrefid' | 'hull' | 'drawing' | 'joint' | 'description' | 'status' | 'workBy'
  | 'materialType1' | 'materialType2' | 'pipeSize' | 'weldLength' | 'plannedDate' | 'changedDate';

export const LINE_WIDTH = 500;

const FIELDS: Omit<LayoutField, 'start'>[] = [
  { key: 'xrefid', label: 'XREFID', length: 5, type: 'text' },
  { key: 'hull', label: 'Hull', length: 5, type: 'text', required: true },
  { key: 'drawing', label: 'Drawing', length: 9, type: 'text', required: true },
  { key: 'joint', label: 'Joint', length: 8, type: 'text', required: true },
  { key: 'description', label: 'Description', length: 40, type: 'text' },
  { key: 'status', label: 'Status', length: 2, type: 'text' },
  { key: 'workBy', label: 'Work By', length: 1, type: 'text' },
  { key: 'materialType1', label: 'Material Type 1', length: 12, type: 'text' },
  { key: 'materialType2', label: 'Material Type 2', length: 12, type: 'text' },
  { key: 'pipeSize', label: 'Pipe Size', length: 6, type: 'text' },
  { key: 'weldLength', label: 'Weld Length', length: 7, type: 'number' },
  { key: 'plannedDate', label: 'Planned Date', length: 8, type: 'date' },
  { key: 'changedDate', label: 'Changed Date', length: 8, type: 'date' },
];

/* starts are computed so the fields always sit end to end */
export const LAYOUT: LayoutField[] = FIELDS.reduce<LayoutField[]>((out, f) => {
  const prev = out[out.length - 1];
  out.push({ ...f, start: prev ? prev.start + prev.length : 1 });
  return out;
}, []);

/* the rest of each line holds vendor fields this load doesn't use */
export const USED_WIDTH = LAYOUT.reduce((n, f) => n + f.length, 0);

export const STATUS_LABELS: Record<string, string> = { AC: 'Active', CN: 'Cancelled', SP: 'Superseded' };
export const WORK_BY_LABELS: Record<string, string> = { Y: 'In house', V: 'Vendor' };

export const KEY_FIELDS: FieldKey[] = ['hull', 'drawing', 'joint'];

/* a joint's business key: hull + drawing + joint */
export function recordKey(values: Partial<Record<FieldKey, string>>): string {
  return KEY_FIELDS.map(k => (values[k] ?? '').trim().toUpperCase()).join('|');
}

export function fieldLabel(key: FieldKey): string {
  return LAYOUT.find(f => f.key === key)?.label ?? key;
}
