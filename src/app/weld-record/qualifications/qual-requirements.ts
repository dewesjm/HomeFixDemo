/* What a qual condition requires (Admin > Qualifications): a group of quals joined by AND (all of)
   or OR (any of), where an item can itself be a group, e.g. CNTRLMTL1 OR CNTRLMTL2, or
   WELD412 AND (WELD427 OR WELD403). An empty group requires nothing. */

export type QualTerm = string | QualGroup;

export interface QualGroup {
  op: 'all' | 'any';
  items: QualTerm[];
}

export function termMet(t: QualTerm, held: readonly string[]): boolean {
  if (typeof t === 'string') return held.includes(t);
  if (!t.items.length) return true;
  return t.op === 'all' ? t.items.every(i => termMet(i, held)) : t.items.some(i => termMet(i, held));
}

/* e.g. "WELD412 AND (WELD427 OR WELD403)"; nested groups of 2+ items get parentheses */
export function requirementText(g: QualGroup, nested = false): string {
  const parts = g.items.map(t => typeof t === 'string' ? t : requirementText(t, true)).filter(Boolean);
  const s = parts.join(g.op === 'all' ? ' AND ' : ' OR ');
  return nested && parts.length > 1 ? `(${s})` : s;
}

/* the unmet part only: an unmet OR group is shown whole (any one item would do), an AND group lists
   just its unmet items, comma separated at the top level. '' when met. */
export function missingText(g: QualGroup, held: readonly string[], nested = false): string {
  if (termMet(g, held)) return '';
  if (g.op === 'any') return requirementText(g, nested);
  /* commas need no parentheses around a nested group; AND inside a nested group does */
  const parts = g.items.filter(t => !termMet(t, held)).map(t => typeof t === 'string' ? t : missingText(t, held, nested));
  const s = parts.join(nested ? ' AND ' : ', ');
  return nested && parts.length > 1 ? `(${s})` : s;
}

/* every qual named anywhere in the group, in order, no repeats */
export function qualsIn(g: QualGroup, out: string[] = []): string[] {
  for (const t of g.items) {
    if (typeof t !== 'string') qualsIn(t, out);
    else if (!out.includes(t)) out.push(t);
  }
  return out;
}

/* nested groups left empty while editing are dropped; the top group is kept even if empty */
export function pruneGroup(g: QualGroup): QualGroup {
  const items = g.items
    .map(t => typeof t === 'string' ? t : pruneGroup(t))
    .filter(t => typeof t === 'string' || t.items.length > 0);
  return { op: g.op, items };
}

export function cloneGroup(g: QualGroup): QualGroup {
  return { op: g.op, items: g.items.map(t => typeof t === 'string' ? t : cloneGroup(t)) };
}
