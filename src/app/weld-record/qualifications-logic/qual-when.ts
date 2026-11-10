/* When a qual condition applies (Admin > Qualifications): a group of clauses joined by AND (all of)
   or OR (any of), where an item can itself be a group, e.g. Type is VT AND (Weld Color is Straw OR
   Weld Color is Light Blue). A clause is Routing Settings's ConditionClause; its field is a
   conditionFields() key (qual-conditions.ts). An empty group matches nothing, so a row with no clauses
   requires nothing. */
import { ConditionClause } from '../conditions-logic/joint-conditions';

export type WhenClause = ConditionClause;

/* starts on "is" with nothing picked, like a new Routing Settings clause */
export const newWhenClause = (field: string): WhenClause => ({ field, op: 'is', values: [] });

export type WhenTerm = WhenClause | WhenGroup;

export interface WhenGroup {
  op: 'all' | 'any';
  items: WhenTerm[];
}

export const isWhenGroup = (t: WhenTerm): t is WhenGroup => 'items' in t;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/* compares like Routing Settings (any case); undefined = the field has no value to test, so no
   comparison matches, is not included */
function clauseMatches(c: WhenClause, value: string | undefined): boolean {
  if (value === undefined || !c.values.length) return false;
  if (c.op === 'contains') {
    const text = c.values[0].trim().toLowerCase();
    return !!text && value.toLowerCase().includes(text);
  }
  /* Has attribute code reads every slot, joined by commas */
  const actual = c.field === 'attributeCodes' ? value.split(',') : [value];
  const hit = c.values.some(v => actual.some(a => same(a, v)));
  return c.op === 'isNot' ? !hit : hit;
}

export function whenMatches(g: WhenGroup, valueOf: (field: string) => string | undefined): boolean {
  if (!g.items.length) return false;
  const m = (t: WhenTerm): boolean => isWhenGroup(t) ? whenMatches(t, valueOf) : clauseMatches(t, valueOf(t.field));
  return g.op === 'all' ? g.items.every(m) : g.items.some(m);
}

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
  return { op: g.op, items: g.items.map(t => isWhenGroup(t) ? cloneWhen(t) : { ...t, values: [...t.values] }) };
}

/* every clause has a value to compare */
export function whenComplete(g: WhenGroup): boolean {
  return g.items.every(t => isWhenGroup(t) ? whenComplete(t) : t.values.length > 0);
}
