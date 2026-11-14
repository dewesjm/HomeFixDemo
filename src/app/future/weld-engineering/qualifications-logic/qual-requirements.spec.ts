import { QualGroup, parseRequirementText, pruneGroup, qualsIn, requirementText } from './qual-requirements';

/* WELD412 AND (WELD427 OR WELD403) */
const nested: QualGroup = { op: 'all', items: ['WELD412', { op: 'any', items: ['WELD427', 'WELD403'] }] };

describe('procedure qualification requirements', () => {
  it('writes the requirement with parentheses around nested groups', () => {
    expect(requirementText(nested)).toBe('WELD412 AND (WELD427 OR WELD403)');
    expect(requirementText({ op: 'any', items: ['CNTRLMTL1', 'CNTRLMTL2'] })).toBe('CNTRLMTL1 OR CNTRLMTL2');
  });

  it('lists every qual once and drops empty nested groups', () => {
    expect(qualsIn(nested)).toEqual(['WELD412', 'WELD427', 'WELD403']);
    expect(pruneGroup({ op: 'all', items: ['A', { op: 'any', items: [{ op: 'all', items: [] }] }] }))
      .toEqual({ op: 'all', items: ['A'] });
  });

  it('reads requirement text back into a group', () => {
    expect(parseRequirementText(requirementText(nested))).toEqual(nested);
    expect(parseRequirementText('weld412 or WELD403')).toEqual({ op: 'any', items: ['weld412', 'WELD403'] });
    expect(parseRequirementText('WELD412')).toEqual({ op: 'all', items: ['WELD412'] });
    expect(parseRequirementText('  ')).toEqual({ op: 'all', items: [] });
  });

  it('says why requirement text cannot be read', () => {
    expect(typeof parseRequirementText('A AND B OR C')).toBe('string');
    expect(typeof parseRequirementText('A AND (B OR C')).toBe('string');
    expect(typeof parseRequirementText('A B')).toBe('string');
    expect(typeof parseRequirementText('A AND')).toBe('string');
    expect(typeof parseRequirementText('A) AND B')).toBe('string');
  });
});
