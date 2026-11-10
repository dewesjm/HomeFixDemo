import { QualGroup, missingText, pruneGroup, qualsIn, requirementText, termMet } from './qual-requirements';

/* WELD412 AND (WELD427 OR WELD403) */
const nested: QualGroup = { op: 'all', items: ['WELD412', { op: 'any', items: ['WELD427', 'WELD403'] }] };

describe('qual requirements', () => {
  it('evaluates AND, OR and nested groups; an empty group requires nothing', () => {
    expect(termMet(nested, ['WELD412', 'WELD403'])).toBeTrue();
    expect(termMet(nested, ['WELD412'])).toBeFalse();
    expect(termMet(nested, ['WELD427', 'WELD403'])).toBeFalse();
    expect(termMet({ op: 'any', items: [] }, [])).toBeTrue();
  });

  it('writes the requirement with parentheses around nested groups', () => {
    expect(requirementText(nested)).toBe('WELD412 AND (WELD427 OR WELD403)');
    expect(requirementText({ op: 'any', items: ['CNTRLMTL1', 'CNTRLMTL2'] })).toBe('CNTRLMTL1 OR CNTRLMTL2');
  });

  it('names only what is missing', () => {
    expect(missingText(nested, ['WELD427'])).toBe('WELD412');
    expect(missingText(nested, [])).toBe('WELD412, WELD427 OR WELD403');
    expect(missingText(nested, ['WELD412'])).toBe('WELD427 OR WELD403');
    expect(missingText(nested, ['WELD412', 'WELD427'])).toBe('');
  });

  it('lists every qual once and drops empty nested groups', () => {
    expect(qualsIn(nested)).toEqual(['WELD412', 'WELD427', 'WELD403']);
    expect(pruneGroup({ op: 'all', items: ['A', { op: 'any', items: [{ op: 'all', items: [] }] }] }))
      .toEqual({ op: 'all', items: ['A'] });
  });
});
