/* Reading a value sent to the procedure service's write into the stored shape for its field type,
   or a message saying what's wrong. Values arrive as plain JSON: a string for text, list, table and
   limit fields; a number (or null) for a number; a list of strings for a multi field; { min, max }
   for a range; the override parts by key; { op, items } for a qualification requirement. null or an
   empty value clears the field. */
import { OVERRIDE_PARTS, type ExtraField, type ExtraFieldValue, type OverrideValue } from '../procedure-sections';
import { emptyValue, fieldChoices } from '../procedure-field-values';
import type { QualGroup, QualTerm } from '../../../weld-record/qualifications-logic/qual-requirements';

type Parsed = { value: ExtraFieldValue } | { problem: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumberOrNull = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));

function isQualTerm(t: unknown): t is QualTerm {
  if (typeof t === 'string') return t.trim() !== '';
  return isObject(t) && (t['op'] === 'all' || t['op'] === 'any') && Array.isArray(t['items']) && t['items'].every(isQualTerm);
}

/* values outside a list, multi or table field's choices */
function notAChoice(field: ExtraField, picked: string[]): string[] {
  const allowed = fieldChoices(field, picked).map(o => o.value);
  return picked.filter(v => !allowed.includes(v));
}

export function parseFieldInput(field: ExtraField, input: unknown): Parsed {
  if (input === null || input === undefined) return { value: emptyValue(field) };
  const bad = (shape: string): Parsed => ({ problem: `${field.label} (${field.key}) needs ${shape}.` });

  switch (field.type) {
    case 'number':
      return isNumberOrNull(input) ? { value: input as number | null } : bad('a number');
    case 'multi': {
      if (!Array.isArray(input) || !input.every(v => typeof v === 'string')) return bad('a list of values, e.g. ["a", "b"]');
      const wrong = notAChoice(field, input);
      return wrong.length ? { problem: `${field.label} (${field.key}) doesn't allow ${wrong.join(', ')}.` } : { value: [...input] };
    }
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
    default: {
      if (typeof input !== 'string') return bad('text');
      if ((field.type === 'list' || field.type === 'table') && input.trim()) {
        const wrong = notAChoice(field, [input]);
        if (wrong.length) return { problem: `${field.label} (${field.key}) doesn't allow ${input}.` };
      }
      return { value: input };
    }
  }
}
