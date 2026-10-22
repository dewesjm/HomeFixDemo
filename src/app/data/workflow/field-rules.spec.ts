import { effectiveShowIf, showIfToStore, showRuleText, disabledRuleText, effectiveRequired } from './field-rules';

describe('field rules', () => {
  it('falls back to the catalog condition when the step sets none', () => {
    expect(showRuleText({ key: 'probationaryInspector' }, 'f')).toBe('Shown when Has Probationary Inspector is checked');
    expect(showRuleText({ key: 'portionInspected' }, 'f')).toBe('Shown when Partial is checked');
    expect(showRuleText({ key: 'defectCode' }, 'f')).toBe('Shown when Type is RT and Result is unsat');
    expect(showRuleText({ key: 'hasProbationary' }, 'f')).toBe('Always shown');
  });

  it('describes greyed-out and required rules', () => {
    expect(disabledRuleText({ key: 'actualPhMin' }, 'f')).toBe('Greyed out when PH Min is NC');
    expect(disabledRuleText({ key: 'weldProcess' }, 'f')).toBe('Always read-only');
    expect(effectiveRequired({ key: 'oversightInspector' }, 'f')).toBeTrue();
    expect(effectiveRequired({ key: 'oversightInspector', required: false }, 'f')).toBeFalse();
  });

  it('stores nothing when edits match the default, and an explicit "always" when cleared', () => {
    const def = [{ source: 'field' as const, key: 'partial', equals: 'yes' }];
    expect(showIfToStore('portionInspected', 'f', def)).toBeUndefined();
    const cleared = showIfToStore('portionInspected', 'f', []);
    expect(cleared).toEqual({ all: [] });
    expect(effectiveShowIf({ key: 'portionInspected', showIf: cleared }, 'f')).toBeUndefined();
    expect(showIfToStore('hasProbationary', 'f', [])).toBeUndefined();
  });

  it('describes joint-design sign-off fields as built-in rules', () => {
    expect(showRuleText({ key: 'backingRingType' }, 'sf')).toBe('Shown when the joint design needs a backing ring');
  });
});
