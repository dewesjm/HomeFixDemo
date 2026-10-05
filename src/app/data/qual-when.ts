/* When a qual condition applies (Admin > Qualifications): a group of "field is value" clauses joined
   by AND (all of) or OR (any of), where an item can itself be a group, e.g. Type is VT AND
   (Weld Color is Straw OR Weld Color is Light Blue). An empty group matches nothing, so a row with no
   clauses requires nothing. */

export interface WhenClause {
  field: string;   /* conditionFields() key (qual-conditions.ts) */
  value: string;
}

export type WhenTerm = WhenClause | WhenGroup;

export interface WhenGroup {
  op: 'all' | 'any';
  items: WhenTerm[];
}

export const isWhenGroup = (t: WhenTerm): t is WhenGroup => 'items' in t;

/* a clause matches when the field has a value and it's the clause's value (any case) */
export function whenMatches(g: WhenGroup, valueOf: (field: string) => string): boolean {
  if (!g.items.length) return false;
  const m = (t: WhenTerm): boolean => isWhenGroup(t)
    ? whenMatches(t, valueOf)
    : !!t.value && same(valueOf(t.field), t.value);
  return g.op === 'all' ? g.items.every(m) : g.items.some(m);
}

const same = (a: string, b: string) => !!a && a.trim().toLowerCase() === b.trim().toLowerCase();

/* e.g. "Type is VT AND (Weld Color is Straw OR Weld Color is Light Blue)"; nested groups of 2+ get parentheses */
export function whenText(g: WhenGroup, clauseText: (c: WhenClause) => string, nested = false): string {
  const parts = g.items.map(t => isWhenGroup(t) ? whenText(t, clauseText, true) : clauseText(t)).filter(Boolean);
  const s = parts.join(g.op === 'all' ? ' AND ' : ' OR ');
  return nested && parts.length > 1 ? `(${s})` : s;
}

/* nested groups left empty while editing are dropped; the top group is kept even if empty */
export function pruneWhen(g: WhenGroup): WhenGroup {
  const items = g.items
    .map(t => isWhenGroup(t) ? pruneWhen(t) : t)
    .filter(t => !isWhenGroup(t) || t.items.length > 0);
  return { op: g.op, items };
}

export function cloneWhen(g: WhenGroup): WhenGroup {
  return { op: g.op, items: g.items.map(t => isWhenGroup(t) ? cloneWhen(t) : { ...t }) };
}
