import { effectiveShowIf, showIfToStore, showRuleText, disabledRuleText, effectiveRequired, disabledIfToStore, effectiveDisabledIf, requiredToStore } from './field-rules';

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

  it('greyed-out rule and required store only what differs from the catalog', () => {
    const def = [{ source: 'field' as const, key: 'consumableInsertOnly', equals: 'yes' }];
    expect(disabledIfToStore('fillerMetalMic', def)).toBeUndefined();
    const cleared = disabledIfToStore('fillerMetalMic', []);
    expect(cleared).toEqual({ all: [] });
    expect(effectiveDisabledIf({ key: 'fillerMetalMic', disabledIf: cleared })).toBeUndefined();
    expect(disabledRuleText({ key: 'fillerMetalMic', disabledIf: cleared }, 'f')).toBe('');
    expect(requiredToStore('fillerMetalMic', 'f', true)).toBeUndefined();
    expect(requiredToStore('fillerMetalMic', 'f', false)).toBeFalse();
  });

  it('describes joint-design sign-off fields as built-in rules', () => {
    expect(showRuleText({ key: 'backingRingType' }, 'sf')).toBe('Shown when the joint design needs a backing ring');
  });
});

describe('field rules: Tack filler wording', () => {
  it('words the virtual joint facts', () => {
    const text = showRuleText({ key: 'fillerMetalType', showIf: { all: [
      { source: 'jointDetail', key: 'consumableInsertRequired', equals: '' },
      { source: 'jointDetail', key: 'materialTraceability', equals: 'yes' },
    ] } }, 'f');
    expect(text).toBe('Shown when the joint design doesn\'t need a consumable insert and either part requires material traceability');
  });
});
