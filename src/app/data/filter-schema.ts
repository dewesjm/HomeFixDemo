/* schema-driven filter engine + saved variants in localStorage */
import { STORAGE } from './storage-keys';
import {
  Job,
  TECHNICIAN_OPTIONS, JOBS
} from './jobs';

export type FilterField =
  | { key: string; label: string; type: 'text';        group: string; required?: boolean; field: keyof Job }
  | { key: string; label: string; type: 'multiselect'; group: string; required?: boolean; field: keyof Job; options: { label: string; value: any }[] }
  | { key: string; label: string; type: 'select';      group: string; required?: boolean; field: keyof Job; options: { label: string; value: any }[] }
  | { key: string; label: string; type: 'range';       group: string; required?: boolean; field: keyof Job; min: number; max: number }
  | { key: string; label: string; type: 'daterange';   group: string; required?: boolean; field: keyof Job };

function uniqueOpts(getter: (j: Job) => string): { label: string; value: string }[] {
  const vals = [...new Set(JOBS.map(getter))].filter(Boolean).sort();
  return vals.map(v => ({ label: v, value: v }));
}

export const FILTER_SCHEMA: FilterField[] = [
  { key: 'hull',            label: 'Hull',          type: 'text',        group: 'Job',        field: 'hull', required: true },
{ key: 'id', label: 'XREFID', type: 'text', group: 'Job', field: 'xrefid' },
  { key: 'trade',           label: 'Trade',            type: 'multiselect', group: 'Job',        field: 'trade',          options: uniqueOpts(j => j.trade) },
  { key: 'technician',      label: 'Technician',       type: 'multiselect', group: 'Job',        field: 'technician',     options: TECHNICIAN_OPTIONS },
  { key: 'drawing',         label: 'Drawing',          type: 'text',        group: 'Job',        field: 'drawing' },
  { key: 'drawingRev',      label: 'Drawing Rev',      type: 'text',        group: 'Job',        field: 'drawingRev' },
  { key: 'joint',           label: 'Joint',            type: 'text',        group: 'Job',        field: 'joint' },
  { key: 'jointDesign',     label: 'Joint design',     type: 'multiselect', group: 'Welding',    field: 'jointDesign', options: uniqueOpts(j => j.jointDesign) },
  { key: 'weldType',        label: 'Weld type',        type: 'multiselect', group: 'Welding',    field: 'weldType',    options: uniqueOpts(j => j.weldType) },
  { key: 'materialType1',   label: 'Material 1',       type: 'multiselect', group: 'Welding',    field: 'materialType1', options: uniqueOpts(j => j.materialType1) },
  { key: 'materialType2',   label: 'Material 2',       type: 'multiselect', group: 'Welding',    field: 'materialType2', options: uniqueOpts(j => j.materialType2) },
  { key: 'pipeSize',        label: 'Pipe size',        type: 'text',        group: 'Welding',    field: 'pipeSize' },
  { key: 'wallThickness',   label: 'Wall thickness',   type: 'text',        group: 'Welding',    field: 'wallThickness' },
  { key: 'mcl1',            label: 'MCL 1',            type: 'multiselect', group: 'Welding',    field: 'mcl1',          options: uniqueOpts(j => j.mcl1) },
  { key: 'mcl2',            label: 'MCL 2',            type: 'multiselect', group: 'Welding',    field: 'mcl2',          options: uniqueOpts(j => j.mcl2) },
  { key: 'joiningItem',     label: 'Joining item',     type: 'text',        group: 'Welding',    field: 'joiningItem' },
  { key: 'joinToItem',      label: 'Join to item',     type: 'text',        group: 'Welding',    field: 'joinToItem' },
  { key: 'sequenceNumber',  label: 'Sequence #',       type: 'text',        group: 'Welding',    field: 'sequenceNumber' },
  { key: 'nInd',            label: 'Nuclear Indicator', type: 'multiselect', group: 'Welding',    field: 'nInd',         options: [{ label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }] },
  { key: 'wps',             label: 'WPS',              type: 'text',        group: 'Welding',    field: 'wps' },
  { key: 'engineeringNotes', label: 'Eng. notes',      type: 'text',        group: 'Welding',    field: 'engineeringNotes' },
  { key: 'ndt',             label: 'NDT',              type: 'text',        group: 'NDT',        field: 'ndt' },
  { key: 'rtRoot',          label: 'RT Root',          type: 'text',        group: 'NDT',        field: 'rtRoot' },
  { key: 'rtFinal',         label: 'RT Final',         type: 'text',        group: 'NDT',        field: 'rtFinal' },
  { key: 'ndtRoot',         label: 'NDT Root',         type: 'text',        group: 'NDT',        field: 'ndtRoot' },
  { key: 'ndtEach',         label: 'NDT Each',         type: 'text',        group: 'NDT',        field: 'ndtEach' },
  { key: 'ndtFinal',        label: 'NDT Final',        type: 'text',        group: 'NDT',        field: 'ndtFinal' },
  { key: 'ut',              label: 'UT',               type: 'text',        group: 'NDT',        field: 'ut' },
  { key: 'pwht',            label: 'PWHT',             type: 'text',        group: 'NDT',        field: 'pwht' },
  { key: 'order',           label: 'Order',            type: 'text',        group: 'Additional', field: 'order' },
  { key: 'workPackage',     label: 'Work package',     type: 'text',        group: 'Additional', field: 'workPackage' },
  { key: 'workPermit',      label: 'Work permit',      type: 'text',        group: 'Additional', field: 'workPermit' },
  { key: 'waff',            label: 'WAFF',             type: 'text',        group: 'Additional', field: 'waff' },
  { key: 'serialNumber',    label: 'Serial number',    type: 'text',        group: 'Additional', field: 'serialNumber' },
  { key: 'refitNumber',     label: 'Refit number',     type: 'text',        group: 'Additional', field: 'refitNumber' },
  { key: 'repairNumber',    label: 'Repair number',    type: 'text',        group: 'Additional', field: 'repairNumber' },
  { key: 'ss',              label: 'SS',               type: 'text',        group: 'Additional', field: 'ss' },
  { key: 'sfff',            label: 'SFFF',             type: 'text',        group: 'Additional', field: 'sfff' },
  { key: 'dssAaa',          label: 'DSS/AAA',          type: 'text',        group: 'Additional', field: 'dssAaa' },
  { key: 'er1',             label: 'ER 1',             type: 'text',        group: 'Additional', field: 'er1' },
  { key: 'er2',             label: 'ER 2',             type: 'text',        group: 'Additional', field: 'er2' },
  { key: 'er3',             label: 'ER 3',             type: 'text',        group: 'Additional', field: 'er3' },
  { key: 'er4',             label: 'ER 4',             type: 'text',        group: 'Additional', field: 'er4' },
  { key: 'attributeCode1',  label: 'Attribute code 1', type: 'text',        group: 'Additional', field: 'attributeCode1' },
  { key: 'attributeCode2',  label: 'Attribute code 2', type: 'text',        group: 'Additional', field: 'attributeCode2' },
  { key: 'attributeCode3',  label: 'Attribute code 3', type: 'text',        group: 'Additional', field: 'attributeCode3' },
  { key: 'attributeCode4',  label: 'Attribute code 4', type: 'text',        group: 'Additional', field: 'attributeCode4' },
  { key: 'estimatedCost',   label: 'Estimated cost',   type: 'range',       group: 'Additional', field: 'estimatedCost', min: 0, max: 100000 },
  { key: 'estimatedHours',  label: 'Estimated hours',  type: 'range',       group: 'Additional', field: 'estimatedHours', min: 0, max: 500 },
  { key: 'scheduledFor',    label: 'Scheduled for',    type: 'daterange',   group: 'Additional', field: 'scheduledFor' },
];

export type FilterValues = Record<string, any>;
export interface TextFilterValue { text: string; negate: boolean }

export function getField(key: string): FilterField | undefined {
  return FILTER_SCHEMA.find(f => f.key === key);
}

export function isEmpty(field: FilterField, value: any): boolean {
  if (value === null || value === undefined || value === '') return true;
  switch (field.type) {
    case 'text':
      return !(value as TextFilterValue).text;
    case 'multiselect':
      return !Array.isArray(value) || value.length === 0;
    case 'range':
      return !Array.isArray(value) || (value[0] === field.min && value[1] === field.max);
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
        case 'text': {
          const { text, negate } = v as TextFilterValue;
          const matches = String(cell).toLowerCase().includes(String(text).toLowerCase());
          if (negate ? matches : !matches) return false;
          break;
        }
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
        case 'daterange': {
          const [start, end] = v as Date[];
          const t = +(cell as Date);
          if (start && t < +start) return false;
          if (end && t > +end + 24 * 3600 * 1000) return false;
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

const VARIANTS_LS_KEY = STORAGE.filterVariants;

export function loadVariants(): FilterVariant[] {
  try {
    const raw = localStorage.getItem(VARIANTS_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FilterVariant[];
    for (const v of parsed) {
      for (const f of FILTER_SCHEMA) {
        if (f.type === 'daterange' && Array.isArray(v.values[f.key])) {
          v.values[f.key] = v.values[f.key].map((d: any) => (d ? new Date(d) : null));
        }
        /* variants saved before "does not contain" stored text values as plain strings */
        if (f.type === 'text' && typeof v.values[f.key] === 'string') {
          v.values[f.key] = { text: v.values[f.key], negate: false };
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
      case 'multiselect': out[key] = []; break;
      case 'daterange':   out[key] = null; break;
      case 'text':        out[key] = { text: '', negate: false } satisfies TextFilterValue; break;
      default:            out[key] = null;
    }
  }
  return out;
}
