import { effectiveShowIf, showIfToStore, showRuleText, disabledRuleText, effectiveRequired, disabledIfToStore, effectiveDisabledIf, requiredToStore,
  defaultFill, effectiveFill, fillToStore, fillRuleText } from './field-rules';

describe('field rules', () => {
  it('falls back to the catalog condition when the step sets none', () => {
    expect(showRuleText({ key: 'probationaryInspector' })).toBe('Shown when Has Probationary Inspector is checked');
    expect(showRuleText({ key: 'portionInspected' })).toBe('Shown when Partial is checked');
    expect(showRuleText({ key: 'defectCode' })).toBe('Shown when Type is RT and Result is unsat');
    expect(showRuleText({ key: 'hasProbationary' })).toBe('Always shown');
  });

  it('describes greyed-out and required rules', () => {
    expect(disabledRuleText({ key: 'actualPhMin' })).toBe('Greyed out when PH Min is NC');
    expect(disabledRuleText({ key: 'weldProcess' })).toBe('Always read-only');
    expect(effectiveRequired({ key: 'oversightInspector' })).toBeTrue();
    expect(effectiveRequired({ key: 'oversightInspector', required: false })).toBeFalse();
  });

  it('stores nothing when edits match the default, and an explicit "always" when cleared', () => {
    const def = [{ source: 'field' as const, key: 'partial', equals: 'yes' }];
    expect(showIfToStore('portionInspected', def)).toBeUndefined();
    const cleared = showIfToStore('portionInspected', []);
    expect(cleared).toEqual({ all: [] });
    expect(effectiveShowIf({ key: 'portionInspected', showIf: cleared })).toBeUndefined();
    expect(showIfToStore('hasProbationary', [])).toBeUndefined();
  });

  it('greyed-out rule and required store only what differs from the catalog', () => {
    const def = [{ source: 'field' as const, key: 'phMin', equals: 'NC' }];
    expect(disabledIfToStore('actualPhMin', def)).toBeUndefined();
    const cleared = disabledIfToStore('actualPhMin', []);
    expect(cleared).toEqual({ all: [] });
    expect(effectiveDisabledIf({ key: 'actualPhMin', disabledIf: cleared })).toBeUndefined();
    expect(disabledRuleText({ key: 'actualPhMin', disabledIf: cleared })).toBe('');
    expect(requiredToStore('fillerMetalMic', true)).toBeUndefined();
    expect(requiredToStore('fillerMetalMic', false)).toBeFalse();
  });

  it('fill rule: catalog default for the filler, stored only when it differs, null when cleared', () => {
    const label = (id: string) => id === 'fit' ? 'Fit' : id;
    expect(fillRuleText({ key: 'fillerMetalType' }, label))
      .toBe('Filled from Fit\'s Consumable Insert Type and locked when Only Consumable Insert used as filler is checked');
    expect(fillRuleText({ key: 'wtn' }, label)).toBe('');
    const def = defaultFill('fillerMetalType');
    expect(fillToStore('fillerMetalType', def && { ...def })).toBeUndefined();
    expect(fillToStore('fillerMetalType', undefined)).toBeNull();
    expect(effectiveFill({ key: 'fillerMetalType', fill: null })).toBeUndefined();
    expect(fillToStore('wtn', undefined)).toBeUndefined();
    const always = { stepId: 'fit', fieldKey: 'deferTack', when: { all: [] } };
    expect(fillToStore('wtn', always)).toEqual(always);
    expect(fillRuleText({ key: 'wtn', fill: always }, label)).toBe('Always filled from Fit\'s Defer Tack and locked');
  });

  it('describes joint-design sign-off fields as built-in rules', () => {
    expect(showRuleText({ key: 'backingRingType' })).toBe('Shown when the joint design needs a backing ring');
  });
});

describe('field rules: Tack filler wording', () => {
  it('words the virtual joint facts', () => {
    const text = showRuleText({ key: 'fillerMetalType', showIf: { all: [
      { source: 'jointDetail', key: 'consumableInsertRequired', equals: '' },
      { source: 'jointDetail', key: 'materialTraceability', equals: 'yes' },
    ] } });
    expect(text).toBe('Shown when the joint design doesn\'t need a consumable insert and either part requires material traceability');
  });
});
