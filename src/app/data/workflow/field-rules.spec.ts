import { effectiveShowIf, showIfToStore, showRuleText, disabledRuleText, effectiveRequired, disabledIfToStore, requiredToStore,
  defaultFill, effectiveFill, fillToStore, fillRuleText, requiredRuleText, requiredIfToStore, effectiveRequiredIf } from './field-rules';

describe('field rules', () => {
  it('falls back to the catalog condition when the step sets none', () => {
    expect(showRuleText({ key: 'probationaryInspector' })).toBe('Shown when Has Probationary Inspector is checked');
    expect(showRuleText({ key: 'portionInspected' })).toBe('Shown when Partial is checked');
    expect(showRuleText({ key: 'defectCode' })).toBe('Shown when Type is RT and Result is unsat');
    expect(showRuleText({ key: 'hasProbationary' })).toBe('Always shown');
  });

  it('describes the WTN and NC fill rules, and required rules', () => {
    const label = (id: string) => id;
    expect(fillRuleText({ key: 'weldProcess' }, label))
      .toBe('Always filled from the WTN\'s Weld Process and locked, except under an engineering override');
    expect(fillRuleText({ key: 'actualPhMin' }, label)).toBe('Filled from this step\'s PH Min and locked when PH Min is NC');
    expect(fillRuleText({ key: 'actualPhMax' }, label)).toBe('Filled from this step\'s PH Max and locked when PH Max is NC');
    expect(disabledRuleText({ key: 'weldProcess' })).toBe('');
    expect(requiredRuleText({ key: 'oversightInspector' })).toBe('Always required');
    expect(requiredRuleText({ key: 'consumableInsertId' })).toBe('Required when either part requires material traceability');
    expect(requiredRuleText({ key: 'hasProbationary' })).toBe('');
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

  it('greyed-out, required and required-when rules store only what differs from the catalog', () => {
    const phNc = [{ source: 'field' as const, key: 'phMin', equals: 'NC' }];
    expect(disabledIfToStore('actualPhMin', [])).toBeUndefined();
    expect(disabledIfToStore('actualPhMin', phNc)).toEqual({ all: phNc });
    const def = [{ source: 'jointDetail' as const, key: 'materialTraceability', equals: 'yes' }];
    expect(requiredIfToStore('consumableInsertId', def)).toBeUndefined();
    const cleared = requiredIfToStore('consumableInsertId', []);
    expect(cleared).toEqual({ all: [] });
    expect(effectiveRequiredIf({ key: 'consumableInsertId', requiredIf: cleared })).toBeUndefined();
    expect(requiredRuleText({ key: 'consumableInsertId', requiredIf: cleared })).toBe('Always required');
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

  it('insert and ring fields show by a joint design rule, Weld Position only when N Ind. is 1', () => {
    expect(showRuleText({ key: 'backingRingType' })).toBe('Shown when the joint design needs a backing ring');
    expect(showRuleText({ key: 'consumableInsertId' })).toBe('Shown when the joint design needs a consumable insert');
    expect(showRuleText({ key: 'weldPosition' })).toBe('Shown when joint N Ind. is 1');
    expect(showRuleText({ key: 'consumableInsertId', showIf: { all: [] } })).toBe('Always shown');
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
