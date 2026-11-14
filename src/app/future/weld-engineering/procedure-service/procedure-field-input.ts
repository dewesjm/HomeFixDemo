/* Reading a value sent to the procedure service's write into the stored shape for its field type,
   or a message saying what's wrong. Values arrive as plain JSON: a string for text, list, table and
   limit fields; a number (or null) for a number; a list of strings for a multi field; { min, max }
   for a range; the override parts by key; { op, items } for a qualification requirement. null or an
   empty value clears the field. Whether a value is one of the field's choices is a save check
   (procedure-save-checks.ts). */
import { OVERRIDE_PARTS, type ExtraField, type ExtraFieldValue, type OverrideValue } from '../procedure-sections';
import { emptyValue } from '../procedure-field-values';
import type { QualGroup, QualTerm } from '../../../weld-record/qualifications-logic/qual-requirements';

type Parsed = { value: ExtraFieldValue } | { problem: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumberOrNull = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));

function isQualTerm(t: unknown): t is QualTerm {
  if (typeof t === 'string') return t.trim() !== '';
  return isObject(t) && (t['op'] === 'all' || t['op'] === 'any') && Array.isArray(t['items']) && t['items'].every(isQualTerm);
}

export function parseFieldInput(field: ExtraField, input: unknown): Parsed {
  if (input === null || input === undefined) return { value: emptyValue(field) };
  const bad = (shape: string): Parsed => ({ problem: `${field.label} (${field.key}) needs ${shape}.` });

  switch (field.type) {
    case 'number':
      return isNumberOrNull(input) ? { value: input as number | null } : bad('a number');
    case 'multi':
      return Array.isArray(input) && input.every(v => typeof v === 'string') ? { value: [...input] } : bad('a list of values, e.g. ["a", "b"]');
    case 'range':
      return isObject(input) && isNumberOrNull(input['min'] ?? null) && isNumberOrNull(input['max'] ?? null)
        ? { value: { min: (input['min'] ?? null) as number | null, max: (input['max'] ?? null) as number | null } }
        : bad('{ "min": number or null, "max": number or null }');
    case 'override': {
      const keys = OVERRIDE_PARTS.map(p => p.key).join(', ');
      if (!isObject(input) || Object.keys(input).some(k => !OVERRIDE_PARTS.some(p => p.key === k))
        || Object.values(input).some(v => typeof v !== 'string')) return bad(`an object of text parts (${keys})`);
      return { value: Object.fromEntries(OVERRIDE_PARTS.map(p => [p.key, (input[p.key] as string | undefined) ?? ''])) as OverrideValue };
    }
    case 'quals':
      return isObject(input) && isQualTerm(input)
        ? { value: input as unknown as QualGroup }
        : bad('{ "op": "all" or "any", "items": [qual codes or nested groups] }');
    default:
      return typeof input === 'string' ? { value: input } : bad('text');
  }
}
