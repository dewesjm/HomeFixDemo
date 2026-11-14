/* The record shape Weld Engineering's procedure service returns: a header plus the procedure's sections,
   each field as key / label / type / value. A field's value says what kind of value it is, so a caller
   can tell one value from a list, a Min / Max pair, a group of parts or a qualification requirement
   without knowing the field's type. Built from a Procedure and the section definitions; nothing here
   reads or writes the store. */
import type { Procedure, ProcedureStatus } from '../../../data/procedures';
import {
  OVERRIDE_PARTS, sectionsOnProcedure, sectionOfField,
  type ExtraField, type ExtraFieldType, type ExtraFieldValue, type ProcedureSection,
} from '../procedure-sections';
import { extraValueText, isOverride, isQuals, isRange } from '../procedure-field-values';
import { requirementText, type QualGroup } from '../../../weld-record/qualifications-logic/qual-requirements';

export interface ProcedureKey { gwp: string; wtn: string; }

export interface ProcedureHeader extends ProcedureKey {
  title: string;
  status: ProcedureStatus;
  revision: string;
  effectiveDate: string;
  weldProcess: string;
  processType: string;
  application: string;
}

/* one value, several values, a Min / Max pair, named parts, or a qualification requirement */
export type FieldValue =
  | { kind: 'one'; value: string | number | null }
  | { kind: 'many'; values: string[] }
  | { kind: 'range'; min: number | null; max: number | null }
  | { kind: 'parts'; parts: { key: string; label: string; value: string }[] }
  | { kind: 'quals'; requirement: QualGroup; text: string };

export interface FieldRecord {
  key: string;
  label: string;
  type: ExtraFieldType;
  value: FieldValue;
  /* the value as one line, as the PDF shows it */
  text: string;
}

export interface SectionRecord {
  id: string;
  number: number;
  name: string;
  fields: FieldRecord[];
}

export interface ProcedureRecord {
  header: ProcedureHeader;
  sections: SectionRecord[];
}

/* a field asked for that the procedure doesn't have, and why */
export interface MissingField { key: string; reason: string; }

export function procedureHeader(p: Procedure): ProcedureHeader {
  const { gwp, wtn, title, status, revision, effectiveDate, weldProcess, processType, application } = p;
  return { gwp, wtn, title, status, revision, effectiveDate, weldProcess, processType, application };
}

export function fieldValue(field: ExtraField, v: ExtraFieldValue | undefined): FieldValue {
  switch (field.type) {
    case 'multi': return { kind: 'many', values: Array.isArray(v) ? [...v] : [] };
    case 'range': return isRange(v) ? { kind: 'range', min: v.min, max: v.max } : { kind: 'range', min: null, max: null };
    case 'override': return {
      kind: 'parts',
      parts: OVERRIDE_PARTS.map(p => ({ key: p.key, label: p.label, value: isOverride(v) ? v[p.key] ?? '' : '' })),
    };
    case 'quals': {
      const requirement: QualGroup = isQuals(v) ? v : { op: 'all', items: [] };
      return { kind: 'quals', requirement, text: requirementText(requirement) };
    }
    default: return { kind: 'one', value: typeof v === 'string' || typeof v === 'number' ? v : null };
  }
}

export function fieldRecord(field: ExtraField, p: Procedure): FieldRecord {
  const v = p.extraFields[field.key];
  return { key: field.key, label: field.label, type: field.type, value: fieldValue(field, v), text: extraValueText(field, v) };
}

/* every section the procedure has ticked, in order, with all its fields */
export function procedureRecord(p: Procedure, sections: ProcedureSection[]): ProcedureRecord {
  return {
    header: procedureHeader(p),
    sections: sectionsOnProcedure(p.sectionIds, sections).map(({ section, number }) => ({
      id: section.id, number, name: section.name,
      fields: section.fields.map(f => fieldRecord(f, p)),
    })),
  };
}

/* why a field key can't be read off this procedure; '' when it can */
export function missingReason(key: string, p: Procedure, sections: ProcedureSection[]): string {
  const section = sectionOfField(key, sections);
  if (!section) return 'No procedure field has this key.';
  if (!p.sectionIds.includes(section.id)) return `This procedure doesn't have the ${section.name} section.`;
  return '';
}

/* only the asked-for fields, kept in their sections (sections with none of them are left out), plus
   the keys that couldn't be read */
export function procedureSubset(
  p: Procedure, keys: string[], sections: ProcedureSection[]
): { record: ProcedureRecord; missing: MissingField[] } {
  const wanted = [...new Set(keys.map(k => k.trim()).filter(Boolean))];
  const missing = wanted.flatMap(key => {
    const reason = missingReason(key, p, sections);
    return reason ? [{ key, reason }] : [];
  });
  const found = wanted.filter(k => !missing.some(m => m.key === k));
  const record = procedureRecord(p, sections);
  record.sections = record.sections
    .map(s => ({ ...s, fields: s.fields.filter(f => found.includes(f.key)) }))
    .filter(s => s.fields.length);
  return { record, missing };
}
