/* Saved Signoff Type Form conditions moved onto the one field catalog (catalogs/field-catalog.ts):
   two joint facts took the catalog's existing entries, and yes/no joint facts read Yes / No like every
   other Joint Details field. Safe to run again: converted clauses no longer match. */
const RENAMED: Record<string, string> = { titanium: 'material.titanium', materialTraceability: 'controlledMaterial' };
const YES_NO_FACTS = new Set(['consumableInsertRequired', 'backingRingRequired', 'part1Traceability', 'part2Traceability', 'revisedJointDesignEntered']);

const toYesNo = (v: unknown) => v === 'yes' ? 'Yes' : v === '' ? 'No' : v;

function migrateClause(clause: Record<string, unknown>): Record<string, unknown> {
  const key = String(clause['key']);
  if (!(key in RENAMED) && !YES_NO_FACTS.has(key)) return clause;
  const { equals, anyOf, ...rest } = clause;
  const next = { ...rest, key: RENAMED[key] ?? key };
  if (Array.isArray(anyOf)) return { ...next, anyOf: anyOf.map(toYesNo) };
  /* no value used to mean "the fact holds" */
  return { ...next, equals: equals === undefined ? 'Yes' : toYesNo(equals) };
}

/* every joint-detail clause anywhere inside saved configuration */
export function migrateConditionClauses<T>(value: T): T {
  if (Array.isArray(value)) return value.map(migrateConditionClauses) as T;
  if (!value || typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([k, v]) => [k, migrateConditionClauses(v)]);
  const copy = Object.fromEntries(entries) as Record<string, unknown>;
  return (copy['source'] === 'jointDetail' ? migrateClause(copy) : copy) as T;
}
