import { JOBS } from '../../data/jobs';
import { excavationTypeOptions } from './signoff-type-routing-rules';
import { getSignoffTypeRoutingRows } from '../../data/signoff-type-routing';
import { replacedType, TypeException, typeExceptionCondition } from './type-exceptions';

describe('Separate material exception conditions', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  const job = (first: string, second = '02-CS', nInd = '3') => ({ ...JOBS[0], materialType1: first, materialType2: second, nInd });
  it('seeds explicit non-ferrous OR austenitic conditions for both Excavations', () => {
    for (const id of ['excavation-ndt', 'nqc-excavation-ndt']) {
      const rule = getSignoffTypeRoutingRows().find(r => r.stepId === id)!.typeExceptions![0];
      expect(rule.when!.map(g => g[0].field)).toEqual(['material.nonFerrous', 'material.austenitic']);
      for (const material of ['12-SS304', '63-AL10', '60-TICP']) {
        expect(excavationTypeOptions(job('02-CS', material), 'pt', id)?.[0].value).toBe('5x');
      }
      expect(excavationTypeOptions(job('02-CS'), 'pt', id)?.[0].value).toBe('pt');
      expect(typeExceptionCondition(rule)).toContain(' OR ');
    }
  });
  it('supports AND, OR and negative material clauses across both members', () => {
    const rule: TypeException = { from: 'pt', to: '5x', when: [[
      { field: 'material.titanium', op: 'is', values: ['Yes'] },
      { field: 'material.austenitic', op: 'is', values: ['Yes'] },
    ]] };
    expect(replacedType([rule], 'pt', job('60-TICP', '12-SS304'))).toBe('5x');
    expect(replacedType([rule], 'pt', job('60-TICP'))).toBe('pt');
    rule.when!.push([{ field: 'material.nonFerrous', op: 'isNot', values: ['Yes'] }]);
    expect(replacedType([rule], 'pt', job('02-CS'))).toBe('5x');
  });
});
