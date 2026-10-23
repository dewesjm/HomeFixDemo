import { fieldRuleLines } from './field-rule-lines';

describe('field rule lines', () => {
  const label = (id: string) => id;

  it('reads "Always | Show" for a field with no conditions', () => {
    expect(fieldRuleLines({ key: 'hasProbationary' }, label)).toEqual([{ condition: 'Always', behaviors: ['Show'] }]);
  });

  it('quotes the error message a Required rule sets', () => {
    expect(fieldRuleLines({ key: 'hasProbationary', required: true, requiredMessage: 'Pick one' }, label))
      .toEqual([{ condition: 'Always', behaviors: ['Show', 'Required: "Pick one"'] }]);
  });

  it('stacks rules that share a condition on one line', () => {
    expect(fieldRuleLines({ key: 'oversightInspector' }, label)).toEqual([
      { condition: 'Has Probationary Inspector is checked', behaviors: ['Show'] },
      { condition: 'Always', behaviors: ['Required'] },
    ]);
    expect(fieldRuleLines({ key: 'actualPhMin' }, label)).toEqual([
      { condition: 'Always', behaviors: ['Show', 'Required'] },
      { condition: 'PH Min is NC', behaviors: ['Prepopulated from this signoff\'s PH Min', 'Disabled'] },
    ]);
  });

  it('follows the step\'s own settings over the catalog', () => {
    expect(fieldRuleLines({ key: 'actualPhMin', required: false, disabledIf: { all: [] }, fill: null }, label))
      .toEqual([{ condition: 'Always', behaviors: ['Show'] }]);
  });

  it('uses the fixed rules of fields set in code', () => {
    expect(fieldRuleLines({ key: 'deferTack' }, label)).toEqual([{ condition: 'Always', behaviors: ['Show'] }]);
    expect(fieldRuleLines({ key: 'affectedItem' }, label))
      .toEqual([{ condition: 'Always', behaviors: ['Show', 'Required (at least one must be picked)'] }]);
    expect(fieldRuleLines({ key: 'allowableThicknessExceeded' }, label)[0])
      .toEqual({ condition: 'The rejected phase has an RT/UT routing', behaviors: ['Show'] });
  });
});
