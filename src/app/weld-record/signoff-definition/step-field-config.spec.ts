import { COMMENTS_KEY, DECISION_KEY, DEFAULT_TYPE_DEFINITIONS, TYPE_KEY, definitionFields, definitionId, getActivationForStep, hasStepActivation } from './step-field-config';
describe('signoff section fields (Type, Inspection Results, Comments)', () => {
  it('Inspection Results is one of the definition fields', () => {
    expect(definitionFields([{ key: 'a' }, { key: DECISION_KEY }])).toEqual([{ key: 'a' }, { key: DECISION_KEY }]);
  });

  it('are seeded where they showed: Inspection Results only on Types with a reject target, Comments on every Type but Sold', () => {
    const keys = (id: string) => DEFAULT_TYPE_DEFINITIONS.find(a => a.typeId === id)!.fields.map(f => f.key);
    for (const id of ['vt', '5x', 'mt', 'pt', 'ut', 'rt', 'fitup-insp', 'review-o63']) expect(keys(id)).withContext(id).toContain(DECISION_KEY);
    expect(keys('root')).not.toContain(DECISION_KEY);
    expect(keys('root')[0]).toBe(TYPE_KEY);
    expect(keys('pre-fit')).not.toContain(TYPE_KEY);
    expect(keys('weld-buildup')[0]).toBe(TYPE_KEY);
    expect(keys('fitup-release')).toEqual([COMMENTS_KEY]);
    expect(keys('sold')).toEqual([]);
  });
});

describe('definition lookup by Type', () => {
  it('every step offering a Type reads its one definition; NQC rows and phases share it', () => {
    for (const id of ['root-ndt-vt5x', 'nqc-layer-ndt-vt5x', 'final-ndt-vt5x']) expect(definitionId({ id, signoffType: 'vt' })).withContext(id).toBe('vt');
    expect(definitionId({ id: 'deferred-tack', signoffType: 'tack' })).toBe('tack');
    expect(definitionId({ id: 'repair-3', signoffType: 'repair' })).toBe('repair');
  });

  it('a step whose Type is not picked yet shows only Type; Excavation NDT keeps its own; a step with no Types has none', () => {
    expect(getActivationForStep({ id: 'root-ndt-utrt', signoffType: 'standard' }).fields.map(f => f.key)).toEqual([TYPE_KEY]);
    expect(definitionId({ id: 'excavation-ndt-2', signoffType: 'rt' })).toBe('excavation-ndt');
    expect(definitionId({ id: 'engineering-hold', signoffType: 'standard' })).toBeUndefined();
    expect(hasStepActivation({ id: 'engineering-hold', signoffType: 'standard' })).toBeFalse();
  });
});
