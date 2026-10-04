/* Stage 2, Converted: cut a raw line into fields by the layout and convert dates and numbers.
   Mechanical only, no business decisions. A value that won't convert is flagged, never dropped. */
import { FieldKey, LAYOUT, LINE_WIDTH } from './layout';

export interface RawLine {
  lineNo: number;
  text: string;
}

export interface ConversionError {
  field: FieldKey | 'line';
  label: string;
  value: string;
  message: string;
}

export interface ConvertedRow {
  lineNo: number;
  values: Record<FieldKey, string>;
  errors: ConversionError[];
}

/* yyyymmdd -> yyyy-mm-dd, or null when it isn't a real date */
export function convertDate(raw: string): string | null {
  if (!/^\d{8}$/.test(raw)) return null;
  const y = +raw.slice(0, 4), m = +raw.slice(4, 6), d = +raw.slice(6, 8);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

/* zero-padded decimal, e.g. 0012.50 -> 12.5 */
export function convertNumber(raw: string): string | null {
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  return String(Number(raw));
}

export function convertLine(line: RawLine): ConvertedRow {
  const values = {} as Record<FieldKey, string>;
  const errors: ConversionError[] = [];

  if (line.text.length !== LINE_WIDTH) {
    errors.push({
      field: 'line', label: 'Line', value: '',
      message: `Line is ${line.text.length} characters, expected ${LINE_WIDTH}`,
    });
  }

  for (const f of LAYOUT) {
    const raw = line.text.slice(f.start - 1, f.start - 1 + f.length).trim();
    let value = raw;
    if (raw && f.type === 'date') {
      const d = convertDate(raw);
      if (d === null) errors.push({ field: f.key, label: f.label, value: raw, message: `${f.label} "${raw}" is not a valid date` });
      else value = d;
    } else if (raw && f.type === 'number') {
      const n = convertNumber(raw);
      if (n === null) errors.push({ field: f.key, label: f.label, value: raw, message: `${f.label} "${raw}" is not a number` });
      else value = n;
    }
    if (!raw && f.required) errors.push({ field: f.key, label: f.label, value: '', message: `${f.label} is blank` });
    values[f.key] = value;
  }

  return { lineNo: line.lineNo, values, errors };
}
