/* Reading a value sent to the procedure service's write into the stored shape for its field type,
   or a message saying what's wrong. Values arrive as plain JSON: a string for text, list, table and
   limit fields; a number (or null) for a number; a list of strings for a multi field; { min, max }
   for a range; the override parts by key; { op, items } for a qualification requirement; a list of
   rows, each { column key: cell }, for a grid (each cell read like a field of the column's type); a
   list of { id, caption? } for images, each id from uploadProcedureImage. A grid or images value may
   also come as stored ({ rows } / { images }). null or an empty value clears the field. Whether a value is one of the field's choices is a save check
   (procedure-save-checks.ts). */
import {
  OVERRIDE_PARTS, MAX_IMAGES_PER_FIELD, columnAsField,
  type ExtraField, type ExtraFieldValue, type GridCell, type GridRow, type ImageRef, type OverrideValue,
} from '../procedure-sections';
import { emptyValue } from '../procedure-field-values';
import { imageExists, imageName } from './procedure-image-service';
import type { QualGroup, QualTerm } from '../qualifications-logic/qual-requirements';

type Parsed = { value: ExtraFieldValue } | { problem: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumberOrNull = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));

function isQualTerm(t: unknown): t is QualTerm {
  if (typeof t === 'string') return t.trim() !== '';
  return isObject(t) && (t['op'] === 'all' || t['op'] === 'any') && Array.isArray(t['items']) && t['items'].every(isQualTerm);
}

/* each row's cells read by column type; a key that isn't a column is refused */
function parseGrid(field: ExtraField, input: unknown): Parsed {
  const rows = isObject(input) && Array.isArray(input['rows']) ? input['rows'] : input;
  const shape = `a list of rows, e.g. [{ "${field.columns?.[0]?.key ?? 'column'}": "100" }]`;
  if (!Array.isArray(rows) || !rows.every(isObject)) return { problem: `${field.label} (${field.key}) needs ${shape}.` };
  const columns = field.columns ?? [];
  const out: GridRow[] = [];
  for (const [i, row] of rows.entries()) {
    const parsed: GridRow = {};
    for (const [key, cell] of Object.entries(row)) {
      const col = columns.find(c => c.key === key);
      if (!col) return { problem: `${field.label} (${field.key}) row ${i + 1}: ${key} isn't one of its columns (${columns.map(c => c.key).join(', ')}).` };
      const r = parseFieldInput(columnAsField(col), cell);
      if ('problem' in r) return { problem: `${field.label} (${field.key}) row ${i + 1}: ${r.problem}` };
      parsed[key] = r.value as GridCell;
    }
    out.push(parsed);
  }
  return { value: { rows: out } };
}

/* references to uploaded images; the name comes from the stored image */
function parseImages(field: ExtraField, input: unknown): Parsed {
  const list = isObject(input) && Array.isArray(input['images']) ? input['images'] : input;
  const bad: Parsed = { problem: `${field.label} (${field.key}) needs a list of images, e.g. [{ "id": "img-...", "caption": "Butt joint" }].` };
  if (!Array.isArray(list) || !list.every(i => isObject(i) && typeof i['id'] === 'string'
    && (i['caption'] === undefined || typeof i['caption'] === 'string'))) return bad;
  if (list.length > MAX_IMAGES_PER_FIELD) return { problem: `${field.label} (${field.key}) holds at most ${MAX_IMAGES_PER_FIELD} images.` };
  const images: ImageRef[] = [];
  for (const i of list as { id: string; caption?: string }[]) {
    if (!imageExists(i.id)) return { problem: `${field.label} (${field.key}): there is no image with id ${i.id}. Upload it with uploadProcedureImage first.` };
    if (images.some(x => x.id === i.id)) return { problem: `${field.label} (${field.key}) has image ${i.id} more than once.` };
    images.push({ id: i.id, name: imageName(i.id), caption: i.caption ?? '' });
  }
  return { value: { images } };
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
    case 'grid':
      return parseGrid(field, input);
    case 'images':
      return parseImages(field, input);
    case 'quals':
      return isObject(input) && isQualTerm(input)
        ? { value: input as unknown as QualGroup }
        : bad('{ "op": "all" or "any", "items": [qual codes or nested groups] }');
    default:
      return typeof input === 'string' ? { value: input } : bad('text');
  }
}
