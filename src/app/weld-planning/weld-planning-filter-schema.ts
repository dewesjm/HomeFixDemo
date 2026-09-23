/* schema-driven filter engine + saved variants for Weld Planning's Advanced Search,
   mirrors data/filter-schema.ts but scoped to WeldJoint instead of Job */
import { STORAGE } from '../data/storage-keys';
import { weldJoints, JOINT_STATUS_OPTIONS, JOINT_TYPE_OPTIONS, NDT_FIELDS, NDT_MARKS, type WeldJoint, type JointPriority } from './weld-planning.data';

export type FilterField =
  | { key: string; label: string; type: 'text';        group: string; required?: boolean; field: keyof WeldJoint }
  | { key: string; label: string; type: 'multiselect'; group: string; required?: boolean; field: keyof WeldJoint; options: { label: string; value: any }[] }
  | { key: string; label: string; type: 'select';      group: string; required?: boolean; field: keyof WeldJoint; options: { label: string; value: any }[] }
  | { key: string; label: string; type: 'daterange';   group: string; required?: boolean; field: keyof WeldJoint };

function uniqueOpts(getter: (j: WeldJoint) => string): { label: string; value: string }[] {
  const vals = [...new Set(weldJoints().map(getter))].filter(Boolean).sort();
  return vals.map(v => ({ label: v, value: v }));
}

const PRIORITY_OPTIONS: { label: string; value: JointPriority }[] = [
  { label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' }, { label: 'Critical', value: 'critical' },
];

const NDT_MARK_OPTIONS = NDT_MARKS.map(m => ({ label: m || 'Blank', value: m }));

export const FILTER_SCHEMA: FilterField[] = [
  { key: 'jointNumber',   label: 'System',        type: 'text',        group: 'Joint',   field: 'jointNumber' },
  { key: 'id',            label: 'XREFID',        type: 'text',        group: 'Joint',   field: 'id' },
  { key: 'hull',          label: 'Hull',          type: 'multiselect', group: 'Joint',   field: 'hull',        options: uniqueOpts(j => j.hull) },
  { key: 'joint',         label: 'Joint',         type: 'text',        group: 'Joint',   field: 'joint' },
  { key: 'description',   label: 'Description',   type: 'text',        group: 'Joint',   field: 'description' },
  { key: 'status',        label: 'Status',        type: 'multiselect', group: 'Joint',   field: 'status',      options: JOINT_STATUS_OPTIONS },
  { key: 'priority',      label: 'Priority',      type: 'multiselect', group: 'Joint',   field: 'priority',    options: PRIORITY_OPTIONS },
  { key: 'jointType',     label: 'Type',          type: 'multiselect', group: 'Joint',   field: 'jointType',   options: JOINT_TYPE_OPTIONS },
  { key: 'drawing',       label: 'Drawing',       type: 'text',        group: 'Welding', field: 'drawing' },
  { key: 'drawingRev',    label: 'Drawing Rev',   type: 'multiselect', group: 'Welding', field: 'drawingRev',  options: uniqueOpts(j => j.drawingRev) },
  { key: 'jointDesign',   label: 'Joint Design',  type: 'multiselect', group: 'Welding', field: 'jointDesign', options: uniqueOpts(j => j.jointDesign) },
  { key: 'weldType',      label: 'Weld Type',     type: 'multiselect', group: 'Welding', field: 'weldType',    options: uniqueOpts(j => j.weldType) },
  { key: 'pipeSize',      label: 'Pipe Size',     type: 'multiselect', group: 'Welding', field: 'pipeSize',    options: uniqueOpts(j => j.pipeSize) },
  { key: 'wallThickness', label: 'Wall Thickness', type: 'multiselect', group: 'Welding', field: 'wallThickness', options: uniqueOpts(j => j.wallThickness) },
  { key: 'materialType1', label: 'Material 1',    type: 'multiselect', group: 'Welding', field: 'materialType1', options: uniqueOpts(j => j.materialType1) },
  { key: 'materialType2', label: 'Material 2',    type: 'multiselect', group: 'Welding', field: 'materialType2', options: uniqueOpts(j => j.materialType2) },
  ...NDT_FIELDS.map(f => ({
    key: f.key, label: f.label, type: 'select' as const, group: 'NDT', field: f.key as keyof WeldJoint, options: NDT_MARK_OPTIONS,
  })),
  { key: 'notes',       label: 'Notes',       type: 'text',      group: 'Additional', field: 'notes' },
  { key: 'createdBy',   label: 'Created By',  type: 'text',      group: 'Additional', field: 'createdBy' },
  { key: 'createdAt',   label: 'Created',     type: 'daterange', group: 'Additional', field: 'createdAt' },
];

export type FilterValues = Record<string, any>;

export function getField(key: string): FilterField | undefined {
  return FILTER_SCHEMA.find(f => f.key === key);
}

export function isEmpty(field: FilterField, value: any): boolean {
  if (value === null || value === undefined || value === '') return true;
  switch (field.type) {
    case 'multiselect':
      return !Array.isArray(value) || value.length === 0;
    case 'daterange':
      return !Array.isArray(value) || !value[0];
    default:
      return false;
  }
}

export function applyFilters(rows: WeldJoint[], values: FilterValues): WeldJoint[] {
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
        case 'daterange': {
          const [start, end] = v as Date[];
          const t = +new Date(cell as string);
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

const VARIANTS_LS_KEY = STORAGE.weldPlanningFilterVariants;

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
      case 'multiselect': out[key] = []; break;
      case 'daterange':   out[key] = null; break;
      default:            out[key] = null;
    }
  }
  return out;
}
