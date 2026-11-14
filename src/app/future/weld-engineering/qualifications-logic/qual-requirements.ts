/* AND/OR qualification groups stored with a weld procedure. */

export type QualTerm = string | QualGroup;

export interface QualGroup {
  op: 'all' | 'any';
  items: QualTerm[];
}

/* e.g. "WELD412 AND (WELD427 OR WELD403)"; nested groups of 2+ items get parentheses */
export function requirementText(g: QualGroup, nested = false): string {
  const parts = g.items.map(t => typeof t === 'string' ? t : requirementText(t, true)).filter(Boolean);
  const s = parts.join(g.op === 'all' ? ' AND ' : ' OR ');
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

/* Reads requirementText's format back: quals joined by AND or OR, with parentheses around a nested
   group, e.g. "WELD412 AND (WELD427 OR WELD403)". Blank text is an empty group. Returns a message
   instead when the text can't be read, including AND and OR mixed without parentheses. */
export function parseRequirementText(text: string): QualGroup | string {
  const tokens = text.match(/\(|\)|[^\s()]+/g) ?? [];
  let i = 0;

  function group(): QualGroup | string {
    const items: QualTerm[] = [];
    let op: QualGroup['op'] | null = null;
    while (i < tokens.length && tokens[i] !== ')') {
      if (items.length) {
        const word = tokens[i].toUpperCase();
        if (word !== 'AND' && word !== 'OR') return `Expected AND or OR before "${tokens[i]}".`;
        const next = word === 'AND' ? 'all' : 'any';
        if (op && op !== next) return 'Use parentheses when mixing AND and OR.';
        op = next;
        i++;
        if (i >= tokens.length || tokens[i] === ')') return `Expected a qual after ${word}.`;
      }
      if (tokens[i] === '(') {
        i++;
        const inner = group();
        if (typeof inner === 'string') return inner;
        if (tokens[i] !== ')') return 'A "(" is missing its ")".';
        i++;
        items.push(inner.items.length === 1 ? inner.items[0] : inner);
      } else {
        items.push(tokens[i++]);
      }
    }
    return { op: op ?? 'all', items };
  }

  const result = group();
  if (typeof result !== 'string' && i < tokens.length) return 'A ")" has no matching "(".';
  return result;
}
