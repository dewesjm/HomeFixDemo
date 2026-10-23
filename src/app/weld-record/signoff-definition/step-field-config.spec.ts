import { COMMENTS_KEY, DECISION_KEY, DEFAULT_STEP_FIELD_ACTIVATIONS, TYPE_KEY, definitionFields } from './step-field-config';
describe('signoff section fields (Type, Inspection Results, Comments)', () => {
  it('Inspection Results is one of the definition fields', () => {
    expect(definitionFields([{ key: 'a' }, { key: DECISION_KEY }])).toEqual([{ key: 'a' }, { key: DECISION_KEY }]);
  });

  it('are seeded where they showed: Inspection Results only on steps with a reject target, Comments on every step but Sold', () => {
    const keys = (id: string) => DEFAULT_STEP_FIELD_ACTIVATIONS.find(a => a.stepId === id)!.fields.map(f => f.key);
    expect(keys('root-ndt-utrt')).toContain(DECISION_KEY);
    expect(keys('fitup-insp')).toContain(DECISION_KEY);
    expect(keys('review-o63')).toContain(DECISION_KEY);
    expect(keys('root-weld')).not.toContain(DECISION_KEY);
    expect(keys('root-weld')[0]).toBe(TYPE_KEY);
    expect(keys('pre-fit')).not.toContain(TYPE_KEY);
    expect(keys('fit-weld-buildup')).not.toContain(TYPE_KEY);
    expect(keys('fitup-release')).toEqual([COMMENTS_KEY]);
    expect(keys('sold')).toEqual([]);
  });
});
