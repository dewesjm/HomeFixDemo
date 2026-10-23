import { ConditionContext, FieldCondition, evaluateCondition } from './field-conditions';
import { conditionText, effectiveShowIf, showIfToStore, showRuleText, disabledRuleText, effectiveRequired, disabledIfToStore, requiredToStore,
  defaultFill, effectiveFill, fillToStore, fillRuleText, requiredRuleText, requiredIfToStore, effectiveRequiredIf,
  requiredMode, withRequiredMode, withRequiredMessage, standardRequiredMessage } from './field-rules';

describe('field rules', () => {
  it('falls back to the catalog condition when the step sets none', () => {
    expect(showRuleText({ key: 'probationaryInspector' })).toBe('Shown when Has Probationary Inspector is checked');
    expect(showRuleText({ key: 'portionInspected' })).toBe('Shown when Partial is checked');
    expect(showRuleText({ key: 'defectCode' })).toBe('Shown when Type is RT and Result is unsat');
    expect(showRuleText({ key: 'hasProbationary' })).toBe('Always shown');
  });

  it('describes the WTN and NC prepopulate and disabled rules, and required rules', () => {
    const label = (id: string) => id;
    expect(fillRuleText({ key: 'weldProcess' }, label))
      .toBe('Prepopulated from the WTN\'s Weld Process when Engineering override is off');
    expect(fillRuleText({ key: 'actualPhMin' }, label)).toBe('Prepopulated from this step\'s PH Min when PH Min is NC');
    expect(fillRuleText({ key: 'actualPhMax' }, label)).toBe('Prepopulated from this step\'s PH Max when PH Max is NC');
    expect(disabledRuleText({ key: 'weldProcess' })).toBe('Disabled when Engineering override is off');
    expect(disabledRuleText({ key: 'actualPhMin' })).toBe('Disabled when PH Min is NC');
    expect(disabledRuleText({ key: 'wtn' })).toBe('Never disabled');
    expect(disabledRuleText({ key: 'weldProcess', disabledIf: { all: [] } })).toBe('Never disabled');
    expect(requiredRuleText({ key: 'oversightInspector' })).toBe('Always required');
    expect(requiredRuleText({ key: 'consumableInsertId' })).toBe('Required when either part requires material traceability');
    expect(requiredRuleText({ key: 'hasProbationary' })).toBe('Never required');
    expect(effectiveRequired({ key: 'oversightInspector' })).toBeTrue();
    expect(effectiveRequired({ key: 'oversightInspector', required: false })).toBeFalse();
  });

  it('stores nothing when edits match the default, and an explicit "always" when cleared', () => {
    const def = [{ source: 'field' as const, key: 'partial', equals: 'yes' }];
    expect(showIfToStore('portionInspected', { all: def })).toBeUndefined();
    const cleared = showIfToStore('portionInspected', { all: [] });
    expect(cleared).toEqual({ all: [] });
    expect(effectiveShowIf({ key: 'portionInspected', showIf: cleared })).toBeUndefined();
    expect(showIfToStore('hasProbationary', { all: [] })).toBeUndefined();
  });

  it('disabled, required and required-when rules store only what differs from the catalog', () => {
    const phNc = [{ source: 'field' as const, key: 'phMin', equals: 'NC' }];
    expect(disabledIfToStore('actualPhMin', { all: phNc })).toBeUndefined();
    expect(disabledIfToStore('actualPhMin', { all: [] })).toEqual({ all: [] });
    expect(disabledIfToStore('wtn', { all: [] })).toBeUndefined();
    expect(disabledIfToStore('wtn', { all: phNc })).toEqual({ all: phNc });
    const def = [{ source: 'jointDetail' as const, key: 'materialTraceability', equals: 'yes' }];
    expect(requiredIfToStore('consumableInsertId', { all: def })).toBeUndefined();
    const cleared = requiredIfToStore('consumableInsertId', { all: [] });
    expect(cleared).toEqual({ all: [] });
    expect(effectiveRequiredIf({ key: 'consumableInsertId', requiredIf: cleared })).toBeUndefined();
    expect(requiredRuleText({ key: 'consumableInsertId', requiredIf: cleared })).toBe('Always required');
    expect(requiredToStore('fillerMetalMic', true)).toBeUndefined();
    expect(requiredToStore('fillerMetalMic', false)).toBeFalse();
  });

  it('Required droplist: Never / Always / When, storing only what differs from the catalog', () => {
    expect(requiredMode({ key: 'hasProbationary' })).toBe('never');
    expect(requiredMode({ key: 'oversightInspector' })).toBe('always');
    expect(requiredMode({ key: 'consumableInsertId' })).toBe('when');
    const always = withRequiredMode({ key: 'consumableInsertId' }, 'always');
    expect(always).toEqual({ key: 'consumableInsertId', requiredIf: { all: [] } });
    expect(requiredMode(always)).toBe('always');
    /* back to When brings the catalog condition back */
    expect(withRequiredMode(always, 'when')).toEqual({ key: 'consumableInsertId' });
    const never = withRequiredMode({ key: 'consumableInsertId', width: 160 }, 'never');
    expect(never).toEqual({ key: 'consumableInsertId', width: 160, required: false });
    expect(requiredRuleText(never)).toBe('Never required');
    expect(withRequiredMode({ key: 'hasProbationary' }, 'always')).toEqual({ key: 'hasProbationary', required: true });
    expect(withRequiredMode({ key: 'hasProbationary', required: true }, 'never')).toEqual({ key: 'hasProbationary' });
  });

  it('Required error message: trimmed, blank removes it, dropped when set to Never', () => {
    expect(withRequiredMessage({ key: 'hasProbationary', required: true }, '  Pick one  '))
      .toEqual({ key: 'hasProbationary', required: true, requiredMessage: 'Pick one' });
    expect(withRequiredMessage({ key: 'hasProbationary', requiredMessage: 'Pick one' }, ' ')).toEqual({ key: 'hasProbationary' });
    expect(withRequiredMode({ key: 'hasProbationary', required: true, requiredMessage: 'Pick one' }, 'never')).toEqual({ key: 'hasProbationary' });
    expect(withRequiredMode({ key: 'consumableInsertId', requiredMessage: 'Pick one' }, 'always'))
      .toEqual({ key: 'consumableInsertId', requiredIf: { all: [] }, requiredMessage: 'Pick one' });
    expect(standardRequiredMessage('oversightInspector', 'Oversight Inspector')).toBe('Oversight Inspector is required');
  });

  it('prepopulate rule: catalog default for the filler, stored only when it differs, null when cleared', () => {
    const label = (id: string) => id === 'fit' ? 'Fit' : id;
    expect(fillRuleText({ key: 'fillerMetalType' }, label))
      .toBe('Prepopulated from Fit\'s Consumable Insert Type when Only Consumable Insert used as filler is checked');
    expect(fillRuleText({ key: 'wtn' }, label)).toBe('Not prepopulated');
    const def = defaultFill('fillerMetalType');
    expect(fillToStore('fillerMetalType', def && { ...def })).toBeUndefined();
    expect(fillToStore('fillerMetalType', undefined)).toBeNull();
    expect(effectiveFill({ key: 'fillerMetalType', fill: null })).toBeUndefined();
    expect(fillToStore('wtn', undefined)).toBeUndefined();
    const always = { stepId: 'fit', fieldKey: 'deferTack', when: { all: [] } };
    expect(fillToStore('wtn', always)).toEqual(always);
    expect(fillRuleText({ key: 'wtn', fill: always }, label)).toBe('Always prepopulated from Fit\'s Defer Tack');
    const onOverride = { ...always, when: { all: [{ source: 'stageProperty' as const, key: 'engineeringEntry', equals: 'yes' }] } };
    expect(fillRuleText({ key: 'wtn', fill: onOverride }, label)).toBe('Prepopulated from Fit\'s Defer Tack when Engineering override is on');
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

describe('AND/OR conditions', () => {
  const ctx: ConditionContext = {
    stageId: 'root-ndt-vt5x', inputs: { inspectionType: 'vt', weldColor: 'straw' },
    jointDetail: () => '', stageProperty: () => '', priorInput: () => '',
  };
  const vt = { source: 'field' as const, key: 'inspectionType', equals: 'vt' };
  const color = (equals: string) => ({ source: 'field' as const, key: 'weldColor', equals });
  const nested: FieldCondition = { all: [vt, { any: [color('straw'), color('light-blue')] }] };

  it('any passes when one clause holds, and groups nest', () => {
    expect(evaluateCondition({ any: [color('dark-blue'), vt] }, ctx)).toBeTrue();
    expect(evaluateCondition({ any: [color('dark-blue'), color('light-blue')] }, ctx)).toBeFalse();
    expect(evaluateCondition(nested, ctx)).toBeTrue();
    expect(evaluateCondition({ any: [] }, ctx)).toBeTrue();
  });

  it('reads with parentheses around a nested group', () => {
    expect(conditionText(nested)).toBe('Type is VT and (Weld Color is straw or Weld Color is light-blue)');
  });

  it('an any group with no clauses counts as always', () => {
    expect(effectiveShowIf({ key: 'weldColor', showIf: { any: [{ all: [] }] } })).toBeUndefined();
  });
});
