// Schema-driven filter engine — field definitions, the generic applyFilters()
// function, and saved filter "variants" (persisted to localStorage).
import {
  Job,
  TRADE_OPTIONS, TECHNICIAN_OPTIONS, STATUS_OPTIONS, TAG_OPTIONS
} from './jobs';

export type FilterField =
  | { key: string; label: string; type: 'text';        group: string; required?: boolean; field: keyof Job }
  | { key: string; label: string; type: 'multiselect'; group: string; required?: boolean; field: keyof Job; options: { label: string; value: any }[] }
  | { key: string; label: string; type: 'select';      group: string; required?: boolean; field: keyof Job; options: { label: string; value: any }[] }
  | { key: string; label: string; type: 'range';       group: string; required?: boolean; field: keyof Job; min: number; max: number }
  | { key: string; label: string; type: 'rating';      group: string; required?: boolean; field: keyof Job }
  | { key: string; label: string; type: 'daterange';   group: string; required?: boolean; field: keyof Job }
  | { key: string; label: string; type: 'tags';        group: string; required?: boolean; field: keyof Job; options: { label: string; value: any }[] };

export const FILTER_SCHEMA: FilterField[] = [
  { key: 'title',         label: 'Title contains', type: 'text',        group: 'Job',        field: 'title', required: true },
  { key: 'trade',         label: 'Trade',          type: 'multiselect', group: 'Job',        field: 'trade',      options: TRADE_OPTIONS },
  { key: 'technician',    label: 'Technician',     type: 'multiselect', group: 'Job',        field: 'technician', options: TECHNICIAN_OPTIONS },
  { key: 'status',        label: 'Status',         type: 'select',      group: 'Scheduling', field: 'status',     options: STATUS_OPTIONS },
  { key: 'estimatedHours',label: 'Est. hours',     type: 'range',       group: 'Scheduling', field: 'estimatedHours', min: 0, max: 40 },
  { key: 'estimatedCost', label: 'Est. cost ($)',  type: 'range',       group: 'Cost',       field: 'estimatedCost', min: 0, max: 2000 },
  { key: 'inspectionScore',label: 'Min score',     type: 'rating',      group: 'Cost',       field: 'inspectionScore' },
  { key: 'scheduledFor',  label: 'Scheduled',      type: 'daterange',   group: 'Scheduling', field: 'scheduledFor' },
  { key: 'tags',          label: 'Tags (any of)',  type: 'tags',        group: 'Job',        field: 'tags',       options: TAG_OPTIONS }
];

export type FilterValues = Record<string, any>;

export function getField(key: string): FilterField | undefined {
  return FILTER_SCHEMA.find(f => f.key === key);
}

export function isEmpty(field: FilterField, value: any): boolean {
  if (value === null || value === undefined || value === '') return true;
  switch (field.type) {
    case 'multiselect':
    case 'tags':
      return !Array.isArray(value) || value.length === 0;
    case 'range':
      return !Array.isArray(value) || (value[0] === field.min && value[1] === field.max);
    case 'rating':
      return Number(value) <= 0;
    case 'daterange':
      return !Array.isArray(value) || !value[0];
    default:
      return false;
  }
}

export function applyFilters(rows: Job[], values: FilterValues): Job[] {
  return rows.filter(row => {
    for (const f of FILTER_SCHEMA) {
      const v = values[f.key];
      if (isEmpty(f, v)) continue;

      const cell = row[f.field] as any;

      switch (f.type) {
        case 'text':
          if (!String(cell).toLowerCase().includes(String(v).toLowerCase())) return false;
          break;
        case 'multiselect':
          if (!(v as any[]).includes(cell)) return false;
          break;
        case 'select':
          if (cell !== v) return false;
          break;
        case 'range': {
          const [lo, hi] = v as [number, number];
          if ((cell as number) < lo || (cell as number) > hi) return false;
          break;
        }
        case 'rating':
          if ((cell as number) < Number(v)) return false;
          break;
        case 'daterange': {
          const [start, end] = v as Date[];
          const t = +(cell as Date);
          if (start && t < +start) return false;
          if (end && t > +end + 24 * 3600 * 1000) return false;
          break;
        }
        case 'tags': {
          const arr = cell as string[];
          if (!(v as any[]).some(x => arr.includes(x))) return false;
          break;
        }
      }
    }
    return true;
  });
}

export interface FilterVariant {
  name: string;
  visibleKeys: string[];
  values: FilterValues;
}

const VARIANTS_LS_KEY = 'pn-demo:filter-variants';

export function loadVariants(): FilterVariant[] {
  try {
    const raw = localStorage.getItem(VARIANTS_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FilterVariant[];
    // revive Date objects in daterange values
    for (const v of parsed) {
      for (const f of FILTER_SCHEMA) {
        if (f.type === 'daterange' && Array.isArray(v.values[f.key])) {
          v.values[f.key] = v.values[f.key].map((d: any) => (d ? new Date(d) : null));
        }
      }
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveVariants(variants: FilterVariant[]): void {
  localStorage.setItem(VARIANTS_LS_KEY, JSON.stringify(variants));
}

export function defaultValuesFor(keys: string[]): FilterValues {
  const out: FilterValues = {};
  for (const key of keys) {
    const f = getField(key);
    if (!f) continue;
    switch (f.type) {
      case 'range':       out[key] = [f.min, f.max]; break;
      case 'multiselect':
      case 'tags':        out[key] = []; break;
      case 'rating':      out[key] = 0; break;
      case 'daterange':   out[key] = null; break;
      default:            out[key] = null;
    }
  }
  return out;
}
